begin;

-- Reconciles two incompatible point_transactions writers that shipped in the
-- same window:
--   - src/features/activity/ledger.ts inserts (user_id, event_type, points, occurred_at)
--     — defined by 20260627_point_ledger.sql (event_type/points NOT NULL, no other columns)
--   - submit_bip_task / review_task_submission / request_reward_redemption /
--     review_reward_redemption insert (user_id, amount, reason, transaction_type,
--     source_type, source_id, metadata) — defined by
--     20260627193000_phase_2_tasks_approvals_rewards.sql
-- Neither migration created the columns/table the other side needs, so every
-- point-awarding task approval and every reward redemption attempt raises a
-- NOT NULL violation (missing event_type/points) or "relation point_balances
-- does not exist" (request_reward_redemption reads it with FOR UPDATE).

alter table public.point_transactions
  alter column event_type drop not null,
  alter column points drop not null;

alter table public.point_transactions
  add column if not exists amount integer,
  add column if not exists reason text,
  add column if not exists transaction_type text not null default 'earn'
    check (transaction_type in ('earn','spend','reserve','release','adjustment')),
  add column if not exists source_type text,
  add column if not exists source_id text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.point_transactions
  drop constraint if exists point_transactions_amount_or_points_chk;
alter table public.point_transactions
  add constraint point_transactions_amount_or_points_chk
  check (amount is not null or points is not null);

-- Backfill: rows written by the event-based ledger only set `points`;
-- treat that as the signed ledger delta so balances stay correct.
update public.point_transactions
set amount = points
where amount is null and points is not null;

-- point_balances: a running balance per user, maintained by trigger so it
-- can be read with FOR UPDATE inside request_reward_redemption /
-- review_reward_redemption without recomputing a SUM() aggregate under lock.
create table if not exists public.point_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  available  integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.point_balances enable row level security;

drop policy if exists point_balances_teen_select on public.point_balances;
create policy point_balances_teen_select on public.point_balances
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists point_balances_parent_select on public.point_balances;
create policy point_balances_parent_select on public.point_balances
for select to authenticated
using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = point_balances.user_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

-- No client-facing insert/update policy: only the SECURITY DEFINER trigger
-- below (and the SECURITY DEFINER reward/task RPCs it supports) write here.

create or replace function public.apply_point_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta integer := coalesce(NEW.amount, NEW.points, 0);
begin
  insert into public.point_balances (user_id, available, updated_at)
  values (NEW.user_id, v_delta, now())
  on conflict (user_id) do update
    set available   = public.point_balances.available + v_delta,
        updated_at  = now();
  return NEW;
end;
$$;

revoke all on function public.apply_point_transaction() from public, anon, authenticated;

drop trigger if exists point_transactions_apply_balance on public.point_transactions;
create trigger point_transactions_apply_balance
  after insert on public.point_transactions
  for each row execute function public.apply_point_transaction();

-- Backfill balances for any point_transactions rows written before this
-- migration (the trigger only fires on new inserts going forward).
insert into public.point_balances (user_id, available, updated_at)
select user_id, sum(coalesce(amount, points, 0)), now()
from public.point_transactions
group by user_id
on conflict (user_id) do update
  set available  = excluded.available,
      updated_at = now();

comment on table public.point_balances is
  'Running signed point balance per user, maintained by apply_point_transaction() '
  'so request_reward_redemption()/review_reward_redemption() can lock a single row '
  'with FOR UPDATE instead of aggregating point_transactions under lock.';

comment on column public.point_transactions.amount is
  'Signed ledger delta (earn/spend/reserve/release/adjustment). Backfilled from '
  '`points` for rows written by the event-based ledger, which only ever earns.';

commit;

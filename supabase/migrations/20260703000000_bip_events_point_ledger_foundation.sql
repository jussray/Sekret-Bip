begin;

-- The active point-ledger reconciliation consumes these two tables, while
-- their original 20260627 migrations are archived. Restore the prerequisite
-- schema before applying the reconciliation rather than weakening it.

create table if not exists public.bip_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null,
  occurred_at timestamptz not null default now(),
  meta        jsonb not null default '{}'::jsonb
);

create index if not exists idx_bip_events_user_time
  on public.bip_events (user_id, occurred_at desc);
create index if not exists idx_bip_events_user_type
  on public.bip_events (user_id, event_type);

alter table public.bip_events enable row level security;

revoke all on table public.bip_events from anon, authenticated;
grant select, insert on table public.bip_events to authenticated;

drop policy if exists "bip_events: teen all" on public.bip_events;
create policy "bip_events: teen all"
  on public.bip_events
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table if not exists public.point_transactions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  event_type   text not null,
  points       integer not null,
  occurred_at  timestamptz not null default now(),
  bip_event_id bigint references public.bip_events(id) on delete set null
);

create index if not exists idx_point_tx_user
  on public.point_transactions (user_id);
create index if not exists idx_point_tx_user_type
  on public.point_transactions (user_id, event_type);

alter table public.point_transactions enable row level security;

revoke all on table public.point_transactions from anon, authenticated;
grant select, insert on table public.point_transactions to authenticated;

drop policy if exists "point_transactions: teen all" on public.point_transactions;
create policy "point_transactions: teen all"
  on public.point_transactions
  for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

comment on table public.bip_events is
  'Append-only activity event ledger with minimal non-content metadata.';
comment on table public.point_transactions is
  'Append-only point ledger linked to activity events.';

commit;

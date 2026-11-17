-- Delayed account deletion requests for Se'kret Bip.
-- The user-facing request function creates pending rows with a seven-day grace
-- period. The account-delete Edge Function processes only expired requests.

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'cancelled', 'processing', 'completed', 'failed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default (now() + interval '7 days'),
  cancelled_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists account_deletion_requests_one_open_per_user
  on public.account_deletion_requests (user_id)
  where status in ('pending', 'processing');

alter table public.account_deletion_requests enable row level security;

drop policy if exists account_deletion_requests_owner_select
  on public.account_deletion_requests;
create policy account_deletion_requests_owner_select
  on public.account_deletion_requests
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists account_deletion_requests_owner_insert
  on public.account_deletion_requests;
create policy account_deletion_requests_owner_insert
  on public.account_deletion_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id and status = 'pending');

drop policy if exists account_deletion_requests_owner_cancel
  on public.account_deletion_requests;
create policy account_deletion_requests_owner_cancel
  on public.account_deletion_requests
  for update
  to authenticated
  using (auth.uid() = user_id and status = 'pending')
  with check (auth.uid() = user_id and status = 'cancelled');

revoke all on public.account_deletion_requests from anon;
grant select, insert, update on public.account_deletion_requests to authenticated;

begin;

-- Private "future me" reminders are intentionally separate from parent chores,
-- Circle/social content, and Daily Intentions. They belong only to the teen.
create table if not exists public.private_reopen_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_key text not null check (char_length(client_key) between 8 and 80),
  label text not null check (char_length(trim(label)) between 1 and 160),
  surface_after timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending','completed','dismissed')),
  shown_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_key)
);

comment on table public.private_reopen_reminders is
  'Owner-only future-self reminder queue. Never parent-visible, social, rewarded, or approval-based.';

create index if not exists private_reopen_reminders_due_idx
  on public.private_reopen_reminders (user_id, status, surface_after, created_at);

alter table public.private_reopen_reminders enable row level security;

revoke all on table public.private_reopen_reminders from public;
revoke all on table public.private_reopen_reminders from anon;
grant select, insert, update, delete on table public.private_reopen_reminders to authenticated;

drop policy if exists private_reopen_reminders_select_own on public.private_reopen_reminders;
create policy private_reopen_reminders_select_own
  on public.private_reopen_reminders
  for select to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

drop policy if exists private_reopen_reminders_insert_own on public.private_reopen_reminders;
create policy private_reopen_reminders_insert_own
  on public.private_reopen_reminders
  for insert to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

drop policy if exists private_reopen_reminders_update_own on public.private_reopen_reminders;
create policy private_reopen_reminders_update_own
  on public.private_reopen_reminders
  for update to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

drop policy if exists private_reopen_reminders_delete_own on public.private_reopen_reminders;
create policy private_reopen_reminders_delete_own
  on public.private_reopen_reminders
  for delete to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

commit;

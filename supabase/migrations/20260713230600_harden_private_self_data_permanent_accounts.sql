begin;

-- Anonymous Supabase Auth sessions assume the `authenticated` database role and
-- receive a real auth.uid(). The legacy owner-only policies below therefore let
-- temporary anonymous accounts create and retain private comfort and room-memory
-- rows. Cloud sync is account-gated, so these private tables require a permanent
-- account in addition to matching ownership.

alter table public.comfort_sessions enable row level security;

revoke all on table public.comfort_sessions from public, anon, authenticated;
grant select, insert, update, delete on table public.comfort_sessions to authenticated;

-- Remove overlapping legacy policies so one auditable contract owns the table.
drop policy if exists comfort_sessions_owner_delete on public.comfort_sessions;
drop policy if exists comfort_sessions_owner_insert on public.comfort_sessions;
drop policy if exists comfort_sessions_owner_select on public.comfort_sessions;
drop policy if exists comfort_sessions_owner_update on public.comfort_sessions;
drop policy if exists comfort_sessions_self on public.comfort_sessions;
drop policy if exists comfort_sessions_permanent_owner_all on public.comfort_sessions;

create policy comfort_sessions_permanent_owner_all
on public.comfort_sessions
for all
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

comment on policy comfort_sessions_permanent_owner_all on public.comfort_sessions is
  'Permanent authenticated account may CRUD only its own comfort-session rows.';

alter table public.room_memory enable row level security;

revoke all on table public.room_memory from public, anon, authenticated;
grant select, insert, update, delete on table public.room_memory to authenticated;

-- Remove overlapping legacy policies so one auditable contract owns the table.
drop policy if exists room_memory_owner_delete on public.room_memory;
drop policy if exists room_memory_owner_insert on public.room_memory;
drop policy if exists room_memory_owner_select on public.room_memory;
drop policy if exists room_memory_owner_update on public.room_memory;
drop policy if exists room_memory_self on public.room_memory;
drop policy if exists room_memory_permanent_owner_all on public.room_memory;

create policy room_memory_permanent_owner_all
on public.room_memory
for all
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
)
with check (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

comment on policy room_memory_permanent_owner_all on public.room_memory is
  'Permanent authenticated account may CRUD only its own private room-memory row.';

commit;

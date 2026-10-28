create table if not exists public.oracle_session_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null check (mode in ('teen', 'parent')),
  session_index integer not null default 0,
  total_turns integer not null default 0,
  question_ids text[] not null default '{}',
  dimension_summary jsonb not null default '{}',
  profile_snapshot text not null default '',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists oracle_session_log_user_mode_idx on public.oracle_session_log (user_id, mode, completed_at desc);
alter table public.oracle_session_log enable row level security;
drop policy if exists "oracle_session_log: owner read" on public.oracle_session_log;
drop policy if exists "oracle_session_log: owner insert" on public.oracle_session_log;
drop policy if exists "oracle_session_log: owner delete" on public.oracle_session_log;
create policy "oracle_session_log: owner read" on public.oracle_session_log for select to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id);
create policy "oracle_session_log: owner insert" on public.oracle_session_log for insert to authenticated with check (public.is_non_anonymous_user() and auth.uid() = user_id);
create policy "oracle_session_log: owner delete" on public.oracle_session_log for delete to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "Enable users to view their own data only" on public.oracle_records to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_records: owner all" on public.oracle_records to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner read" on public.oracle_sessions to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner insert" on public.oracle_sessions to authenticated with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner update" on public.oracle_sessions to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner delete" on public.oracle_sessions to authenticated using (public.is_non_anonymous_user() and auth.uid() = user_id);

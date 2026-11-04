create or replace function public.is_non_anonymous_user()
returns boolean
language sql
stable
set search_path = public, pg_temp
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

revoke all on function public.is_non_anonymous_user() from public, anon;
grant execute on function public.is_non_anonymous_user() to authenticated;

alter policy journal_entries_owner_select on public.journal_entries using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy journal_entries_owner_insert on public.journal_entries with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy journal_entries_owner_update on public.journal_entries using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy journal_entries_owner_delete on public.journal_entries using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy journal_entries_self on public.journal_entries using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy voice_notes_owner_select on public.voice_notes using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy voice_notes_owner_insert on public.voice_notes with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy voice_notes_owner_update on public.voice_notes using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy voice_notes_owner_delete on public.voice_notes using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy voice_notes_self on public.voice_notes using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy "Enable users to view their own data only" on public.oracle_records using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_records: owner all" on public.oracle_records using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy "oracle_sessions: owner read" on public.oracle_sessions using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner insert" on public.oracle_sessions with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner update" on public.oracle_sessions using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy "oracle_sessions: owner delete" on public.oracle_sessions using (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy mood_history_owner_select on public.mood_history using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy mood_history_owner_insert on public.mood_history with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy mood_history_owner_update on public.mood_history using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy mood_history_owner_delete on public.mood_history using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy mood_history_self on public.mood_history using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy period_days_owner_select on public.period_days using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy period_days_owner_insert on public.period_days with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy period_days_owner_update on public.period_days using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy period_days_owner_delete on public.period_days using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy period_days_self on public.period_days using (public.is_non_anonymous_user() and auth.uid() = user_id) with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy account_deletion_requests_owner_select on public.account_deletion_requests using (public.is_non_anonymous_user() and auth.uid() = user_id);
alter policy account_deletion_requests_owner_insert on public.account_deletion_requests with check (public.is_non_anonymous_user() and auth.uid() = user_id and status = 'pending');
alter policy account_deletion_requests_owner_cancel on public.account_deletion_requests using (public.is_non_anonymous_user() and auth.uid() = user_id and status = 'pending') with check (public.is_non_anonymous_user() and auth.uid() = user_id and status = 'cancelled');

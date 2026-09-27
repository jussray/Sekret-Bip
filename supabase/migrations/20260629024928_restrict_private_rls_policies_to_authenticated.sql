alter policy journal_entries_owner_delete on public.journal_entries to authenticated;
alter policy journal_entries_owner_insert on public.journal_entries to authenticated;
alter policy journal_entries_owner_select on public.journal_entries to authenticated;
alter policy journal_entries_owner_update on public.journal_entries to authenticated;
alter policy journal_entries_self on public.journal_entries to authenticated;

alter policy voice_notes_owner_delete on public.voice_notes to authenticated;
alter policy voice_notes_owner_insert on public.voice_notes to authenticated;
alter policy voice_notes_owner_select on public.voice_notes to authenticated;
alter policy voice_notes_owner_update on public.voice_notes to authenticated;
alter policy voice_notes_self on public.voice_notes to authenticated;

alter policy "Enable users to view their own data only" on public.oracle_records to authenticated;
alter policy "oracle_records: owner all" on public.oracle_records to authenticated;

alter policy "oracle_sessions: owner delete" on public.oracle_sessions to authenticated;
alter policy "oracle_sessions: owner insert" on public.oracle_sessions to authenticated;
alter policy "oracle_sessions: owner read" on public.oracle_sessions to authenticated;
alter policy "oracle_sessions: owner update" on public.oracle_sessions to authenticated;

alter policy mood_history_owner_delete on public.mood_history to authenticated;
alter policy mood_history_owner_insert on public.mood_history to authenticated;
alter policy mood_history_owner_select on public.mood_history to authenticated;
alter policy mood_history_owner_update on public.mood_history to authenticated;
alter policy mood_history_self on public.mood_history to authenticated;

alter policy period_days_owner_delete on public.period_days to authenticated;
alter policy period_days_owner_insert on public.period_days to authenticated;
alter policy period_days_owner_select on public.period_days to authenticated;
alter policy period_days_owner_update on public.period_days to authenticated;
alter policy period_days_self on public.period_days to authenticated;

alter policy "parent_notes: parent insert" on public.parent_notes to authenticated;
alter policy "parent_notes: parent read" on public.parent_notes to authenticated;
alter policy "parent_notes: teen mark seen" on public.parent_notes to authenticated;
alter policy "parent_notes: teen read" on public.parent_notes to authenticated;

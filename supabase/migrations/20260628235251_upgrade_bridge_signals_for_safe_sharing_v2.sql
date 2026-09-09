alter table public.bridge_signals add column if not exists summary text;
alter table public.bridge_signals add column if not exists source_id text;

alter table public.bridge_signals drop constraint if exists bridge_signals_summary_length;
alter table public.bridge_signals add constraint bridge_signals_summary_length
check (summary is null or length(summary) <= 1000);

alter table public.bridge_signals drop constraint if exists bridge_signals_share_type_check;
alter table public.bridge_signals add constraint bridge_signals_share_type_check
check (share_type in ('mood_summary','support_request','journal_summary','voice_summary','milestone','safety_check_in'));

alter table public.bridge_signals drop constraint if exists bridge_signals_char_key_check;
alter table public.bridge_signals add constraint bridge_signals_char_key_check
check (char_key in ('raylene','rylane','cloud','night','oracle'));

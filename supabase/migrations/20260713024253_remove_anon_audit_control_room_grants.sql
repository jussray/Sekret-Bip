-- Remove unnecessary unauthenticated table privileges from audit and Control Room tables.

revoke all privileges on table public.audit_events from anon;
revoke all privileges on table public.control_room_fingerprints from anon;
revoke all privileges on table public.control_room_issue_events from anon;
revoke all privileges on table public.control_room_issue_history from anon;
revoke all privileges on table public.control_room_issues from anon;
revoke all privileges on table public.control_room_releases from anon;

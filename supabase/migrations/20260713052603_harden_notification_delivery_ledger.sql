begin;

-- notification_deliveries is an internal cooldown/delivery ledger used only by
-- the JWT-protected send-push Edge Function through a service-role client.
-- Teen and parent clients must never read or mutate this table directly.
alter table public.notification_deliveries enable row level security;

-- Remove inherited/default Data API exposure, then restore only the two table
-- privileges required by send-push: SELECT for cooldown checks and INSERT for
-- recording a successful delivery attempt.
revoke all on table public.notification_deliveries
  from public, anon, authenticated, service_role;

grant select, insert on table public.notification_deliveries
  to service_role;

-- Identity generation needs sequence USAGE. No client role receives sequence
-- access, and the service role does not need sequence SELECT or UPDATE.
revoke all on sequence public.notification_deliveries_id_seq
  from public, anon, authenticated, service_role;

grant usage on sequence public.notification_deliveries_id_seq
  to service_role;

-- Keep the intentional deny-all API boundary visible to humans and advisors.
-- Grants already block client access; this policy documents the row boundary
-- as defense in depth without widening access for anonymous-authenticated users.
drop policy if exists notification_deliveries_deny_clients
  on public.notification_deliveries;

create policy notification_deliveries_deny_clients
on public.notification_deliveries
for all
to anon, authenticated
using (false)
with check (false);

comment on table public.notification_deliveries is
  'Server-only push notification cooldown and delivery ledger. Client roles have no table privileges; send-push uses service_role SELECT and INSERT only.';

comment on policy notification_deliveries_deny_clients
  on public.notification_deliveries is
  'Explicit deny-all policy for anon and authenticated roles. The service role bypasses RLS and is limited by table grants.';

commit;

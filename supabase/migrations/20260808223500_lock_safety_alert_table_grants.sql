begin;

-- RLS does not govern table-level TRUNCATE and the legacy safety_alerts grants
-- predate the canonical read-only client contract. Remove every inherited table
-- privilege from authenticated, then grant only the SELECT capability intended
-- by the teen-owner and linked-parent RLS policies.
revoke all on table public.safety_alerts from authenticated;
grant select on table public.safety_alerts to authenticated;

commit;

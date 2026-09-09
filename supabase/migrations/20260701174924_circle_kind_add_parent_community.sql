-- Circle V2 Phase 0 (1/2) — add 'parent_community' to circle_kind
-- Split so the new enum value is committed before later migrations reference it.

alter type public.circle_kind add value if not exists 'parent_community';

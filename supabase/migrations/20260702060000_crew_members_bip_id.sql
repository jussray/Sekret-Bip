-- Se'kret Bip — crew_members.bip_id / connection_status
--
-- Backfills a gap found by docs/RLS_POLICY_AUDIT.md: db/schema.sql already
-- adds these columns via an inline `alter table ... add column if not
-- exists`, but no versioned migration ever did the same. A project
-- bootstrapped purely from `supabase/migrations/` (the CLI `supabase db
-- push` path) is missing both columns, even though src/utils/supabase.ts
-- reads/writes connection_status.
--
-- Mirrors db/schema.sql's crew_members block exactly. RLS is already
-- enabled and policy already exists for crew_members via the dynamic loop
-- in 0001_init.sql — nothing to add here on that front.

alter table public.crew_members add column if not exists bip_id text;
alter table public.crew_members add column if not exists connection_status text not null default 'pending';

do $$ begin
  alter table public.crew_members add constraint crew_members_connection_status_check
    check (connection_status in ('pending', 'accepted', 'blocked', 'removed'));
exception when duplicate_object then null;
end $$;

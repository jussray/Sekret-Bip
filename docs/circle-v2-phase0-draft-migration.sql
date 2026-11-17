-- ============================================================================
-- STALE — DO NOT APPLY — superseded by live verification
-- ============================================================================
-- Access to tbsevonvegdnlyjgplmm was resolved after this file was written.
-- Live queries (see docs/circle-v2-migration-plan.md §1-§3) contradict several
-- assumptions below:
--   - Teen Circle open-read already exists live (circles/posts already carve
--     out `kind = 'public'`) — section 4 below is unnecessary for Teen Circle.
--   - Parent Circle is structurally blocked by a real `circles_kind_shape`
--     CHECK constraint tying every kind='parent' row to a specific
--     parent_link_id — section 4's parent-circle policy below cannot work
--     as written and is not just "needs real column types," it needs a
--     genuine design decision first (plan doc §1.2).
--   - circle_profiles.account_type already exists live with the exact
--     CHECK ('teen','guardian') this file adds in section 2 — that section
--     is a no-op against the real schema.
--   - The reaction vocabulary conflict (section 7) is now confirmed real,
--     not hypothetical: reaction_kind = hug/heart/listen/support/spark is
--     live and in use by the schema.
-- Kept for history only. The real migration will be drafted fresh once
-- plan doc §1.2 is decided.
-- ============================================================================
--
-- Original header, kept for context (now inaccurate — see above):
-- This file is a working draft of the Phase 0 migration, built from the
-- reported live-schema audit of tbsevonvegdnlyjgplmm (Se'kret Bip prod), NOT
-- from an independently-verified query against that project. This session's
-- Supabase connector still lacks project-scoped access to tbsevonvegdnlyjgplmm
-- (confirmed: it can see the "Se'kret Bip" org, but not this specific
-- project — access denied is "permission," not "not found").
--
-- Treat every assumption below as UNVERIFIED until someone with real access
-- runs the queries in docs/circle-v2-migration-plan.md §8 item 1 and this
-- file is revised to match. Do not run this against any database as-is.
--
-- Assumptions carried in from the reported audit (§0/§9 of the plan doc):
--   - circles.id, circle_members.id, posts.id, post_reactions.id,
--     post_comments.id are UUID (not bigint, contra the repo's own
--     0004_supplemental_tables.sql — meaning the live DB has diverged from
--     every migration file in this repo for these tables)
--   - post_comments uses author_user_id / body (not user_id / text)
--   - post_reactions.reaction is constrained by a `reaction_kind` enum:
--     hug, heart, listen, support, spark — NOT the app's actual UI keys
--     (felt/comfort/proud/stay, beenThere/solidarity/reminder/needed/strength)
--   - No Circle V2 tables currently have rows (no backfill/data-loss risk
--     for anything touched here, if true)
--   - circles.kind check constraint, circle_members structure, and RLS
--     policy names are assumed to roughly match 0004_supplemental_tables.sql
--     in shape even though the id types don't — UNCONFIRMED
--   - circle_profiles table shape is entirely unconfirmed; account_type
--     is assumed not to exist yet
-- ============================================================================

begin;

-- ── 1. Guardian verification states ─────────────────────────────────────────
-- account_verification.verification_state is repo-confirmed (this table's
-- shape is NOT in dispute — 20260630001000_account_verification_parent_approval.sql
-- is the same file regardless of which project is live).
alter table public.account_verification
  drop constraint if exists account_verification_verification_state_check;
alter table public.account_verification
  add constraint account_verification_verification_state_check
  check (verification_state in (
    'UNVERIFIED','PENDING_PARENT','PENDING_TRUSTED_ADULT','LIMITED_MODE',
    'VERIFIED_TEEN','EXPIRED','MANUAL_REVIEW','SUSPENDED',
    'VERIFIED_GUARDIAN','PENDING_GUARDIAN_REVIEW','GUARDIAN_REJECTED','GUARDIAN_SUSPENDED'
  ));
-- NOTE: does not add a redemption/attestation path that sets VERIFIED_GUARDIAN.
-- That's a separate, real product flow (guardian signup/attestation, ID
-- verification or equivalent) — out of scope for this schema-only draft.

-- ── 2. circle_profiles.account_type ──────────────────────────────────────────
-- UNCONFIRMED whether this table/column exists live at all.
alter table public.circle_profiles
  add column if not exists account_type text;
alter table public.circle_profiles
  drop constraint if exists circle_profiles_account_type_check;
alter table public.circle_profiles
  add constraint circle_profiles_account_type_check
  check (account_type in ('teen','guardian'));
-- If circle_profiles doesn't exist live, or account_type belongs on a
-- different table (e.g. a profiles/users table), this whole section needs
-- to be replaced once Phase 0 item 1 confirms the real shape.

-- ── 3. circles.kind gains 'parent' ───────────────────────────────────────────
-- UNCONFIRMED constraint name on live DB; assumed to match repo pattern.
alter table public.circles
  drop constraint if exists circles_kind_check;
alter table public.circles
  add constraint circles_kind_check
  check (kind in ('public','friends','crew','parent'));

-- ── 4. Open-read policies for Teen/Parent circles ────────────────────────────
-- Teen Circle: any account with a teen-verified state can read every
-- 'public'-kind circle/post, not just ones they're a circle_members row for.
-- Parent Circle: any VERIFIED_GUARDIAN + account_type='guardian' account can
-- read every 'parent'-kind circle/post, independent of parent_links.
drop policy if exists "circles_public_parent_read" on public.circles;
create policy "circles_public_parent_read" on public.circles
  for select using (
    (kind = 'public' and exists (
      select 1 from public.account_verification av
      where av.user_id = auth.uid() and av.verification_state = 'VERIFIED_TEEN'
    ))
    or
    (kind = 'parent' and exists (
      select 1 from public.account_verification av
      join public.circle_profiles cp on cp.user_id = av.user_id
      where av.user_id = auth.uid()
        and av.verification_state = 'VERIFIED_GUARDIAN'
        and cp.account_type = 'guardian'
    ))
  );

drop policy if exists "posts_public_parent_read" on public.posts;
create policy "posts_public_parent_read" on public.posts
  for select using (
    is_deleted = false
    and circle_id in (
      select id from public.circles c
      where (c.kind = 'public' and exists (
        select 1 from public.account_verification av
        where av.user_id = auth.uid() and av.verification_state = 'VERIFIED_TEEN'
      ))
      or (c.kind = 'parent' and exists (
        select 1 from public.account_verification av
        join public.circle_profiles cp on cp.user_id = av.user_id
        where av.user_id = auth.uid()
          and av.verification_state = 'VERIFIED_GUARDIAN'
          and cp.account_type = 'guardian'
      ))
    )
  );
-- Friends/crew keep the existing circle_members-gated policies untouched.

-- ── 5. DB-level anonymity guard for Teen/Parent circles ──────────────────────
-- Never trust the client's is_identity_revealed flag for these two kinds.
create or replace function public.enforce_circle_anonymity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _kind text;
begin
  select kind into _kind from public.circles where id = new.circle_id;
  if _kind in ('public','parent') and new.is_identity_revealed = true then
    raise exception 'identity cannot be revealed on % circle posts', _kind;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_circle_anonymity on public.posts;
create trigger enforce_circle_anonymity
  before insert or update on public.posts
  for each row execute function public.enforce_circle_anonymity();

-- ── 6. Safety scan extended to posts ─────────────────────────────────────────
-- trigger_safety_scan() already generalizes over content column ('text'/'body')
-- — no function change needed, confirmed from the repo migration regardless
-- of which project is live.
alter table public.posts
  add column if not exists safety_flagged boolean not null default false;

drop trigger if exists safety_scan_posts on public.posts;
create trigger safety_scan_posts
  after insert on public.posts
  for each row execute function public.trigger_safety_scan('body');
-- Also requires 'posts' added to the Edge Function's SourceTable allowlist —
-- that's an application-code change (supabase/functions/safety-scan/index.ts),
-- not SQL, tracked separately.

-- ── 7. Reaction vocabulary — UNRESOLVED, do not run this section yet ────────
-- Reported live: post_reactions.reaction constrained by a `reaction_kind`
-- enum (hug, heart, listen, support, spark). Repo/app UI keys are
-- felt/comfort/proud/stay (teen) and beenThere/solidarity/reminder/needed/
-- strength (parent) — a completely different vocabulary. This is the
-- original pasted-document blocker, apparently real after all once checked
-- against the correct project. Needs a decision before any SQL here:
--   (a) alter reaction_kind to add the app's real keys, or
--   (b) add an app-layer mapping between UI keys and the DB enum.
-- No ALTER TYPE / CHECK constraint drafted until that's decided AND the
-- enum's real name/values are confirmed directly (not just reported).

commit;

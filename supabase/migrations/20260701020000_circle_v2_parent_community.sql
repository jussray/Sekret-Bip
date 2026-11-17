-- Circle V2 Phase 0 (2/2) — guardian verification + parent_community circle
--
-- Decisions this migration implements (docs/circle-v2-migration-plan.md):
--   §1.1 — standalone VERIFIED_GUARDIAN state, independent of parent_links
--   §1.2 option (a) — new circle_kind value 'parent_community' (added in
--     the prior migration file) for the guardian community feed; the
--     existing kind='parent' (private, parent_links-scoped) is untouched
--   §4   — DB-level anonymity guard for kind in ('public','parent_community')
--   §5   — safety-scan extended to `posts`
--
-- NOT included, on purpose:
--   §6 reaction vocabulary — still unresolved (alter reaction_kind vs. an
--     app-layer mapping), not part of this decision, no reaction_kind
--     change here.
--   Anything to do with kind='parent' (private Bridge-linked circles) —
--     explicitly out of scope, left exactly as it was.
--
-- Verified against the live schema of tbsevonvegdnlyjgplmm before writing
-- this (see plan doc §3): uuid ids throughout, circle_kind/reaction_kind
-- are real Postgres enums, circles_kind_shape and the policy names below
-- are all confirmed via direct query, not assumed from repo migrations
-- (which do not match this project's actual schema).

begin;

-- ── 1. Guardian verification states ─────────────────────────────────────────
alter table public.account_verification
  drop constraint account_verification_verification_state_check;
alter table public.account_verification
  add constraint account_verification_verification_state_check
  check (verification_state in (
    'UNVERIFIED','PENDING_PARENT','PENDING_TRUSTED_ADULT','LIMITED_MODE',
    'VERIFIED_TEEN','EXPIRED','MANUAL_REVIEW','SUSPENDED',
    'VERIFIED_GUARDIAN','PENDING_GUARDIAN_REVIEW','GUARDIAN_REJECTED','GUARDIAN_SUSPENDED'
  ));
-- Does not add a redemption/attestation flow that actually sets
-- VERIFIED_GUARDIAN — that's a real, separate product flow (guardian
-- signup/attestation, id verification or equivalent), intentionally out of
-- scope for this schema-only migration.

-- ── 2. circles_kind_shape gains 'parent_community' ───────────────────────────
-- Same shape bucket as 'public'/'friends': no crew_id, no parent_link_id.
alter table public.circles
  drop constraint circles_kind_shape;
alter table public.circles
  add constraint circles_kind_shape
  check (
    (kind = 'crew'::circle_kind and crew_id is not null and parent_link_id is null)
    or (kind = 'parent'::circle_kind and parent_link_id is not null and crew_id is null)
    or (kind in ('public'::circle_kind, 'friends'::circle_kind, 'parent_community'::circle_kind)
        and crew_id is null and parent_link_id is null)
  );

-- ── 3. is_verified_guardian() helper ─────────────────────────────────────────
create or replace function public.is_verified_guardian()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.account_verification av
    join public.circle_profiles cp on cp.user_id = av.user_id
    where av.user_id = auth.uid()
      and av.verification_state = 'VERIFIED_GUARDIAN'
      and cp.account_type = 'guardian'
  );
$$;

-- ── 4. circles RLS — open read for parent_community, gated on guardian status ─
drop policy "circles select owner or member" on public.circles;
create policy "circles select owner or member" on public.circles
  for select using (
    (owner_user_id = (select auth.uid()))
    or (id in (select cm.circle_id from public.circle_members cm where cm.user_id = (select auth.uid())))
    or (kind = 'public'::circle_kind)
    or (kind = 'parent_community'::circle_kind and public.is_verified_guardian())
  );

-- Only verified guardians may create a parent_community circle for
-- themselves. Other kinds keep their existing (unrestricted-by-kind)
-- insert behavior — not touched here, out of scope.
drop policy "circles insert own" on public.circles;
create policy "circles insert own" on public.circles
  for insert with check (
    (owner_user_id = (select auth.uid()))
    and (kind <> 'parent_community'::circle_kind or public.is_verified_guardian())
  );

-- ── 5. posts RLS — same open-read carve-out for parent_community ─────────────
drop policy "posts select by circle visibility" on public.posts;
create policy "posts select by circle visibility" on public.posts
  for select using (
    (author_user_id = (select auth.uid()))
    or (circle_id in (select c.id from public.circles c where c.kind = 'public'::circle_kind))
    or (circle_id in (
         select c.id from public.circles c
         where c.kind = 'friends'::circle_kind
           and c.owner_user_id in (
             select f1.friend_user_id
             from public.friendships f1
             join public.friendships f2
               on f1.user_id = f2.friend_user_id and f1.friend_user_id = f2.user_id
             where f1.user_id = (select auth.uid())
           )
       ))
    or (circle_id in (select cm.circle_id from public.circle_members cm where cm.user_id = (select auth.uid())))
    or (
      circle_id in (select c.id from public.circles c where c.kind = 'parent_community'::circle_kind)
      and public.is_verified_guardian()
    )
  );

drop policy "posts insert by author" on public.posts;
create policy "posts insert by author" on public.posts
  for insert with check (
    (author_user_id = (select auth.uid()))
    and (
      not exists (
        select 1 from public.circles c
        where c.id = circle_id and c.kind = 'parent_community'::circle_kind
      )
      or public.is_verified_guardian()
    )
  );

-- ── 6. DB-level anonymity guard ───────────────────────────────────────────────
-- Never trust the client's is_identity_revealed flag for public or
-- parent_community posts. (kind='parent', friends, crew are unaffected —
-- those may legitimately reveal identity per the target model.)
create or replace function public.enforce_circle_anonymity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _kind public.circle_kind;
begin
  select kind into _kind from public.circles where id = new.circle_id;
  if _kind in ('public', 'parent_community') and new.is_identity_revealed is true then
    raise exception 'identity cannot be revealed on % circle posts', _kind;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_circle_anonymity on public.posts;
create trigger enforce_circle_anonymity
  before insert or update on public.posts
  for each row execute function public.enforce_circle_anonymity();

-- ── 7. Safety scan extended to posts ─────────────────────────────────────────
-- trigger_safety_scan() already generalizes over content column
-- ('text'/'body') — confirmed via live function body, no function change
-- needed.
alter table public.posts
  add column if not exists safety_flagged boolean not null default false;

drop trigger if exists safety_scan_posts on public.posts;
create trigger safety_scan_posts
  after insert on public.posts
  for each row execute function public.trigger_safety_scan('body');
-- Companion app-code change (not SQL, already made in this PR): 'posts'
-- added to the Edge Function's SourceTable allowlist in
-- supabase/functions/safety-scan/index.ts, with author_user_id used
-- instead of user_id when flagging a posts row specifically.

commit;

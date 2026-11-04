begin;

-- Legacy Circle V1 tables remain reachable from compatibility paths and the
-- parent community route. Supabase anonymous-authenticated sessions receive an
-- auth.uid() and therefore satisfy the original owner-only policies. Add a
-- restrictive permanent-account membrane without weakening the existing
-- audience/owner policies.

-- Friends posts ---------------------------------------------------------------
drop policy if exists friends_circle_posts_permanent_accounts_only
  on public.friends_circle_posts;
create policy friends_circle_posts_permanent_accounts_only
on public.friends_circle_posts
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

revoke all on table public.friends_circle_posts from anon;
revoke all on table public.friends_circle_posts from authenticated;
grant select, insert, update, delete
  on table public.friends_circle_posts to authenticated;

revoke all on sequence public.friends_circle_posts_id_seq from anon, authenticated;
grant usage, select on sequence public.friends_circle_posts_id_seq to authenticated;

-- Crew posts ------------------------------------------------------------------
drop policy if exists crew_circle_posts_permanent_accounts_only
  on public.crew_circle_posts;
create policy crew_circle_posts_permanent_accounts_only
on public.crew_circle_posts
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

revoke all on table public.crew_circle_posts from anon;
revoke all on table public.crew_circle_posts from authenticated;
grant select, insert, update, delete
  on table public.crew_circle_posts to authenticated;

revoke all on sequence public.crew_circle_posts_id_seq from anon, authenticated;
grant usage, select on sequence public.crew_circle_posts_id_seq to authenticated;

-- Parent community posts ------------------------------------------------------
-- Parent Circle is a parent/guardian community, not Teen Parent Bridge. Keep
-- its existing owner visibility while requiring the same verified-guardian
-- authority already used by Circle V2 parent_community posts.
drop policy if exists parent_circle_posts_permanent_accounts_only
  on public.parent_circle_posts;
create policy parent_circle_posts_permanent_accounts_only
on public.parent_circle_posts
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

drop policy if exists parent_circle_posts_verified_guardians_only
  on public.parent_circle_posts;
create policy parent_circle_posts_verified_guardians_only
on public.parent_circle_posts
as restrictive
for all
to authenticated
using (public.is_verified_guardian())
with check (public.is_verified_guardian());

revoke all on table public.parent_circle_posts from anon;
revoke all on table public.parent_circle_posts from authenticated;
grant select, insert, update, delete
  on table public.parent_circle_posts to authenticated;

-- Comments --------------------------------------------------------------------
-- The original cc_read policy allowed every authenticated account to read every
-- polymorphic comment row regardless of the source post audience. There is no
-- active database-backed comment reader in the app today, so fail closed to the
-- existing owner policy until an audience-aware comment RPC is implemented.
drop policy if exists cc_read on public.circle_comments;

drop policy if exists circle_comments_permanent_accounts_only
  on public.circle_comments;
create policy circle_comments_permanent_accounts_only
on public.circle_comments
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

revoke all on table public.circle_comments from anon;
revoke all on table public.circle_comments from authenticated;
grant select, insert, update, delete
  on table public.circle_comments to authenticated;

revoke all on sequence public.circle_comments_id_seq from anon, authenticated;
grant usage, select on sequence public.circle_comments_id_seq to authenticated;

-- Blocks ----------------------------------------------------------------------
drop policy if exists blocked_users_permanent_accounts_only
  on public.blocked_users;
create policy blocked_users_permanent_accounts_only
on public.blocked_users
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

revoke all on table public.blocked_users from anon;
revoke all on table public.blocked_users from authenticated;
grant select, insert, delete on table public.blocked_users to authenticated;

revoke all on sequence public.blocked_users_id_seq from anon, authenticated;
grant usage, select on sequence public.blocked_users_id_seq to authenticated;

-- Reports ---------------------------------------------------------------------
drop policy if exists reported_posts_permanent_accounts_only
  on public.reported_posts;
create policy reported_posts_permanent_accounts_only
on public.reported_posts
as restrictive
for all
to authenticated
using (public.is_non_anonymous_user())
with check (public.is_non_anonymous_user());

revoke all on table public.reported_posts from anon;
revoke all on table public.reported_posts from authenticated;
grant select, insert, delete on table public.reported_posts to authenticated;

revoke all on sequence public.reported_posts_id_seq from anon, authenticated;
grant usage, select on sequence public.reported_posts_id_seq to authenticated;

comment on policy friends_circle_posts_permanent_accounts_only on public.friends_circle_posts is
  'Restrictive permanent-account membrane layered over legacy Friends Circle audience policies.';
comment on policy crew_circle_posts_permanent_accounts_only on public.crew_circle_posts is
  'Restrictive permanent-account membrane layered over legacy Crew Circle audience policies.';
comment on policy parent_circle_posts_verified_guardians_only on public.parent_circle_posts is
  'Restricts the legacy parent community table to verified permanent guardian accounts.';
comment on policy circle_comments_permanent_accounts_only on public.circle_comments is
  'Prevents anonymous-authenticated sessions from using legacy Circle comments; cross-account reads remain fail-closed.';
comment on policy blocked_users_permanent_accounts_only on public.blocked_users is
  'Prevents anonymous-authenticated sessions from persisting block relationships.';
comment on policy reported_posts_permanent_accounts_only on public.reported_posts is
  'Prevents anonymous-authenticated sessions from persisting Circle reports.';

commit;
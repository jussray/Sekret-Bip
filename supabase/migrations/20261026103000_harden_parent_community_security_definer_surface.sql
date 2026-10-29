-- Parent Circle V2 — harden SECURITY DEFINER surface before production activation.
--
-- Main Bip remains the canonical shared backend owner.
-- This migration is append-only: it does not rewrite the already-merged V2
-- cutover migration. It moves RLS-only classifiers out of the exposed public
-- schema and pins every Parent Community SECURITY DEFINER RPC to an empty
-- search_path while preserving explicit schema qualification.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.is_parent_community_circle_id(p_circle_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.circles c
    where c.id = p_circle_id
      and c.kind = 'parent_community'::public.circle_kind
  );
$$;

create or replace function private.is_parent_community_post_id(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.posts p
    join public.circles c on c.id = p.circle_id
    where p.id = p_post_id
      and c.kind = 'parent_community'::public.circle_kind
  );
$$;

revoke all on function private.is_parent_community_circle_id(uuid)
  from public, anon, authenticated;
revoke all on function private.is_parent_community_post_id(uuid)
  from public, anon, authenticated;
grant execute on function private.is_parent_community_circle_id(uuid)
  to authenticated;
grant execute on function private.is_parent_community_post_id(uuid)
  to authenticated;

drop policy if exists parent_community_membership_rpc_only on public.circle_members;
create policy parent_community_membership_rpc_only
on public.circle_members
as restrictive
for all
to authenticated
using (not private.is_parent_community_circle_id(circle_id))
with check (not private.is_parent_community_circle_id(circle_id));

drop policy if exists parent_community_posts_rpc_only on public.posts;
create policy parent_community_posts_rpc_only
on public.posts
as restrictive
for all
to authenticated
using (not private.is_parent_community_post_id(id))
with check (not private.is_parent_community_circle_id(circle_id));

drop policy if exists parent_community_comments_rpc_only on public.post_comments;
create policy parent_community_comments_rpc_only
on public.post_comments
as restrictive
for all
to authenticated
using (not private.is_parent_community_post_id(post_id))
with check (not private.is_parent_community_post_id(post_id));

drop policy if exists parent_community_reactions_rpc_only on public.post_reactions;
create policy parent_community_reactions_rpc_only
on public.post_reactions
as restrictive
for all
to authenticated
using (not private.is_parent_community_post_id(post_id))
with check (not private.is_parent_community_post_id(post_id));

revoke all on function public.is_parent_community_circle_id(uuid)
  from public, anon, authenticated;
revoke all on function public.is_parent_community_post_id(uuid)
  from public, anon, authenticated;

drop function if exists public.is_parent_community_circle_id(uuid);
drop function if exists public.is_parent_community_post_id(uuid);

alter function public.get_parent_community_feed(integer)
  set search_path = '';
alter function public.create_parent_community_post(text, text)
  set search_path = '';
alter function public.react_to_parent_community_post(uuid, text)
  set search_path = '';
alter function public.reply_to_parent_community_post(uuid, text)
  set search_path = '';
alter function public.report_parent_community_post(uuid, text)
  set search_path = '';

comment on function private.is_parent_community_circle_id(uuid) is
  'Internal RLS-only classifier for Parent Community circle UUIDs. Not exposed through the Data API.';
comment on function private.is_parent_community_post_id(uuid) is
  'Internal RLS-only classifier for Parent Community post UUIDs. Not exposed through the Data API.';

commit;

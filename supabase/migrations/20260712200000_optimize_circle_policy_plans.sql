begin;

-- The original table already has a constraint-backed unique index on the same
-- reaction key. Drop the redundant copy introduced by the feature migration.
drop index if exists public.circle_reactions_unique_user_post;

-- Post ownership checks and account cleanup filter by user_id.
create index if not exists public_circle_posts_user_id_idx
  on public.public_circle_posts (user_id);

-- Cache auth.jwt() once per statement so RLS does not re-evaluate it per row.
drop policy if exists circle_profiles_owner_select on public.circle_profiles;
create policy circle_profiles_owner_select
on public.circle_profiles
for select
to authenticated
using (
  (select auth.uid()) = user_id
  and coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists public_circle_posts_permanent_insert on public.public_circle_posts;
create policy public_circle_posts_permanent_insert
on public.public_circle_posts
as restrictive
for insert
to authenticated
with check (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists public_circle_posts_permanent_delete on public.public_circle_posts;
create policy public_circle_posts_permanent_delete
on public.public_circle_posts
as restrictive
for delete
to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

drop policy if exists circle_reactions_permanent_accounts_only on public.circle_reactions;
create policy circle_reactions_permanent_accounts_only
on public.circle_reactions
as restrictive
for all
to authenticated
using (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
)
with check (
  coalesce(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) is false
);

commit;

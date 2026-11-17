-- Social, Circle, Crew and parent surfaces are permanent-account only.
--
-- The app creates an anonymous Supabase session on first launch. Private self
-- data already rejects anonymous sessions (is_non_anonymous_user), and
-- circle_reactions carries a RESTRICTIVE permanent-accounts-only policy. The
-- tables below still admitted anonymous sessions through their permissive
-- owner/relationship policies, so an account-less session could create
-- friendships, Crew/Circle membership, posts, comments, encouragements and
-- parent-surface rows that reach other users.
--
-- This migration adds one RESTRICTIVE policy per table, mirroring
-- circle_reactions_permanent_accounts_only. Restrictive policies AND with the
-- existing permissive ones, so every current owner/relationship rule is kept
-- unchanged and only anonymous sessions lose access. No grants, permissive
-- policies, or data change.
--
-- Rollback: drop policy if exists <table>_permanent_accounts_only on public.<table>;

begin;

do $$
declare
  t text;
begin
  foreach t in array array[
    'friendships',
    'circles',
    'circle_members',
    'circle_posts',
    'posts',
    'post_comments',
    'post_reactions',
    'crews',
    'crew_check_ins',
    'crew_check_in_shares',
    'crew_encouragements',
    'scrapbook_entries',
    'parent_mood_summaries',
    'parent_notes'
  ]
  loop
    if to_regclass('public.' || t) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_permanent_accounts_only', t);
      execute format(
        'create policy %I on public.%I as restrictive for all to authenticated '
        || 'using (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean, false) is false) '
        || 'with check (coalesce(((select auth.jwt()) ->> ''is_anonymous'')::boolean, false) is false)',
        t || '_permanent_accounts_only', t
      );
    end if;
  end loop;
end
$$;

commit;

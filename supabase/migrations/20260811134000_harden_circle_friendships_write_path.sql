begin;

-- `0002_circle_v1.sql` historically created one ALL policy for
-- circle_friendships. Because friends-only reads trust accepted friendship rows,
-- allowing either side to insert/update that table lets a client forge an
-- accepted relationship and widen read access.
--
-- Production currently has no circle_friendships table, so keep this migration
-- conditional. Legacy environments that do have the table are moved to a
-- fail-closed state: clients retain read access only to their own friendship
-- rows, direct friendship DML is revoked, and dependent cross-user friend-read
-- policies are removed until a separately verified server-side acceptance path
-- can re-establish trusted authorization.
do $$
begin
  if to_regclass('public.circle_friendships') is null then
    return;
  end if;

  execute 'drop policy if exists "cf_self" on public.circle_friendships';

  execute $policy$
    create policy "cf_self"
    on public.circle_friendships
    for select
    to authenticated
    using (
      public.is_non_anonymous_user()
      and (auth.uid() = user_id or auth.uid() = friend_id)
    )
  $policy$;

  execute 'revoke insert, update, delete on table public.circle_friendships from anon, authenticated';
  execute 'grant select on table public.circle_friendships to authenticated';

  -- Existing accepted rows cannot be proven trustworthy because the legacy ALL
  -- policy allowed clients to forge them. Do not preserve those rows as an
  -- authorization source. Removing the dependent read policies quarantines the
  -- legacy friendship graph without destructively rewriting relationship data.
  if to_regclass('public.circle_profiles') is not null then
    execute 'drop policy if exists "circle_profiles_friends_read" on public.circle_profiles';
  end if;

  if to_regclass('public.friends_circle_posts') is not null then
    execute 'drop policy if exists "fcp_friends_read" on public.friends_circle_posts';
  end if;
end
$$;

commit;

-- Keep repository migration truth aligned with the live Supabase hardening applied on 2026-08-16.
-- Direct push-token table access must match the hardened claim/disable RPCs: permanent authenticated users only.

alter policy push_tokens_select_own
  on public.push_tokens
  to authenticated
  using (
    public.is_non_anonymous_user()
    and (select auth.uid()) = user_id
  );

alter policy push_tokens_insert_own
  on public.push_tokens
  to authenticated
  with check (
    public.is_non_anonymous_user()
    and (select auth.uid()) = user_id
  );

alter policy push_tokens_update_own
  on public.push_tokens
  to authenticated
  using (
    public.is_non_anonymous_user()
    and (select auth.uid()) = user_id
  )
  with check (
    public.is_non_anonymous_user()
    and (select auth.uid()) = user_id
  );

alter policy push_tokens_delete_own
  on public.push_tokens
  to authenticated
  using (
    public.is_non_anonymous_user()
    and (select auth.uid()) = user_id
  );

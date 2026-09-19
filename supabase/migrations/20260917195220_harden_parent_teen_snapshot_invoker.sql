-- Parent snapshot is a privacy boundary, not a convenience view.
-- PostgreSQL views execute with definer rights unless SECURITY INVOKER is set,
-- which can bypass RLS on teen_activity_summary. Keep browser access read-only,
-- require a permanent account, and let the underlying RLS decide which row is visible.

alter view public.parent_teen_activity_snapshot set (security_invoker = true);

revoke all on public.parent_teen_activity_snapshot from anon;
revoke all on public.parent_teen_activity_snapshot from authenticated;
grant select on public.parent_teen_activity_snapshot to authenticated;

alter policy "teen_activity_summary: teen all"
  on public.teen_activity_summary
  using (public.is_non_anonymous_user() and auth.uid() = user_id)
  with check (public.is_non_anonymous_user() and auth.uid() = user_id);

alter policy "teen_activity_summary: parent read"
  on public.teen_activity_summary
  using (
    public.is_non_anonymous_user()
    and exists (
      select 1
      from public.parent_links pl
      where pl.parent_user_id = auth.uid()
        and pl.teen_user_id = teen_activity_summary.user_id
        and pl.status = 'active'
    )
  );

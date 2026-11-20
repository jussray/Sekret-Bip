begin;

-- can_manage_guardian_reviews is an internal authorization predicate used by
-- founder/admin SECURITY DEFINER RPCs. Mobile clients do not call it directly,
-- so authenticated users should not receive EXECUTE merely to evaluate a bool.
revoke all on function public.can_manage_guardian_reviews()
  from public, anon, authenticated;

grant execute on function public.can_manage_guardian_reviews()
  to service_role;

comment on function public.can_manage_guardian_reviews() is
  'Internal guardian-review authorization predicate. Direct client execution is denied; founder/admin review RPCs invoke it through their postgres-owned SECURITY DEFINER context.';

commit;

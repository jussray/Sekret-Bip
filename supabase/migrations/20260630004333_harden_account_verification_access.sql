revoke execute on function public.initialize_account_verification() from public, anon, authenticated;
grant execute on function public.initialize_account_verification() to service_role;

drop policy if exists "account_verification_select_own"
on public.account_verification;

create policy "account_verification_select_own"
on public.account_verification
for select
to authenticated
using (
  auth.uid() = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

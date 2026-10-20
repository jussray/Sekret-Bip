begin;

create or replace function public.create_parent_link_invite()
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_code text;
begin
  if v_user_id is null then
    raise exception 'authentication required';
  end if;

  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  update public.parent_links
  set status = 'revoked', updated_at = now()
  where teen_user_id = v_user_id and status = 'pending';

  insert into public.parent_links (
    teen_user_id,
    invite_code,
    status,
    is_active,
    expires_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_code,
    'pending',
    true,
    now() + interval '48 hours',
    now(),
    now()
  );

  insert into public.account_verification (
    user_id,
    verification_state,
    parent_link_state,
    verification_reason,
    verification_updated_at
  ) values (
    v_user_id,
    'PENDING_PARENT',
    'pending',
    'parent_invite_created',
    now()
  )
  on conflict (user_id) do update
  set verification_state = 'PENDING_PARENT',
      parent_link_state = 'pending',
      verification_reason = 'parent_invite_created',
      verification_updated_at = now();

  return v_code;
end;
$$;

revoke execute on function public.create_parent_link_invite() from public, anon;
grant execute on function public.create_parent_link_invite() to authenticated;

commit;

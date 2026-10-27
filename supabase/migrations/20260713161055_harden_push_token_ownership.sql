begin;

-- Token validation mirrors Expo.isExpoPushToken: either an Expo/Exponent wrapper
-- or the UUID-shaped form accepted by the current Expo server SDK.
create or replace function public.claim_push_token(
  p_expo_push_token text,
  p_platform text,
  p_app_variant text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := btrim(p_expo_push_token);
  v_profile_side text;
  v_effective_variant text;
  v_claimed_user_id uuid;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_token is null
     or not (
       (
         (
           v_token like 'ExponentPushToken[%]'
           or v_token like 'ExpoPushToken[%]'
         )
         and right(v_token, 1) = ']'
       )
       or v_token ~* '^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$'
     ) then
    raise exception 'invalid expo push token' using errcode = '22023';
  end if;

  if p_platform not in ('ios', 'android') then
    raise exception 'invalid platform' using errcode = '22023';
  end if;

  if p_app_variant not in ('teen', 'parent') then
    raise exception 'invalid app variant' using errcode = '22023';
  end if;

  -- Once account setup has chosen a side, that server-owned profile wins over
  -- caller metadata. Before profile completion, retain the binary-supplied side
  -- so notification registration can still happen during onboarding.
  select account_side into v_profile_side
  from public.app_profiles
  where user_id = v_user_id
    and account_side in ('teen', 'parent');

  v_effective_variant := coalesce(v_profile_side, p_app_variant);

  -- Same-owner refresh is allowed. Cross-user handoff is allowed only after the
  -- current owner disables the token during sign-out. The conflict predicate is
  -- atomic, so an enabled token cannot silently migrate between active accounts.
  insert into public.push_tokens (
    user_id,
    expo_push_token,
    platform,
    app_variant,
    enabled,
    last_seen_at
  ) values (
    v_user_id,
    v_token,
    p_platform,
    v_effective_variant,
    true,
    now()
  )
  on conflict (expo_push_token) do update
  set user_id = excluded.user_id,
      platform = excluded.platform,
      app_variant = excluded.app_variant,
      enabled = true,
      last_seen_at = now()
  where public.push_tokens.user_id = excluded.user_id
     or public.push_tokens.enabled = false
  returning user_id into v_claimed_user_id;

  if not found then
    raise exception 'push token is already claimed by another active account'
      using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.claim_push_token(text, text, text)
  from public, anon;
grant execute on function public.claim_push_token(text, text, text)
  to authenticated, service_role;

comment on function public.claim_push_token(text, text, text) is
  'Claims an Expo push token for a permanent account. Completed account profile side overrides caller metadata; enabled cross-user transfer is denied, while disabled-token handoff supports explicit sign-out and account switching.';

create or replace function public.disable_push_token(
  p_expo_push_token text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid := auth.uid();
  v_token text := btrim(p_expo_push_token);
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_token is null
     or not (
       (
         (
           v_token like 'ExponentPushToken[%]'
           or v_token like 'ExpoPushToken[%]'
         )
         and right(v_token, 1) = ']'
       )
       or v_token ~* '^[a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12}$'
     ) then
    raise exception 'invalid expo push token' using errcode = '22023';
  end if;

  update public.push_tokens
  set enabled = false,
      last_seen_at = now()
  where expo_push_token = v_token
    and user_id = v_user_id;
end;
$$;

revoke all on function public.disable_push_token(text)
  from public, anon;
grant execute on function public.disable_push_token(text)
  to authenticated, service_role;

comment on function public.disable_push_token(text) is
  'Idempotently disables only the authenticated account owner push token. Disabled tokens may later be claimed by another permanent account on the same signed-out device.';

commit;

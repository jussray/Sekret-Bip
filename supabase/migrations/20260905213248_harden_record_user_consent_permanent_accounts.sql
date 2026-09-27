create or replace function public.record_user_consent(
  p_category text,
  p_granted boolean,
  p_version text default '1.0.0'::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_timestamp timestamptz := now();
  v_action text;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_authentication_required' using errcode = '42501';
  end if;

  if p_category not in ('notifications','moodTracking','journaling','aiChat','analytics','privacyPolicy','termsOfService') then
    raise exception 'invalid_consent_category' using errcode = '22023';
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;

  v_action := case when p_granted then 'grant' else 'revoke' end;

  insert into public.user_consents as current_state (user_id, category, granted, timestamp, version)
  values (v_user_id, p_category, p_granted, v_timestamp, p_version)
  on conflict (user_id, category) do update
    set granted = excluded.granted,
        timestamp = excluded.timestamp,
        version = excluded.version;

  insert into public.consent_audit_log (user_id, category, action, granted, timestamp, version)
  values (v_user_id, p_category, v_action, p_granted, v_timestamp, p_version);

  return jsonb_build_object(
    'category', p_category,
    'granted', p_granted,
    'timestamp', v_timestamp,
    'version', p_version
  );
end;
$function$;

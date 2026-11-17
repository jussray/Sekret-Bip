begin;

-- Consent is recorded only after the auth gate. Supabase anonymous-authenticated
-- sessions also receive auth.uid(), so mirror the client onboarding boundary at
-- the database layer before persisting durable consent/audit rows.

drop policy if exists "Users read own consents" on public.user_consents;
create policy "Users read own consents"
on public.user_consents
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

drop policy if exists "Users read own audit log" on public.consent_audit_log;
create policy "Users read own audit log"
on public.consent_audit_log
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and (select auth.uid()) = user_id
);

create or replace function public.record_user_consent(
  p_category text,
  p_granted boolean,
  p_version text default '1.0.0'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_timestamp timestamptz := now();
  v_action text;
begin
  if v_user_id is null then
    raise exception 'authentication_required' using errcode = '42501';
  end if;

  if not public.is_non_anonymous_user() then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_category not in (
    'notifications',
    'moodTracking',
    'journaling',
    'aiChat',
    'analytics',
    'privacyPolicy',
    'termsOfService'
  ) then
    raise exception 'invalid_consent_category' using errcode = '22023';
  end if;

  if coalesce(btrim(p_version), '') = '' then
    raise exception 'invalid_consent_version' using errcode = '22023';
  end if;

  v_action := case when p_granted then 'grant' else 'revoke' end;

  insert into public.user_consents as current_state (
    user_id,
    category,
    granted,
    timestamp,
    version
  ) values (
    v_user_id,
    p_category,
    p_granted,
    v_timestamp,
    p_version
  )
  on conflict (user_id, category) do update
    set granted = excluded.granted,
        timestamp = excluded.timestamp,
        version = excluded.version;

  insert into public.consent_audit_log (
    user_id,
    category,
    action,
    granted,
    timestamp,
    version
  ) values (
    v_user_id,
    p_category,
    v_action,
    p_granted,
    v_timestamp,
    p_version
  );

  return jsonb_build_object(
    'category', p_category,
    'granted', p_granted,
    'timestamp', v_timestamp,
    'version', p_version
  );
end;
$$;

revoke all on function public.record_user_consent(text,boolean,text) from public, anon;
grant execute on function public.record_user_consent(text,boolean,text) to authenticated;

comment on function public.record_user_consent(text,boolean,text) is
  'Permanent-account-only consent writer. Atomically updates current consent and appends the owner audit entry.';

commit;
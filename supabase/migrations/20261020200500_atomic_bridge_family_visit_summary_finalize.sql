begin;

-- Freeze both Family Visit audience summaries and the exact evidence version in
-- one database transaction. Only the service-role Worker may execute this RPC.
-- This prevents concurrent generation requests from overwriting a summary pair
-- after another request has already frozen the session.
create or replace function public.finalize_bridge_family_visit_summaries(
  p_session_id uuid,
  p_expected_updated_at timestamptz,
  p_parent_content jsonb,
  p_parent_limitations text,
  p_professional_content jsonb,
  p_professional_limitations text,
  p_prompt_version text,
  p_model text default null,
  p_used_fallback boolean default false
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
declare
  v_session public.bridge_family_visit_sessions%rowtype;
  v_assignment public.bridge_case_assignments%rowtype;
  v_generated_at timestamptz := clock_timestamp();
  v_reflection_roles integer;
begin
  if p_session_id is null
     or p_expected_updated_at is null
     or p_parent_content is null
     or jsonb_typeof(p_parent_content) <> 'object'
     or p_professional_content is null
     or jsonb_typeof(p_professional_content) <> 'object'
     or nullif(btrim(p_parent_limitations), '') is null
     or char_length(p_parent_limitations) > 2000
     or nullif(btrim(p_professional_limitations), '') is null
     or char_length(p_professional_limitations) > 2000
     or nullif(btrim(p_prompt_version), '') is null
     or char_length(p_prompt_version) > 120
     or (p_model is not null and char_length(p_model) > 200)
     or octet_length(p_parent_content::text) > 65536
     or octet_length(p_professional_content::text) > 65536 then
    raise exception 'invalid family visit summary payload' using errcode = '22023';
  end if;

  select * into v_session
  from public.bridge_family_visit_sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'family visit session not found' using errcode = 'P0002';
  end if;

  select * into v_assignment
  from public.bridge_case_assignments
  where id = v_session.assignment_id;

  -- Authority is rechecked even when another generation request has already
  -- frozen the pair. A revoked/expired professional must not receive a stale
  -- success receipt merely because the content itself is already immutable.
  if not found
     or v_assignment.status <> 'active'
     or (v_assignment.expires_at is not null and v_assignment.expires_at <= now())
     or not exists (
       select 1
       from public.bridge_professional_profiles pp
       where pp.user_id = v_assignment.professional_user_id
         and pp.verification_status = 'verified'
     ) then
    return 'authority_changed';
  end if;

  -- Another valid request may have completed while this request was generating.
  -- Never overwrite the frozen pair in that case.
  if v_session.state = 'ready' then
    return 'already_ready';
  end if;

  if v_session.state <> 'reflection'
     or v_session.updated_at is distinct from p_expected_updated_at then
    return 'evidence_changed';
  end if;

  if v_session.capture_mode <> 'none'
     or v_session.teen_acknowledged_at is null
     or v_session.parent_acknowledged_at is null
     or v_session.professional_acknowledged_at is null then
    return 'session_invalid';
  end if;

  select count(distinct actor_role)
    into v_reflection_roles
  from public.bridge_family_visit_reflections
  where session_id = p_session_id
    and actor_role in ('teen', 'parent', 'professional');

  if v_reflection_roles <> 3 then
    return 'reflections_incomplete';
  end if;

  insert into public.bridge_family_visit_summaries (
    session_id, audience, content, limitations, prompt_version, model,
    used_fallback, generated_at, updated_at
  ) values (
    p_session_id, 'parent', p_parent_content, btrim(p_parent_limitations),
    btrim(p_prompt_version), p_model, p_used_fallback, v_generated_at, v_generated_at
  )
  on conflict (session_id, audience) do update
  set content = excluded.content,
      limitations = excluded.limitations,
      prompt_version = excluded.prompt_version,
      model = excluded.model,
      used_fallback = excluded.used_fallback,
      generated_at = excluded.generated_at,
      updated_at = excluded.updated_at;

  insert into public.bridge_family_visit_summaries (
    session_id, audience, content, limitations, prompt_version, model,
    used_fallback, generated_at, updated_at
  ) values (
    p_session_id, 'professional', p_professional_content, btrim(p_professional_limitations),
    btrim(p_prompt_version), p_model, p_used_fallback, v_generated_at, v_generated_at
  )
  on conflict (session_id, audience) do update
  set content = excluded.content,
      limitations = excluded.limitations,
      prompt_version = excluded.prompt_version,
      model = excluded.model,
      used_fallback = excluded.used_fallback,
      generated_at = excluded.generated_at,
      updated_at = excluded.updated_at;

  update public.bridge_family_visit_sessions
  set state = 'ready', updated_at = v_generated_at
  where id = p_session_id;

  return 'ready';
end;
$$;

revoke all on function public.finalize_bridge_family_visit_summaries(
  uuid,timestamptz,jsonb,text,jsonb,text,text,text,boolean
) from public, anon, authenticated;
grant execute on function public.finalize_bridge_family_visit_summaries(
  uuid,timestamptz,jsonb,text,jsonb,text,text,text,boolean
) to service_role;

comment on function public.finalize_bridge_family_visit_summaries(
  uuid,timestamptz,jsonb,text,jsonb,text,text,text,boolean
) is 'Service-role-only atomic freeze of both Family Visit audience summaries for one unchanged evidence version.';

commit;

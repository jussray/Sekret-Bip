create or replace function public.log_control_room_runtime_event(
  p_user_id uuid,
  p_event_type text,
  p_screen text,
  p_severity text,
  p_message text,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_event_id uuid;
  v_auth_user uuid := auth.uid();
  v_role text := coalesce(current_setting('request.jwt.claim.role', true), '');
  v_effective_user uuid;
  v_metadata jsonb;
begin
  if v_role = 'service_role' then
    v_effective_user := p_user_id;
  else
    if v_auth_user is null then
      raise exception 'authentication required' using errcode = '42501';
    end if;

    if p_user_id is not null and p_user_id <> v_auth_user then
      raise exception 'cannot log events for another user' using errcode = '42501';
    end if;

    v_effective_user := v_auth_user;
  end if;

  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'event_type is required' using errcode = '22023';
  end if;

  if p_severity not in ('critical', 'error', 'warning', 'info') then
    raise exception 'invalid severity' using errcode = '22023';
  end if;

  v_metadata := coalesce(p_metadata, '{}'::jsonb)
    - 'journalText'
    - 'journal_text'
    - 'rawAudio'
    - 'raw_audio'
    - 'audioBlob'
    - 'audio_blob'
    - 'token'
    - 'access_token'
    - 'refresh_token'
    - 'apiKey'
    - 'api_key'
    - 'authorization'
    - 'conversation'
    - 'conversationText'
    - 'conversation_text'
    - 'transcript'
    - 'fullTranscript'
    - 'full_transcript'
    - 'messageText'
    - 'message_text'
    - 'content'
    - 'payload';

  insert into public.audit_events (
    user_id,
    event_type,
    screen,
    severity,
    message,
    metadata
  ) values (
    v_effective_user,
    btrim(p_event_type),
    nullif(btrim(p_screen), ''),
    p_severity,
    left(p_message, 500),
    v_metadata
  )
  returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.log_control_room_runtime_event(uuid, text, text, text, text, jsonb) from public;
revoke all on function public.log_control_room_runtime_event(uuid, text, text, text, text, jsonb) from anon;
grant execute on function public.log_control_room_runtime_event(uuid, text, text, text, text, jsonb) to authenticated;
grant execute on function public.log_control_room_runtime_event(uuid, text, text, text, text, jsonb) to service_role;

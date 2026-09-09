-- Se’kret Bip voice runtime foundation proof harness
--
-- Preconditions:
--   * Run only after 20260717034535_create_voice_runtime_foundation is applied.
--   * Use an administrator connection that can insert temporary auth.users rows
--     and SET LOCAL ROLE.
--
-- Safety:
--   * Synthetic users and metadata only.
--   * No raw audio, transcripts, prompts, replies, or private messages.
--   * Entire probe runs inside one transaction.
--   * Final statement is ROLLBACK, never COMMIT.

begin;

create temp table voice_probe_ids (
  label text primary key,
  user_id uuid not null
) on commit drop;

insert into voice_probe_ids(label, user_id)
values
  ('user_a', gen_random_uuid()),
  ('user_b', gen_random_uuid());

grant select on voice_probe_ids to authenticated;

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
select
  null,
  user_id,
  'authenticated',
  'authenticated',
  label || '.voice-probe@sekret.invalid',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
from voice_probe_ids;

create temp table voice_probe_sessions (
  label text primary key,
  session_id uuid not null,
  turn_id uuid not null
) on commit drop;

grant select on voice_probe_sessions to authenticated;

with inserted as (
  insert into public.voice_sessions (
    user_id,
    client_session_id,
    companion_id,
    surface,
    status,
    transport,
    region
  )
  select
    user_id,
    gen_random_uuid(),
    case label when 'user_a' then 'raylene' else 'rylane' end,
    'voice_bip',
    'active',
    'websocket',
    'test'
  from voice_probe_ids
  returning id, user_id
), turns as (
  insert into public.voice_turns (
    session_id,
    turn_index,
    speaker,
    end_reason,
    language,
    transcript_chars,
    audio_duration_ms,
    ended_at
  )
  select
    inserted.id,
    0,
    'user',
    'silence',
    'en',
    12,
    800,
    now()
  from inserted
  returning id, session_id
)
insert into voice_probe_sessions(label, session_id, turn_id)
select ids.label, inserted.id, turns.id
from inserted
join voice_probe_ids ids on ids.user_id = inserted.user_id
join turns on turns.session_id = inserted.id;

insert into public.voice_events (
  session_id,
  turn_id,
  event_type,
  payload,
  client_ts
)
select
  session_id,
  turn_id,
  'speech_end',
  jsonb_build_object('silence_ms', 450, 'network_state', 'ok'),
  now()
from voice_probe_sessions;

insert into public.voice_latency_metrics (
  session_id,
  turn_id,
  vad_open_ms,
  stt_first_token_ms,
  llm_first_token_ms,
  tts_first_byte_ms,
  playback_start_ms,
  total_ms
)
select
  session_id,
  turn_id,
  40,
  130,
  240,
  330,
  410,
  620
from voice_probe_sessions;

create temp table voice_probe_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on voice_probe_results to authenticated;

insert into voice_probe_results values
  (
    'anon_has_no_table_privileges',
    not has_table_privilege('anon', 'public.voice_sessions', 'SELECT')
      and not has_table_privilege('anon', 'public.voice_turns', 'SELECT')
      and not has_table_privilege('anon', 'public.voice_events', 'SELECT')
      and not has_table_privilege('anon', 'public.voice_latency_metrics', 'SELECT'),
    'anon has no SELECT grant on any voice runtime telemetry table'
  ),
  (
    'authenticated_has_no_write_privileges',
    not has_table_privilege('authenticated', 'public.voice_sessions', 'INSERT')
      and not has_table_privilege('authenticated', 'public.voice_sessions', 'UPDATE')
      and not has_table_privilege('authenticated', 'public.voice_turns', 'INSERT')
      and not has_table_privilege('authenticated', 'public.voice_events', 'INSERT')
      and not has_table_privilege('authenticated', 'public.voice_latency_metrics', 'INSERT'),
    'authenticated clients cannot directly forge telemetry writes'
  ),
  (
    'authenticated_has_owner_read_and_session_delete_grants',
    has_table_privilege('authenticated', 'public.voice_sessions', 'SELECT')
      and has_table_privilege('authenticated', 'public.voice_sessions', 'DELETE')
      and has_table_privilege('authenticated', 'public.voice_turns', 'SELECT')
      and has_table_privilege('authenticated', 'public.voice_events', 'SELECT')
      and has_table_privilege('authenticated', 'public.voice_latency_metrics', 'SELECT'),
    'authenticated role has only the intended owner-facing operations'
  ),
  (
    'voice_event_sequence_is_server_only',
    not has_sequence_privilege('anon', 'public.voice_events_id_seq', 'USAGE')
      and not has_sequence_privilege('authenticated', 'public.voice_events_id_seq', 'USAGE')
      and has_sequence_privilege('service_role', 'public.voice_events_id_seq', 'USAGE'),
    'only service_role can allocate voice event identity values'
  ),
  (
    'payload_validator_is_server_only',
    not has_function_privilege('anon', 'public.voice_event_payload_is_safe(jsonb)', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.voice_event_payload_is_safe(jsonb)', 'EXECUTE')
      and has_function_privilege('service_role', 'public.voice_event_payload_is_safe(jsonb)', 'EXECUTE'),
    'only service_role can invoke the telemetry payload validator directly'
  );

-- Prove a human-readable value cannot enter the opaque UUID correlation column.
do $$
declare
  v_user_id uuid;
begin
  select user_id
  into v_user_id
  from voice_probe_ids
  where label = 'user_b';

  begin
    insert into public.voice_sessions (
      user_id,
      client_session_id,
      companion_id,
      surface,
      status,
      transport,
      region
    ) values (
      v_user_id,
      'user@example.com',
      'rylane',
      'voice_bip',
      'active',
      'http',
      'test'
    );

    insert into voice_probe_results values (
      'non_opaque_client_session_id_rejected',
      false,
      'A human-readable identifier unexpectedly entered the UUID column'
    );
  exception
    when invalid_text_representation then
      insert into voice_probe_results values (
        'non_opaque_client_session_id_rejected',
        true,
        'The UUID column rejected a human-readable identifier before storage'
      );
  end;
end;
$$;

-- Prove nested raw-content-shaped payloads fail closed.
do $$
declare
  v_session_id uuid;
  v_turn_id uuid;
begin
  select session_id, turn_id
  into v_session_id, v_turn_id
  from voice_probe_sessions
  where label = 'user_b';

  begin
    insert into public.voice_events (
      session_id,
      turn_id,
      event_type,
      payload
    ) values (
      v_session_id,
      v_turn_id,
      'stt_final',
      '{"nested":{"transcript":"synthetic forbidden content"}}'::jsonb
    );

    insert into voice_probe_results values (
      'raw_payload_rejected',
      false,
      'Nested transcript metadata unexpectedly passed the allowlist'
    );
  exception
    when check_violation then
      insert into voice_probe_results values (
        'raw_payload_rejected',
        true,
        'Nested transcript-shaped data was rejected by voice_events_payload_safe'
      );
  end;
end;
$$;

-- Prove an unlisted key cannot smuggle free-form private content.
do $$
declare
  v_session_id uuid;
  v_turn_id uuid;
begin
  select session_id, turn_id
  into v_session_id, v_turn_id
  from voice_probe_sessions
  where label = 'user_b';

  begin
    insert into public.voice_events (
      session_id,
      turn_id,
      event_type,
      payload
    ) values (
      v_session_id,
      v_turn_id,
      'session_failed',
      '{"diagnostic":"synthetic private sentence"}'::jsonb
    );

    insert into voice_probe_results values (
      'unknown_payload_key_rejected',
      false,
      'An unlisted free-form diagnostic key unexpectedly passed the allowlist'
    );
  exception
    when check_violation then
      insert into voice_probe_results values (
        'unknown_payload_key_rejected',
        true,
        'An unlisted diagnostic key was rejected by voice_events_payload_safe'
      );
  end;
end;
$$;

-- Permanent User A can read only their own metadata.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from voice_probe_ids where label = 'user_a'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from voice_probe_ids where label = 'user_a'),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

insert into voice_probe_results
select
  'owner_reads_own_metadata',
  count(*) = 4,
  'User A can read one session, turn, event, and latency row'
from (
  select 1
  from public.voice_sessions
  where id = (select session_id from voice_probe_sessions where label = 'user_a')
  union all
  select 1
  from public.voice_turns
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
  union all
  select 1
  from public.voice_events
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
  union all
  select 1
  from public.voice_latency_metrics
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
) own_rows;

insert into voice_probe_results
select
  'cross_user_reads_denied',
  count(*) = 0,
  'User A cannot read User B session, turn, event, or latency rows'
from (
  select 1
  from public.voice_sessions
  where id = (select session_id from voice_probe_sessions where label = 'user_b')
  union all
  select 1
  from public.voice_turns
  where session_id = (select session_id from voice_probe_sessions where label = 'user_b')
  union all
  select 1
  from public.voice_events
  where session_id = (select session_id from voice_probe_sessions where label = 'user_b')
  union all
  select 1
  from public.voice_latency_metrics
  where session_id = (select session_id from voice_probe_sessions where label = 'user_b')
) cross_rows;

with deleted as (
  delete from public.voice_sessions
  where id = (select session_id from voice_probe_sessions where label = 'user_a')
  returning id
)
insert into voice_probe_results
select
  'owner_deletes_own_session',
  count(*) = 1,
  'User A can delete exactly their own top-level session'
from deleted;

reset role;

insert into voice_probe_results
select
  'owner_delete_cascades',
  count(*) = 0,
  'Deleting User A session removes its turns, events, and latency rows'
from (
  select 1
  from public.voice_turns
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
  union all
  select 1
  from public.voice_events
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
  union all
  select 1
  from public.voice_latency_metrics
  where session_id = (select session_id from voice_probe_sessions where label = 'user_a')
) remaining_children;

-- Supabase anonymous-authenticated User B must fail the permanent-account predicate.
select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from voice_probe_ids where label = 'user_b'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select user_id::text from voice_probe_ids where label = 'user_b'),
    'role', 'authenticated',
    'is_anonymous', true
  )::text,
  true
);
set local role authenticated;

insert into voice_probe_results
select
  'anonymous_authenticated_reads_denied',
  count(*) = 0,
  'Anonymous-authenticated User B cannot read its otherwise-owned session'
from public.voice_sessions
where id = (select session_id from voice_probe_sessions where label = 'user_b');

with attempted as (
  delete from public.voice_sessions
  where id = (select session_id from voice_probe_sessions where label = 'user_b')
  returning id
)
insert into voice_probe_results
select
  'anonymous_authenticated_delete_denied',
  count(*) = 0,
  'Anonymous-authenticated User B cannot delete its otherwise-owned session'
from attempted;

reset role;

select check_name, passed, detail
from voice_probe_results
order by check_name;

rollback;

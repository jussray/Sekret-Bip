-- Humane retention contracts for teen users.
-- Product value may create return. Absence, broken streaks, and public status may not.

begin;

alter table public.bridge_signals
  add column if not exists response_preference text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bridge_signals_response_preference_check'
      and conrelid = 'public.bridge_signals'::regclass
  ) then
    alter table public.bridge_signals
      add constraint bridge_signals_response_preference_check
      check (
        response_preference is null
        or response_preference in ('listen', 'comfort', 'help_plan', 'check_later', 'give_space')
      );
  end if;
end
$$;

create index if not exists bip_events_user_occurred_at_idx
  on public.bip_events (user_id, occurred_at desc);

create unique index if not exists bip_events_bridge_signal_once_idx
  on public.bip_events (user_id, event_type, ((meta ->> 'sourceId')))
  where event_type = 'bridge_shared' and (meta ->> 'sourceId') is not null;

-- Inactivity deductions conflict with the product promise. Keep the RPC as a
-- compatibility no-op so older clients cannot subtract points after time away.
create or replace function public.apply_inactivity_point_adjustment()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  return jsonb_build_object(
    'adjusted', 0,
    'days_away', 0,
    'reason', 'disabled_no_guilt_retention'
  );
end;
$$;

revoke all on function public.apply_inactivity_point_adjustment() from public, anon;
grant execute on function public.apply_inactivity_point_adjustment() to authenticated;

-- Award points for value-producing actions, never for preserving a streak.
create or replace function public.handle_bip_event_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer;
begin
  v_points := case new.event_type
    when 'mood_logged' then 2
    when 'journal_saved' then 5
    when 'voice_completed' then 5
    when 'circle_post' then 4
    when 'comfort_completed' then 3
    when 'breathe_completed' then 3
    when 'crew_checkin' then 6
    when 'goal_completed' then 4
    when 'bridge_shared' then 5
    when 'bippin2_step_completed' then 4
    else 0
  end;

  if v_points = 0 then
    return new;
  end if;

  if not exists (
    select 1
    from public.point_transactions
    where user_id = new.user_id
      and source_type = 'app_action'
      and source_id = new.id::text
  ) then
    insert into public.point_transactions (
      user_id, event_type, points, amount, reason,
      transaction_type, source_type, source_id,
      occurred_at, bip_event_id
    ) values (
      new.user_id, new.event_type, v_points, v_points,
      'Bip app activity', 'earn', 'app_action',
      new.id::text, new.occurred_at, new.id
    );
  end if;

  return new;
end;
$$;

-- Bridge is a meaningful connection action. Record metadata only; message
-- content never enters the activity ledger.
create or replace function public.record_bridge_signal_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.bip_events (user_id, event_type, occurred_at, meta)
  values (
    new.teen_user_id,
    'bridge_shared',
    coalesce(new.sent_at, new.created_at, now()),
    jsonb_strip_nulls(jsonb_build_object(
      'sourceId', new.id::text,
      'category', 'connect',
      'route', 'bridge',
      'receiptKey', 'bridge_shared',
      'responsePreference', new.response_preference
    ))
  )
  on conflict do nothing;

  return new;
end;
$$;

drop trigger if exists bridge_signals_record_meaningful_activity on public.bridge_signals;
create trigger bridge_signals_record_meaningful_activity
after insert on public.bridge_signals
for each row execute function public.record_bridge_signal_activity();

-- Cross-device retention summary. It returns safe event metadata only, never
-- journal text, voice transcripts, Circle content, or Bridge message content.
create or replace function public.get_meaningful_return_snapshot()
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null or coalesce(auth.jwt() ->> 'is_anonymous', 'false') = 'true' then
    raise exception 'permanent account required';
  end if;

  with meaningful as (
    select event_type, occurred_at, meta
    from public.bip_events
    where user_id = v_user
      and event_type in (
        'mood_logged',
        'journal_saved',
        'voice_completed',
        'comfort_completed',
        'breathe_completed',
        'crew_checkin',
        'circle_post',
        'circle_reaction',
        'goal_completed',
        'bridge_shared',
        'memory_reviewed',
        'bippin2_step_completed'
      )
  )
  select jsonb_build_object(
    'active_days_8', count(distinct (occurred_at at time zone 'UTC')::date)
      filter (where occurred_at >= now() - interval '8 days'),
    'active_days_30', count(distinct (occurred_at at time zone 'UTC')::date)
      filter (where occurred_at >= now() - interval '30 days'),
    'meaningful_actions_8', count(*)
      filter (where occurred_at >= now() - interval '8 days'),
    'meaningful_actions_30', count(*)
      filter (where occurred_at >= now() - interval '30 days'),
    'latest_event_type', (
      select event_type from meaningful order by occurred_at desc limit 1
    ),
    'latest_occurred_at', (
      select occurred_at from meaningful order by occurred_at desc limit 1
    ),
    'latest_safe_meta', coalesce((
      select jsonb_strip_nulls(jsonb_build_object(
        'category', meta ->> 'category',
        'route', meta ->> 'route',
        'receiptKey', meta ->> 'receiptKey'
      ))
      from meaningful
      order by occurred_at desc
      limit 1
    ), '{}'::jsonb)
  )
  into v_result
  from meaningful;

  return coalesce(v_result, jsonb_build_object(
    'active_days_8', 0,
    'active_days_30', 0,
    'meaningful_actions_8', 0,
    'meaningful_actions_30', 0,
    'latest_event_type', null,
    'latest_occurred_at', null,
    'latest_safe_meta', '{}'::jsonb
  ));
end;
$$;

revoke all on function public.get_meaningful_return_snapshot() from public, anon;
grant execute on function public.get_meaningful_return_snapshot() to authenticated;

comment on function public.get_meaningful_return_snapshot() is
  'Privacy-safe active-day and meaningful-action summary. No raw emotional content.';

commit;

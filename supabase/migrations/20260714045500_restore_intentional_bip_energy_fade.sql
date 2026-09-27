-- Restore the intentional Bip Energy fade.
-- The economy should make showing up matter without turning absence into shame.
-- Contract: one-day grace, once per day, max five points, never below zero.

begin;

create or replace function public.apply_inactivity_point_adjustment()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_last_activity_date date;
  v_days_away integer := 0;
  v_balance integer := 0;
  v_adjustment integer := 0;
  v_rows integer := 0;
begin
  if v_user is null then
    raise exception 'authentication required';
  end if;

  select max(created_at)::date
    into v_last_activity_date
  from public.activity_events
  where user_id = v_user;

  if v_last_activity_date is null then
    return jsonb_build_object(
      'adjusted', 0,
      'days_away', 0,
      'reason', 'no_activity_history',
      'message_key', 'bip_energy_no_history'
    );
  end if;

  v_days_away := greatest(current_date - v_last_activity_date, 0);

  if v_days_away <= 1 then
    return jsonb_build_object(
      'adjusted', 0,
      'days_away', v_days_away,
      'reason', 'grace_period',
      'message_key', 'bip_energy_still_here'
    );
  end if;

  select available
    into v_balance
  from public.point_balances
  where user_id = v_user
  for update;

  v_balance := coalesce(v_balance, 0);

  if v_balance <= 0 then
    insert into public.point_inactivity_adjustments(
      user_id,
      adjustment_date,
      days_away,
      points_adjusted
    ) values (
      v_user,
      current_date,
      v_days_away,
      0
    )
    on conflict do nothing;

    return jsonb_build_object(
      'adjusted', 0,
      'days_away', v_days_away,
      'reason', 'no_balance',
      'message_key', 'bip_energy_empty_safe'
    );
  end if;

  v_adjustment := least(v_balance, least(5, greatest(1, v_days_away - 1)));

  insert into public.point_inactivity_adjustments(
    user_id,
    adjustment_date,
    days_away,
    points_adjusted
  ) values (
    v_user,
    current_date,
    v_days_away,
    v_adjustment
  )
  on conflict do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object(
      'adjusted', 0,
      'days_away', v_days_away,
      'reason', 'already_checked_today',
      'message_key', 'bip_energy_already_checked'
    );
  end if;

  if v_adjustment > 0 then
    insert into public.point_transactions(
      user_id,
      amount,
      reason,
      transaction_type,
      source_type,
      source_id,
      metadata
    ) values (
      v_user,
      -v_adjustment,
      'Bip Energy faded a little after time away',
      'adjustment',
      'inactivity_adjustment',
      current_date::text,
      jsonb_build_object(
        'days_away', v_days_away,
        'grace_days', 1,
        'daily_cap', 5,
        'never_below_zero', true,
        'message_key', 'bip_energy_faded'
      )
    );
  end if;

  return jsonb_build_object(
    'adjusted', v_adjustment,
    'days_away', v_days_away,
    'reason', 'bip_energy_fade',
    'message_key', 'bip_energy_faded'
  );
end;
$$;

revoke all on function public.apply_inactivity_point_adjustment() from public, anon;
grant execute on function public.apply_inactivity_point_adjustment() to authenticated;

-- Keep streak bonuses as one positive part of the economy. They are never used
-- as a public rank and the return experience does not shame a broken streak.
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
    when 'streak_milestone' then 3
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
      user_id,
      event_type,
      points,
      amount,
      reason,
      transaction_type,
      source_type,
      source_id,
      occurred_at,
      bip_event_id
    ) values (
      new.user_id,
      new.event_type,
      v_points,
      v_points,
      'Bip app activity',
      'earn',
      'app_action',
      new.id::text,
      new.occurred_at,
      new.id
    );
  end if;

  return new;
end;
$$;

commit;

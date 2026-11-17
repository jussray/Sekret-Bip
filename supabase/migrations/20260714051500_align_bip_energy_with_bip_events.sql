-- Align the intentional Bip Energy fade with the canonical event ledger.
-- The client writes meaningful activity to public.bip_events, not the legacy
-- public.activity_events table.

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

  select max(occurred_at)::date
    into v_last_activity_date
  from public.bip_events
  where user_id = v_user
    and event_type not in ('app_opened', 'streak_milestone');

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
        'activity_source', 'bip_events',
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

commit;

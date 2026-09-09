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

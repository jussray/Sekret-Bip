begin;

-- Keep app-action points server-owned and aligned with the event names emitted by
-- src/features/activity/events.ts. Parent-created chores remain bonus entries
-- with source_type = 'bip_task'.

create table if not exists public.app_point_awards (
  bip_event_id bigint primary key references public.bip_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  points_awarded integer not null check (points_awarded > 0),
  awarded_at timestamptz not null default now()
);

alter table public.app_point_awards
  add column if not exists bip_event_id bigint references public.bip_events(id) on delete cascade;

-- The first live version referenced activity_events. Preserve any historical
-- rows while allowing new awards to key from bip_events instead.
do $$
declare
  v_constraint text;
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'app_point_awards'
      and column_name = 'activity_event_id'
  ) then
    select conname into v_constraint
    from pg_constraint
    where conrelid = 'public.app_point_awards'::regclass
      and contype = 'p'
    limit 1;

    if v_constraint is not null then
      execute format('alter table public.app_point_awards drop constraint %I', v_constraint);
    end if;

    alter table public.app_point_awards
      alter column activity_event_id drop not null;
  end if;
end
$$;

create unique index if not exists app_point_awards_bip_event_uidx
  on public.app_point_awards(bip_event_id)
  where bip_event_id is not null;

alter table public.app_point_awards enable row level security;
drop policy if exists app_point_awards_owner_read on public.app_point_awards;
create policy app_point_awards_owner_read
on public.app_point_awards
for select to authenticated
using (auth.uid() = user_id);

create or replace function public.award_points_for_bip_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points integer := case NEW.event_type
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
  v_inserted integer := 0;
begin
  if v_points <= 0 then
    return NEW;
  end if;

  insert into public.app_point_awards(
    bip_event_id,
    user_id,
    event_type,
    points_awarded
  )
  values (NEW.id, NEW.user_id, NEW.event_type, v_points)
  on conflict do nothing;

  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    insert into public.point_transactions(
      user_id,
      event_type,
      points,
      amount,
      reason,
      transaction_type,
      source_type,
      source_id,
      metadata,
      occurred_at,
      bip_event_id
    )
    values (
      NEW.user_id,
      NEW.event_type,
      v_points,
      v_points,
      'Earned points from a Bip app activity',
      'earn',
      'app_action',
      NEW.id::text,
      jsonb_build_object('bip_event_id', NEW.id, 'event_type', NEW.event_type),
      NEW.occurred_at,
      NEW.id
    );
  end if;

  return NEW;
end;
$$;

revoke all on function public.award_points_for_bip_event() from public, anon, authenticated;

do '
begin
  if to_regclass(''public.activity_events'') is not null then
    execute ''drop trigger if exists activity_events_award_points on public.activity_events'';
  end if;
end
';
drop trigger if exists bip_events_award_points on public.bip_events;
create trigger bip_events_award_points
after insert on public.bip_events
for each row execute function public.award_points_for_bip_event();

-- One gentle inactivity adjustment per day. It uses bip_events because that is
-- the canonical event stream emitted by the app.
create table if not exists public.point_inactivity_adjustments (
  user_id uuid not null references auth.users(id) on delete cascade,
  adjustment_date date not null default current_date,
  days_away integer not null check (days_away >= 0),
  points_adjusted integer not null check (points_adjusted >= 0),
  reason text not null default 'return_nudge',
  created_at timestamptz not null default now(),
  primary key (user_id, adjustment_date)
);

alter table public.point_inactivity_adjustments enable row level security;
drop policy if exists point_inactivity_adjustments_owner_read on public.point_inactivity_adjustments;
create policy point_inactivity_adjustments_owner_read
on public.point_inactivity_adjustments
for select to authenticated
using (auth.uid() = user_id);

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
  where user_id = v_user;

  if v_last_activity_date is null then
    return jsonb_build_object('adjusted', 0, 'days_away', 0, 'reason', 'no_activity_history');
  end if;

  v_days_away := greatest(current_date - v_last_activity_date, 0);

  if v_days_away <= 1 then
    return jsonb_build_object('adjusted', 0, 'days_away', v_days_away, 'reason', 'grace_period');
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
    )
    values (v_user, current_date, v_days_away, 0)
    on conflict do nothing;

    return jsonb_build_object('adjusted', 0, 'days_away', v_days_away, 'reason', 'no_balance');
  end if;

  v_adjustment := least(v_balance, least(5, greatest(1, v_days_away - 1)));

  insert into public.point_inactivity_adjustments(
    user_id,
    adjustment_date,
    days_away,
    points_adjusted
  )
  values (v_user, current_date, v_days_away, v_adjustment)
  on conflict do nothing;

  get diagnostics v_rows = row_count;

  if v_rows = 0 then
    return jsonb_build_object('adjusted', 0, 'days_away', v_days_away, 'reason', 'already_checked_today');
  end if;

  insert into public.point_transactions(
    user_id,
    amount,
    reason,
    transaction_type,
    source_type,
    source_id,
    metadata
  )
  values (
    v_user,
    -v_adjustment,
    'Gentle points adjustment after time away from Bip',
    'adjustment',
    'inactivity_adjustment',
    current_date::text,
    jsonb_build_object('days_away', v_days_away, 'grace_days', 1, 'daily_cap', 5)
  );

  return jsonb_build_object('adjusted', v_adjustment, 'days_away', v_days_away, 'reason', 'return_nudge');
end;
$$;

revoke all on function public.apply_inactivity_point_adjustment() from public, anon;
grant execute on function public.apply_inactivity_point_adjustment() to authenticated;

-- Chores / parent bonus points.
create table if not exists public.bip_tasks (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_by_role text not null check (created_by_role in ('teen','parent','system')),
  title text not null check (length(trim(title)) > 0),
  description text,
  category text not null default 'custom' check (category in ('home','school','self_care','growth','habit','custom')),
  point_value integer not null default 0 check (point_value between 0 and 10000),
  requires_approval boolean not null default true,
  due_at timestamptz,
  recurrence_rule text,
  status text not null default 'active' check (status in ('active','submitted','rejected','completed','cancelled','expired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.bip_tasks(id) on delete cascade,
  teen_id uuid not null references auth.users(id) on delete cascade,
  note text,
  evidence_url text,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text
);

create unique index if not exists task_submissions_one_open_idx
  on public.task_submissions(task_id)
  where status = 'pending';

alter table public.bip_tasks enable row level security;
alter table public.task_submissions enable row level security;

drop policy if exists bip_tasks_teen_select on public.bip_tasks;
create policy bip_tasks_teen_select on public.bip_tasks
for select to authenticated using (auth.uid() = teen_id);

drop policy if exists bip_tasks_linked_parent_select on public.bip_tasks;
create policy bip_tasks_linked_parent_select on public.bip_tasks
for select to authenticated using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = bip_tasks.teen_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

drop policy if exists bip_tasks_teen_insert on public.bip_tasks;
create policy bip_tasks_teen_insert on public.bip_tasks
for insert to authenticated with check (
  auth.uid() = teen_id
  and auth.uid() = created_by
  and created_by_role = 'teen'
  and point_value = 0
  and requires_approval = false
);

drop policy if exists bip_tasks_linked_parent_insert on public.bip_tasks;
create policy bip_tasks_linked_parent_insert on public.bip_tasks
for insert to authenticated with check (
  auth.uid() = created_by
  and created_by_role = 'parent'
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
  )
);

drop policy if exists task_submissions_teen_select on public.task_submissions;
create policy task_submissions_teen_select on public.task_submissions
for select to authenticated using (auth.uid() = teen_id);

drop policy if exists task_submissions_linked_parent_select on public.task_submissions;
create policy task_submissions_linked_parent_select on public.task_submissions
for select to authenticated using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = task_submissions.teen_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

-- Reward redemption reconciled to the active reward_catalog/reward_redemptions schema.
alter table public.reward_redemptions
  add column if not exists reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists review_note text;

-- The earlier rewards migration used RETURNS uuid. Drop that signature so this
-- reconciliation can intentionally replace it with the richer result table.
drop function if exists public.request_reward_redemption(uuid);

create or replace function public.request_reward_redemption(p_reward_id uuid)
returns table(
  redemption_id uuid,
  reward_name text,
  point_cost integer,
  status text,
  available_points integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_reward public.reward_catalog%rowtype;
  v_balance integer := 0;
  v_status text;
  v_redemption_id uuid;
begin
  if v_user_id is null then raise exception 'unauthorized'; end if;

  select * into v_reward
  from public.reward_catalog
  where id = p_reward_id and active = true
  for update;

  if not found then raise exception 'reward_not_found'; end if;
  if v_reward.inventory_count is not null and v_reward.inventory_count <= 0 then
    raise exception 'out_of_stock';
  end if;

  select available into v_balance
  from public.point_balances
  where user_id = v_user_id
  for update;

  v_balance := coalesce(v_balance, 0);
  if v_balance < v_reward.point_cost then raise exception 'insufficient_points'; end if;

  v_status := case when v_reward.requires_parent_approval then 'pending_parent' else 'approved' end;

  insert into public.reward_redemptions(teen_id, reward_id, point_cost, status)
  values (v_user_id, v_reward.id, v_reward.point_cost, v_status)
  returning id into v_redemption_id;

  insert into public.point_transactions(
    user_id, amount, reason, transaction_type, source_type, source_id, metadata
  )
  values (
    v_user_id,
    -v_reward.point_cost,
    'Reward redemption reserved',
    'reserve',
    'reward_redemption',
    v_redemption_id::text,
    jsonb_build_object('reward_id', v_reward.id, 'status', v_status)
  );

  if v_reward.inventory_count is not null then
    update public.reward_catalog
    set inventory_count = inventory_count - 1,
        updated_at = now()
    where id = v_reward.id;
  end if;

  return query
  select v_redemption_id, v_reward.name, v_reward.point_cost, v_status, v_balance - v_reward.point_cost;
end;
$$;

create or replace function public.review_reward_redemption(
  p_redemption_id uuid,
  p_approve boolean,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent uuid := auth.uid();
  v_redemption public.reward_redemptions%rowtype;
begin
  if v_parent is null then raise exception 'authentication required'; end if;

  select rr.* into v_redemption
  from public.reward_redemptions rr
  where rr.id = p_redemption_id
    and rr.status = 'pending_parent'
  for update;

  if not found then raise exception 'redemption_not_pending'; end if;

  if not exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = v_redemption.teen_id
      and pl.parent_user_id = v_parent
      and pl.status = 'active'
  ) then
    raise exception 'not_authorized';
  end if;

  update public.reward_redemptions
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = v_parent,
      reviewed_at = now(),
      review_note = p_review_note
  where id = p_redemption_id;

  if not p_approve then
    insert into public.point_transactions(
      user_id, amount, reason, transaction_type, source_type, source_id, metadata
    )
    values (
      v_redemption.teen_id,
      v_redemption.point_cost,
      'Reward reservation released',
      'release',
      'reward_redemption',
      p_redemption_id::text || ':release',
      jsonb_build_object('redemption_id', p_redemption_id, 'reviewed_by', v_parent)
    );

    update public.reward_catalog r
    set inventory_count = case when r.inventory_count is null then null else r.inventory_count + 1 end,
        updated_at = now()
    where r.id = v_redemption.reward_id;
  end if;

  return jsonb_build_object('approved', p_approve, 'redemption_id', p_redemption_id);
end;
$$;

revoke all on function public.request_reward_redemption(uuid) from public, anon;
grant execute on function public.request_reward_redemption(uuid) to authenticated;
revoke all on function public.review_reward_redemption(uuid,boolean,text) from public, anon;
grant execute on function public.review_reward_redemption(uuid,boolean,text) to authenticated;

commit;

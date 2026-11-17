begin;

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

create index if not exists bip_tasks_teen_status_idx
  on public.bip_tasks(teen_id, status, created_at desc);
create index if not exists bip_tasks_creator_idx
  on public.bip_tasks(created_by, created_at desc);

alter table public.bip_tasks enable row level security;

drop policy if exists bip_tasks_teen_select on public.bip_tasks;
create policy bip_tasks_teen_select on public.bip_tasks
for select to authenticated
using (auth.uid() = teen_id);

drop policy if exists bip_tasks_parent_select on public.bip_tasks;
create policy bip_tasks_parent_select on public.bip_tasks
for select to authenticated
using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = bip_tasks.teen_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

drop policy if exists bip_tasks_teen_insert on public.bip_tasks;
create policy bip_tasks_teen_insert on public.bip_tasks
for insert to authenticated
with check (
  auth.uid() = teen_id
  and auth.uid() = created_by
  and created_by_role = 'teen'
  and point_value = 0
  and requires_approval = false
);

drop policy if exists bip_tasks_parent_insert on public.bip_tasks;
create policy bip_tasks_parent_insert on public.bip_tasks
for insert to authenticated
with check (
  auth.uid() = created_by
  and created_by_role = 'parent'
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
  )
);

drop policy if exists bip_tasks_creator_update on public.bip_tasks;
drop policy if exists bip_tasks_teen_update on public.bip_tasks;
create policy bip_tasks_teen_update on public.bip_tasks
for update to authenticated
using (auth.uid() = created_by and created_by_role = 'teen')
with check (
  auth.uid() = created_by
  and created_by_role = 'teen'
  and teen_id = auth.uid()
  and point_value = 0
  and requires_approval = false
);

drop policy if exists bip_tasks_parent_update on public.bip_tasks;
create policy bip_tasks_parent_update on public.bip_tasks
for update to authenticated
using (
  auth.uid() = created_by
  and created_by_role = 'parent'
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
  )
)
with check (
  auth.uid() = created_by
  and created_by_role = 'parent'
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bip_tasks.teen_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
  )
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
create index if not exists task_submissions_teen_idx
  on public.task_submissions(teen_id, submitted_at desc);

alter table public.task_submissions enable row level security;

drop policy if exists task_submissions_teen_select on public.task_submissions;
create policy task_submissions_teen_select on public.task_submissions
for select to authenticated
using (auth.uid() = teen_id);

drop policy if exists task_submissions_parent_select on public.task_submissions;
create policy task_submissions_parent_select on public.task_submissions
for select to authenticated
using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = task_submissions.teen_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

create table if not exists public.reward_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null check (length(trim(name)) > 0),
  description text,
  category text not null default 'digital' check (category in ('digital','merch','experience','custom')),
  point_cost integer not null check (point_cost > 0),
  image_url text,
  inventory_count integer,
  active boolean not null default true,
  requires_parent_approval boolean not null default true,
  fulfillment_type text not null default 'manual' check (fulfillment_type in ('manual','digital','shopify')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.reward_catalog enable row level security;

drop policy if exists reward_catalog_authenticated_read on public.reward_catalog;
create policy reward_catalog_authenticated_read on public.reward_catalog
for select to authenticated
using (active = true);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  teen_id uuid not null references auth.users(id) on delete cascade,
  reward_id uuid not null references public.reward_catalog(id),
  point_cost integer not null check (point_cost > 0),
  status text not null default 'pending_parent' check (status in ('pending_parent','approved','rejected','cancelled','fulfilled','refunded')),
  requested_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  fulfilled_at timestamptz,
  fulfillment_reference text,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists reward_redemptions_teen_idx
  on public.reward_redemptions(teen_id, requested_at desc);
create unique index if not exists reward_redemptions_open_unique_idx
  on public.reward_redemptions(teen_id, reward_id)
  where status in ('pending_parent','approved');

alter table public.reward_redemptions enable row level security;

drop policy if exists reward_redemptions_teen_select on public.reward_redemptions;
create policy reward_redemptions_teen_select on public.reward_redemptions
for select to authenticated
using (auth.uid() = teen_id);

drop policy if exists reward_redemptions_parent_select on public.reward_redemptions;
create policy reward_redemptions_parent_select on public.reward_redemptions
for select to authenticated
using (exists (
  select 1 from public.parent_links pl
  where pl.teen_user_id = reward_redemptions.teen_id
    and pl.parent_user_id = auth.uid()
    and pl.status = 'active'
));

create or replace function public.submit_bip_task(
  p_task_id uuid,
  p_note text default null,
  p_evidence_url text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_submission_id uuid;
  v_task public.bip_tasks%rowtype;
begin
  if v_user_id is null then raise exception 'authentication required'; end if;

  select * into v_task
  from public.bip_tasks
  where id = p_task_id
    and teen_id = v_user_id
    and status in ('active','rejected')
  for update;

  if not found then raise exception 'task not available'; end if;

  insert into public.task_submissions(task_id, teen_id, note, evidence_url, status)
  values (
    p_task_id,
    v_user_id,
    p_note,
    p_evidence_url,
    case when v_task.requires_approval then 'pending' else 'approved' end
  )
  returning id into v_submission_id;

  if v_task.requires_approval then
    update public.bip_tasks
    set status = 'submitted', updated_at = now()
    where id = p_task_id;
  else
    update public.bip_tasks
    set status = 'completed', updated_at = now()
    where id = p_task_id;

    insert into public.bip_events(user_id,event_type,metadata)
    values (
      v_user_id,
      'task_completed',
      jsonb_build_object(
        'task_id', p_task_id,
        'submission_id', v_submission_id,
        'source', 'bip_task'
      )
    );

    if v_task.point_value > 0 then
      insert into public.point_transactions(user_id,amount,reason,transaction_type,source_type,source_id,metadata)
      values (
        v_user_id,
        v_task.point_value,
        'Completed a Bip task',
        'earn',
        'bip_task',
        p_task_id::text,
        jsonb_build_object('submission_id',v_submission_id)
      )
      on conflict do nothing;
    end if;
  end if;

  return v_submission_id;
end;
$$;

revoke all on function public.submit_bip_task(uuid,text,text) from public, anon;
grant execute on function public.submit_bip_task(uuid,text,text) to authenticated;

create or replace function public.review_task_submission(
  p_submission_id uuid,
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
  v_submission public.task_submissions%rowtype;
  v_task public.bip_tasks%rowtype;
begin
  if v_parent is null then raise exception 'authentication required'; end if;

  select * into v_submission
  from public.task_submissions
  where id = p_submission_id and status = 'pending'
  for update;

  if not found then raise exception 'submission not pending'; end if;

  select * into v_task
  from public.bip_tasks
  where id = v_submission.task_id
  for update;

  if not exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = v_submission.teen_id
      and pl.parent_user_id = v_parent
      and pl.status = 'active'
  ) then raise exception 'not authorized'; end if;

  update public.task_submissions
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = v_parent,
      reviewed_at = now(),
      review_note = p_review_note
  where id = p_submission_id;

  update public.bip_tasks
  set status = case when p_approve then 'completed' else 'rejected' end,
      updated_at = now()
  where id = v_task.id;

  if p_approve then
    insert into public.bip_events(user_id,event_type,metadata)
    values (
      v_submission.teen_id,
      'task_completed',
      jsonb_build_object(
        'task_id', v_task.id,
        'submission_id', p_submission_id,
        'approved_by', v_parent,
        'source', 'bip_task'
      )
    );

    if v_task.point_value > 0 then
      insert into public.point_transactions(user_id,amount,reason,transaction_type,source_type,source_id,metadata)
      values (
        v_submission.teen_id,
        v_task.point_value,
        'Completed an approved Bip task',
        'earn',
        'bip_task',
        v_task.id::text,
        jsonb_build_object('submission_id',p_submission_id,'approved_by',v_parent)
      )
      on conflict do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'approved', p_approve,
    'task_id', v_task.id,
    'submission_id', p_submission_id
  );
end;
$$;

revoke all on function public.review_task_submission(uuid,boolean,text) from public, anon;
grant execute on function public.review_task_submission(uuid,boolean,text) to authenticated;

create or replace function public.request_reward_redemption(p_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_reward public.reward_catalog%rowtype;
  v_balance integer;
  v_redemption uuid;
  v_status text;
begin
  if v_user is null then raise exception 'authentication required'; end if;

  select * into v_reward
  from public.reward_catalog
  where id = p_reward_id
    and active = true
    and (inventory_count is null or inventory_count > 0)
  for update;

  if not found then raise exception 'reward unavailable'; end if;

  select available into v_balance
  from public.point_balances
  where user_id = v_user
  for update;

  if coalesce(v_balance,0) < v_reward.point_cost then
    raise exception 'insufficient points';
  end if;

  v_status := case
    when v_reward.requires_parent_approval then 'pending_parent'
    else 'approved'
  end;

  insert into public.reward_redemptions(teen_id,reward_id,point_cost,status)
  values (v_user,v_reward.id,v_reward.point_cost,v_status)
  returning id into v_redemption;

  insert into public.point_transactions(user_id,amount,reason,transaction_type,source_type,source_id,metadata)
  values (
    v_user,
    -v_reward.point_cost,
    'Reward redemption reserved',
    'reserve',
    'reward_redemption',
    v_redemption::text,
    jsonb_build_object('reward_id',v_reward.id)
  );

  return v_redemption;
end;
$$;

revoke all on function public.request_reward_redemption(uuid) from public, anon;
grant execute on function public.request_reward_redemption(uuid) to authenticated;

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

  select * into v_redemption
  from public.reward_redemptions
  where id = p_redemption_id and status = 'pending_parent'
  for update;

  if not found then raise exception 'redemption not pending'; end if;

  if not exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = v_redemption.teen_id
      and pl.parent_user_id = v_parent
      and pl.status = 'active'
  ) then raise exception 'not authorized'; end if;

  update public.reward_redemptions
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = v_parent,
      reviewed_at = now(),
      review_note = p_review_note
  where id = p_redemption_id;

  if not p_approve then
    insert into public.point_transactions(user_id,amount,reason,transaction_type,source_type,source_id,metadata)
    values (
      v_redemption.teen_id,
      v_redemption.point_cost,
      'Reward reservation released',
      'release',
      'reward_redemption',
      p_redemption_id::text || ':release',
      jsonb_build_object('redemption_id',p_redemption_id)
    );
  end if;

  return jsonb_build_object(
    'approved', p_approve,
    'redemption_id', p_redemption_id
  );
end;
$$;

revoke all on function public.review_reward_redemption(uuid,boolean,text) from public, anon;
grant execute on function public.review_reward_redemption(uuid,boolean,text) to authenticated;

commit;

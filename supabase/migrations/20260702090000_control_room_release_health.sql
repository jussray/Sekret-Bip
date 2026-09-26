create table if not exists public.control_room_releases (
  id uuid primary key default gen_random_uuid(),
  release_key text not null unique,
  commit_sha text not null,
  branch text not null default 'main',
  workflow_run_id text,
  deployed_at timestamptz not null default now(),
  baseline_started_at timestamptz,
  observation_ended_at timestamptz,
  status text not null default 'observing',
  issue_count integer not null default 0,
  error_count integer not null default 0,
  warning_count integer not null default 0,
  regression_count integer not null default 0,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists control_room_releases_deployed_at_idx
  on public.control_room_releases (deployed_at desc);
create index if not exists control_room_releases_commit_sha_idx
  on public.control_room_releases (commit_sha);

alter table public.control_room_releases enable row level security;

drop policy if exists "Founder: releases" on public.control_room_releases;
create policy "Founder: releases"
  on public.control_room_releases
  for all
  using (public.is_founder())
  with check (public.is_founder());

create or replace function public.refresh_control_room_release_health(p_release_key text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_release public.control_room_releases%rowtype;
  v_previous public.control_room_releases%rowtype;
  v_issue_count integer := 0;
  v_error_count integer := 0;
  v_warning_count integer := 0;
  v_regression_count integer := 0;
  v_summary jsonb;
begin
  select * into v_release
  from public.control_room_releases
  where release_key = p_release_key;

  if v_release.id is null then
    raise exception 'Unknown release key: %', p_release_key;
  end if;

  select * into v_previous
  from public.control_room_releases
  where deployed_at < v_release.deployed_at
  order by deployed_at desc
  limit 1;

  update public.control_room_issues
  set linked_release = v_release.release_key,
      updated_at = now()
  where first_seen_at >= v_release.deployed_at
    and first_seen_at < coalesce(v_release.observation_ended_at, now())
    and linked_release is null;

  select
    count(*),
    count(*) filter (where severity in ('error', 'critical')),
    count(*) filter (where severity = 'warning'),
    count(*) filter (
      where occurrence_count > 1
         or severity in ('error', 'critical')
    )
  into v_issue_count, v_error_count, v_warning_count, v_regression_count
  from public.control_room_issues
  where linked_release = v_release.release_key
    and status not in ('resolved', 'ignored');

  v_summary := jsonb_build_object(
    'release_key', v_release.release_key,
    'commit_sha', v_release.commit_sha,
    'deployed_at', v_release.deployed_at,
    'previous_release', v_previous.release_key,
    'issue_count', v_issue_count,
    'error_count', v_error_count,
    'warning_count', v_warning_count,
    'regression_count', v_regression_count,
    'health', case
      when v_error_count > 0 then 'degraded'
      when v_warning_count > 0 then 'watch'
      else 'healthy'
    end
  );

  update public.control_room_releases
  set issue_count = v_issue_count,
      error_count = v_error_count,
      warning_count = v_warning_count,
      regression_count = v_regression_count,
      status = case
        when v_error_count > 0 then 'degraded'
        when v_warning_count > 0 then 'watch'
        else 'healthy'
      end,
      summary = v_summary,
      updated_at = now()
  where release_key = p_release_key;

  return v_summary;
end;
$$;

revoke all on function public.refresh_control_room_release_health(text) from public;
revoke all on function public.refresh_control_room_release_health(text) from anon;
revoke all on function public.refresh_control_room_release_health(text) from authenticated;
grant execute on function public.refresh_control_room_release_health(text) to service_role;

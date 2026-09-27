-- Create and share a Crew check-in with any number of accepted members.

begin;

create or replace function public.create_crew_check_in(
  p_local_date date,
  p_emoji text,
  p_note text,
  p_share_with uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_check_in_id uuid;
  v_requested_count integer;
  v_accepted_count integer;
begin
  if v_user_id is null
     or coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'permanent_account_required' using errcode = '42501';
  end if;

  if p_local_date is null then
    raise exception 'local_date_required' using errcode = '22023';
  end if;
  if p_emoji not in ('great', 'okay', 'low', 'need_support', 'resting') then
    raise exception 'invalid_check_in_emoji' using errcode = '22023';
  end if;
  if p_note is not null and char_length(trim(p_note)) > 280 then
    raise exception 'check_in_note_too_long' using errcode = '22023';
  end if;

  create temporary table if not exists pg_temp.requested_crew_members (
    user_id uuid primary key
  ) on commit drop;
  truncate pg_temp.requested_crew_members;

  insert into pg_temp.requested_crew_members(user_id)
  select distinct requested_id
  from unnest(coalesce(p_share_with, array[]::uuid[])) requested_id
  where requested_id is not null;

  select count(*) into v_requested_count
  from pg_temp.requested_crew_members;

  if v_requested_count = 0 then
    raise exception 'choose_at_least_one_crew_member' using errcode = '22023';
  end if;
  if exists (
    select 1 from pg_temp.requested_crew_members where user_id = v_user_id
  ) then
    raise exception 'cannot_share_crew_check_in_with_self' using errcode = '22023';
  end if;

  select count(*) into v_accepted_count
  from pg_temp.requested_crew_members requested
  where exists (
    select 1
    from public.crew_members cm
    where cm.user_id = v_user_id
      and cm.member_user_id = requested.user_id
      and cm.connection_status = 'accepted'
  )
  and not exists (
    select 1
    from public.crew_members blocked
    where blocked.connection_status = 'blocked'
      and (
        (blocked.user_id = v_user_id and blocked.member_user_id = requested.user_id)
        or (blocked.user_id = requested.user_id and blocked.member_user_id = v_user_id)
      )
  );

  if v_accepted_count <> v_requested_count then
    raise exception 'all_recipients_must_be_accepted_crew_members' using errcode = '42501';
  end if;

  insert into public.crew_check_ins (
    owner_user_id, local_date, emoji, note
  ) values (
    v_user_id,
    p_local_date,
    p_emoji,
    nullif(left(trim(coalesce(p_note, '')), 280), '')
  ) returning id into v_check_in_id;

  insert into public.crew_check_in_shares (
    check_in_id, owner_user_id, shared_with
  )
  select v_check_in_id, v_user_id, requested.user_id
  from pg_temp.requested_crew_members requested
  on conflict (check_in_id, shared_with) do nothing;

  return v_check_in_id;
end;
$$;

revoke all on function public.create_crew_check_in(date, text, text, uuid[]) from public, anon;
grant execute on function public.create_crew_check_in(date, text, text, uuid[]) to authenticated;

comment on function public.create_crew_check_in(date, text, text, uuid[]) is
  'Creates one Crew check-in for any number of distinct accepted, non-blocked Crew members. No numeric cap is applied.';

commit;

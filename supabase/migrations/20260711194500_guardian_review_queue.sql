begin;

create table if not exists public.guardian_verification_reviews (
  id bigint generated always as identity primary key,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  reviewer_user_id uuid references auth.users(id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists guardian_verification_reviews_target_idx
  on public.guardian_verification_reviews(target_user_id, created_at desc);

alter table public.guardian_verification_reviews enable row level security;
revoke all on table public.guardian_verification_reviews from anon, authenticated;

create or replace function public.can_manage_guardian_reviews()
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    coalesce(auth.jwt() ->> 'role', '') = 'service_role'
    or exists (
      select 1
      from public.app_profiles p
      where p.user_id = auth.uid()
        and p.role in ('founder', 'admin')
        and p.can_manage_app = true
        and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
    );
$$;

revoke execute on function public.can_manage_guardian_reviews() from public, anon;
grant execute on function public.can_manage_guardian_reviews() to authenticated, service_role;

create or replace function public.list_guardian_verification_queue()
returns table (
  target_user_id uuid,
  email text,
  private_display_name text,
  verification_state text,
  verification_reason text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.can_manage_guardian_reviews() then
    raise exception 'founder or admin access required' using errcode = '42501';
  end if;

  return query
  select
    av.user_id,
    ap.email,
    ap.private_display_name,
    av.verification_state,
    av.verification_reason,
    av.verification_updated_at
  from public.account_verification av
  join public.app_profiles ap on ap.user_id = av.user_id
  join public.circle_profiles cp on cp.user_id = av.user_id
  where av.verification_state = 'PENDING_GUARDIAN_REVIEW'
    and ap.account_side = 'parent'
    and ap.onboarding_complete = true
    and cp.account_type = 'guardian'
  order by av.verification_updated_at asc;
end;
$$;

revoke execute on function public.list_guardian_verification_queue() from public, anon;
grant execute on function public.list_guardian_verification_queue() to authenticated, service_role;

create or replace function public.review_guardian_verification(
  p_target_user_id uuid,
  p_approve boolean,
  p_reason text default null
)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_reviewer_user_id uuid := auth.uid();
  v_target_profile public.app_profiles%rowtype;
  v_target_circle public.circle_profiles%rowtype;
  v_current_state text;
  v_next_state text;
  v_decision text;
begin
  if not public.can_manage_guardian_reviews() then
    raise exception 'founder or admin access required' using errcode = '42501';
  end if;

  if not p_approve and nullif(btrim(p_reason), '') is null then
    raise exception 'rejection reason required' using errcode = '22023';
  end if;

  select * into v_target_profile
  from public.app_profiles
  where user_id = p_target_user_id
  for update;

  if not found
     or v_target_profile.account_side <> 'parent'
     or v_target_profile.onboarding_complete is not true then
    raise exception 'completed parent profile required' using errcode = '22023';
  end if;

  select * into v_target_circle
  from public.circle_profiles
  where user_id = p_target_user_id;

  if not found or v_target_circle.account_type <> 'guardian' then
    raise exception 'guardian circle profile required' using errcode = '22023';
  end if;

  select verification_state into v_current_state
  from public.account_verification
  where user_id = p_target_user_id
  for update;

  if not found or v_current_state <> 'PENDING_GUARDIAN_REVIEW' then
    raise exception 'guardian review is not pending' using errcode = '22023';
  end if;

  v_next_state := case when p_approve then 'VERIFIED_GUARDIAN' else 'GUARDIAN_REJECTED' end;
  v_decision := case when p_approve then 'approved' else 'rejected' end;

  update public.account_verification
  set verification_state = v_next_state,
      parent_link_state = 'none',
      verification_reason = case
        when p_approve then 'guardian_review_approved'
        else btrim(p_reason)
      end,
      verification_updated_at = now()
  where user_id = p_target_user_id;

  insert into public.guardian_verification_reviews(
    target_user_id,
    reviewer_user_id,
    decision,
    reason
  ) values (
    p_target_user_id,
    v_reviewer_user_id,
    v_decision,
    nullif(btrim(p_reason), '')
  );

  return v_next_state;
end;
$$;

revoke execute on function public.review_guardian_verification(uuid, boolean, text) from public, anon;
grant execute on function public.review_guardian_verification(uuid, boolean, text) to authenticated, service_role;

comment on table public.guardian_verification_reviews is
  'Immutable audit trail for founder/admin guardian review decisions. No teen parent_link data is used or created.';
comment on function public.list_guardian_verification_queue() is
  'Founder/admin-only queue of completed parent accounts awaiting guardian verification.';
comment on function public.review_guardian_verification(uuid, boolean, text) is
  'Founder/admin-only decision RPC. Guardian identity review remains independent from teen parent_link consent.';

commit;

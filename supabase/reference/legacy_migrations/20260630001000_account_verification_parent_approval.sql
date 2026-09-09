begin;

create table if not exists public.account_verification (
  user_id uuid primary key references auth.users(id) on delete cascade,
  verification_state text not null default 'UNVERIFIED'
    check (verification_state in (
      'UNVERIFIED','PENDING_PARENT','PENDING_TRUSTED_ADULT','LIMITED_MODE',
      'VERIFIED_TEEN','EXPIRED','MANUAL_REVIEW','SUSPENDED'
    )),
  parent_link_state text not null default 'none'
    check (parent_link_state in ('none','pending','active','expired','revoked','declined')),
  verification_reason text,
  verification_updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.account_verification enable row level security;
revoke all on public.account_verification from anon;
revoke insert, update, delete on public.account_verification from authenticated;
grant select on public.account_verification to authenticated;

drop policy if exists account_verification_select_own on public.account_verification;
create policy account_verification_select_own
on public.account_verification
for select
to authenticated
using (
  auth.uid() = user_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

create or replace function public.set_account_verification_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.verification_updated_at = now();
  return new;
end;
$$;

drop trigger if exists account_verification_set_updated_at on public.account_verification;
create trigger account_verification_set_updated_at
before update on public.account_verification
for each row execute function public.set_account_verification_updated_at();

create or replace function public.initialize_account_verification()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.account_verification(user_id, verification_state, parent_link_state)
  values (new.id, 'UNVERIFIED', 'none')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke execute on function public.initialize_account_verification() from public, anon, authenticated;
grant execute on function public.initialize_account_verification() to service_role;

drop trigger if exists initialize_account_verification_on_signup on auth.users;
create trigger initialize_account_verification_on_signup
after insert on auth.users
for each row execute function public.initialize_account_verification();

insert into public.account_verification(user_id, verification_state, parent_link_state)
select id, 'UNVERIFIED', 'none' from auth.users
on conflict (user_id) do nothing;

create or replace function public.redeem_parent_link_invite(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_parent_id uuid := auth.uid();
  v_link public.parent_links%rowtype;
begin
  if v_parent_id is null then
    raise exception 'authentication required';
  end if;

  select * into v_link
  from public.parent_links
  where invite_code = upper(trim(p_invite_code))
    and status = 'pending'
    and is_active = true
    and (expires_at is null or expires_at > now())
  for update;

  if not found then
    raise exception 'invalid or expired invite';
  end if;

  if v_link.teen_user_id = v_parent_id then
    raise exception 'cannot link account to itself';
  end if;

  update public.parent_links
  set parent_user_id = v_parent_id,
      status = 'active',
      updated_at = now()
  where id = v_link.id;

  insert into public.account_verification(
    user_id, verification_state, parent_link_state,
    verification_reason, verification_updated_at
  ) values (
    v_link.teen_user_id, 'VERIFIED_TEEN', 'active',
    'parent_link_approved', now()
  )
  on conflict (user_id) do update
  set verification_state = 'VERIFIED_TEEN',
      parent_link_state = 'active',
      verification_reason = 'parent_link_approved',
      verification_updated_at = now();

  return v_link.teen_user_id;
end;
$$;

revoke execute on function public.redeem_parent_link_invite(text) from public, anon;
grant execute on function public.redeem_parent_link_invite(text) to authenticated;

comment on function public.redeem_parent_link_invite(text) is
  'Atomically activates a parent link and promotes the linked teen to VERIFIED_TEEN.';

commit;

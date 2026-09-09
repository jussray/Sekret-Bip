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

create policy "account_verification_select_own"
on public.account_verification
for select
to authenticated
using (auth.uid() = user_id);

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

drop trigger if exists initialize_account_verification_on_signup on auth.users;
create trigger initialize_account_verification_on_signup
after insert on auth.users
for each row execute function public.initialize_account_verification();

insert into public.account_verification(user_id, verification_state, parent_link_state)
select id, 'UNVERIFIED', 'none' from auth.users
on conflict (user_id) do nothing;

comment on table public.account_verification is
  'Server-authoritative account verification snapshot. Client users may read their own row but cannot promote or mutate verification state directly.';
comment on column public.account_verification.verification_state is
  'Must match src/types/verification.ts VerificationState.';
comment on column public.account_verification.parent_link_state is
  'Must match src/types/verification.ts ParentLinkState.';

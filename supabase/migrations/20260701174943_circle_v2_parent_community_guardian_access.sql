-- Circle V2 Phase 0 (2/2) — guardian verification + parent_community circle
begin;

alter table public.account_verification
  drop constraint account_verification_verification_state_check;
alter table public.account_verification
  add constraint account_verification_verification_state_check
  check (verification_state in (
    'UNVERIFIED','PENDING_PARENT','PENDING_TRUSTED_ADULT','LIMITED_MODE',
    'VERIFIED_TEEN','EXPIRED','MANUAL_REVIEW','SUSPENDED',
    'VERIFIED_GUARDIAN','PENDING_GUARDIAN_REVIEW','GUARDIAN_REJECTED','GUARDIAN_SUSPENDED'
  ));

alter table public.circles
  drop constraint circles_kind_shape;
alter table public.circles
  add constraint circles_kind_shape
  check (
    (kind = 'crew'::circle_kind and crew_id is not null and parent_link_id is null)
    or (kind = 'parent'::circle_kind and parent_link_id is not null and crew_id is null)
    or (kind in ('public'::circle_kind, 'friends'::circle_kind, 'parent_community'::circle_kind)
        and crew_id is null and parent_link_id is null)
  );

create or replace function public.is_verified_guardian()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.account_verification av
    join public.circle_profiles cp on cp.user_id = av.user_id
    where av.user_id = auth.uid()
      and av.verification_state = 'VERIFIED_GUARDIAN'
      and cp.account_type = 'guardian'
  );
$$;

drop policy "circles select owner or member" on public.circles;
create policy "circles select owner or member" on public.circles
  for select using (
    (owner_user_id = (select auth.uid()))
    or (id in (select cm.circle_id from public.circle_members cm where cm.user_id = (select auth.uid())))
    or (kind = 'public'::circle_kind)
    or (kind = 'parent_community'::circle_kind and public.is_verified_guardian())
  );

drop policy "circles insert own" on public.circles;
create policy "circles insert own" on public.circles
  for insert with check (
    (owner_user_id = (select auth.uid()))
    and (kind <> 'parent_community'::circle_kind or public.is_verified_guardian())
  );

drop policy "posts select by circle visibility" on public.posts;
create policy "posts select by circle visibility" on public.posts
  for select using (
    (author_user_id = (select auth.uid()))
    or (circle_id in (select c.id from public.circles c where c.kind = 'public'::circle_kind))
    or (circle_id in (
         select c.id from public.circles c
         where c.kind = 'friends'::circle_kind
           and c.owner_user_id in (
             select f1.friend_user_id
             from public.friendships f1
             join public.friendships f2
               on f1.user_id = f2.friend_user_id and f1.friend_user_id = f2.user_id
             where f1.user_id = (select auth.uid())
           )
       ))
    or (circle_id in (select cm.circle_id from public.circle_members cm where cm.user_id = (select auth.uid())))
    or (
      circle_id in (select c.id from public.circles c where c.kind = 'parent_community'::circle_kind)
      and public.is_verified_guardian()
    )
  );

drop policy "posts insert by author" on public.posts;
create policy "posts insert by author" on public.posts
  for insert with check (
    (author_user_id = (select auth.uid()))
    and (
      not exists (
        select 1 from public.circles c
        where c.id = circle_id and c.kind = 'parent_community'::circle_kind
      )
      or public.is_verified_guardian()
    )
  );

create or replace function public.enforce_circle_anonymity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _kind public.circle_kind;
begin
  select kind into _kind from public.circles where id = new.circle_id;
  if _kind in ('public', 'parent_community') and new.is_identity_revealed is true then
    raise exception 'identity cannot be revealed on % circle posts', _kind;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_circle_anonymity on public.posts;
create trigger enforce_circle_anonymity
  before insert or update on public.posts
  for each row execute function public.enforce_circle_anonymity();

alter table public.posts
  add column if not exists safety_flagged boolean not null default false;

drop trigger if exists safety_scan_posts on public.posts;
create trigger safety_scan_posts
  after insert on public.posts
  for each row execute function public.trigger_safety_scan('body');

commit;

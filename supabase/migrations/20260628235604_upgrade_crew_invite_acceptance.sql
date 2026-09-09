alter table public.crew_members add column if not exists connection_status text not null default 'pending';
alter table public.crew_members add column if not exists member_user_id uuid references auth.users(id) on delete set null;
alter table public.crew_members add column if not exists accepted_at timestamptz;

alter table public.crew_members drop constraint if exists crew_members_connection_status_check;
alter table public.crew_members add constraint crew_members_connection_status_check
check (connection_status in ('pending','accepted','blocked','removed'));

create unique index if not exists crew_members_invite_code_unique
on public.crew_members (invite_code);

create unique index if not exists crew_members_one_member_per_owner
on public.crew_members (user_id, member_user_id)
where member_user_id is not null and connection_status = 'accepted';

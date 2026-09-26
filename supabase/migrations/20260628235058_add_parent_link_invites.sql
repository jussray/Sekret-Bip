alter table public.parent_links alter column parent_user_id drop not null;
alter table public.parent_links add column if not exists invite_code text;
alter table public.parent_links add column if not exists expires_at timestamptz;

update public.parent_links
set status = case when is_active then 'active' else 'revoked' end
where status is null or status not in ('pending','active','revoked','expired');

alter table public.parent_links drop constraint if exists parent_links_status_check;
alter table public.parent_links add constraint parent_links_status_check
check (status in ('pending','active','revoked','expired'));

alter table public.parent_links drop constraint if exists parent_links_distinct_users;
alter table public.parent_links add constraint parent_links_distinct_users
check (parent_user_id is null or teen_user_id <> parent_user_id);

create unique index if not exists parent_links_invite_code_unique
on public.parent_links (invite_code)
where invite_code is not null;

create index if not exists parent_links_pending_invite_lookup
on public.parent_links (invite_code, status, expires_at)
where status = 'pending';

-- Se'kret Bip — Phase 2 Crew Accountability
--
-- Creates the current Crew Accountability contract without replacing the
-- legacy crew_members relationship table. The authenticated user UUID for a
-- crew member is stored in crew_members.member_user_id.

-- Legacy 0001 created crew_check_ins with an incompatible bigint/member layout.
-- Preserve it only when it still exists and has not already been archived.
do $$
begin
  if to_regclass('public.crew_check_ins') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public'
         and table_name = 'crew_check_ins'
         and column_name = 'member_id'
     )
     and to_regclass('public.crew_check_ins_legacy_v1') is null then
    alter table public.crew_check_ins rename to crew_check_ins_legacy_v1;
  end if;
end $$;

create table if not exists public.crew_check_ins (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  local_date    date not null,
  emoji         text not null check (emoji in ('great','okay','low','need_support','resting')),
  note          text check (note is null or char_length(note) <= 280),
  status        text not null default 'active' check (status in ('active','deleted')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create index if not exists crew_check_ins_owner_created_idx
  on public.crew_check_ins (owner_user_id, created_at desc);

alter table public.crew_check_ins enable row level security;

drop policy if exists crew_check_ins_owner_read on public.crew_check_ins;
create policy crew_check_ins_owner_read on public.crew_check_ins
  for select to authenticated
  using (auth.uid() = owner_user_id);

drop policy if exists crew_check_ins_owner_insert on public.crew_check_ins;
create policy crew_check_ins_owner_insert on public.crew_check_ins
  for insert to authenticated
  with check (auth.uid() = owner_user_id);

drop policy if exists crew_check_ins_owner_update on public.crew_check_ins;
create policy crew_check_ins_owner_update on public.crew_check_ins
  for update to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create table if not exists public.crew_check_in_shares (
  id            uuid primary key default gen_random_uuid(),
  check_in_id   uuid not null references public.crew_check_ins(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  shared_with   uuid not null references auth.users(id) on delete cascade,
  status        text not null default 'active' check (status in ('active','revoked')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  revoked_at    timestamptz,
  unique (check_in_id, shared_with),
  check (owner_user_id <> shared_with)
);

create index if not exists crew_check_in_shares_recipient_idx
  on public.crew_check_in_shares (shared_with, status, created_at desc);
create index if not exists crew_check_in_shares_owner_idx
  on public.crew_check_in_shares (owner_user_id, check_in_id);

alter table public.crew_check_in_shares enable row level security;

drop policy if exists crew_check_in_shares_owner_read on public.crew_check_in_shares;
create policy crew_check_in_shares_owner_read on public.crew_check_in_shares
  for select to authenticated
  using (auth.uid() = owner_user_id);

drop policy if exists crew_check_in_shares_owner_insert on public.crew_check_in_shares;
create policy crew_check_in_shares_owner_insert on public.crew_check_in_shares
  for insert to authenticated
  with check (
    auth.uid() = owner_user_id
    and exists (
      select 1
      from public.crew_members cm
      where cm.user_id = owner_user_id
        and cm.member_user_id = shared_with
        and cm.connection_status = 'accepted'
    )
  );

drop policy if exists crew_check_in_shares_owner_update on public.crew_check_in_shares;
create policy crew_check_in_shares_owner_update on public.crew_check_in_shares
  for update to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists crew_check_in_shares_crew_read on public.crew_check_in_shares;
create policy crew_check_in_shares_crew_read on public.crew_check_in_shares
  for select to authenticated
  using (
    auth.uid() = shared_with
    and status = 'active'
    and exists (
      select 1
      from public.crew_members cm
      where cm.user_id = owner_user_id
        and cm.member_user_id = auth.uid()
        and cm.connection_status = 'accepted'
    )
  );

drop policy if exists crew_check_ins_crew_read on public.crew_check_ins;
create policy crew_check_ins_crew_read on public.crew_check_ins
  for select to authenticated
  using (
    status = 'active'
    and exists (
      select 1
      from public.crew_check_in_shares s
      join public.crew_members cm
        on cm.user_id = s.owner_user_id
       and cm.member_user_id = auth.uid()
       and cm.connection_status = 'accepted'
      where s.check_in_id = crew_check_ins.id
        and s.shared_with = auth.uid()
        and s.status = 'active'
    )
  );

create table if not exists public.crew_encouragements (
  id                uuid primary key default gen_random_uuid(),
  check_in_id       uuid not null references public.crew_check_ins(id) on delete cascade,
  sender_user_id    uuid not null references auth.users(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  preset_key        text not null check (char_length(trim(preset_key)) between 1 and 64),
  local_date        date not null,
  status            text not null default 'active' check (status in ('active','deleted')),
  created_at        timestamptz not null default now(),
  unique (check_in_id, sender_user_id)
);

create index if not exists crew_encouragements_check_in_idx
  on public.crew_encouragements (check_in_id, status);
create index if not exists crew_encouragements_recipient_idx
  on public.crew_encouragements (recipient_user_id, created_at desc);

alter table public.crew_encouragements enable row level security;

drop policy if exists crew_encouragements_sender_insert on public.crew_encouragements;
create policy crew_encouragements_sender_insert on public.crew_encouragements
  for insert to authenticated
  with check (
    auth.uid() = sender_user_id
    and recipient_user_id <> sender_user_id
    and exists (
      select 1
      from public.crew_check_in_shares s
      join public.crew_members cm
        on cm.user_id = s.owner_user_id
       and cm.member_user_id = auth.uid()
       and cm.connection_status = 'accepted'
      where s.check_in_id = crew_encouragements.check_in_id
        and s.shared_with = auth.uid()
        and s.owner_user_id = recipient_user_id
        and s.status = 'active'
    )
  );

drop policy if exists crew_encouragements_read on public.crew_encouragements;
create policy crew_encouragements_read on public.crew_encouragements
  for select to authenticated
  using (auth.uid() = sender_user_id or auth.uid() = recipient_user_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists crew_check_ins_updated_at on public.crew_check_ins;
create trigger crew_check_ins_updated_at
  before update on public.crew_check_ins
  for each row execute function public.set_updated_at();

drop trigger if exists crew_check_in_shares_updated_at on public.crew_check_in_shares;
create trigger crew_check_in_shares_updated_at
  before update on public.crew_check_in_shares
  for each row execute function public.set_updated_at();

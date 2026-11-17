create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null unique,
  platform text not null check (platform in ('ios', 'android')),
  app_variant text not null check (app_variant in ('teen', 'parent')),
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_tokens_user_id_idx
  on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

revoke all on table public.push_tokens from anon;
grant select, insert, update, delete on table public.push_tokens to authenticated;

create policy "push_tokens_select_own"
  on public.push_tokens
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "push_tokens_insert_own"
  on public.push_tokens
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "push_tokens_update_own"
  on public.push_tokens
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "push_tokens_delete_own"
  on public.push_tokens
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.set_push_tokens_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_push_tokens_updated_at() from public;

drop trigger if exists set_push_tokens_updated_at on public.push_tokens;
create trigger set_push_tokens_updated_at
before update on public.push_tokens
for each row execute function public.set_push_tokens_updated_at();

create table if not exists public.daily_intentions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  intention_date date not null,
  position smallint not null check (position between 0 and 4),
  label text not null check (char_length(label) between 1 and 120),
  category text not null check (category in ('soothe','body','focus','connect','self_kind','future','reflect','baseline')),
  source_kind text not null check (source_kind in ('baseline','activity','conversation','manual')),
  source_label text not null check (source_label in ('gentle default','today''s mood','today''s activity','recent companion entry','manual')),
  companion_key text null check (companion_key is null or companion_key in ('raylene','rylane','cloud','night','sekret')),
  generation_version text not null default 'local-v1' check (generation_version in ('local-v1','manual-v1')),
  completed boolean not null default false,
  dismissed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, intention_date, position)
);

comment on table public.daily_intentions is
  'Owner-only daily checklist. Stores final intention labels and coarse source tags only; never journal text, companion replies, excerpts, transcripts, or parent summaries.';

create index if not exists daily_intentions_user_date_idx
  on public.daily_intentions (user_id, intention_date desc);

alter table public.daily_intentions enable row level security;

revoke all on table public.daily_intentions from public;
revoke all on table public.daily_intentions from anon;
grant select, insert, update, delete on table public.daily_intentions to authenticated;

create policy "daily_intentions_select_own"
  on public.daily_intentions
  for select
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

create policy "daily_intentions_insert_own"
  on public.daily_intentions
  for insert
  to authenticated
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

create policy "daily_intentions_update_own"
  on public.daily_intentions
  for update
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  )
  with check (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

create policy "daily_intentions_delete_own"
  on public.daily_intentions
  for delete
  to authenticated
  using (
    (select auth.uid()) is not null
    and (select auth.uid()) = user_id
    and coalesce((((select auth.jwt()) ->> 'is_anonymous')::boolean), false) = false
  );

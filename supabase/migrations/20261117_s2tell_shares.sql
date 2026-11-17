-- s2tell_shares: teen-to-parent delivery of Se'kret-translated messages
-- raw text is NEVER stored — only the rewrite the teen chose to share
create table if not exists public.s2tell_shares (
  teen_user_id   uuid        not null references auth.users(id) on delete cascade,
  parent_user_id uuid        not null references auth.users(id) on delete cascade,
  id             text        not null,
  rewrite        text        not null,
  tone           text        not null,
  saved_at       text        not null,
  created_at     timestamptz not null default now(),
  primary key (teen_user_id, id)
);
alter table public.s2tell_shares enable row level security;
create policy "teen_insert" on public.s2tell_shares
  for insert with check (teen_user_id = auth.uid());
create policy "parent_read" on public.s2tell_shares
  for select using (parent_user_id = auth.uid());

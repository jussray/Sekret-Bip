-- parent_tell_shares: teen-to-parent delivery of S2Tell rewrites.
-- Raw text is NEVER stored; only the rewrite the teen chose to share.
-- Writes are limited to the teen's own confirmed, active parent link.
create table if not exists public.parent_tell_shares (
  teen_user_id   uuid        not null references auth.users(id) on delete cascade,
  parent_user_id uuid        not null references auth.users(id) on delete cascade,
  id             text        not null,
  rewrite        text        not null,
  tone           text        not null,
  saved_at       text        not null,
  created_at     timestamptz not null default now(),
  primary key (teen_user_id, id)
);

alter table public.parent_tell_shares enable row level security;

create policy "parent_tell_shares_teen_insert" on public.parent_tell_shares
  for insert to authenticated
  with check (
    teen_user_id = auth.uid()
    and exists (
      select 1 from public.parent_links pl
      where pl.teen_user_id = auth.uid()
        and pl.parent_user_id = parent_tell_shares.parent_user_id
        and pl.status = 'active'
        and pl.is_active = true
    )
  );

create policy "parent_tell_shares_teen_update" on public.parent_tell_shares
  for update to authenticated
  using (teen_user_id = auth.uid())
  with check (
    teen_user_id = auth.uid()
    and exists (
      select 1 from public.parent_links pl
      where pl.teen_user_id = auth.uid()
        and pl.parent_user_id = parent_tell_shares.parent_user_id
        and pl.status = 'active'
        and pl.is_active = true
    )
  );

create policy "parent_tell_shares_parent_read" on public.parent_tell_shares
  for select to authenticated
  using (parent_user_id = auth.uid());

create index if not exists parent_tell_shares_parent_created_idx
  on public.parent_tell_shares (parent_user_id, created_at desc);

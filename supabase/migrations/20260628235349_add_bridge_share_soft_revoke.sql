alter table public.bridge_signals add column if not exists revoked_at timestamptz;

drop policy if exists "bridge_signals: linked parent read" on public.bridge_signals;
create policy "bridge_signals: linked parent read"
on public.bridge_signals
for select
using (
  revoked_at is null
  and exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bridge_signals.teen_user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

drop policy if exists "bridge_signals: teen update" on public.bridge_signals;
create policy "bridge_signals: teen update"
on public.bridge_signals
for update
using (auth.uid() = teen_user_id)
with check (auth.uid() = teen_user_id);

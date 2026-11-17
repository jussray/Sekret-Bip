begin;

-- The existing Bridge model is canonical:
-- bridge_signals = Doorbell signals
-- bridge_shares = teen S2Tell messages
-- parent_notes = parent replies

alter table public.bridge_shares enable row level security;

drop policy if exists bridge_shares_linked_parent_select on public.bridge_shares;
create policy bridge_shares_linked_parent_select
on public.bridge_shares
for select
to authenticated
using (
  exists (
    select 1 from public.parent_links pl
    where pl.teen_user_id = bridge_shares.user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bridge_shares'
  ) then
    alter publication supabase_realtime add table public.bridge_shares;
  end if;
end $$;

commit;

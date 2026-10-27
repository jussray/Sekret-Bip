begin;

-- The runtime contract has used user_id/source_table/source_id/parent_notified_at
-- since the recorded Phase 3 migration, but older production state left the
-- pre-existing teen/parent alert shape in place. Reconcile additively so the
-- active Edge Function and teen safety coordinator can use one canonical shape.
alter table public.safety_alerts
  add column if not exists user_id uuid,
  add column if not exists source_table text,
  add column if not exists source_id text,
  add column if not exists reviewed_by_parent boolean not null default false,
  add column if not exists parent_notified_at timestamptz;

-- Preserve legacy teen-owned rows only on schemas that actually carry the old
-- teen_user_id column. Fresh replay already starts from the canonical user_id
-- shape and must not fail on a historical column that was never present there.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'safety_alerts'
      and column_name = 'teen_user_id'
  ) then
    execute $sql$
      update public.safety_alerts
      set user_id = teen_user_id
      where user_id is null
        and teen_user_id is not null
    $sql$;
  end if;
end
$$;

alter table public.safety_alerts
  alter column user_id set not null;

-- Legacy-only columns stay available for rollback/compatibility when present,
-- but clean canonical replay does not need to fabricate them.
do $$
declare
  legacy_column text;
begin
  foreach legacy_column in array array['teen_user_id', 'parent_user_id', 'title', 'summary']
  loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'safety_alerts'
        and column_name = legacy_column
    ) then
      execute format(
        'alter table public.safety_alerts alter column %I drop not null',
        legacy_column
      );
    end if;
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.safety_alerts'::regclass
      and conname = 'safety_alerts_user_id_fkey'
  ) then
    alter table public.safety_alerts
      add constraint safety_alerts_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade;
  end if;
end
$$;

-- The legacy trigger requires parent_user_id on every alert and therefore blocks
-- teen-owned alerts when no parent is linked. Parent visibility belongs in RLS;
-- the service-role safety scanner owns alert creation.
drop trigger if exists trg_safety_alerts_link on public.safety_alerts;

alter table public.safety_alerts enable row level security;

revoke all on table public.safety_alerts from anon;
revoke insert, update, delete on table public.safety_alerts from authenticated;
grant select on table public.safety_alerts to authenticated;

-- Remove both legacy and canonical historical policy names before installing one
-- authoritative read-only client contract.
drop policy if exists "safety alerts insert teen only" on public.safety_alerts;
drop policy if exists "safety alerts select linked teen or parent" on public.safety_alerts;
drop policy if exists "safety alerts update parent or teen" on public.safety_alerts;
drop policy if exists "safety_alerts: teen read" on public.safety_alerts;
drop policy if exists "safety_alerts: linked parent read" on public.safety_alerts;
drop policy if exists "safety_alerts: linked parent update reviewed" on public.safety_alerts;

create policy "safety_alerts: teen read"
on public.safety_alerts
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and auth.uid() = user_id
);

create policy "safety_alerts: linked parent read"
on public.safety_alerts
for select
to authenticated
using (
  public.is_non_anonymous_user()
  and exists (
    select 1
    from public.parent_links pl
    where pl.teen_user_id = safety_alerts.user_id
      and pl.parent_user_id = auth.uid()
      and pl.status = 'active'
      and pl.is_active = true
  )
);

create index if not exists idx_safety_alerts_user_created
  on public.safety_alerts (user_id, created_at desc);

comment on table public.safety_alerts is
  'Canonical safety runtime rows. Service-side scanners write; teen owner and currently linked parent can read through RLS. Legacy columns remain nullable for compatibility and rollback when present.';

commit;

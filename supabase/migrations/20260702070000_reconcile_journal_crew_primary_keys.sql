-- Se'kret Bip — reconcile journal_entries / crew_members primary key shape
--
-- docs/RLS_POLICY_AUDIT.md flagged that db/schema.sql (manual bootstrap) used
-- `id bigint primary key` on these two tables, while this migrations path
-- (0001_init.sql) uses `primary key (user_id, id)`. App code generates `id`
-- via `Date.now()` (see src/hooks/useAppActions.ts, src/handlers/actionHandlers.ts,
-- src/context/AppContext.tsx) — a millisecond timestamp that is only unique
-- per user, not globally. A single-column `id` primary key is unsafe under
-- that scheme (two different users can generate the same id in the same
-- millisecond); `(user_id, id)` is the correct shape and is what
-- src/utils/supabase.ts's own comments already treat as canonical.
--
-- db/schema.sql has been corrected to match. This migration reconciles any
-- database that was already bootstrapped from the old single-column-PK
-- version of db/schema.sql, and is a no-op on databases that already have
-- the composite PK (e.g. anything bootstrapped via supabase/migrations).
--
-- Widening a primary key from (id) to (user_id, id) can never violate
-- existing data — a set unique under (id) alone is trivially unique under
-- (user_id, id) too — so this is safe to run against live rows.

do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name into v_constraint_name
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name = 'journal_entries'
    and tc.constraint_type = 'PRIMARY KEY';

  if v_constraint_name is not null and not exists (
    select 1
    from information_schema.key_column_usage kcu
    where kcu.table_schema = 'public'
      and kcu.table_name = 'journal_entries'
      and kcu.constraint_name = v_constraint_name
      and kcu.column_name = 'user_id'
  ) then
    execute format('alter table public.journal_entries drop constraint %I', v_constraint_name);
    alter table public.journal_entries add primary key (user_id, id);
  end if;
end $$;

do $$
declare
  v_constraint_name text;
begin
  select tc.constraint_name into v_constraint_name
  from information_schema.table_constraints tc
  where tc.table_schema = 'public'
    and tc.table_name = 'crew_members'
    and tc.constraint_type = 'PRIMARY KEY';

  if v_constraint_name is not null and not exists (
    select 1
    from information_schema.key_column_usage kcu
    where kcu.table_schema = 'public'
      and kcu.table_name = 'crew_members'
      and kcu.constraint_name = v_constraint_name
      and kcu.column_name = 'user_id'
  ) then
    execute format('alter table public.crew_members drop constraint %I', v_constraint_name);
    alter table public.crew_members add primary key (user_id, id);
  end if;
end $$;

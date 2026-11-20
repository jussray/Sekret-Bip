-- Se'kret Bip — reconcile primary key shape on the remaining client-id tables
--
-- Same issue as 20260702070000_reconcile_journal_crew_primary_keys.sql, on
-- the other five tables that shared the pattern: db/schema.sql used a plain
-- `id bigint primary key`, while this migrations path (0001_init.sql)
-- already used composite `(user_id, id)`. `id` is client-generated via
-- `Date.now()` (see src/hooks/useAppActions.ts, src/handlers/actionHandlers.ts,
-- src/context/AppContext.tsx) — only unique per user, not globally — so the
-- single-column PK is unsafe. db/schema.sql has been corrected to match.
--
-- Tables covered here: mood_history, circle_posts, parent_circle_posts,
-- voice_notes, comfort_sessions.
--
-- Widening a primary key from (id) to (user_id, id) can never violate
-- existing data — a set unique under (id) alone is trivially unique under
-- (user_id, id) too — so this is safe to run against live rows. No-op on
-- any database already on the composite shape.

do $$
declare
  v_table text;
  v_constraint_name text;
begin
  foreach v_table in array array[
    'mood_history',
    'circle_posts',
    'parent_circle_posts',
    'voice_notes',
    'comfort_sessions'
  ]
  loop
    select tc.constraint_name into v_constraint_name
    from information_schema.table_constraints tc
    where tc.table_schema = 'public'
      and tc.table_name = v_table
      and tc.constraint_type = 'PRIMARY KEY';

    if v_constraint_name is not null and not exists (
      select 1
      from information_schema.key_column_usage kcu
      where kcu.table_schema = 'public'
        and kcu.table_name = v_table
        and kcu.constraint_name = v_constraint_name
        and kcu.column_name = 'user_id'
    ) then
      execute format('alter table public.%I drop constraint %I', v_table, v_constraint_name);
      execute format('alter table public.%I add primary key (user_id, id)', v_table);
    end if;
  end loop;
end $$;

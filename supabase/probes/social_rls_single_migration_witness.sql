-- Metadata-only witness for the single approved social RLS migration.
-- Exactly one pipe-delimited row: RLS tables | effective guards | named guards | ledger receipts | other-policy fingerprint.
-- No private application rows, no DDL or writes.
with expected(tablename) as (
  values
    ('friendships'),
    ('circles'),
    ('circle_members'),
    ('circle_posts'),
    ('posts'),
    ('post_comments'),
    ('post_reactions'),
    ('crews'),
    ('crew_check_ins'),
    ('crew_check_in_shares'),
    ('crew_encouragements'),
    ('scrapbook_entries'),
    ('parent_mood_summaries'),
    ('parent_notes')
), expected_guard(expression) as (
  -- Pinned PostgreSQL 17 pg_policies output for the reviewed anonymous-denial predicate.
  -- Complete-expression equality prevents a malicious OR branch from passing a substring check.
  values ('(COALESCE(((( SELECT auth.jwt() AS jwt) ->> ''is_anonymous''::text))::boolean, false) IS FALSE)')
)
select
  (select count(*) from expected e
     join pg_class c on c.relname = e.tablename and c.relkind in ('r', 'p')
     join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
     where c.relrowsecurity) as rls_enabled_tables,
  (select count(*) from expected e
     join pg_policies p on p.schemaname = 'public' and p.tablename = e.tablename
     cross join expected_guard g
     where p.policyname = e.tablename || '_permanent_accounts_only'
       and p.permissive = 'RESTRICTIVE' and p.cmd = 'ALL'
       and p.roles = ARRAY['authenticated']::name[]
       and p.qual = g.expression
       and p.with_check = g.expression) as effective_guard_policies,
  (select count(*) from expected e
     join pg_policies p on p.schemaname = 'public' and p.tablename = e.tablename
     where p.policyname = e.tablename || '_permanent_accounts_only') as named_guard_policies,
  (select count(*) from supabase_migrations.schema_migrations
     where version = '20261006040000') as migration_receipts,
  (select encode(sha256(convert_to(coalesce(
     string_agg(
       concat_ws('~', p.tablename, p.policyname, p.permissive, array_to_string(p.roles, ','),
                 p.cmd, coalesce(p.qual, ''), coalesce(p.with_check, '')),
       E'\n' order by p.tablename, p.policyname), 'none'), 'UTF8')), 'hex')
     from pg_policies p
     join expected e on e.tablename = p.tablename
     where p.schemaname = 'public'
       and p.policyname <> p.tablename || '_permanent_accounts_only'
  ) as other_policies_sha256;

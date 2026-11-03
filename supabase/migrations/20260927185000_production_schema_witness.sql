-- Bounded production schema witness for CI/runtime proof.
-- Exposes only a digest/count/head plus the pgjwt policy state through a
-- service-role-only RPC. Raw migration SQL and migration names remain private.

create or replace function public.sekret_production_schema_witness()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'schemaVersion', 1,
    'authorityFloorVersion', '20260805170500',
    'historySha256', encode(
      extensions.digest(
        coalesce(
          string_agg(
            schema_migrations.version || ':' || coalesce(schema_migrations.name, ''),
            E'\n'
            order by schema_migrations.version
          ) filter (where schema_migrations.version >= '20260805170500'),
          ''
        ),
        'sha256'
      ),
      'hex'
    ),
    'liveMaxVersion', coalesce(
      max(schema_migrations.version) filter (
        where schema_migrations.version >= '20260805170500'
      ),
      ''
    ),
    'historyCount', count(*) filter (
      where schema_migrations.version >= '20260805170500'
    ),
    'pgjwtInstalled', exists (
      select 1
      from pg_catalog.pg_extension
      where extname = 'pgjwt'
    ),
    'pgjwtVersion', (
      select extversion
      from pg_catalog.pg_extension
      where extname = 'pgjwt'
      limit 1
    )
  )
  from supabase_migrations.schema_migrations;
$$;

revoke all on function public.sekret_production_schema_witness() from public;
revoke all on function public.sekret_production_schema_witness() from anon;
revoke all on function public.sekret_production_schema_witness() from authenticated;
grant execute on function public.sekret_production_schema_witness() to service_role;

comment on function public.sekret_production_schema_witness() is
  'Service-role-only bounded production migration-history fingerprint for Se''kret Bip runtime verification.';

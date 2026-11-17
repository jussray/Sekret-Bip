-- Se'kret Bip Bridge permanent-account authorization probe.
-- Catalog-only verification: reads policy/function metadata, writes only a
-- temporary result table, reads no application/user rows, and always ROLLBACKs.

begin;

create temp table bridge_permanent_account_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

insert into bridge_permanent_account_results values
  (
    'direct_request_source_mutations_absent',
    not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and policyname in (
          'bridge_share_requests_teen_insert',
          'bridge_share_requests_teen_update',
          'bridge_share_sources_teen_insert'
        )
    ),
    'Bridge request/source mutation is RPC-only'
  ),
  (
    'phase1_policies_require_permanent_account',
    coalesce((
      select count(*) = 8
        and bool_and(
          coalesce(qual, with_check, '') like '%is_non_anonymous_user%'
          or coalesce(with_check, qual, '') like '%is_non_anonymous_user%'
        )
      from pg_policies
      where schemaname = 'public'
        and policyname in (
          'bridge_share_requests_teen_select',
          'bridge_share_requests_parent_select',
          'bridge_share_sources_teen_select',
          'bridge_summaries_teen_select',
          'bridge_summaries_parent_select',
          'bridge_summary_views_parent_select',
          'bridge_summary_views_parent_insert',
          'bridge_delivery_preferences_owner_all'
        )
    ), false),
    'Every client-visible Phase-1 Bridge policy rejects anonymous Auth sessions'
  ),
  (
    'parent_summary_access_stays_relationship_bound',
    coalesce((
      select qual like '%parent_user_id = auth.uid()%'
        and qual like '%status%ready%viewed%'
        and qual like '%revoked_at IS NULL%'
        and qual like '%expires_at%'
        and qual like '%pl.status%active%'
        and qual like '%pl.is_active%'
      from pg_policies
      where schemaname = 'public'
        and tablename = 'bridge_summaries'
        and policyname = 'bridge_summaries_parent_select'
    ), false),
    'Parent summary reads still require exact current active-link authorization'
  ),
  (
    'parent_view_receipts_revoke_with_summary_access',
    coalesce((
      select qual like '%parent_user_id = auth.uid()%'
        and qual like '%bridge_share_requests%'
        and qual like '%revoked_at IS NULL%'
        and qual like '%pl.status%active%'
        and qual like '%pl.is_active%'
      from pg_policies
      where schemaname = 'public'
        and tablename = 'bridge_summary_views'
        and policyname = 'bridge_summary_views_parent_select'
    ), false),
    'Historical view-receipt metadata is hidden when the parent loses summary access'
  ),
  (
    'revoke_rpc_requires_permanent_account',
    coalesce((
      select p.prosecdef
        and pg_get_functiondef(p.oid) like '%is_anonymous%'
        and pg_get_functiondef(p.oid) like '%permanent_account_required%'
        and pg_get_functiondef(p.oid) like '%teen_user_id = v_teen_user_id%'
      from pg_proc p
      where p.oid = to_regprocedure('public.revoke_bridge_share_request(uuid)')
    ), false)
      and coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('public.revoke_bridge_share_request(uuid)'),
        'EXECUTE'
      ), false)
      and not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('public.revoke_bridge_share_request(uuid)'),
        'EXECUTE'
      ), false),
    'Revocation remains teen-owned, authenticated-only, and rejects anonymous Auth sessions'
  ),
  (
    'revoke_rpc_safe_search_path',
    coalesce((
      select exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where replace(setting, ' ', '') = 'search_path=public,pg_temp'
      )
      from pg_proc p
      where p.oid = to_regprocedure('public.revoke_bridge_share_request(uuid)')
    ), false),
    'Bridge revocation fixes search_path to public and pg_temp'
  );

select check_name, passed, detail
from bridge_permanent_account_results
order by check_name;

rollback;

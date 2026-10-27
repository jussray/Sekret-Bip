-- Se'kret Bip controlled-alpha relationship contract probe
--
-- Purpose:
--   Verify deployed Bridge/Crew migration parity and privilege wiring without
--   reading or mutating teen, parent, Crew, journal, mood, or account data.
--
-- Safety:
--   * Reads PostgreSQL catalogs only.
--   * Creates temporary result rows inside one transaction.
--   * Returns no user identifiers, private content, credentials, or secrets.
--   * Final statement is ROLLBACK, never COMMIT.
--
-- This probe is structural evidence. It does not replace controlled two-account,
-- revocation, blocked-user, deletion, or device journeys.

begin;

create temp table controlled_alpha_relationship_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

insert into controlled_alpha_relationship_results values
  (
    'relationship_tables_keep_rls_enabled',
    not exists (
      select 1
      from unnest(array[
        'public.bridge_share_requests',
        'public.bridge_share_sources',
        'public.bridge_summaries',
        'public.bridge_summary_views',
        'public.crew_check_ins',
        'public.crew_check_in_shares',
        'public.crew_encouragements'
      ]) as expected(table_name)
      where not coalesce((
        select c.relrowsecurity
        from pg_class c
        where c.oid = to_regclass(expected.table_name)
      ), false)
    ),
    'Every Bridge and Crew data table has RLS enabled'
  ),
  (
    'bridge_direct_request_and_source_mutations_absent',
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
    'Authenticated clients cannot directly create or rewrite Bridge consent/source rows'
  ),
  (
    'bridge_create_rpc_is_security_definer',
    coalesce((
      select p.prosecdef
      from pg_proc p
      where p.oid = to_regprocedure('public.create_bridge_share_request(uuid,text,jsonb,timestamptz)')
    ), false),
    'Bridge creation uses the reviewed security-definer RPC'
  ),
  (
    'bridge_create_rpc_has_safe_search_path',
    coalesce((
      select exists (
        select 1
        from unnest(coalesce(p.proconfig, array[]::text[])) setting
        where setting = 'search_path=public, pg_temp'
      )
      from pg_proc p
      where p.oid = to_regprocedure('public.create_bridge_share_request(uuid,text,jsonb,timestamptz)')
    ), false),
    'Bridge creation fixes search_path to public and pg_temp'
  ),
  (
    'bridge_create_rpc_grants_are_explicit',
    coalesce(has_function_privilege(
      'authenticated',
      to_regprocedure('public.create_bridge_share_request(uuid,text,jsonb,timestamptz)'),
      'EXECUTE'
    ), false)
      and not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('public.create_bridge_share_request(uuid,text,jsonb,timestamptz)'),
        'EXECUTE'
      ), false),
    'Only authenticated app callers receive Bridge creation EXECUTE authority'
  ),
  (
    'bridge_create_rpc_enforces_owned_alpha_sources_and_stable_intent',
    coalesce((
      select
        pg_get_functiondef(p.oid) like '%v_source_kind not in (''journal'', ''mood'')%'
        and pg_get_functiondef(p.oid) like '%entry.user_id = v_teen_user_id%'
        and pg_get_functiondef(p.oid) like '%mood.user_id = v_teen_user_id%'
        and pg_get_functiondef(p.oid) like '%active_parent_link_required%'
        and pg_get_functiondef(p.oid) like '%sources_must_be_array%'
        and pg_get_functiondef(p.oid) like '%v_source_id := (v_source_id::bigint)::text%'
        and pg_get_functiondef(p.oid) like '%duplicate_source%'
        and pg_get_functiondef(p.oid) like '%idempotency_conflict%'
        and pg_get_functiondef(p.oid) like '%v_existing_sources <> v_requested_sources%'
      from pg_proc p
      where p.oid = to_regprocedure('public.create_bridge_share_request(uuid,text,jsonb,timestamptz)')
    ), false),
    'Bridge RPC accepts one unique canonical owned Journal/Mood set through an active parent link and rejects conflicting idempotency reuse'
  ),
  (
    'crew_direct_share_mutations_absent',
    not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and policyname in (
          'crew_check_in_shares_owner_insert',
          'crew_check_in_shares_owner_update'
        )
    ),
    'Crew share creation and revocation are RPC-only'
  ),
  (
    'crew_share_owner_trigger_is_private_and_enabled',
    exists (
      select 1
      from pg_trigger trigger_row
      where trigger_row.tgrelid = 'public.crew_check_in_shares'::regclass
        and trigger_row.tgname = 'crew_check_in_shares_owner_guard'
        and not trigger_row.tgisinternal
        and trigger_row.tgenabled <> 'D'
        and trigger_row.tgfoid = to_regprocedure('private.enforce_crew_check_in_share_owner()')
    )
      and to_regprocedure('public.enforce_crew_check_in_share_owner()') is null
      and not coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('private.enforce_crew_check_in_share_owner()'),
        'EXECUTE'
      ), false),
    'An enabled private trigger rejects share/check-in owner mismatches and is not directly executable by app callers'
  ),
  (
    'crew_revoke_rpc_is_scoped_and_explicit',
    coalesce((
      select
        p.prosecdef
        and pg_get_functiondef(p.oid) like '%owner_user_id = v_user_id%'
        and pg_get_functiondef(p.oid) like '%status = ''active''%'
        and pg_get_functiondef(p.oid) like '%returning id into v_share_id%'
      from pg_proc p
      where p.oid = to_regprocedure('public.revoke_crew_check_in_share(uuid,uuid)')
    ), false)
      and coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('public.revoke_crew_check_in_share(uuid,uuid)'),
        'EXECUTE'
      ), false)
      and not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('public.revoke_crew_check_in_share(uuid,uuid)'),
        'EXECUTE'
      ), false),
    'Crew revocation targets one exact active owned share and is unavailable to anon'
  ),
  (
    'crew_policy_helper_is_private_security_definer',
    coalesce((
      select p.prosecdef
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where p.oid = to_regprocedure('private.crew_check_in_access_is_active(uuid,uuid,uuid)')
        and n.nspname = 'private'
    ), false)
      and to_regprocedure('public.crew_check_in_access_is_active(uuid,uuid,uuid)') is null
      and coalesce(has_function_privilege(
        'authenticated',
        to_regprocedure('private.crew_check_in_access_is_active(uuid,uuid,uuid)'),
        'EXECUTE'
      ), false)
      and not coalesce(has_function_privilege(
        'anon',
        to_regprocedure('private.crew_check_in_access_is_active(uuid,uuid,uuid)'),
        'EXECUTE'
      ), false),
    'Crew recipient authorization uses an authenticated-only private security-definer helper rather than an exposed public RPC'
  ),
  (
    'crew_policy_helper_checks_full_relationship_contract',
    coalesce((
      select
        pg_get_functiondef(p.oid) like '%share_row.owner_user_id = p_owner_user_id%'
        and pg_get_functiondef(p.oid) like '%share_row.shared_with = p_member_user_id%'
        and pg_get_functiondef(p.oid) like '%accepted.connection_status = ''accepted''%'
        and pg_get_functiondef(p.oid) like '%blocked.connection_status = ''blocked''%'
      from pg_proc p
      where p.oid = to_regprocedure('private.crew_check_in_access_is_active(uuid,uuid,uuid)')
    ), false),
    'Crew helper requires owner-consistent active share, accepted membership, and no block in either direction'
  ),
  (
    'crew_policies_call_private_helper_without_cross_table_subqueries',
    coalesce((
      select
        count(*) = 3
        and bool_and(coalesce(qual, with_check, '') like '%private.crew_check_in_access_is_active%')
        and bool_and(coalesce(qual, with_check, '') not like '%from public.crew_check_ins%')
        and bool_and(coalesce(qual, with_check, '') not like '%from public.crew_check_in_shares%')
      from pg_policies
      where schemaname = 'public'
        and policyname in (
          'crew_check_in_shares_crew_read',
          'crew_check_ins_crew_read',
          'crew_encouragements_sender_insert'
        )
    ), false),
    'Crew recipient policies avoid mutually recursive RLS and call the private helper'
  );

select check_name, passed, detail
from controlled_alpha_relationship_results
order by check_name;

rollback;

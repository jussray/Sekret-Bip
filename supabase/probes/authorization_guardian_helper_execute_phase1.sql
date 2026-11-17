-- Se'kret Bip guardian helper execution Phase 1 proof harness
--
-- Purpose:
--   Prove the internal guardian authorization predicate is not directly
--   executable by client roles while intended founder/admin RPCs still work.
--
-- Safety:
--   * Uses one existing founder/admin profile only through internal subqueries.
--   * Creates no auth users and writes no application rows.
--   * Returns no user IDs, emails, private content, or secrets.
--   * Final statement is ROLLBACK, never COMMIT.

begin;

create temp table guardian_helper_context (
  founder_user_id uuid not null,
  normal_user_id uuid not null
) on commit drop;

insert into guardian_helper_context(founder_user_id, normal_user_id)
select p.user_id, gen_random_uuid()
from public.app_profiles p
where p.role in ('founder', 'admin')
  and p.can_manage_app = true
order by p.created_at
limit 1;

do $probe$
begin
  if not exists (select 1 from guardian_helper_context) then
    raise exception 'Guardian helper probe requires one founder/admin fixture';
  end if;
end
$probe$;

grant select on guardian_helper_context to authenticated;

create temp table guardian_helper_results (
  check_name text primary key,
  passed boolean not null,
  detail text not null
) on commit drop;

grant all on guardian_helper_results to authenticated;

-- Normal authenticated caller: direct helper and elevated RPCs must be denied.
select set_config(
  'request.jwt.claim.sub',
  (select normal_user_id::text from guardian_helper_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select normal_user_id::text from guardian_helper_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

do $probe$
begin
  begin
    perform public.can_manage_guardian_reviews();
    insert into guardian_helper_results values (
      'normal_direct_helper_denied',
      false,
      'Normal authenticated caller unexpectedly executed the internal helper'
    );
  exception when insufficient_privilege then
    insert into guardian_helper_results values (
      'normal_direct_helper_denied',
      true,
      'Normal authenticated caller has no direct EXECUTE grant on the helper'
    );
  end;

  begin
    perform * from public.list_guardian_verification_queue();
    insert into guardian_helper_results values (
      'normal_queue_rpc_denied',
      false,
      'Normal authenticated caller unexpectedly listed guardian reviews'
    );
  exception when insufficient_privilege then
    insert into guardian_helper_results values (
      'normal_queue_rpc_denied',
      true,
      'Queue RPC still denies normal authenticated callers through internal authorization'
    );
  end;

  begin
    perform public.review_guardian_verification(gen_random_uuid(), true, null);
    insert into guardian_helper_results values (
      'normal_review_rpc_denied',
      false,
      'Normal authenticated caller unexpectedly reached guardian review mutation'
    );
  exception when insufficient_privilege then
    insert into guardian_helper_results values (
      'normal_review_rpc_denied',
      true,
      'Review RPC still denies normal authenticated callers before target validation'
    );
  end;
end
$probe$;

reset role;

-- Intended founder path: direct helper remains private, wrapper RPCs still work.
select set_config(
  'request.jwt.claim.sub',
  (select founder_user_id::text from guardian_helper_context),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', (select founder_user_id::text from guardian_helper_context),
    'role', 'authenticated',
    'is_anonymous', false
  )::text,
  true
);
set local role authenticated;

do $probe$
begin
  begin
    perform public.can_manage_guardian_reviews();
    insert into guardian_helper_results values (
      'founder_direct_helper_denied',
      false,
      'Founder unexpectedly retained direct client execution of the internal helper'
    );
  exception when insufficient_privilege then
    insert into guardian_helper_results values (
      'founder_direct_helper_denied',
      true,
      'Founder uses the reviewed wrapper RPCs rather than calling the helper directly'
    );
  end;

  perform * from public.list_guardian_verification_queue();
  insert into guardian_helper_results values (
    'founder_queue_rpc_allowed',
    true,
    'Founder queue RPC executes through its postgres-owned SECURITY DEFINER context'
  );

  begin
    perform public.review_guardian_verification(gen_random_uuid(), true, null);
    insert into guardian_helper_results values (
      'founder_review_reaches_target_validation',
      false,
      'Review unexpectedly accepted a nonexistent target'
    );
  exception when invalid_parameter_value then
    insert into guardian_helper_results values (
      'founder_review_reaches_target_validation',
      true,
      'Founder passes authorization and reaches target validation'
    );
  when insufficient_privilege then
    insert into guardian_helper_results values (
      'founder_review_reaches_target_validation',
      false,
      'Founder wrapper RPC broke after helper grant restriction'
    );
  end;
end
$probe$;

reset role;

insert into guardian_helper_results values
  (
    'guardian_helper_grants_are_least_privilege',
    not has_function_privilege('anon', 'public.can_manage_guardian_reviews()', 'EXECUTE')
      and not has_function_privilege('authenticated', 'public.can_manage_guardian_reviews()', 'EXECUTE')
      and has_function_privilege('service_role', 'public.can_manage_guardian_reviews()', 'EXECUTE'),
    'Only service_role retains an explicit helper EXECUTE grant; postgres ownership supports internal wrapper calls'
  );

select check_name, passed, detail
from guardian_helper_results
order by check_name;

rollback;

# Supabase Live Relationship Baseline

## Scope and safety

- Project: Se’kret Bip (`tbsevonvegdnlyjgplmm`)
- Project status: active and healthy
- Repository PR: #495
- Evidence type: live catalog, aggregate-only read, rollback-only compilation, and branch-capability evidence
- No migration, credential, account, user-content, storage, or persistent database mutation occurred.

The catalog probes created only temporary result rows inside transactions and ended with `ROLLBACK`. No teen, parent, Journal, Mood, Crew, account, or deletion-record identifiers were returned.

## Live migration state

The database migration history contains the original Bridge and Crew contracts and later hardening through July 18, 2026, but does not contain the three PR #495 relationship migrations:

- `20260718034500_controlled_alpha_relationship_boundaries.sql`
- `20260718035000_deny_blocked_crew_access.sql`
- `20260718035500_harden_bridge_source_idempotency.sql`

Therefore repository integration and live database state remain intentionally different.

## Catalog probe v2 result

Result: **2 of 12 checks pass; 10 of 12 fail because the forward migrations are not applied.**

### Passing live checks

1. Every Bridge and Crew data table inspected has RLS enabled.
2. `create_bridge_share_request` is currently a security-definer RPC executable by authenticated callers and not anon.

### Expected live failures before migration

- direct Bridge request/source insert and request-update policies still exist;
- Bridge RPC search path is currently `public`, not the reviewed `public, pg_temp` contract;
- Bridge RPC still accepts Goal and Scrapbook source kinds and does not enforce source ownership, canonical IDs, duplicate rejection, or stable idempotency intent;
- direct Crew share insert/update policies still exist;
- the private Crew owner-consistency trigger does not exist;
- the scoped Crew revoke RPC does not exist;
- the private caller-bound Crew access helper does not exist;
- recipient policies do not yet use the non-recursive helper;
- a former or blocked Crew sender can still read encouragement rows through the current direct participant policy.

## Live schema compatibility

The planned migrations match the observed live schema:

- Journal and Mood source IDs are `bigint` under composite `(user_id, id)` primary keys;
- Bridge request, source, and summary identifiers are UUIDs;
- Crew check-ins, shares, and encouragements use UUID identifiers;
- Crew shares contain `owner_user_id`, `shared_with`, `status`, `revoked_at`, and `updated_at`;
- Crew relationships contain `user_id`, `member_user_id`, and `connection_status`;
- existing indexes cover Bridge idempotency, Bridge source uniqueness, source ownership lookups, Crew share owner/recipient lookups, Crew membership direction, and encouragement check-in/recipient lookups.

No additional index is required for the proposed controlled-alpha authorization queries based on the observed catalog.

## Aggregate-only drift check

All four pre-application drift counts are zero:

- malformed active Crew shares whose owner differs from the referenced check-in owner: `0`;
- active Crew shares with a blocked relationship in either direction: `0`;
- Bridge source rows outside Journal and Mood: `0`;
- nonterminal Bridge requests containing unsupported source kinds: `0`.

The migration’s malformed-share revocation statement currently has no matching active row. No cleanup sweep is needed for unsupported Bridge source rows before migration application based on this baseline.

## Rollback-only function compilation

The final function bodies compiled successfully as temporary `pg_temp` functions against the live schema and were rolled back:

- Bridge request creation RPC;
- Crew share-owner trigger function;
- Crew scoped revoke RPC;
- caller-bound Crew access helper.

This proves PL/pgSQL syntax and referenced live columns for those functions. It does not prove the full policy DDL, grants, trigger installation, migration order, or post-migration behavior.

## Isolated branch attempt

The founder approved an isolated Supabase development branch at **$0.01344 per hour**.

Supabase rejected `controlled-alpha-validation-20260718` with `PaymentRequiredException`: development branching is supported only on the Pro plan or above.

Verified branch state after the rejection:

- no development branch was created;
- no hourly branch charge started;
- the branch list contains only the existing `main` branch;
- production schema and data remain unchanged.

A Supabase plan upgrade is a separate billing decision and was not approved by the branch-cost confirmation. A separate validation project would also require a separate price and approval.

## Supabase security advisor findings relevant to launch

### Founder action required

- **Leaked password protection is disabled.** Enable it before inviting controlled-alpha password users unless the founder explicitly accepts the risk and documents an alternative authentication boundary.

### Relationship-layer warnings

- Supabase flags authenticated-role policies on Bridge and Crew tables because anonymous sign-ins also receive the authenticated database role. The PR removes direct Bridge and Crew share mutation policies, blocks anonymous callers in the Bridge creation/revocation path, and binds the private Crew helper to a permanent current user. Live anonymous and upgraded-account denial probes remain required.
- Supabase flags `create_bridge_share_request` and `create_crew_check_in` because they are public security-definer RPCs callable by authenticated users. These are intentional app entry points, but the accepted-risk record must require fixed search paths, `auth.uid()` binding, anonymous denial, ownership/relationship checks, explicit grants, focused negative probes, and no direct table mutation alternative.
- `account_deletion_receipts` has RLS enabled with no policies. This may be intentional service-only storage, but the deletion receipt visibility path must be verified through the intended trusted surface before launch claims mention user-visible receipts.

### Broader backlog finding

- `public.uos_set_updated_at` has a mutable search path. It is outside this relationship slice but remains a security-advisor warning and should stay in Founder Room backlog rather than being silently ignored.

## Current decision boundary

Safe repository and catalog preparation may continue. Do not apply the relationship migrations to the live project, change Auth settings, upgrade the plan, create another paid environment, provision secrets, deploy the alpha Worker, create paid builds, distribute builds, or operate controlled accounts without the corresponding founder gate.

The next evidence order is:

1. complete-checkout controlled-alpha tests when repository access or hosted runners recover;
2. TypeScript and implementation-ledger validation;
3. local Supabase reset, or a newly approved paid validation environment after plan/cost approval;
4. catalog probe v2 expecting 12 of 12 in that isolated environment;
5. security advisors after DDL;
6. synthetic anonymous, blocked, revoked, unrelated, source-ownership, and idempotency denial probes;
7. separate founder approval before any live application.

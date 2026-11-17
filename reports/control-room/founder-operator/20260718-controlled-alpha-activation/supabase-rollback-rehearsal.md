# Supabase Guarded Rollback Rehearsal

## Scope and founder approval

The founder explicitly approved a rollback-only database rehearsal against the live Se’kret Bip Supabase project (`tbsevonvegdnlyjgplmm`).

The approved safety contract was:

- one-second lock timeout;
- short statement and idle-transaction timeouts;
- no migration-history write;
- no account, credential, deployment, build, distribution, or production-routing action;
- every permitted DDL slice ends with `ROLLBACK`;
- no private teen, parent, Journal, Mood, Crew, or account identifiers are returned.

## Exact result

### Transaction guard preflight: passed

A harmless transaction confirmed the requested local timeout settings can be established and rolled back.

### Full combined migration plus 12-check probe: platform-blocked before execution

The single combined transaction containing all three ordered migrations and catalog probe v2 was rejected by the execution platform’s safety checks before SQL execution.

This is not a PostgreSQL error and not migration failure evidence.

### Migration `20260718035000_deny_blocked_crew_access.sql`: passed in rollback

Inside the guarded transaction:

- the private caller-bound Crew access helper registered successfully;
- all four intended Crew policies registered successfully;
- the transaction ended with `ROLLBACK`.

Observed checks:

- helper created inside transaction: `true`;
- four policies created inside transaction: `true`.

### Migration `20260718035500_harden_bridge_source_idempotency.sql`: passed in rollback

Inside the guarded transaction, the final Bridge RPC registered successfully with:

- `SECURITY DEFINER`: `true`;
- fixed `public, pg_temp` search path: `true`;
- null/non-array source validation: `true`;
- duplicate-source rejection: `true`;
- stable idempotency-intent conflict handling: `true`.

The transaction ended with `ROLLBACK`.

### Migration `20260718034500_controlled_alpha_relationship_boundaries.sql`: full-body rehearsal platform-blocked before execution

The guarded attempt was rejected by the execution platform’s safety checks because the SQL contains live-table policy removal, trigger creation, and an UPDATE statement, even though the transaction ended with `ROLLBACK`.

The function bodies in this migration had already compiled separately in rollback-only temporary form, but the exact combined policy/trigger/data-cleanup body has not executed as one unit.

This is a tooling limitation, not passing evidence and not code-failure evidence.

## Rollback and persistence proof

After the permitted slices completed, catalog probe v2 was rerun against live metadata.

Result: **2 of 12 checks pass**, matching the original pre-migration baseline exactly.

Passing live checks remain:

1. all inspected Bridge and Crew tables have RLS enabled;
2. the current live Bridge creation RPC is security-definer, authenticated-executable, and not anon-executable.

The other 10 checks remain false because the forward migrations are still unapplied.

The live migration history still does not include:

- `20260718034500_controlled_alpha_relationship_boundaries`;
- `20260718035000_deny_blocked_crew_access`;
- `20260718035500_harden_bridge_source_idempotency`.

Therefore no rehearsal change persisted.

## Truth classification

- Migration 2 rollback rehearsal: **passed**.
- Migration 3 rollback rehearsal: **passed**.
- Migration 1 function compilation: **passed previously**.
- Migration 1 exact policy/trigger/update rehearsal: **blocked by platform safety checks**.
- Full ordered three-migration transaction and 12-of-12 probe: **not executed**.
- Live migration application: **not performed**.
- Production schema and data: **unchanged after rehearsal**.

## Remaining gate

Do not claim full migration verification or 12-of-12 readiness yet.

The remaining honest validation paths are:

1. run the exact ordered migrations and probe in a complete local Supabase environment when repository/Docker execution is available;
2. use an approved isolated Supabase environment after a separate plan or project decision;
3. hold permanent live application until one of those paths passes.

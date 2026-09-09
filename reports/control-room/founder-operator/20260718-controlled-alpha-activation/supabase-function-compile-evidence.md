# Supabase Function Compilation Evidence

## Scope

This evidence validates the complex function bodies from the controlled-alpha relationship migrations against the live Se’kret Bip schema without applying the migrations.

Each function was recreated under `pg_temp` inside a transaction, checked with `to_regprocedure`, and removed by `ROLLBACK`. No function was retained, no function body was executed, no policy or trigger was changed, and no user row was read or mutated.

## Results

- Bridge `create_bridge_share_request` final body: **compiled**
- Crew share owner trigger function: **compiled**
- Crew scoped revoke RPC body: **compiled**
- Crew caller-bound access helper body: **compiled**

The bodies resolved successfully against the observed live tables and columns, including:

- `parent_links`
- `journal_entries`
- `mood_history`
- `bridge_share_requests`
- `bridge_share_sources`
- `bridge_summaries`
- `crew_members`
- `crew_check_ins`
- `crew_check_in_shares`

## Additional source evidence

The new `test/controlled-alpha-crew-access-hardening.test.mjs` file passed independent `node --check` syntax validation from the exact content written to the branch.

## What this proves

- the PL/pgSQL and SQL function bodies parse;
- referenced tables and columns exist in the live schema;
- declared parameter and return types are accepted;
- the temporary function definitions can be created successfully.

## What this does not prove

- full ordered migration execution;
- policy or trigger DDL application;
- grants after migration;
- live RLS behavior;
- function behavior under authenticated, anonymous, blocked, revoked, unrelated, or cross-user sessions;
- idempotency behavior with real rows;
- complete-checkout TypeScript, unit, ledger, Worker, export, or browser checks.

## Next gate

A full isolated migration dry run is still required before live application. Founder approval remains required before applying migrations to the live project.

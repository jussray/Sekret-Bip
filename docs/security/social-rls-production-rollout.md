# Production social RLS guard — controlled rollout

## Canonical scope

Repository migration: `supabase/migrations/20261006040000_social_surfaces_permanent_accounts_only.sql`.

This is a **restrictive, additive authorization change** for 14 existing public-schema social/Circle/Crew/parent tables. It must not change any existing ownership, consent, age, or parent–teen relationship policy; nor can it be treated as completed merely because a file or migration receipt exists.

## Before an authorized production apply

1. Bind the current reviewed `main` commit, the exact production Supabase project reference `tbsevonvegdnlyjgplmm`, the original migration file, and the current remote migration ledger. Recheck each immediately before mutation.
2. Verify every targeted table exists, has RLS enabled, and has no conflicting guard with the same name. Record **policy metadata only**, not private application rows.
3. Confirm that the production migration plan executes **only** the reviewed canonical migration. If the dry-run also lists historical, L3-memory, compliance, or other pending migrations, **STOP**. Restore migration-history parity through separately reviewed reconciliation, then re-run the preflight. Never run a broad `supabase db push` on an unreviewed plan.
4. Preserve the original `20261006040000` migration identity. The generic Supabase MCP `apply_migration` action generates its own version and therefore **must not** substitute for the repository-controlled, version-preserving deployment on this existing migration.
5. Confirm explicit founder approval and an authorized production executor. Do not use uncontrolled client sessions, privileged browser state, or arbitrary test users as migration authority.

## Apply gate

Execute the reviewed migration **only through a version-preserving operator workflow** that first verifies its exact one-file dry-run and current-main/project identity. Hold if the available workflow cannot isolate that one migration. Do not edit the Supabase migration ledger by hand to silence drift.

## Post-apply proof

- The canonical migration identity is recorded in the intended production project's applied history.
- The release verifier observes 14 of 14 effective restrictive `FOR ALL TO authenticated` policies, including anonymous-denial predicates in both `USING` and `WITH CHECK`.
- Existing owner/relationship and consent policies remain unchanged; no grants or private data changed.
- Test denial for an intentionally created **controlled** anonymous account, and authorized functionality for controlled permanent accounts. Verify parent–teen access boundaries with test-only identities and deliberate sharing/revocation. Never use real teen or family content as a diagnostic.
- Keep release certification **blocked** until exact frontend/Worker and affected device/browser paths are observed on the same release identity.

## Recovery

If the apply transaction fails, inspect the database policy catalog and migration ledger before attempting any retry. Do not mark a migration applied unless its changes exist. Since removing these restrictive guards would *widen* access, rollback requires a separate privacy/incident approval; prefer a reviewed forward correction. Never automatically drop guards to turn CI green.

## Evidence discipline

Retain only counts, migration identifiers, commit SHAs, test status, and redacted error categories. Do not publish private provider payloads, access credentials, account identifiers, or young people's content.

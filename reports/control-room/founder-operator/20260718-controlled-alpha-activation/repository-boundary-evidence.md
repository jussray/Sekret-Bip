# Controlled-Alpha Repository Boundary Evidence

## Exact state

- Repository: `jussray/Sekret-Bip`
- Pull request: #495
- Branch: `launch/controlled-alpha-activation`
- Exact head inspected: `293ce60591a1bc2debd7f3a1bbfabb94a8b3b88d`
- PR state: open, mergeable, draft

## Founder Room slices executed

### A. Cohort boundary

- Bridge summaries changed from public `enabled` to `beta`.
- Crew accountability changed from public `enabled` to `beta`.
- Preview profiles use audience `beta`.
- Production profiles use audience `public`, which no longer receives Bridge or Crew availability.
- Emotional Scrapbook remains `internal`.
- Companion memory/L4 remains `disabled`.

### B. Worker fail-closed boundary

- `wrangler.alpha.toml` names the isolated `sekret-backend-alpha` service.
- Committed `BRIDGE_SUMMARIES_ROLLOUT` is `disabled`.
- The configuration requires a founder-approved comma-separated teen-account allowlist at runtime.
- No API or service-role credential is committed.
- Production `wrangler.toml` remains disabled.

### C. Bridge executable-choice and consent-intent boundary

- Controlled alpha supports Journal and Mood sources only.
- Goal and Scrapbook sources are rejected in the client before `create_bridge_share_request` can execute.
- Direct authenticated Bridge request/source insert and request-update RLS policies are removed by the forward migration.
- The security-definer RPC requires a permanent account, active parent link, and source ownership.
- Source input is null-safe and array-validated before reading its length.
- IDs are normalized through `bigint`, duplicate normalized sources are rejected, and non-terminal idempotency-key reuse with another parent or source set returns `idempotency_conflict`.
- The parent remains limited to generated summary rows under the existing Bridge read policies; live denial proof remains required.

### D. Crew mutation and recipient-access boundary

- Client revocation uses `revoke_crew_check_in_share` rather than direct table update.
- Direct authenticated Crew share insert and update policies are removed.
- A private trigger function requires each share owner to match the referenced check-in owner.
- Active malformed legacy share rows are changed to revoked for audit preservation rather than deleted.
- The scoped revocation RPC returns the affected share UUID only when an exact active owned row transitions.
- Recipient share reads, check-in reads, and encouragement inserts use one private security-definer helper.
- The helper requires an active owner-consistent check-in/share, accepted membership, and no blocked relationship in either direction.
- Public policies call the private helper and no longer query each other, avoiding recursive RLS evaluation.

### E. Repository authorization evidence

Added:

- `supabase/migrations/20260718034500_controlled_alpha_relationship_boundaries.sql`
- `supabase/migrations/20260718035000_deny_blocked_crew_access.sql`
- `supabase/migrations/20260718035500_harden_bridge_source_idempotency.sql`
- `supabase/probes/controlled_alpha_relationship_contract.sql`
- `implementation-ledger.extensions/controlled-alpha-relationship-boundaries.json`

The catalog probe reads PostgreSQL catalogs only, writes temporary results inside a transaction, and ends with `ROLLBACK`. It checks RLS enablement, policy absence/presence, function security mode, fixed search paths, explicit grants, private trigger/helper placement, source and idempotency markers, and non-recursive Crew policy wiring. It has not executed against Supabase.

## Source-contract evidence

Added or updated:

- `test/controlled-alpha-activation.test.mjs`
- `test/controlled-alpha-founder-room-plan.test.mjs`
- `test/controlled-alpha-service-boundaries.test.mjs`
- `test/founder-preview-unlock.test.mjs`
- `package.json` focused test command

The exact PR patches were inspected for feature flags, alpha Worker configuration, Bridge client guard, Crew RPC client path, all three forward migrations, catalog probe, ledger extension, Founder Room artifacts, and source contracts.

The current source contracts are present but have not executed on a complete exact-head checkout. Earlier reconstructed controlled-alpha test files passed independent Node syntax checks before the latest SQL-contract additions; that earlier result is not counted as proof for the current head.

## Hosted classification

At exact head `293ce60591a1bc2debd7f3a1bbfabb94a8b3b88d`, GitHub created eight pull-request workflow runs. All completed as failure. The inspected CI jobs for Type-check, Build, Control Room audits, Lint, and Test contain `steps: null` and no job log.

Classification: `runner_startup_failure`.

This is not passing test evidence and not a code diagnosis.

## Not executed or proven

- complete exact-head checkout installation;
- TypeScript compilation;
- full or focused unit execution on the current head;
- PostgreSQL/Supabase migration parse or dry run;
- application of the three forward migrations;
- catalog parity probe execution;
- live policy, grant, trigger, and function-signature parity;
- Wrangler alpha dry-run bundle;
- Expo web export;
- Playwright;
- dedicated alpha Worker deployment;
- teen or parent EAS preview builds;
- Bridge or Crew two-account journeys;
- blocked, revoked, unrelated, anonymous, and cross-user live denial;
- account deletion and second-user isolation;
- iOS/Android device evidence.

## Rollback

Every repository change is reversible through PR #495 commits. Production routing and production Bridge rollout remain unchanged. No credentials, live data, database state, external account, deployment, paid build, merge, or deletion operation occurred. If the migrations are later applied, rollback must use a reviewed forward migration that restores prior functions and policies without deleting user content.

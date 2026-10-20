# bip-release-gate

## 5W1H operating contract

Before planning, editing, or claiming completion, establish requester/owner, exact outcome/non-goals, repository/branch/environment/runtime/provider target, lifecycle/order/rollback, verified reason, and smallest safe implementation/proof.

Last reviewed: 2026-08-20

## Trigger

Before any merge to `main`. Run this last, after task-specific review skills.

## Rule

Discover current release machinery from the repository and live provider evidence. Do not rely on a remembered workflow list, Worker name, route, binding, or dashboard value.

Classify every possible gate as:

- **REQUIRED** — must run/pass on current head;
- **NOT APPLICABLE** — explain why;
- **MANUAL GATE** — requires external verification CI cannot prove.

An untriggered workflow is not automatically passed. A green check from an older SHA is not current evidence.

## Attack 2000 falsification layer

Attack 2000 is mandatory for merge, beta, controlled production mutation, and public-release decisions. It is an adversarial depth contract, not a literal claim that 2,000 tests executed.

For every consequential release claim, record:

- **CLAIM** — the exact thing being asserted;
- **SUBJECT** — exact repository head, release target, runtime/provider identity, or other immutable proof subject;
- **AUTHORITY** — who/what can authorize the transition and what that authority does not permit;
- **EVIDENCE** — the current observations that support the claim;
- **FALSIFIER** — the smallest observation that would force the claim to be withdrawn;
- **RESULT** — PASS, HOLD, or FAIL;
- **ROLLBACK** — the smallest safe reversal or forward-fix path.

Attack the selected claim across the applicable truth planes rather than counting arbitrary test cases. At minimum, try to falsify with:

- exact head or trusted base movement;
- missing, pending, skipped, cancelled, or failed required checks;
- same-name checks emitted by an untrusted app;
- user-visible Playwright that did not actually execute when applicable;
- production source/runtime identity mismatch;
- Supabase migration-history, schema, RLS, or runtime contradiction;
- Cloudflare Pages/Worker/provider readback contradiction;
- stale evidence, stale continuity, or predecessor success being reused as current proof;
- authority scope drift, replay, or a non-authorizing receipt being treated as permission;
- rollback that cannot be attributed safely;
- newer live evidence contradicting repository or historical evidence.

Attack 2000 may only preserve or reduce confidence. It never manufactures merge, deploy, publication, spending, deletion, auth, or provider authority. A failed verification can be a successful Attack 2000 outcome when it correctly prevents a false success claim.

The GitHub merge membrane implements the source-side Attack 2000 slice for exact-head machine evidence. Full beta/public-release Attack 2000 additionally requires the applicable provider, runtime, Supabase, browser, privacy, and rollback planes below.

## Step 0 — Discover, do not assume

Inspect current workflows, diff, exact HEAD, branch protection, current `wrangler.toml`, active Worker/client contracts, and live provider evidence when deployment truth matters.

Read:

- `implementation-ledger.json`
- `DEPLOYMENT.md`
- `docs/CURRENT_STATUS.md`
- `docs/CLOUDFLARE_OWNERSHIP.md`
- `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md`
- `docs/DEMO_READINESS_ENFORCEMENT.md`

Durable production topology:

- frontend Pages: `sekret-bip`;
- stable public API origin: `api.sekretbip.net`, currently repository-configured to `sekret-backend`;
- companion Worker lineage: `sekret`, founder-confirmed active, exact provider binding read back live;
- preferred purpose split: `/api/sekret/*` delegated from `sekret-backend` to `sekret` through a Cloudflare Service Binding after explicit cutover proof;
- deployment authority: Cloudflare native integration, with GitHub exact-release verification rather than a second normal upload path.

## Release gate checklist

### 1. Classify the change

Classify as one or more of:

- app/UI;
- companion Worker/API (`sekret` purpose or `/api/sekret/*` contract);
- public/platform Worker/API (`sekret-backend`);
- Worker route/domain/Service Binding/build-trigger configuration;
- web frontend/Pages (`sekret-bip`);
- Supabase migration/RLS/database function;
- Supabase Edge Function;
- native dependency/config;
- assets/content;
- CI/tooling;
- documentation/agent instructions.

State target: PR merge only, preview/beta, controlled production mutation, or public release.

### 2. Applicable CI

- discover workflows and path/event filters;
- confirm every required check ran on current exact head and passed;
- explain every NOT APPLICABLE workflow;
- run implementation/documentation truth gates when architecture/docs/skills change;
- run Playwright for user-visible/runtime/privacy/release-evidence changes.

A docs-only branch can still trigger provider builds if Cloudflare integration is misconfigured. Provider activity must be classified separately from code/doc applicability.

### 3. Supabase safety

When Supabase/security/RLS/grants/functions change, compare migration history with target project, review authorization/locking/idempotency, run positive/negative tests, preserve rollback/forward-fix, and record live evidence.

If target environment is unavailable, classify proof BLOCKED/MANUAL GATE.

### 4. Worker readiness

When Worker source/config/bindings/AI/voice/auth behavior changes:

- confirm relevant entry points compile;
- confirm current public `wrangler.toml` identity unless intentionally changing it;
- read back live `sekret-backend` and `sekret` provider state when relevant;
- compare bindings with code/secret references;
- keep elevated credentials out of clients and logs;
- run `bip-worker-guardian`;
- test auth before protected access;
- test affected identity/style/Bridge/safety boundaries;
- confirm rollout, telemetry, rollback.

#### Special gate: companion Service Binding

If adding/changing `sekret-backend -> sekret`:

- [ ] `sekret` exact provider identity/routes/version/build trigger known;
- [ ] compatibility proven before activation;
- [ ] `SUPABASE_SERVICE_ROLE_KEY` remains platform-owned;
- [ ] companion telemetry least-privilege seam proven;
- [ ] public client remains on `api.sekretbip.net` unless separately approved;
- [ ] only `/api/sekret/*` delegates;
- [ ] Bridge/email/platform routes stay local to backend;
- [ ] provider binding read back after mutation;
- [ ] exact companion release/version included in release packet;
- [ ] old backend-local companion execution retained as rollback during first cutover;
- [ ] production reply, voice, transcription, auth-denial, rate-limit, and trace journeys pass.

### 5. Pages/web readiness

When web/public routes/assets/Pages change:

- run Expo web export and Playwright;
- verify Pages project `sekret-bip` and custom domain;
- verify `EXPO_PUBLIC_BACKEND_URL` remains the stable approved public origin (`https://api.sekretbip.net` under the current contract);
- confirm no backend/companion secret appears in client bundle;
- confirm build writes the canonical well-known release marker.

Do not point the client directly at `sekret` simply because companion execution moves there internally.

### 6. Exact production evidence

Before a Worker split, follow the exact-release contract in `DEPLOYMENT.md`: repository target, Pages marker, `sekret-backend` health/release identity, Supabase runtime, production Playwright, and applicable account/device proof.

After the companion binding activates, additionally verify:

1. exact `sekret-backend` public release;
2. exact `sekret` companion release/version;
3. live Cloudflare Service Binding readback;
4. production companion paths executing on that version;
5. Bridge/email/platform non-regression;
6. retained rollback.

The retired Supabase `release-health` function is not release evidence.

### 7. Environment variables and secrets

- compare code references with example/config files;
- document/provision new variables/bindings in correct environment;
- keep secrets out of source/logs/public bundles;
- do not duplicate service-role credentials across Worker boundaries for convenience;
- treat AI/voice secret relocation as a separately approved credential migration.

### 8. Expo/EAS readiness

For native changes, confirm EAS profile/platform/version policy and require native build when appropriate. Documentation-only/server-only PRs do not require EAS unless repository policy says otherwise.

### 9. Conditional product gates

- Supabase/data: privacy red-team and denial tests;
- Worker endpoint/binding: `bip-worker-guardian`;
- AI/prompt/summary: AI review + Companion Lab;
- user copy: voice guard;
- Parent/Bridge: controlled relationship/revocation proof;
- beta/release: affected journeys/legal checklist;
- L4: blocked until authorization/deletion/provenance/retention/runtime/rollout/rollback are evidenced.

### 10. Documentation reality

When Markdown/agent skills change:

- active docs agree on current routing vs target purpose;
- historical audits remain labeled snapshots;
- `sekret` is not mislabeled legacy/deletion target;
- current repository routing is not falsely described as already service-bound;
- integrated features are not called released without live proof;
- remaining provider/binding unknowns stay UNKNOWN;
- `node scripts/audit-documentation-truth.mjs` passes.

## Pass criteria

Return `READY TO MERGE` only when all applicable current-head checks/evidence pass and no known safety/privacy/migration/evidence/release blocker applies to the requested merge.

Return `READY TO DEPLOY` only after deployment/provider manual gates and exact-release requirements are satisfied.

## Output

Return one of:

- `READY TO MERGE`
- `READY TO DEPLOY`
- `BLOCKED`

Include current head SHA, change classification/target, applicable checks, NOT APPLICABLE reasons, manual gates, and exact blocker.

Never recommend merging with a known failure. Never describe untriggered/skipped/stale/older-SHA checks as passed.

## Control Room evidence gate

Local Control Room success is local evidence only. It does not merge, deploy, prove provider bindings, or satisfy exact-production verification. If GitHub jobs never execute steps, classify hosted evidence as BLOCKED and preserve local evidence without calling the head merge-ready.

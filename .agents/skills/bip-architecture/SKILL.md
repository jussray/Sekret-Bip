# bip-architecture

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — requester, decision owner, affected users/data subjects, execution authority.
- **What** — requested outcome, concrete deliverable, non-goals, work to preserve.
- **Where** — exact repository, branch, environment, runtime, route, service, table, or provider boundary.
- **When** — lifecycle/release state, ordering, timing constraint, rollback window.
- **Why** — user problem and verified evidence.
- **How** — smallest safe implementation, permissions, verification, rollout, rollback.

Inspect repository and runtime truth for unknowns. Re-run 5W1H when red-team/OODA findings change the plan.

Last reviewed: 2026-08-20

## Trigger

Any session involving new features, refactors, routing changes, state ownership, character/AI integration, onboarding, Supabase trust boundaries, Cloudflare Worker ownership, Service Bindings, or deployment authority.

## Repository truth first

Canonical repository: `jussray/Sekret-Bip`.

Before editing:

1. verify current branch and fresh `main` SHA;
2. read `implementation-ledger.json`;
3. read `docs/CURRENT_STATUS.md`, `docs/TRUTH_AUTHORITY.md`, `docs/CLOUDFLARE_OWNERSHIP.md`, `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md`, and `DEPLOYMENT.md`;
4. inspect actual files/workflows/provider evidence involved;
5. update this skill in the same PR when its durable architecture rules become stale.

Do not use dated launch snapshots as current authority.

## Route groups

```text
app/
  (auth)/
  (onboarding)/
  (teen)/
  (parent)/
  (modals)/
  (dev)/
  +not-found.tsx
  _layout.tsx
  index.tsx
```

The teen/parent route split is a presentation boundary, not authorization. Privacy must also be enforced by RLS, RPC/Worker checks, consent records, Storage policies, and response minimization.

## Current architecture anchors

Verify exact paths before use:

```text
app/                         Expo Router surfaces
src/features/sekret/         companion identity/style contracts
src/contracts/sekretApi.ts   shared companion reply/voice/transcription contract
src/services/backend/        typed Worker client boundary
worker/sekret-reply.ts       companion brain/reply/TTS/STT implementation
worker/index.ts              companion auth/rate/style wrapper
worker/observed-index.ts     companion/backend telemetry wrapper
worker/voice-entry.ts        current public backend entry point
worker/bridge-summary.ts     privileged Bridge summary boundary
worker/email-router.ts       inbound email boundary
worker/audit/                assurance metadata persistence
supabase/migrations/         schema source of truth
supabase/functions/          Edge Functions
security/                    machine-readable security evidence
e2e/                         Playwright guardrails
implementation-ledger.json   feature evidence state
```

Do not invent a remembered monolithic character, state, routing, or Worker file. Inspect current ownership first.

## Canonical Cloudflare ownership

### Public API / platform Worker: `sekret-backend`

Current repository configuration:

- name: `sekret-backend`;
- entry point: `worker/voice-entry.ts`;
- stable public API origin: `https://api.sekretbip.net`;
- deployment authority: Cloudflare native Git/Workers Builds, subject to live provider branch-control evidence.

Best-fit purpose:

- stable public ingress;
- shared front-door auth/rate/release controls where applicable;
- Bridge and privileged data operations;
- Supabase service-role operations;
- inbound email;
- other platform/backend business logic outside companion inference;
- narrow companion assurance ingestion if needed.

### Companion Worker: `sekret`

Founder-confirmed active companion API lineage. Historical Cloudflare-generated rename PRs show `sekret` targeted the same companion/backend lineage before `sekret-backend` became the repository’s canonical public Worker identity.

Best-fit purpose:

- `/api/sekret/reply`;
- `/api/sekret/voice`;
- `/api/sekret/transcribe`;
- companion identity/style enforcement;
- safety-response logic coupled directly to companion replies;
- AI/voice provider execution and provider secrets;
- companion-scoped telemetry that does not require broad database privilege.

Exact live hostname, routes, custom domains, workers.dev state, service bindings, build trigger, version, traffic, and secrets/bindings remain Cloudflare provider-readback truth.

### Preferred connection

Keep the production client single-homed:

```text
client -> api.sekretbip.net -> sekret-backend -> Service Binding -> sekret
                                              for /api/sekret/*
```

Use a Cloudflare Service Binding rather than adding a second public companion URL to Expo/Web configuration.

The target Worker must be provider-proven and backward compatible before the caller activates delegation. Preserve the existing backend-local companion implementation as rollback until exact production proof completes.

### Secret boundary

- `SUPABASE_SERVICE_ROLE_KEY` belongs to the privileged platform plane.
- Do not copy it into `sekret` merely because current assurance telemetry writes metadata directly to Supabase.
- Refactor privileged telemetry persistence behind a narrow backend/internal boundary before removing the direct path.
- AI/voice provider secrets may move with the companion runtime only through an explicitly approved secret migration with rollback and provider readback.
- Client/Pages never receive server secrets.

### Frontend Pages

- project: `sekret-bip`;
- deployment: Cloudflare Pages native Git integration;
- owns Expo web export, static/browser routes, custom domain, public `/.well-known/sekret-release.json`, and client bootstrap.

## Boundary rules

- Worker purpose is not inferred solely from a historical Worker name.
- Current provider binding is not inferred solely from repository intent.
- Clients use one stable public production API origin unless separately approved.
- Bridge/email/platform privileged work does not move to the companion Worker as part of a reply/voice split.
- A Service Binding is a separately gated provider mutation.
- GitHub Actions verifies deployment; it does not become a second normal upload authority.
- The retired Supabase `release-health` function is never valid release evidence.

## Exact-release verification

Before the Worker split, production claims require the current public backend release, Pages marker, Supabase runtime, and production journey proof required by `DEPLOYMENT.md` and issue #696.

After a Service Binding cutover, add:

1. exact `sekret-backend` release identity;
2. exact `sekret` release/version identity;
3. provider readback of the binding;
4. production reply/voice/transcription proof that executes on that companion release;
5. Bridge/email non-regression on the platform Worker;
6. retained rollback proof.

Check status is not enough when deployed identity or binding differs.

## Identity and companion architecture

Required invariants:

- Se'kret is a continuity presence with canonical product identity;
- Suhana, Sy, Cloud, and Night remain distinct named companions;
- legacy identifiers remain only at verified compatibility seams;
- internal-only identities do not leak into user-visible text, speech, archives, notifications, or accessibility labels;
- question budgets/deterministic repair remain enforced;
- telemetry remains metadata-only;
- short-term history and approved context are supported;
- durable L4 continuity memory remains planned until its schema/privacy proof exists.

Do not replace the existing reply brain when a wrapper, adapter, or service delegation can make the canonical boundary authoritative with less blast radius.

## Supabase architecture

- `supabase/migrations/` is the only schema source of truth.
- UI hiding never substitutes for RLS/server authorization.
- server-only tables must not receive client grants merely to silence a scanner.
- elevated database functions require positive owner/role and negative anonymous/cross-user tests.
- retired Edge Functions need explicit replacements/no callers/platform protection where registered.

## L4 continuity boundary

Do not create L4 tables/dashboards before ownership, provenance, correction/deletion, retention, RLS/denial tests, one real runtime consumer, rollout, telemetry, and rollback are approved together.

A dashboard is not implementation.

## State and data rules

- transient UI state belongs in client state only where implementation says so;
- sensitive content must not enter AsyncStorage without reviewed exception;
- identity-bearing fields must not enter unauthorized client state;
- Parent Bridge remains consent-based and response-minimized;
- route separation never substitutes for database/server authorization;
- local/cloud conflict behavior must be explicit before claiming lossless multi-device editing.

## Workflow before changing architecture

1. Identify the user-visible outcome.
2. Resolve current runtime/data/provider owners.
3. Classify privacy, authorization, and secret boundaries.
4. Attack whether the change can be a connection/delegation instead of replacement.
5. Update ledger acceptance/evidence when feature state changes.
6. Implement the smallest reversible runtime slice.
7. Add executable tests, telemetry, rollout, rollback.
8. Run exact-head CI and Playwright where applicable.
9. Deploy/provider-mutate only through explicitly authorized authority.
10. Reconcile provider evidence and durable docs.

For the `sekret` split specifically: provider census -> compatibility -> telemetry least privilege -> service binding -> controlled proof -> exact production proof -> only then remove duplicate companion execution from `sekret-backend`.

## Environment rules

- Use staging when a real staging environment exists.
- Do not claim staging when none exists.
- Document real local/preview/controlled-production/rollback paths.
- Avoid untracked production dashboard edits where repository-controlled paths exist.
- Reconcile emergency production changes immediately.

## Output

At session start, report verified repository/branch/commit, runtime/data/provider owners, privacy/authorization/secret boundaries, target environment/deployment authority, implementation-ledger state, and stale assumptions found.

Repository and live provider truth override this snapshot.

## Control Room ownership boundary

Keep one founder Control Room at `app/(dev)/control-room.tsx` and `src/screens/DevControlRoomWorkspace.tsx`. Local mission execution belongs in existing Control Room services/scripts. The browser never runs shell directly; it calls the authenticated loopback server, which invokes only fixed local-agent missions.
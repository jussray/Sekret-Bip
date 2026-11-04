# Controlled-Alpha System and Dependency Map

## Authority and source-of-truth

- **Founder Control Room:** operating order, artifact status, risks, evidence requirements, and founder gates.
- **GitHub PR #495:** repository implementation and review evidence for `launch/controlled-alpha-activation`.
- **Cloudflare:** canonical Worker previews and, only after founder approval, the dedicated `sekret-backend-alpha` runtime.
- **Supabase:** authenticated accounts, relationship data, RLS/RPC boundaries, deletion requests, storage, and trusted deletion processing.
- **Playwright/device proof:** executed user-journey evidence. A route, feature flag, or deployed file is not journey proof.

## Topology

```text
Teen preview app ─┐
                  ├─ EXPO_PUBLIC_BACKEND_URL ─> sekret-backend-alpha Worker
Parent preview app┘                              │
                                                ├─ JWT authentication and rate-limit boundary
                                                ├─ /api/sekret/reply
                                                ├─ /api/sekret/voice
                                                └─ /api/bridge/summary/generate
                                                         │
                                                         ├─ server rollout gate
                                                         ├─ teen-owned share request lookup
                                                         ├─ selected source lookup
                                                         ├─ model request or deterministic fallback
                                                         ├─ privacy/schema validator
                                                         └─ bridge_summaries persistence

Teen/Parent/Crew clients ── Supabase Auth + RLS/RPC ── relationship tables
Account deletion UI ── request Edge Function ── seven-day request table
Trusted deletion sweep ── account-delete Edge Function ── Storage + Auth deletion + cascade + receipt
```

## Build and routing layer

### Preview

- `eas.json` routes both `preview` and `parent-preview` to `https://sekret-backend-alpha.mcgill-raylene.workers.dev`.
- Both preview profiles set `EXPO_PUBLIC_RELEASE_AUDIENCE=beta`.
- The preview profiles are internal-distribution build definitions, not proof that builds exist or were installed.

### Production

- Production teen and parent profiles remain on `https://sekret-backend.mcgill-raylene.workers.dev`.
- Production uses `EXPO_PUBLIC_RELEASE_AUDIENCE=public`.
- `wrangler.toml` keeps `BRIDGE_SUMMARIES_ROLLOUT="disabled"`.

### Alpha Worker

- `wrangler.alpha.toml` names a distinct service: `sekret-backend-alpha`.
- Alpha Bridge rollout is currently `enabled`, meaning any authenticated user who can create a usable owned request is allowed by the Worker rollout function.
- The dedicated service still needs approved credential provisioning and deployment. A canonical branch preview of `sekret-backend` is not the same service.

## Feature availability layer

`src/constants/relationshipFeatureFlags.ts` currently defines:

- Bridge summaries: enabled;
- Crew accountability: enabled;
- Emotional Scrapbook: internal;
- companion memory/L4: disabled.

Client availability never replaces Supabase authorization or Worker rollout enforcement.

## Bridge dependency chain

1. The teen client builds a share preview and creates a request through `create_bridge_share_request`.
2. The client calls `${EXPO_PUBLIC_BACKEND_URL}/api/bridge/summary/generate` with authenticated backend headers.
3. `worker/index.ts` requires JSON, authenticates the request, applies the Worker rate-limit binding when configured, and routes the request.
4. `worker/bridge-summary.ts` requires a permanent user principal and checks `BRIDGE_SUMMARIES_ROLLOUT` independently from the client flag.
5. `worker/bridge-summary-store.ts` verifies that the request belongs to the teen, is not revoked/expired/deleted, and fetches the complete selected source set.
6. The Worker sends only minimized snippets to the model. Raw source text is not persisted by the Worker.
7. Model output must pass strict shape, size, clinical-language, and seven-word source-leak checks. One corrective retry is allowed, then a deterministic static fallback is persisted.
8. The parent client reads only `bridge_share_requests`, `bridge_summaries`, and `bridge_summary_views`; access depends on live RLS.
9. Teen revocation uses `revoke_bridge_share_request`; parent post-revocation denial must be proved with two accounts.

### Bridge mismatch discovered

The teen client preview accepts `journal`, `mood`, `goal`, and `scrapbook` source kinds, but the Worker store currently supports only `journal` and `mood`. Goal or Scrapbook selections fail closed with `source_not_available`. Controlled alpha must either:

- restrict the selectable source kinds to Worker-supported inputs; or
- implement and verify the missing source lookups, authorization, deletion, and privacy behavior.

The smallest safe launch slice is to restrict alpha selection to journal and mood until the other source paths are fully implemented.

## Crew dependency chain

1. Crew is available only to a permanent, non-anonymous Supabase user.
2. Check-in creation calls `create_crew_check_in` with a de-duplicated recipient set.
3. The owner reads active check-ins and share states from `crew_check_ins` and `crew_check_in_shares`.
4. A recipient feed reads active shares addressed to the signed-in user, then joins active check-ins and encouragements.
5. Encouragement insertion writes sender, recipient, check-in, preset, and local date.
6. Share revocation directly updates `crew_check_in_shares` and depends entirely on RLS for ownership enforcement.

### Crew mismatch discovered

`revokeCheckInShare` returns `{ revoked: true }` whenever Supabase returns no error, even when zero rows match. Controlled alpha needs affected-row proof or a narrowly scoped RPC so the UI cannot claim revocation without confirming a state transition.

## Account-deletion dependency chain

1. The client invokes `account-deletion-request` with explicit confirmation.
2. The Edge Function authenticates the user and inserts one pending request with a seven-day grace period, reusing an existing pending/processing request.
3. The scheduled sweep identifies expired pending requests and invokes the trusted `account-delete` processor sequentially.
4. The processor authenticates with a separate admin secret, claims the request, enumerates every private bucket under the user-owned prefix, removes objects, clears known non-cascading references, removes retained Crew display identity, prepares a hashed deletion receipt, deletes the Auth user, and relies on database cascades for remaining owned rows.
5. Failures mark the request and receipt without logging deleted private content.

### Deletion dependencies still requiring proof

- the request and cancellation functions are deployed and match repository content;
- the scheduled sweep is actually running despite the hosted-runner startup problem;
- every account-owned table has the intended cascade, detach, or anonymization policy;
- parent deletion preserves teen-private content;
- teen deletion immediately ends parent access;
- all private buckets use the expected owner prefix;
- retries are idempotent and orphan detection returns zero;
- local caches are wiped only after the server deletion state is accepted;
- deletion receipts are visible without exposing deleted content.

## Relationship release-gate dependency order

1. architecture and typed contracts;
2. migrations, RLS, RPCs, grants, indexes, and cleanup;
3. Worker privacy, retries, fallback, idempotency, telemetry, and cost boundaries;
4. client disabled/loading/empty/offline/failed/revoked/expired/success states;
5. automated type, unit, migration/RLS, export, build, browser, secret, dependency, and drift checks;
6. founder-only two-account test, revoke/unlink/block/delete, provider outage, malformed output, deletion-during-work, kill switch, and rollback;
7. invited cohort monitoring and stop triggers;
8. monitored beta;
9. general availability.

## Current dependency order for PR #495

1. Keep the Founder Room mission and artifact ledger current.
2. Fix the two repository mismatches that can create false-green behavior:
   - unsupported Bridge source selection;
   - Crew revocation without affected-row confirmation.
3. Add focused contract tests for both fixes.
4. Prepare the non-secret alpha runtime checklist and exact rollback.
5. Obtain founder approval before credential use, deployment, paid build capacity, or distribution.
6. Deploy and identify the dedicated alpha runtime.
7. Produce teen and parent preview builds.
8. Run controlled Bridge and Crew journeys.
9. Run deletion and second-user isolation proof.
10. Run iOS/Android and accessibility/failure-state proof.
11. Produce the verification report and founder decision pack.

## Non-claims

This map does not prove live RLS, deployed Edge Functions, an operating deletion sweep, a dedicated alpha Worker, preview builds, installed devices, two-account isolation, deletion completion, or launch readiness.

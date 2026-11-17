# Demo Readiness Enforcement

Last reviewed: 2026-08-20

This document converts readiness review into enforced implementation policy. Documentation may describe only behavior backed by code, migrations, configuration, tests, live evidence, or a named release gate. Planned behavior is not demo-ready behavior.

## Release posture

Se'kret Bip is suitable for a controlled internal demo only when the demo uses synthetic/non-sensitive data, clearly labels unfinished areas, and avoids unsupported production, privacy, legal, parent-lifecycle, or provider-binding claims.

Public launch or production teen-data collection remains evidence-gated by the then-current launch plan, legal/safeguarding requirements, and exact production proof.

## Evidence states

```text
planned -> contract -> integrated -> verified -> released
```

`implementation-ledger.json` records feature paths, tests, rollout, verification, rollback, and blockers. Architecture/status/agent-skill changes must reconcile machine and documentation truth.

## Enforced completion rule

A feature or deployment path may be called complete only when all applicable layers agree:

1. route/screen behavior;
2. service/API behavior;
3. database/RLS/RPC/Storage/Edge Function behavior;
4. executable tests or documented live proof;
5. telemetry/failure visibility;
6. rollout and rollback;
7. production/provider verification when the claim depends on live Cloudflare or Supabase configuration.

UI hiding is never authorization.

## Worker purpose enforcement

Current checked-in public routing is:

```text
client -> https://api.sekretbip.net -> sekret-backend
```

The durable purpose boundary is:

- `sekret`: founder-confirmed companion API lineage and target owner for reply, voice, transcription, companion identity/style, and reply-coupled safety enforcement;
- `sekret-backend`: stable public ingress plus Bridge/privileged Supabase/email/platform operations;
- preferred connection: Cloudflare Service Binding from `sekret-backend` to `sekret` for `/api/sekret/*`, without adding a second public client URL.

The Service Binding is not demo-ready or production-ready merely because docs describe it. Before claiming the split is active, require provider readback, exact Worker versions, companion path proof, non-regression, and rollback.

`SUPABASE_SERVICE_ROLE_KEY` must not be copied into `sekret` merely to preserve current assurance metadata persistence. Privileged telemetry persistence must move behind a narrow backend/internal boundary first.

## Parent and Bridge enforcement

Bridge is privileged platform behavior and remains on `sekret-backend` in the purpose split.

Parent/Bridge claims require evidence for applicable relationship states, controlled two-account journeys, privacy validation, revocation/unlink/deletion, and minimized notifications.

Bridge may expose only intentionally shared/minimized content. It must not expose raw private journals, private voice transcripts, private companion chats, private memory, or unrelated activity.

## Deployment enforcement

Production authority is Cloudflare native integration. Before the companion split, exact-production evidence includes the then-current requirements from `DEPLOYMENT.md` and issue #696: exact repository target, Pages release marker, canonical public backend health/release identity, Supabase runtime, production Playwright, and applicable account/device witnesses.

After an approved `sekret-backend -> sekret` Service Binding cutover, add:

1. exact `sekret-backend` public release identity;
2. exact `sekret` companion release/version;
3. live provider binding readback;
4. reply/voice/transcription execution on the intended companion release;
5. Bridge/email/platform non-regression;
6. rollback proof to the prior backend-local companion implementation.

The retired Supabase `release-health` function is not valid release evidence. GitHub Actions verifies; it does not silently become a second normal upload authority.

Additional deployment requirements:

- server secrets remain in server-side secret stores;
- Worker CORS/auth/rate-limit behavior matches the actual invocation path;
- authenticated routes do not trust body-only identity;
- Supabase migrations replay and match live state;
- RLS/Storage/Edge Function auth is reviewed;
- provider route/binding/build-trigger unknowns remain UNKNOWN until read back.

## Authorization enforcement

A verified slice does not certify the whole database. Elevated database/function access requires least privilege and executable denial tests.

Companion runtime code should not receive broad platform credentials simply because it needs model access or telemetry.

## Legal and age-gate enforcement

The service is documented as 13+ unless a separately reviewed under-13 product is implemented. Public launch requires the then-current age/consent/legal controls and bypass-resistant proof.

Demos must not ask participants to enter real private journal, voice, account, or sensitive safety information unless the environment is explicitly approved for that data.

## Companion enforcement

The implemented companion system supports short-term history, approved context, canonical identity/style enforcement, voice behavior, and metadata-safe telemetry contracts.

Do not market durable semantic memory, persistent goals, scheduled reflection, persisted relationship phases, or inter-companion coordination as implemented without their complete privacy/runtime proof.

## Required validation

For applicable changes:

```bash
npm run type-check
npm test
npm run lint
node scripts/audit-documentation-truth.mjs
npm run verify:bundle
npm run audit:control-room
npm run validate:companions
npm run test:e2e
npm run verify:prepush
```

For production claims, follow `DEPLOYMENT.md` and preserve the exact release/binding evidence packet.

Any warning involving privacy, authorization, deployment identity, Worker binding, age gates, deletion, safety, or parent/teen boundaries must be resolved or explicitly classified as a non-production limitation.
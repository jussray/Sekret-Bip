<!-- truth-mode: durable -->
# Se’kret Bip 💜

🌐 **Official site:** https://sekretbip.net

> Copyright © 2024–2026 Juss Ray. All rights reserved. Proprietary software; see `LICENSE`.

Se’kret Bip is a privacy-first emotional growth and self-expression product for teens, built with React Native, Expo Router, TypeScript, Supabase, and Cloudflare. Founder Control Room is the operating/evidence layer for approvals, changes, deployments, verification, and rollback.

## Live truth boundary

This README describes durable product and operating contracts. It does **not** declare the live release SHA, provider status, open/closed issue state, or launch verdict.

Before making a current claim, resolve live authority in this order:

1. fresh GitHub `main`, PRs, issues, checks, reviews, jobs, and logs;
2. the newest marked exact-production receipt on issue #696;
3. Cloudflare Pages / Workers / Access evidence for the same target;
4. the intended Supabase project and live migration/runtime evidence;
5. production Playwright and, where required, physical-device and controlled-account proof.

See `docs/TRUTH_AUTHORITY.md` for expiry and supersession rules. A fact that was verified earlier remains historical evidence, but newer contradictory authority revokes its use as present-tense truth.

## State → Evidence → Claim

For every material completion or blocker claim, identify:

- the state observed;
- the evidence and authority that observed it;
- the exact scope of the claim;
- what makes that evidence expire;
- whether newer evidence superseded it.

Keep repository, CI, Cloudflare, Supabase, browser, device, and account witnesses separate.

## Product promise

- Private reflections stay private.
- Teens choose what they share.
- Parent access is relationship-based, not surveillance-based.
- Identity and permissions are enforced by runtime and database boundaries, not only by UI hiding.
- Operational evidence remains metadata-safe and never becomes a back door into private teen content.

## Product and UX direction

Se’kret Bip is a premium, living app experience. Cosmic and character art is visual DNA and atmosphere, not product architecture.

Prioritize interactive product states, companions embedded into real flows, responsive emotional feedback, personalized home behavior, clear Teen / Parent / Bip Jr journeys, accessible motion, and a coherent mobile design system. Do not regress the product into splash-art-led UX.

## Architecture

- **Frontend:** React Native, Expo Router, TypeScript
- **Routes:** auth, onboarding, Teen, Parent, and founder/internal groups
- **Local state:** React state, context, hooks, and AsyncStorage
- **Cloud data:** Supabase Auth, Postgres, RLS, Storage, Edge Functions, ordered migrations
- **Public API front door:** `https://api.sekretbip.net`, currently pinned by repository configuration to Cloudflare Worker `sekret-backend`
- **Companion runtime lineage:** Cloudflare Worker `sekret`; founder-confirmed active and historically the deployment identity for the Se’kret companion API. Exact live routes/custom domains remain Cloudflare provider-readback truth.
- **Web:** canonical Cloudflare Pages project `sekret-bip`
- **Production proof:** exact release identity + Worker health + Supabase runtime + production Playwright + any required account/device witnesses
- **Schema source:** `supabase/migrations/`

### Worker purpose boundary

The checked-in production client is intentionally single-homed to `api.sekretbip.net`; product code must not choose between multiple public Worker URLs.

The preferred purpose split is:

- `sekret` owns the companion execution plane: `/api/sekret/reply`, `/api/sekret/voice`, `/api/sekret/transcribe`, companion style/safety enforcement, AI/voice provider capability, and companion-scoped telemetry;
- `sekret-backend` owns the public API/front-door and privileged platform plane: authentication/rate-limit ingress, Bridge summary/data operations, server-side Supabase service-role work, inbound email, and other non-companion backend business logic;
- when provider readback and code migration are approved, `sekret-backend` should delegate companion requests to `sekret` through a Cloudflare Service Binding rather than exposing a second client-facing URL;
- `SUPABASE_SERVICE_ROLE_KEY` must not be duplicated into the companion Worker merely for telemetry. Privileged persistence should cross a narrow internal boundary or remain backend-owned.

This is a **purpose/target contract**, not a claim that the service binding or route cutover is already deployed. Current provider binding remains Level 0 Cloudflare truth and must be proven before mutation.

Legacy compatibility files and historical provider identities are not a second production authority. `sekret` is not classified as legacy while its active provider role remains founder-confirmed and provider-protected.

## Product areas

### Teen

Room, Pages, journaling, voice reflection, companions, Daily Intentions, Calm/Comfort/Mind + Body Reset, Cloud Thoughts, Circle, Bip Crew, Growth/Insights/History/Memories, period tools, points, and rewards infrastructure exist at different evidence levels. Repository presence is not equivalent to release proof.

### Parent and trusted relationships

Parent routes, account linking, Bridge contracts, relationship-aware access, Parent Circle, and guarded parent surfaces exist. Parent launch readiness remains independently evidence-gated across lifecycle, privacy, production, notification, device, revocation, unlink, and deletion journeys.

## Future lanes

Unless newer exact repository implementation proves otherwise, durable L4 continuity memory, persistent companion goals, scheduled reflection jobs, evidence-derived relationship phases, inter-companion coordination, and L5 cross-companion synthesis remain future lanes. They are not automatic launch dependencies.

## Local setup

```bash
gh repo clone jussray/Sekret-Bip
cd Sekret-Bip
npm install --legacy-peer-deps
cp .env.example .env.local
git lfs pull
npx expo start --web -c
```

### Supabase

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Use ordered migrations as the schema authority; do not maintain a second bootstrap schema.

## Validation

```bash
npm run type-check
npm test
npm run lint
node scripts/audit-documentation-truth.mjs
npm run verify:bundle
npm run audit:control-room
npm run validate:companions
npm run test:e2e
npm run test:e2e:production
npm run verify:prepush
```

A Playwright file committed to the repository is not proof that it executed against deployed production.

## Canonical operating references

- `docs/TRUTH_AUTHORITY.md` — claim freshness, expiry, and supersession
- `docs/CURRENT_STATUS.md` — how to resolve current status without copying volatile state into docs
- `docs/DOCUMENTATION_MAP.md` — documentation authority and archive rules
- `docs/CLOUDFLARE_OWNERSHIP.md` — Worker identity, provider authority, and purpose boundary
- `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md` — preservation, migration, and rollback sequence
- `docs/LAUNCH_ROADMAP.md` — durable launch phases and exit evidence
- `DEPLOYMENT.md` — deployment and exact-production verification contract
- `implementation-ledger.json` and validated extensions — machine-checked feature state
- issue #696 — exact-production release packet and marked receipts

Dated snapshots, historical PR bodies, and old issue comments remain evidence for their observation window only. When documentation and live authority disagree, preserve the history and repair the stale current-use claim.

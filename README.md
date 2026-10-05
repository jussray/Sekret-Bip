<!-- truth-mode: durable -->
# Se’kret Bip 💜

**A private, age-aware space for reflection, self-expression, emotional growth, and healthier family communication.**

🌐 **Official site:** https://sekretbip.net

Se’kret Bip is built for teens and the families who support them. It combines private reflection, journaling, voice, comfort tools, companions, relationship-aware family experiences, and expressive social spaces without turning parent access into surveillance.

> **Boundary:** Se’kret Bip is not a medical, therapy, crisis, or emergency service. It does not diagnose users or replace professional or emergency care.

Copyright © 2024–2026 Juss Ray. All rights reserved. Proprietary software; see `LICENSE`.

## What the product is trying to protect

Se’kret Bip is designed around a simple principle: connection should not require giving up privacy.

- Private reflections stay private unless the product explicitly says otherwise.
- Teens choose what they share through supported sharing and relationship flows.
- Parent and trusted-adult access is relationship-based, permission-aware, and intentionally separated from a teen’s private space.
- Identity and access rules are enforced by runtime and database boundaries, not only by hidden UI.
- Operational evidence must remain metadata-safe and must not become a back door into private teen content.
- Public discovery pages and authenticated account content are separate layers.

## Core experiences

### Teen

The repository contains Teen experiences across reflection, journaling, voice, Se’kret companions, Daily Intentions, Calm / Comfort / Mind + Body Reset, Cloud Thoughts, Circle, Bip Crew, Growth / Insights / History / Memories, period tools, points, and rewards infrastructure.

These features exist at different evidence levels. **Code present in the repository is not the same thing as production-verified behavior.**

### Parent and trusted relationships

Parent routes, linking, Bridge contracts, relationship-aware permissions, Parent Circle, and guarded parent surfaces are part of the product architecture. Parent launch readiness is independently gated by privacy, linking, revocation, unlink, deletion, notification, account, browser, and device evidence.

### Bip Jr

Bip Jr experiences are part of the broader family product direction and remain subject to the app’s age, account, relationship, and release rules. Their existence in source does not override the product’s age-gating or launch requirements.

## Character world

Se’kret Bip’s visual world is part of the experience, but character art is **not** the product architecture.

The approved canonical character family currently includes:

- **Night** — The Watcher
- **Suhana** — The Center
- **Sy** — The Mind
- **Cloud** — The Calm

Character identity is governed by `sekret-bip-character-canon/registry.json`. Ensemble art, world art, prompts, and design descriptions cannot silently redefine a canonical character.

The UX target is a living product: companions embedded into real flows, responsive emotional feedback, personalized home behavior, coherent Teen / Parent / Bip Jr journeys, accessible motion, and a consistent mobile design system.

## Architecture

| Layer | Source of truth |
| --- | --- |
| App | React Native + Expo Router + TypeScript |
| Targets | Web, iOS, Android |
| Client state | React state, context, hooks, AsyncStorage |
| Auth + data | Supabase Auth, Postgres, RLS, Storage, Edge Functions |
| Schema | `supabase/migrations/` |
| Web deployment target | Cloudflare Pages project `sekret-bip` |
| Public API origin | `https://api.sekretbip.net` |
| Checked-in Worker target | `sekret-backend` in `wrangler.toml` |
| Companion Worker lineage | `sekret`, with exact live routing/bindings requiring provider readback |
| Operating / evidence layer | Founder Control Room |

### Worker purpose boundary

The public client is intentionally single-homed to `api.sekretbip.net`.

The durable target split is:

- **`sekret`**: companion reply, voice, transcription, companion style/safety behavior, provider capability, and companion-scoped telemetry.
- **`sekret-backend`**: public API/front-door work, authentication and rate-limit ingress, Bridge/data operations, privileged Supabase work, inbound email, and other backend business logic.

A preferred future topology delegates companion requests from `sekret-backend` to `sekret` through a Cloudflare Service Binding while preserving one public API URL. **That service binding must not be described as live until provider and exact-release evidence prove it.**

Privileged secrets such as `SUPABASE_SERVICE_ROLE_KEY` must not be duplicated into the companion Worker merely for convenience.

## Truth boundary

This README documents **durable product and architecture contracts**, not a live deployment verdict.

Do not use README prose alone to claim the current production SHA, Cloudflare routing, Supabase runtime state, open/closed issue state, or launch readiness. Resolve current truth from fresh evidence:

1. GitHub `main`, PRs, issues, checks, reviews, jobs, and logs;
2. the newest marked exact-production receipt on issue #696;
3. Cloudflare Pages / Workers / Access readback for the same target;
4. the intended Supabase project and live migration/runtime evidence;
5. production Playwright plus controlled-account or physical-device evidence where required.

Use **State → Evidence → Claim**. Older successful evidence remains historical when a newer authority supersedes it.

See `docs/TRUTH_AUTHORITY.md` and `docs/CURRENT_STATUS.md` for the full freshness and supersession rules.

## Repository map

```text
app/                              Expo Router surfaces
src/                              product features, contracts, services, utilities
screens/                          retained screen implementations
worker/                           Cloudflare Worker runtime
supabase/migrations/              ordered database schema authority
e2e/                              browser / journey proof
test/                             unit and contract tests
scripts/                          verification, audit, release, and operator tooling
docs/                             architecture, truth, privacy, launch, and operating docs
sekret-bip-character-canon/       canonical character identity registry
implementation-ledger.json        machine-checked implementation state
```

## Local development

```bash
gh repo clone jussray/Sekret-Bip
cd Sekret-Bip
npm install --legacy-peer-deps
cp .env.example .env
git lfs pull
npm run web
```

Use only local/development-safe values in `.env`. Never commit real provider secrets, service-role keys, or private credentials.

Database migrations are authoritative under `supabase/migrations/`. Linking or pushing to a remote Supabase project is an explicit environment mutation and should only be done against the intended project with the appropriate authority and evidence.

## Validation

Start with the cheapest relevant check and escalate only as needed.

```bash
npm run type-check
npm test
npm run lint
npm run verify:character-canon
node scripts/audit-documentation-truth.mjs
npm run verify:bundle
npm run audit:control-room
npm run validate:companions
npm run test:e2e
npm run test:e2e:production
npm run verify:prepush
```

A committed Playwright test is not proof that the deployed production path passed. Production claims require an executed run against the intended release plus the resulting evidence.

## Canonical operating references

- `docs/TRUTH_AUTHORITY.md` — claim freshness, expiry, and supersession
- `docs/CURRENT_STATUS.md` — current-status resolution protocol
- `docs/DOCUMENTATION_MAP.md` — documentation authority and archive rules
- `docs/CLOUDFLARE_OWNERSHIP.md` — Worker identity and provider authority
- `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md` — Worker preservation, migration, and rollback
- `docs/LAUNCH_ROADMAP.md` — launch phases and exit evidence
- `docs/legal/COPPA_POSITION.md` — age/privacy product constraints
- `DEPLOYMENT.md` — deployment and exact-production verification contract
- `implementation-ledger.json` and validated extensions — machine-checked feature state
- issue #696 — exact-production release packet and marked receipts

Historical snapshots, old PR descriptions, and old issue comments remain evidence for their observation window only. When documentation and fresh runtime authority disagree, preserve the history and repair the stale present-tense claim.
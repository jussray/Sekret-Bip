<!-- truth-mode: durable -->
# Se’kret Bip — Current Status Protocol

This file explains how to determine Se’kret Bip’s **current** status without freezing volatile provider/runtime facts into repository prose.

## Live truth boundary

Do not use this document to determine the live `main` SHA, the open/closed state of an issue, a Cloudflare result, a Supabase runtime result, or whether production Playwright passed.

Resolve those facts from live authority at decision time:

1. GitHub branch / PR / issue / check / review / job state;
2. the newest marked release receipt on issue #696;
3. Cloudflare provider evidence for the same target;
4. the intended Supabase project and live migration/runtime evidence;
5. production browser, controlled-account, and physical-device evidence where applicable.

`docs/TRUTH_AUTHORITY.md` defines how earlier verification becomes historical or superseded when new evidence contradicts it.

## Durable repository posture

Se’kret Bip has an integrated application and infrastructure foundation and uses evidence-gated launch progression. Integrated code is not automatically production verified.

Durable foundations include:

- Expo Router auth, onboarding, Teen, Parent, and founder/internal route groups;
- Supabase Auth, Postgres, RLS, Storage, Edge Functions, and ordered migrations;
- `https://api.sekretbip.net` as the stable public API origin currently configured to `sekret-backend`;
- founder-confirmed active Cloudflare Worker `sekret` as the companion API lineage, with exact provider routing/bindings requiring live readback;
- canonical Cloudflare Pages project `sekret-bip`;
- shared typed companion request/reply/voice/transcription contracts and stable error mapping;
- privacy-safe companion, Circle, Calm/Comfort, relationship, deletion, and operational contracts at varying evidence levels;
- exact-release verification machinery and retained evidence boundaries;
- production audience journeys for Teen, Bip Jr, and Parent that still require an exact deployed-release execution before they become production proof.

## Worker purpose rule

Current routing and target architecture are intentionally separate claims.

**Current repository routing:** clients call `api.sekretbip.net`, which `wrangler.toml` maps to `sekret-backend`.

**Durable purpose boundary:** companion reply/voice/transcription execution belongs with `sekret`; privileged Bridge/data/email/platform work belongs with `sekret-backend`.

**Preferred migration:** preserve the public API URL and delegate `/api/sekret/*` from `sekret-backend` to `sekret` through a Cloudflare Service Binding after provider readback, compatibility proof, least-privilege secret review, and founder approval.

Until that cutover is proven, do not describe the service binding as live. Do not put `SUPABASE_SERVICE_ROLE_KEY` into `sekret` merely to preserve telemetry.

## Evidence layers

Keep these independent:

- code present in a branch;
- exact-head PR checks;
- checks on the merge/current-main commit;
- Cloudflare build/deployment/configuration evidence for each Worker and any binding between them;
- live Supabase schema/authorization/runtime evidence;
- production browser evidence;
- controlled-account evidence;
- physical-device evidence.

A green signal in one layer does not silently prove another.

## Current-status query contract

When an agent or founder asks “where are we now?”, return a small status packet rather than quoting old prose:

```text
STATE
OBSERVED_AT
TARGET_SHA
AUTHORITY
EVIDENCE_REF
CURRENT | HISTORICAL | SUPERSEDED | UNKNOWN
```

Then apply:

```text
State → Evidence → Claim
```

If `main` moved after exact-head evidence, re-pin. If a provider/runtime observation is newer and contradictory, supersede the older current-state claim while retaining it as historical evidence.

For Worker topology questions, separately report:

```text
PUBLIC_FRONT_DOOR
COMPANION_WORKER
PLATFORM_WORKER
SERVICE_BINDING_STATE
PROVIDER_ROUTE_READBACK
EXACT_RELEASE_IDENTITY_PER_WORKER
```

Unknown provider bindings remain UNKNOWN rather than being inferred from repository filenames.

## Launch evidence classes

Before public-launch readiness is claimed, applicable gates include:

- exact production routing and release identity;
- canonical public backend health;
- exact companion Worker identity and service-binding proof once the split is activated;
- live Supabase migration and runtime/authorization evidence;
- auth, session restore, recovery, and onboarding journeys;
- Teen, Bip Jr, Parent/Bridge, Cloud/Comfort, privacy-denial, unlink, and deletion journeys;
- physical-device, accessibility, offline, notification, moderation, and failure-state QA;
- legal, safeguarding, store, support, incident-response, backup, restore, and rollback readiness.

The exact set must come from the then-current launch plan and issue authority, not from a historical snapshot.

## Product and UX direction

Se’kret Bip is a premium, living app experience. Cosmic and character art is atmosphere and visual DNA; it is not the product architecture. Prioritize interactive states, embedded companions, emotional responsiveness, personalized home behavior, clear Teen / Parent / Bip Jr journeys, accessible motion, and a coherent mobile design system.

## Planned lanes

L4 continuity memory and L5 synthesis remain separately governed future lanes unless a newer approved plan and exact implementation prove otherwise. They do not enter launch scope merely because they appear in historical strategy material.

## Canonical references

- `docs/TRUTH_AUTHORITY.md`
- `docs/DOCUMENTATION_MAP.md`
- `docs/CLOUDFLARE_OWNERSHIP.md`
- `docs/CLOUDFLARE_WORKER_CONSOLIDATION.md`
- `docs/LAUNCH_ROADMAP.md`
- `DEPLOYMENT.md`
- `implementation-ledger.json`
- `implementation-ledger.extensions/`
- issue #696 for exact-production release receipts

Historical dated documents remain useful evidence for their observation window. They do not override fresh live authority.

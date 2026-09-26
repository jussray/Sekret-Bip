# Agent Instructions for Se'kret Bip

Use these instructions whenever an AI coding agent works in this repository.

Before material planning, implementation, review, automation, publishing, deployment, migration, or cross-repository coordination, read [`AGENTS_FOUNDER_INTELLIGENCE.md`](./AGENTS_FOUNDER_INTELLIGENCE.md), which loads the Founder Intelligence Constitution and Se'kret Bip's heightened teen privacy, consent, safety, dignity, and anti-surveillance duties.

> **Before making any claim about current PR, deployment, migration, backend state, GitHub Actions status, Cloudflare status, Supabase state, or release truth, inspect the real repository and read `docs/CURRENT_STATUS.md`, `docs/TRUTH_AUTHORITY.md`, `docs/CLOUDFLARE_OWNERSHIP.md`, and `.agents/skills/bip-repo-truth/SKILL.md`. Also check Founder Control Room when release, CI, outage, or cross-repo truth is involved.**

## Current repository checkpoint

- Default branch: `main`.
- Never pin a durable “current main SHA” in this file. Fetch `main` at decision time.
- Exact-production release truth is owned by issue #696 and its newest marked receipt for the exact target.
- Cloudflare branch/build authority is owned by issue #646 and live provider evidence. Its open/closed/reopened state must be read from GitHub live; do not freeze a past resolution into this file.
- Canonical frontend: Cloudflare Pages `sekret-bip`.
- Stable public API origin: `https://api.sekretbip.net`, currently configured by repository `wrangler.toml` to `sekret-backend`.
- Companion Worker lineage: `sekret`, founder-confirmed active and still responsible for the companion API purpose; exact routes/custom domains/build triggers remain Cloudflare provider-readback truth.
- Preferred Worker purpose split: `sekret` for companion reply/voice/transcription execution; `sekret-backend` for public ingress plus privileged Bridge/data/email/platform operations; preserve one client API URL and use a Cloudflare Service Binding for `/api/sekret/*` only after evidence-backed cutover.
- Canonical frontend release marker: `/.well-known/sekret-release.json`.

Do not use old PR descriptions, a local build, a screenshot, a green branch check, or the legacy `/release.json` path as production evidence. Keep repository, CI, Cloudflare, Supabase, browser, device, and account evidence separate.

## Current repo map

Treat these as active architecture until exact inspection proves otherwise:

- `app/(auth)/`
- `app/(onboarding)/`
- `app/(teen)/`
- `app/(parent)/`
- `app/(dev)/`
- `src/`
- `worker/`
- `supabase/migrations/`
- `supabase/functions/`
- `test/`
- `e2e/`
- `.agents/skills/`
- `.control-room/`
- `implementation-ledger.json` and extensions

## Worker purpose boundary

Do not conflate a Worker **name**, a Worker **purpose**, and a Worker’s **current provider binding**.

Current repository routing is single-homed:

```text
client -> api.sekretbip.net -> sekret-backend
```

The code attack and founder topology establish the preferred purpose boundary:

```text
sekret
  companion reply
  companion voice
  transcription
  companion identity/style/safety response enforcement
  AI/voice provider capability

sekret-backend
  stable public API ingress
  Bridge summary and privileged data operations
  Supabase service-role operations
  inbound email
  other platform/backend business logic
```

Preferred migration:

```text
client -> api.sekretbip.net -> sekret-backend -> Service Binding -> sekret
                                      for /api/sekret/* only
```

Cloudflare Service Binding state is provider truth and must not be claimed live before it is configured and read back.

Security rules for this split:

- do not teach clients a second production Worker URL merely to separate services;
- do not move `SUPABASE_SERVICE_ROLE_KEY` into `sekret` to preserve telemetry;
- companion assurance metadata that currently needs privileged persistence must cross a narrow internal/backend-owned boundary or use another least-privilege mechanism;
- Bridge and email do not move with companion inference;
- do not delete, rename, detach, or repurpose `sekret` without exact provider routes/bindings/version/traffic evidence and rollback;
- do not remove the existing backend-local companion implementation in the same step that first activates delegation; preserve rollback until production proof is complete.

## Evidence hierarchy

Keep these proof layers separate:

1. repository code state;
2. local checks;
3. GitHub Actions exact-head state;
4. merge-SHA state on `main`;
5. Cloudflare build/deployment/route/Service Binding state;
6. live Supabase migration, catalog, and authorization state;
7. production-browser state;
8. physical-device and real-account state;
9. Product Design, Figma, Canva, screenshot, or static prototype state.

A green result in one layer does not silently prove another. A PR body is proposed scope and self-reported evidence, not independent proof. A merged PR is repository history, not automatic production proof.

If GitHub Actions has no jobs, no steps, or no logs, classify it as infrastructure evidence, not a code regression.

## Current primary repair boundary

Do not recreate parallel canonical paths merely because historical files describe them. Inspect current source and select one active owner per behavior.

No merged code path is automatic production, device, or real-account evidence.

## Companion naming boundary

Canonical display/canon names:

- Suhana
- Sy
- Cloud
- Night
- Se'kret

Legacy identifiers `raylene`, `rylane`, and `oracle` may remain only where database, storage, analytics, route, fixture, API, or saved-state compatibility requires them.

Never rename persisted identifiers casually. Normalize legacy values at user-facing and AI-facing boundaries. Add compatibility tests before any schema or stored-value migration.

## Global founder stack

Read [`GLOBAL_AI.md`](./GLOBAL_AI.md) before nontrivial work and preserve the full founder reasoning stack.

Every agent must follow:

```text
/elonmusk /garyvee lindymode redteam l99 redteam ooda /truthmode
```

The first red-team pass attacks the premise and evidence. L99 drives implementation depth. The second red-team OODA pass attacks implementation, privacy and security blast radius, rollback, and proof.

Project-local rules may become stricter. They may not weaken teen privacy, consent, security, provenance, evidence, approval, or rollback.

## MCP-to-skill routing

MCP connectivity and Bip skill activation are separate requirements.

Before invoking an MCP server:

1. read `config/mcp-skill-routing.json`;
2. load every skill mapped to that server;
3. load every skill in `alwaysLoad`;
4. stop if a mapped skill is missing;
5. run `npm run verify:mcp` when the routing contract changes.

Auth, login, consent, verification, parent linking, or onboarding work must activate `.agents/skills/bip-auth-onboarding/SKILL.md`.

## Figma and Product Design

For Figma, screen design, room design, design-system, design-to-code, Code Connect, prototype, or visual QA work, also read:

- `.agents/skills/figma-build-implement/SKILL.md`
- `.figma/repository-profile.json`

Figma, Canva, screenshots, and prototypes may guide visual treatment with synthetic or redacted content. They cannot prove runtime, auth, consent, parent visibility, RLS, migrations, devices, deployment, or release truth.

Native-critical flows require controlled device evidence in addition to editable design and web proof.

## OODA workflow

### 1. Observe

Inspect the real repository state before acting.

Check:

- existing files, routes, services, hooks, types, assets, tests, and active imports;
- current branch, PR, and exact head;
- recent merges and open repair candidates;
- type, lint, test, build, bundle, Playwright, and deployment evidence relevant to the task;
- whether the requested feature already exists but is disconnected;
- whether the issue is stale local code, unpushed work, infrastructure outage, deployment drift, live-schema drift, provider-binding drift, or actual code behavior.

Do not assume planned architecture exists. Verify it.

### 2. Orient

Map the task against the active architecture.

Ask which existing file owns the behavior now, whether this is UI, companion runtime, platform backend, database, auth, storage, AI reply, release, or shared work, and whether it is a shipping blocker, demo polish, repair, refactor, or future idea.

Prefer the current working structure over imaginary clean-room architecture.

### 3. Decide

Choose the smallest shipping-safe action.

Before coding, decide whether existing code can be wired instead of replaced, whether the fix can be one focused patch, whether preserved work needs a compatibility boundary, and whether the change requires a migration, environment variable, Worker binding, backend change, test, Playwright proof, device proof, or release-truth record.

If there are multiple fixes, choose the least risky option that keeps the app shippable and preserves future product work.

### 4. Act

Make the change with minimal blast radius.

- Modify only necessary files.
- Keep naming consistent with the repo.
- Preserve existing features, routes, assets, and services unless removal is required for correctness, privacy, security, or release safety.
- Prefer feature flags, route isolation, deprecation notes, compatibility adapters, and reversible service delegation over deletion.
- Before deleting anything, identify all references and explain why preservation is unsafe or materially blocks shipping.
- Avoid new dependencies unless there is no native or existing option.
- Avoid broad refactors unless explicitly required.
- Leave the app easier to understand than before.

After acting, report what changed, why it was the smallest safe change, how existing work was preserved, how it was verified, and what remains unfinished.

## Infrastructure outage and CI classification

Classify evidence before blaming code:

- `runner_startup_failure`: the runner or job failed before meaningful steps executed, especially with no steps, no logs, or null log URLs;
- `workflow_no_jobs`: the workflow scheduled no jobs or was skipped before jobs existed;
- `workflow_step_failure`: at least one job executed steps and logs show a concrete failing command, assertion, build, lint, type, test, or Playwright step.

Never claim a code regression from a zero-step or no-log failure.

Infrastructure failure can still block release truth when exact-head checks are required. Record the blocker and continue independently provable review or code work.

## Founder Control Room and Cloudflare truth

Founder Control Room is the first authority for interpreting GitHub Actions incidents, cross-repo release truth, and Cloudflare evidence.

For every CI or release incident, capture:

- repository;
- PR or branch;
- exact head SHA;
- workflow, run, job, steps, and logs;
- failure classification;
- Cloudflare Pages state;
- `sekret-backend` version/routes/build state;
- `sekret` version/routes/build/binding state when companion authority is involved;
- live runtime evidence;
- impact;
- next gate.

Cloudflare success does not prove GitHub checks, Playwright, auth, data, privacy, Supabase, Worker routes, Service Bindings, or devices. GitHub success does not prove Cloudflare or production.

## Preservation-first rule

Se'kret Bip is being shipped in phases, not reduced to a permanently smaller product.

- Do not delete unfinished product work merely because it is outside the current release path.
- Keep future features available through flags, hidden routes, documented backlog state, or isolated modules.
- Do not maintain duplicate active implementations indefinitely. Select one canonical path and preserve another only when it has clear future value or is an explicit rollback seam.
- Mark deprecated or inactive code clearly.
- Delete only when code is unsafe, irreparably broken, legally risky, secret-bearing, truly obsolete, or proven to have no future use.

## Ponytail rule

Before adding code, ask:

1. Does this already exist?
2. Can existing code be connected instead of replaced?
3. Can Expo do this already?
4. Can React Native do this already?
5. Can Supabase do this already?
6. Can Cloudflare Workers or a Service Binding do this already?
7. Can an installed dependency do this already?
8. Can one small change solve it instead of a new abstraction?

Only write new code after those checks.

## Testing strategy

Use the smallest tool that proves the changed behavior.

1. Unit, service, contract, and regression tests for core logic, privacy contracts, RLS assumptions, route safety, Worker delegation, and compatibility.
2. Playwright for web flows, auth routing, parent/teen boundaries, release guardrails, and user-facing runtime changes.
3. Maestro for real iOS and Android signup, login, onboarding, navigation, linking, Bridge share/revoke, and device smoke journeys.
4. Detox only if a proven native automation gap requires it.

For a Worker-purpose split, prove at minimum: auth denial, rate limit, reply, voice, transcription, trace continuity, exact Worker identities, service-binding readback, Bridge non-regression, email non-regression, and rollback.

Do not add a new test framework to a feature PR unless that PR specifically requires it.

If Playwright cannot run because of runner outage, missing secrets, browser dependencies, or unavailable infrastructure, record a verification blocker rather than blaming code.

## Product priorities

Keep Se'kret Bip simple, shippable, and easy to demo while preserving the larger vision.

Prefer:

- Expo APIs;
- React Native primitives;
- existing app services;
- Supabase features;
- Cloudflare Worker features and Service Bindings where they reduce public/secret blast radius;
- small patches;
- canonical active paths plus preserved, clearly flagged rollback/future work.

Avoid:

- unnecessary dependencies;
- duplicate helpers, services, hooks, types, state systems, schemas, or public deployment authorities;
- broad architecture rewrites;
- cosmetic file moves;
- placeholder systems not wired into the app;
- destructive cleanup for appearance or metrics.

## Product guardrails

Keep the product teen-centered, warm, safe, and non-clinical.

The app is not a therapy replacement. Do not add features that claim to diagnose, treat, or replace emergency support.

Preserve these boundaries:

- teen privacy first;
- parent visibility is optional and consent-based unless an approved safety rule requires escalation;
- anonymous Circle identity protected by default;
- no private names, journal text, voice notes, messages, or safety data exposed across contexts;
- no secrets, tokens, service keys, or private user content in logs, docs, issues, tests, or evidence.

## Development style

- Make the smallest working change.
- Check existing files before creating new ones.
- Keep route and screen names consistent with Expo Router.
- Keep TypeScript types strict and shared where they already exist.
- Do not introduce a new state system unless the existing canonical one truly cannot support the task.
- Do not add environment variables or bindings unless unavoidable.
- Document every required environment variable/binding in the same change.

## Merge authority

Merge when it is the correct evidence-backed integration step, not merely because a PR exists or a badge looks green.

A merge is safe only when:

- repository, target branch, PR, and exact head SHA are verified;
- scope is focused and no unrelated work is hidden;
- changed code, configuration, schema, tests, and docs are reviewed;
- required checks genuinely executed and passed, or an infrastructure outage is classified and the remaining evidence is sufficient for the exact scope;
- Playwright passed for changed user-facing web/runtime paths or is explicitly inapplicable;
- Founder Control Room and Cloudflare evidence were checked when release or deployment truth is involved;
- no unresolved critical review thread remains;
- teen privacy, parent visibility, auth, RLS, credentials, Worker bindings, brand/IP, user data, and rollback remain intact;
- the merge does not silently perform deployment, migration, auth/RLS changes, billing, publication, deletion, credential movement, route/binding mutation, or another separately gated action.

If those conditions are not met, keep working or leave the PR open with the exact blocker.

## Separate approval gates

Require explicit founder approval before:

- force-push;
- production deployment or rollback;
- auth, authorization, RLS, RPC, identity, or parent-linking changes;
- destructive database, Storage, cache, memory, or migration operations;
- secret creation, rotation, deletion, duplication, or exposure;
- domains, DNS, Worker names, Worker routes, Service Bindings, build triggers, app identifiers, signing, or production environment changes;
- paid-service changes;
- expanding parent access or public identity exposure;
- sending external communications;
- deleting Ray/Juss material.

An audit authorizes inspection, not mutation. Approval for one gate does not silently approve the next.

## Before finishing

Verify that:

- every changed file is necessary;
- no duplicate active implementation or public deployment authority was introduced;
- preserved inactive/rollback work is clearly flagged or isolated;
- no unused imports or dead execution branches were added;
- the app can still run in Expo Go unless the change intentionally requires a native build;
- any safety, privacy, parent-teen, auth, RLS, Worker-binding, or identity boundary touched still behaves correctly;
- appropriate tests executed against the intended exact head;
- Playwright passed where applicable or the blocker is recorded;
- Founder Control Room and Cloudflare truth were checked where applicable;
- canonical Markdown and ledger truth were reconciled.
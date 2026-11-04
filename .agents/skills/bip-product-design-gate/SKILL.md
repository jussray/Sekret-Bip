# bip-product-design-gate

## Trigger

Activate whenever the user invokes `@Product Design` or asks to audit, critique, inspect, redesign, ideate, prototype, clone, implement, QA, compare, or share a product flow, screen, UI, onboarding path, companion surface, Figma reference, screenshot, visual mock, or prototype.

Also activate for:

- design feedback before code changes;
- UX or accessibility review;
- Product Design prototype handoff;
- image-to-code, URL-to-code, Figma-to-code, or screenshot-to-code requests;
- visual QA after a Product Design build;
- design evidence claims in a PR.

## Required with

- `bip-repo-truth`
- `bip-typescript-audit` when product design work may affect repository code
- `bip-typescript-root-cause-debugger` when a UI bug has an expected-vs-actual mismatch
- `bip-typescript-behavior-tests` when behavior or flow coverage is needed
- `bip-typescript-minimal-patch` when a code repair is authorized
- `bip-typescript-strict-review` before merge-ready or handoff claims
- `bip-auth-onboarding` when onboarding, signup, login, consent, age, guardian, or post-auth routing is touched
- `bip-supabase-guardian` when Auth, RLS, migrations, Storage, Realtime, Edge Functions, or Supabase client behavior affects the surface
- `bip-privacy-redteam` for sensitive product surfaces, notifications, telemetry, or private content boundaries
- `bip-release-gate` before merge, release, deploy, or production-ready claims

## Core rule

Product Design evidence is design evidence. It is not merge proof, deployment proof, privacy proof, auth proof, Supabase proof, Playwright proof, or production readiness.

A Product Design pass can inform the next GitHub patch, but it does not waive exact-head checks, release gates, privacy review, Supabase schema/RLS/Auth verification, or Founder Control Room evidence.

## Chat mode boundary

If Product Design is invoked in a chat that cannot run Product Design Work Mode tools, do not pretend the Product Design workflow ran. Say the Product Design workflow itself requires Work Mode, and provide the repo-facing plan or skill contract only.

Do not claim screenshots, browser captures, Figma boards, rendered prototypes, or QA passes unless those artifacts were actually produced and inspected.

## Audit contract

For UX, product-flow, onboarding, checkout, settings, or screen audits:

1. identify the product or surface;
2. identify the flow or task;
3. capture evidence from the actual flow;
4. inspect the screenshots before accepting them;
5. tie every finding to a screenshot, step, or named blocker;
6. state what screenshots alone cannot prove.

No screenshot evidence means no completed audit. Indirect docs, memories, old captures, or vibe checks are research, not audit evidence.

## Design QA contract

Use design QA only after both artifacts exist:

- source visual target: Figma node, image, screenshot, mockup, or source capture;
- rendered implementation: local URL, deployed URL, app screen, component, or screenshot.

If either artifact is missing, blocked, stale, or not the same state, write the QA result as blocked.

Before handoff, explicitly evaluate:

- fonts and typography;
- spacing and layout rhythm;
- colors and visual tokens;
- image and asset fidelity;
- app-specific copy and content;
- responsiveness and visible accessibility risks.

A QA result must be `passed` only when no actionable P0, P1, or P2 issues remain. P3 polish may remain as follow-up.

## Supabase boundary

For Supabase-backed product surfaces:

- use synthetic accounts, synthetic project data, and synthetic media for design captures;
- never expose service-role keys, JWTs, refresh tokens, private environment keys, connection strings, bucket secrets, or signed URLs;
- never infer RLS correctness from UI visibility alone;
- require database/Auth/RLS/Edge Function evidence when the visible behavior depends on Supabase access control or server logic;
- do not change migrations, policies, storage rules, or Edge Functions from a Product Design workflow unless a separate Supabase gate authorizes it.

## No visual target, no build

Do not scaffold, edit files, or start a prototype build when there is no URL, screenshot, Figma frame, mockup, source image, existing code target, or selected visual option.

For new design exploration, route through Product Design context and ideation first, then wait for a selected visual direction before implementation.

## Bip privacy and safety boundary

Use synthetic accounts, synthetic profile data, and safe placeholder content for visual captures and prototypes.

Never copy private user data, family data, customer data, media, credentials, or safety-sensitive content into screenshots, Figma, prompts, PR bodies, QA reports, or design boards.

Do not expose private companion internals in user-facing design artifacts.

## Product Design output

When Product Design work informs a repo change, report:

1. product surface and flow;
2. source visual or capture evidence;
3. implementation or prototype evidence;
4. audit or QA result: `passed`, `blocked`, or `research only`;
5. Supabase dependency status: `none`, `client-only`, `auth/RLS-backed`, `edge-backed`, or `unverified`;
6. top issues by severity;
7. smallest code/design next step;
8. verification still required before merge.

## Forbidden shortcuts

Do not:

- use Product Design as a reason to bypass GitHub checks;
- claim visual QA from code review alone;
- claim accessibility compliance from screenshots alone;
- infer Supabase Auth/RLS/schema correctness from screenshots alone;
- replace real screenshots with memory or old artifacts;
- broaden a small annotation into a redesign;
- mix design exploration, production deployment, database mutation, and merge approval into one gate;
- use real private user data in captures or prototypes;
- merge a design-driven PR without release-gate evidence.

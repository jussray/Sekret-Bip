# Se'kret Bip — Issue Closure Log

This log records issue-hygiene decisions that affect repository authority. It is not a feature-status ledger and does not replace `implementation-ledger.json`, `SPRINT.md`, or `docs/CURRENT_STATUS.md`.

## 2026-07-24

A user request to "close old issues" prompted a fresh read-only re-verification pass against current `main`, rather than a blanket age-based sweep. This pass predates and does not repeat the 2026-07-17 authority normalization below; it adds new evidence gathered since, cross-checked against that document's existing scope table.

### Closed as completed

- **#451 — trust: wire explicit onboarding consent into atomic consent service**
  - Verified against current `main`: `app/(onboarding)/consent.tsx` calls `consentService.load()`, `consentService.has('privacyPolicy')`, `consentService.has('termsOfService')`, `consentService.grant(userId, 'privacyPolicy')`, `consentService.grant(userId, 'termsOfService')`, and `consentService.hasCompletedOnboarding()` — the exact `consentService.grant` marker `.control-room/repository.manifest.json`'s `onboarding-requires-explicit-consent-action` usage assertion requires.
  - `node --test test/auth-onboarding-runtime.test.mjs` passes 5/5, including "Control Room proof points to the real consent action."
  - Per this document's canonical table, #451 was tracked as "a focused implementation gate under #413." Closing it does not complete #413; consent and onboarding disclosures remain owned by #413.

### Re-verified and confirmed correctly still open

- **#507 — Founder Control Room: verify direct Comfort and Cloud screen commit**
  - PR #508 (the canonical route restoration) is merged, but the independent copy blocker named in #507's own thread is still present verbatim: `screens/CloudThoughtsScreen.tsx` line 317 still reads "Everything you send here stays between you and Se'kret. 🔒" — an unsupported absolute privacy claim.
  - #507's most recent comment (2026-07-24) also reports a new, unrelated, still-open problem: PR branches auto-deploying to production Cloudflare Workers without an approval gate.
- **#414 (Trust-03) — persistent crisis-support surface**: `components/CrisisSupport.tsx` (`CrisisSupportButton`, `CrisisSupportModal`) exists but has zero imports anywhere else in the app. Built, never mounted. Separately, `worker/sekret-reply.ts`'s `crisisReply()` already provides a real, warm, resource-linked (988, 741741) in-chat crisis response — that chat-side coverage is real and substantial, but it does not satisfy #414's "persistent, always-accessible... across all teen-facing surfaces" surface requirement.
- **#419 / #467 (Trust-08) — AI companion boundary / identity transparency**: `components/companions/AIDisclosureModal.tsx` exists but has zero imports anywhere else in the app. Same unmounted-component pattern as #414.
- **#492 — route every GitHub Actions failure through Founder Control Room**: no `workflow_run`-triggered scanner exists that watches other workflows' completions and auto-classifies failures. Every failure classification observed across this repository's issue history (including several read during this pass) was done manually.
- **#417 / #426 (Trust-06) — account deletion**: `DeleteAccountScreen` / `AccountDeletionControls` are now wired into both `app/(teen)/settings.tsx` and `app/(parent)/settings.tsx` (real progress since #417/#426 were last touched), but full Storage/Auth/second-user-isolation verification proof remains outstanding per `SPRINT.md`'s own account-deletion proof requirements.

### Correction to prior evidence, no status change

- **#563 — Founder Access Recovery Gate**: the `wrangler.toml` naming bug its "Current note" describes (`bip-mail` instead of `sekret-backend`) was already fixed by commit `940cb83` ("fix: restore official backend Worker name"), landing 2026-07-20 10:25:34 UTC — 20 seconds after #563 was opened flagging it. Current `wrangler.toml` correctly reads `name = "sekret-backend"`. This does not close #563: its actual gate (the founder personally completing signup/login/onboarding on a physical device) has no evidence either way and is not something a repository-only pass can verify.

### General infrastructure note

The `runner_startup_failure` GitHub Actions pattern cited as a live blocker across #492, #494, #507, #514, #528, and #563 (and pervasive throughout the 2026-07-17 pass above) appears to have cleared: four PRs merged during this same 2026-07-24 session (#595, #596, #600, #601) all ran real, exact-head CI with real logs and real pass/fail results. Issues that cited only that infra problem as their blocker have since accumulated newer, distinct, still-open problems rather than becoming closable — see #507 above. This note does not itself close or complete any issue.

## 2026-07-17

### Closed as completed

- **#301 — Add Playwright as a Control Room capability and mission**
  - Implementation merged through PR #436.
  - The existing Control Room owns the allowlisted `verify-frontend` mission.
  - Reports distinguish real browser proof from non-browser fallback evidence.
  - Required exact-head workflows passed.

- **#441 — Cloudflare: retain exact-release evidence on failed verification**
  - Implementation merged through PR #445.
  - The verifier writes evidence before polling and refreshes it on every observation.
  - Worker and Pages blockers are machine-classified.
  - Failure and timeout snapshots are retained before the verifier exits.
  - Required exact-head workflows passed.

### Closed as duplicates

- **#248** → **#416** for Bridge consent/privacy behavior, **#270** for controlled deployed proof, **#399** for authorization evidence, and **#417** for deletion cleanup.
- **#282** → canonical **#417** for complete deletion and live proof; **#426** retains user-facing export and deletion-controls scope.
- **#283** → canonical **#259** for the teen + parent V1 program; **#323** retains parent-first onboarding, **#270/#271** retain deployed journey and relationship-settings proof, and **#413/#416/#417/#426/#428** retain consent, privacy, deletion, export, accessibility, and device-quality requirements.
- **#422** → canonical **#413** for consent and onboarding disclosures.
- **#423** → canonical **#414** for persistent crisis-support surfaces.
- **#424** → canonical **#415** for tiered safety-trigger responses in journal and companion paths.
- **#427** → canonical **#418** for age, COPPA/GDPR, jurisdiction, and store-rating decisions; **#413** retains parent onboarding disclosures and **#416** retains parent visibility and Bridge privacy boundaries.

Closing #248, #282, or #283 does not mark Bridge, deletion, parent parity, or launch readiness complete. Their unresolved production, journey, authorization, cleanup, isolation, onboarding, accessibility, and device evidence remains in the canonical issues.

### Kept open and normalized

These issues contained unique launch requirements and were not legitimately closable. Their titles or authority scopes were changed or clarified to remove ambiguity:

- **#259 — OODA: preservation-first path to polished teen + parent V1**
  - Remains the canonical launch program and owns the complete teen/parent product loop and V1 definition of done.
- **#323 — Allow parent-first onboarding without a teen code**
  - Remains open for a useful unlinked-parent dashboard, supported parent-first and teen-first link initiation, explicit handling of proposed QR/email/share-link channels, multiple-child scope, and isolation proof.
- **#344 — Supabase Auth configuration and performance hardening**
  - Renamed and narrowed from the original broad authorization campaign.
  - Retains leaked-password/Auth configuration and bounded performance-advisor work.
  - Historical Phase 0, config-table grant, Edge-retirement, and custom-auth test slices remain evidence but do not complete #399.
- **#357 — Productization: L4 persistence, observers, and live style evidence**
  - Renamed and rewritten around its unique remaining scope.
  - PR #358 completed the implementation-evidence gate and PR #360 completed repository-level style integration.
  - Remains open for live style evidence, privacy-reviewed L4 persistence after #399, and authoritative Control Room observers.
- **#399 — Supabase authorization release gate: RLS and SECURITY DEFINER RPCs**
  - Confirmed as the canonical live authorization gate.
  - Owns private-table and Storage policy review, anonymous-session and cross-user denial, elevated-RPC classification, rollback-contained role matrices, and fresh advisor evidence.
  - A fresh 2026-07-17 production advisor observation still reports broad unresolved finding classes, so closure is not justified.
- **#402 — Verify and release unified frontend-to-Worker contract spine**
  - Remains open because PR #398 established repository integration, not the full exact-production-release, user-visible failure-state, retry, telemetry, privacy, and rollback evidence matrix.
- **#460 — Voice runtime telemetry contract and environment proof**
  - Renamed and updated to identify #479 as its only active implementation PR.
  - Remains open because exact-head checks have not executed, founder merge approval is absent, and no environment migration or rollback-contained live proof exists.
  - Cloudflare previews do not prove database application or realtime voice availability.
- **#464 — Strategy intake: voice, RLS, and visual concepts**
  - Renamed and updated to identify #478 as its only active documentation PR.
  - Remains open until #478's exact-head checks actually execute and pass and the corrected documentation merges.
  - It authorizes no runtime, schema, sprint, roadmap, deployment, or ledger-status change.
- **#270 — Bridge: controlled two-account production proof**
  - Remains open for exact deployed-SHA link, selected-source generation, summary-only parent visibility, raw-source denial, revoke, fresh re-share, unlink, deletion, isolation, and cleanup evidence.
  - The retired token-based deployment blocker is no longer the authority; Cloudflare native Git and exact-release observation are current.
- **#271 — Relationship settings: link status, unlink, and retry states**
  - Remains open for status-aware teen/parent settings, offline/server differentiation, retry, valid-state unlink controls, physical-device QA, and two-account UI proof.
  - Deletion completeness remains #417; export and deletion controls remain #426.
- **#425 — Security: auth, session, endpoint, and device-access hardening**
  - Remains open for TLS, token lifecycle, plaintext-log prevention, device lock, threat modeling, and dependency review.
  - #399 separately owns the live RLS and exposed-RPC security gate.
- **#426 — Privacy: user data export and deletion controls**
  - Remains open because user-facing export is not fully owned by canonical deletion issue #417.
- **#428 — Accessibility and store-quality sweep**
  - Remains open as a distinct device and accessibility QA gate.
- **#429 — Claims and copy audit**
  - Remains open as supporting evidence for canonical submission tracker #420.
- **#430 — Operations: incident and breach response plan**
  - Remains open for runbook ownership, containment, notification, audit evidence, and tabletop proof.

The long-horizon relationship roadmap in #238 also remains open. Its phased Translation, Crew, Scrapbook, and persistent-memory scope is broader than the launch program and must not be collapsed into #259 or represented as V1-complete.

### Active focused pull requests

- **PR #476 — Add founder social provisioning lab and coordinated AI lanes**
  - Owns 24 focused coordination/social files, including one-writer handoffs, `AGENTS.md`, DeepSeek/provider guidance, and the dry-run-only social provisioning lab.
  - Preserves the corresponding #468 boundaries while adding collision and external-platform safeguards.
  - Zero commits behind `main` after ancestry reconciliation.
- **PR #481 — Port Playwright living-room production engine to current main**
  - Owns 12 focused files: the reviewed room manifest, Night prompt pack, Figma blueprint, room-specific Playwright suite, foreman, contract tests, and exact-head room workflow wiring.
  - The initial current-main port preserved all eight #446-added files and all three narrow modified-file patches. Later focused commits added the workflow and hardened the foreman and contract test.
  - Zero commits behind `main`.
- **PR #482 — Add executable Founder Control Room mission core**
  - Owns 15 focused files: the authenticated loopback mission server, launcher, browser client, mission UI, bounded output, Playwright evidence integration, and guarded GitHub route.
  - Zero commits behind #481 and still stacked; it must be retargeted and reverified after its base merges.
- **PR #484 — Extract 5W1H skill contracts and Prompt OS guidance**
  - Owns exactly 19 changed files: the 18 repository skills and `PromptOsPanel.tsx` not present in #476 or #482.
  - The exact reviewed #468 blobs are overlaid on current `main`.
  - Zero commits behind `main` after the ancestry merge.

The current exact heads of #481, #482, and #484 are not merge-ready. Their inspected Quality Gate jobs concluded with `steps: null` and `logs_url: null`; this is runner-startup evidence, not executed test evidence or a code diagnosis.

### Closed pull requests without merge

- **PR #408 — Add Playwright as a Control Room capability (#301)**
  - Closed as a stale mixed branch.
  - Its Playwright scope is superseded by merged PR #436.
  - Its unmerged relationship-status prototype remains tracked by #271 and must be rebuilt on current `main`.
  - Its auth-redirect tests require reassessment against current routing before reuse.

- **PR #446 — feat(room): add Playwright living-room production engine**
  - Closed as the stale-base predecessor to current-main PR #481.
  - The initial #481 port preserved every reviewed added file and the exact `.gitignore`, package-script, and default Playwright-isolation patches.
  - Subsequent #481 commits added focused workflow coverage and foreman/test hardening; those are new current-head work, not lost #446 scope.
  - Closing it does not merge the engine, approve Canva state, implement Night's actor runtime, or prove production behavior.

- **PR #465 — db: add privacy-safe voice runtime telemetry foundation**
  - Closed as a stale-base predecessor to current-main PR #479.
  - #479 preserves the exact architecture document, rollback probe, and contract test; retains the five-file scope; and strengthens implementation-ledger privacy criteria.
  - The opaque UUID and strict payload-allowlist fixes from #465's review are preserved.
  - #479 remains blocked because its workflows ended with no steps or logs and founder merge approval is still required.

- **PR #466 — docs(strategy): red-team voice, RLS, and visual concept pack**
  - Closed as a stale-base predecessor to current-main PR #478.
  - Both corrected documentation files are byte-for-byte identical in #478.
  - The repository-integrated/not-proven-live correction and all privacy, consent, RLS, Bridge, and future-scope boundaries remain intact.
  - #478 remains blocked because its workflows ended with no steps or logs.

- **PR #468 — Make Control Room executable with guarded AI contracts**
  - Closed as a mixed branch after complete file-level decomposition of its original 34 files.
  - #476 owns 3 original coordinated AI/provider files, #482 owns 12 original executable Control Room files, and #484 owns 19 skill/Prompt OS files.
  - #482 later added three focused GitHub-route files, bringing its current scope to 15 without changing the original partition.
  - Core agent, launcher, server, and browser-client blobs are exact in #482.
  - #482's focused test removes DeepSeek and whole-repository skill assertions now owned by #476/#484 and adds room-suite compatibility checks.
  - Closing #468 does not merge any focused PR, activate a provider adapter, authorize social-account creation, or prove production Control Room execution.

Closing #446, #465, #466, or #468 does not complete their replacement work or authorize merge, deployment, database application, external account mutation, or product-status promotion.

The canonical Trust and launch issues remain open. Their launch-critical acceptance criteria, physical/runtime evidence, policy review, and safety proof are not satisfied merely because duplicate trackers or stale branches were removed.

## Closure standard

Use `completed` only when the issue's declared implementation and verification criteria are met. Use `duplicate` only when another issue clearly owns the same outcome with equal or stronger scope. Preserve links to merged PRs, test evidence, production witnesses, or every canonical issue required to retain the original scope in the closure comment. Close stale PRs without merge only after confirming a current-main replacement preserves all unique reviewed work. For a mixed branch, account for every changed file before closure. Treat zero-step or no-log failures as infrastructure evidence rather than a pass or code diagnosis. Normalize overlapping open issues when each retains unique unfinished work instead of forcing a misleading closure.

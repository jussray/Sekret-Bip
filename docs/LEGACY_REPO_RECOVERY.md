# Legacy Repository Recovery Ledger

**Purpose:** record which Se'kret Bip code still lives outside `jussray/Sekret-Bip`, who rightfully owns it, and what has been recovered. Repository identity follows each repository's current purpose; code provenance decides what is recovered here.

**Audit base:** `jussray/Sekret-Bip@34641f1aa0238fa1b4454bce8d8524407f5eee12` (main, 2026-10-06). Observed 2026-10-08.

## Repositories inspected

| Repository @ SHA | Current role (from its own `AGENTS.md` / README) | Bip code still inside |
|---|---|---|
| `Sekret-Bip-Bridge@721d22bf` | investigate-only redirect to canonical | 2026-05 single-file React Native prototype (`App.js`), Engineering OS v1 proposal (`docs/architecture/*`, `tools/reviewers/*`), `utils/moodEngine.js` |
| `Sekret-Bip-Parents@be7a0e9b` (formerly `jussray/do-not-use`) | read-only legacy archive | 2026-05 prototype `app.js` with parent role, `screens` (Parent Portal) |
| `sekret-bip-companions@08e1aece` (formerly `sekret-bip-demo`) | public, non-canonical web demo | Vite demo screens derived from Bip concepts |
| `Sekret-Bip-Gov@65275f83` | created 2026-10-06; README only | none |
| `bip-jr@cf773ff1` | investigate-only redirect to canonical | Bip Jr child product: Study Buddy curriculum, safety contract, authority model migrations, `jr-authority-service` Edge Function |
| `jussray@907725dd` | profile + Juss & Co site | none (Bip gets no public link until its front door is live) |

## Ownership map

| Component | Location | Disposition | Evidence |
|---|---|---|---|
| Mood → growth-room copy | Bridge `utils/moodEngine.js` | Already recovered | `src/utils/moodEngine.ts` ("Converted from utils/moodEngine.js") |
| Comfort / Calm / Parent Portal prototype copy | Bridge `App.js`, Parents `app.js`, `screens` | Superseded, keep as history | Canonical evolved Calm reset catalog (`src/features/reset/catalog.ts`), Parent Se'kret coach (`constants/parentSekret.ts`), Bridge, S2Tell. Porting the prototype would create a second copy. |
| Engineering OS v1 invariants and reviewer scripts | Bridge `docs/architecture/*`, `tools/reviewers/*` | Superseded, do not port | Already classified in `docs/BIP_ENGINEERING_OS_STATUS.md`. Invariant I-5 contradicts current schema (`audit_events` deliberately allows authenticated insert, `20260713024245_harden_audit_control_room_policies.sql`). Companion tone table uses legacy Raylene/Rylane, not current canon. Canonical coverage: `scripts/control-room-rls-scan.mjs` and the `test/supabase-bridge-*` / `test/bridge-summary-*` suites. |
| Demo screens | companions `src/screens/*` | Stays in demo | Demo is non-authoritative by its own README; no unique product logic found. |
| **Bip Jr Study Buddy** (30 reviewed missions, progress rules, mode policy) | bip-jr `src/child/**` | **Recovered here** | Absent from canonical before this change; canonical had only parent-side `jr_child_profiles` (`src/services/bipJr.ts`). |
| **Bip Jr child safety contract** | bip-jr `src/child/config/safetyContract.ts` | **Recovered here** | Governs every child-facing Bip Jr surface. |
| Bip Jr Study screen | bip-jr `app/(child)/study.tsx` | **Recovered here (Transfer 2)** as an adult-supervised Parent route | Founder approval 2026-10-08. Runs under the Parent account; no child account or login. |
| Other Bip Jr child routes (`room`, `pages`, `calm`, `bridge`, onboarding) | bip-jr `app/(child)/*` | Pending | A child-operated surface needs the authority model below plus COPPA and child-welfare review. |
| Bip Jr authority model (migrations + `jr-authority-service`) | bip-jr `supabase/**` | Blocked | Database migration and Edge Function deploy; bip-jr's own Phase 2C gate (disposable database proof, advisors, legal and child-welfare review) is unmet. |
| Chief AI Prompt Machine license template | `CHIEF_AI_PROMPT_MACHINE_LICENSE.md` | **Exported (Transfer 3)** | Now `jussray/chief-ai-machine:docs/legal/CHIEF_AI_PROMPT_MACHINE_LICENSE.md`. |
| JBH Messenger message and payment policy | `lib/juss-beautiful-hair/*`, its tests, `docs/integrations/juss-beautiful-hair-messenger.md` | **Exported (Transfer 4)** | Now `jussray/jbh-private:automation/messenger/`. Removal from this repository is PR #1134. |
| Founder Control Room material inside canonical | `control-room/` | Out of scope here | Rightful owner `founder-control-room` is not attached to this recovery. |

## Transfer 1 — Bip Jr Study Buddy domain

Source `jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2`:

| Source path (blob) | Destination |
|---|---|
| `src/child/types/study.ts` (`15828f2f`) | `src/bipJr/study/types.ts` — `ChildAgeBand` now reuses `BipJrAgeBand` |
| `src/child/services/studyBuddy.ts` (`0b9a90b3`) | `src/bipJr/study/curriculum.ts` — content unchanged |
| `src/child/config/studyBuddy.ts` (`9f678993`) | `src/bipJr/study/modes.ts` |
| `src/child/services/studyProgress.ts` (`2726822c`) | `src/bipJr/study/progress.ts` (pure rules) + `progressStore.ts` (device storage; unreadable data now logs a warning instead of resetting silently) |
| `src/child/config/safetyContract.ts` (`8d7cfa85`) | `src/bipJr/safetyContract.ts` |

Proof: `test/bip-jr-study-buddy.test.mjs` exercises the curriculum, answer checks, progress rules, storage normalization, locked modes, and the safety contract.

Not changed: no migration, RLS, Edge Function, or network call.

Source repositories are untouched. Nothing is deleted from `bip-jr` until a child route in this repository is verified and deletion is separately approved.

Rollback: revert the commit; nothing else depends on `src/bipJr/`.

## Transfer 2 — Study Buddy screen, parent-supervised

Source `jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:app/(child)/study.tsx` → `app/(parent)/bip-jr-study.tsx`.

- Reached from the Study Buddy card on `app/(parent)/bip-jr.tsx`. Registered with `href: null` in `app/(parent)/_layout.tsx`, so it adds no tab. Route constant `PARENT_ROUTES.bipJrStudy`.
- Adult-operated on the parent's device. No child account is created, and no data leaves the device.
- Opened from a profile row, the selected child (`{ id, ageBand }`) is handed to the screen through device storage (`jr_study_active_child_v1`), never in the URL. Progress is stored under that child's own key (`jr_study_progress_v1:<id>`). Opened from the general card, the handoff is cleared, the screen uses a device key, and it says that progress is shared.
- Every study progress key and the handoff key are cleared on sign-out (`clearPrivateAccountCache` → `clearAllStudyProgress`).
- A failed progress save is shown on screen, never hidden.
- Proof: `e2e-founder-preview/bip-jr-study-buddy.spec.ts` (Playwright, 390 px). Covers the entry card, per-child progress separation, a wrong-then-right answer, the hint, progress surviving a reload, age and subject switching, locked modes, no horizontal overflow, and zero requests to any non-local host.

Fixed separately in PR #1148: the Parent tab bar no longer shows stray `bip-jr`, `circle/feed` and `teen-verification` tabs.

## Transfer 3 — Chief AI Prompt Machine license template (outbound)

- Destination: `jussray/chief-ai-machine` PR #213, merged as `a92495c` on 2026-10-09. Body byte-identical to this repository's copy (blob `a6ec2dc0`), with a header marking it a draft template.
- The removal from this repository is a separate gate. `AGENTS.md` requires explicit founder approval before deleting Ray/Juss material, so the removal takes effect only when Juss explicitly approves this deletion together with the exact-head merge. Until then the source copy stays.
- `docs/legal/LICENSE_AUDIT_2026.md` keeps its dated finding and points to the new location.
- Rollback: revert the removal commit; the destination copy is unaffected.

## Transfer 4 — JBH Messenger policy (outbound)

- Destination: `jussray/jbh-private` PR #84, merged as `0b0f093` on 2026-10-09. `automation/messenger/message-policy.mjs` and `payment-policy.mjs` are byte-identical to `Sekret-Bip@1d494ec` plus a provenance header; the tests run in jbh-private's `messenger-policy.yml` workflow.
- Removal here is PR #1134, which predates the export. The export it was missing has now landed; that is one prerequisite, not a merge verdict. Merging #1134 still needs its own exact-head checks and Juss's explicit approval of the deletion.

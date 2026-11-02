# Browser verification lanes

Bip deliberately separates local, public-production, and authenticated live proofs.
None of these commands merges, deploys, or grants release authority by itself.

## Local browser regression

`npm run test:e2e` uses `playwright.config.ts` against the local Expo web app
with public Supabase variables deliberately blank. It tests public and
unauthenticated behavior and cannot prove authenticated private screens.
Do not inject a fake account to bypass the age, guardian, email-verification,
or permanent-identity gates. Private-surface screenshot failures under this
configuration are not evidence that a user can access those screens.

## Public production, read only

`npm run test:e2e:production` uses `playwright.production.config.ts` and
covers public teen, Bip Jr, parent, and signup transport journeys. The signup
transport fixture intercepts all Auth requests and must never create an
account. Check the configured exact production release identity separately.

## Gated live onboarding and permanent-account proof

`playwright.live-onboarding.config.ts` runs `live-onboarding-email.spec.ts`
and `live-family-authority.spec.ts`. Use `LIVE_ONBOARDING_PHASE=readiness`
for its no-write signup rehearsal. Account creation, confirmation, return
sign-in, parent invitation, and family linking require isolated exact-head
preview, explicit write approval, and appropriately provisioned test identities.
Refer to `.github/workflows/live-signup-proof.yml` and
`.github/workflows/owned-bip-signup-proof.yml`; never substitute a fake pass.

`playwright.controlled-account.config.ts` covers controlled account Cloud,
Comfort, and session continuity. It requires the real protected credentials
and exact release identity described by
`.github/workflows/controlled-account-cloud-comfort.yml`.

The four live/controlled spec files are intentionally excluded from the
unauthenticated local suite and remain in dedicated executable proof lanes.
The absence of their skips from local output is **not** completion of their
live proof. Preserve skip receipts and mark unresolved prerequisites BLOCKED.

## Verification ledger, 2026-10-20

Baseline run: 77 discovered, 47 passed, 23 failed, seven intentionally
skipped. The failure inventory came from a real Expo/Chromium Node 24 run
against `fe70878ca96ecfb638c8e4780a4928fe38a06473`, sharded 26/26/25.
The baseline is historical and must not be copied as a current-head verdict.

Corrections proven in focused runs:

- `e2e/password-recovery.spec.ts`: six of six passed after reconciling stale
  recovery copy and fixing actual 390-pixel horizontal overflow from decorative
  background glows in both recovery screens
- `e2e/front-door-audience-switch.spec.ts`: the brief introductory animation
  passed with an animation-frame witness rather than racing its unmount
- `e2e/production-signup-transport.spec.ts`: passed on the public production
  configuration, which intercepts all Auth requests. It fails in the local
  no-Supabase configuration for a different, expected reason
- `e2e/live-onboarding-email.spec.ts` readiness subtest: passed without a
  signup write under `LIVE_ONBOARDING_PHASE=readiness`

The other 16 failures from the original browser run concern guarded/private
surfaces: six Calm, two cinematic, one Continue the Thought, one private
calendar, four product-review/Voice Bip, one companion safety surface, and one
Room. The tested unauthenticated routes redirect to public entry/onboarding.
This behavior is an expected privacy boundary. The private visuals require a
proper controlled verified account to establish or refute their expected UX.
**Do not rewrite these tests as successful visual proofs of screens they did
not reach.** Record them as unresolved browser evidence until the controlled
proof lane and its private fixture prerequisites complete.

Of the original seven skips, two belong to controlled-account evidence and
five to live onboarding/family evidence. Their absence from the revised local
suite only corrects lane accounting. They have **not** passed. Use existing
explicit opt-in workflows and their safety/identity prerequisites. Never copy
live passwords, tokens, private chats, or other personal account data into
this ledger. Missing required witnesses keep MERGE and DEPLOY authority false.

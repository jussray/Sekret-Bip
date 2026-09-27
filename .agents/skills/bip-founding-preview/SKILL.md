# bip-founding-preview

## Parent contract

This skill inherits from the private canonical `juss-founder-os` skill in
`jussray/founder-control-room`.

Apply the full founder stack:

```text
/garyvee lindymode redteam l99 redteam ooda
```

Do not weaken founder authority, brand/IP protection, privacy, evidence,
rollback, truthfulness, or the rule against deletion without explicit approval.

## Trigger

Activate whenever work touches:

- the splash PNG or its invisible CTA;
- preview-open or preview-closed routing;
- recognized login, onboarding resume, or returning-user state;
- a 72-hour founding preview or limited-access campaign;
- waiting-list creation, confirmation, ranking, referral, or return experience;
- sponsor CTAs, project updates, or proof-of-demand analytics;
- Instagram, Facebook, TikTok, or other campaign-content generation;
- public demo boundaries, preview data, launch metrics, or post-window access.

## Required with

- `bip-repo-truth`
- `bip-auth-onboarding`
- `bip-supabase-guardian`
- `bip-privacy-redteam`
- `bip-release-gate`
- `bip-sekret-identity` when Se’kret identity, tone, or companion behavior is touched

## Locked public funnel

```text
Social content
→ Splash PNG
→ invisible CTA
→ account recognition or lightweight onboarding
→ 72-hour Se’kret Bip founding preview while open
→ personalized waiting-list home after closure
→ updates, referrals, sponsorship, and future access
```

**The preview closes. The relationship does not.**

## Brand and source boundary

- The authoritative product repository and private implementation remain private.
- A temporary public repository is copyable and is not a protection mechanism.
- Public proof should use controlled builds, screenshots, recordings, sanitized
  test evidence, selected metrics, and clear project updates.
- Never expose private prompts, system instructions, safety thresholds, service
  credentials, database internals, administrative routes, unreleased architecture,
  proprietary scoring, or real user content.
- Sponsorship grants no ownership, license, resale right, product-control right,
  endorsement right, or permission to use Se’kret Bip branding.
- Do not delete project work. Preserve inactive or future work behind flags,
  isolated routes, archives, or documented backlog state unless a specific deletion
  is explicitly approved.

## Splash PNG contract

The splash PNG is the permanent visual doorway and primary CTA surface on both
sides of the preview window.

- The full artwork behaves as the CTA without an obvious rectangular button.
- Implement the visual surface as a real accessible button or link.
- Provide an accessible name such as `Enter Se’kret Bip`.
- Support keyboard, visible focus, screen readers, switch control, and reduced motion.
- Prevent double taps and duplicate navigation.
- Keep the branded splash visible during short loading or routing transitions.
- After a reasonable delay, a subtle fallback cue may appear for users who do not
  recognize the artwork as interactive.
- The splash image and visual identity remain consistent before, during, and after
  the preview so returning users recognize the doorway.

## State routing

Use persisted server-resolved lifecycle state. Do not infer the entire relationship
from client page history alone.

```text
preview_open + new_user          → onboarding
preview_open + recognized_user   → preview
preview_closed + waitlisted_user → personalized waiting-list home
preview_closed + incomplete_user → resume onboarding
preview_closed + new_user        → waiting-list onboarding
invited_user                     → approved early access
```

A recognized user must not repeat completed onboarding.

Recommended durable lifecycle states:

```text
account_created
onboarding_started
onboarding_completed
preview_activated
waitlist_joined
preview_closed_seen
returning_waitlist_user
early_access_eligible
invited
active
```

Auth success alone is not routing truth. Reconcile the permanent session,
canonical account profile, consent, verification state, lifecycle state, and
campaign access state before navigation.

## Preview-open journey

### New visitor

```text
Splash
→ account creation or sign-in
→ only required onboarding steps
→ limited preview
→ waiting-list relationship saved
```

### Recognized visitor

```text
Splash
→ session and lifecycle reconciliation
→ resume the allowed preview state
```

## Preview-closed journey

### Recognized and waitlisted

```text
Splash
→ session and lifecycle reconciliation
→ “Welcome back — your place is saved”
→ personalized waiting-list home
```

### Existing but incomplete

```text
Splash
→ resume only unfinished required onboarding
→ waiting-list confirmation
```

### New visitor

```text
Splash
→ permanent account
→ minimal required onboarding
→ waiting-list confirmation
```

## Waiting-list home contract

The waiting list is a persistent prelaunch product surface, not a dead end.

It should provide:

- clear confirmation that the user’s place is saved;
- current build phase and the next visible milestone;
- founder/build updates and controlled previews;
- referral link and referral progress when enabled;
- early-access eligibility or invitation status;
- brief feedback prompts and preference controls;
- sponsor/support option with specific funding uses;
- account, communication, consent, and privacy controls.

Do not show a fake numerical queue position unless a real, durable, explainable
positioning system exists.

## Data minimization and teen safety

- Use synthetic data in public previews.
- Do not collect sensitive emotional information merely to prove traction.
- Collect only what is needed for authentication, required consent, access state,
  communication preferences, and approved product research.
- Do not expose journals, voice, media, parent visibility, safety events, or private
  profile data in campaign analytics or content tools.
- Do not imply diagnosis, treatment, crisis response, or guaranteed outcomes.
- Broad minor onboarding, sensitive-data collection, paid reservation models, and
  production launch require qualified legal/privacy review and explicit approval.

## Content Control Room

Social content must use a controlled draft and approval pipeline:

```text
campaign brief
→ AI draft generation
→ brand / privacy / safety validation
→ Juss approval
→ approved platform adapter
→ performance data
→ next OODA cycle
```

- Default to draft-only.
- Do not publish externally without the required founder approval gate.
- Use approved platform APIs and scopes only.
- Keep tokens isolated and out of clients, logs, screenshots, and generated content.
- Maintain audit logs, rate limits, duplicate detection, and an emergency kill switch.
- Do not automate sensitive replies involving personal emotional disclosures.

Each content record should track:

```text
project
campaign
platform
content_type
hook
caption
visual_asset
call_to_action
destination_url
approval_status
scheduled_time
publication_status
performance_metrics
```

## Analytics contract

Track the funnel with consistent event names and campaign/source metadata:

- `splash_viewed`
- `splash_tapped`
- `session_recognized`
- `onboarding_started`
- `onboarding_resumed`
- `onboarding_completed`
- `preview_entered`
- `meaningful_preview_action`
- `waitlist_page_entered`
- `waitlist_joined`
- `return_visit`
- `referral_created`
- `referral_converted`
- `sponsor_cta_viewed`
- `sponsor_cta_clicked`
- `early_access_entered`

Registrations alone are attention data, not proof of revenue. Report conversion
ratios across discovery, splash interaction, account creation, onboarding,
activation, waiting-list join, return behavior, referral, and sponsorship.

Do not collect sensitive content in analytics properties.

## 72-hour campaign states

### Hours 0–24: Reveal

- Explain the product, intended audience, and mission.
- Open the controlled preview.
- Use one primary CTA: enter through the splash and save a place.

### Hours 24–48: Proof

- Show selected features, verified progress, privacy principles, and controlled
  technical evidence without exposing implementation.
- Use real metrics only and label small sample sizes clearly.

### Hours 48–72: Conversion

- State the closing time and post-window experience clearly.
- Drive return visits, waiting-list completion, referrals, and sponsorship.
- Close the interactive preview on schedule and preserve recognized routing.

### After closure

- Keep splash, accounts, waiting-list home, and updates active.
- Publish a truthful campaign result.
- Invite controlled cohorts only after release, privacy, safety, and evidence gates
  are green.

## Required evidence

At one exact commit and one identified environment, prove:

- splash is reachable and visually consistent;
- invisible CTA is accessible and does not double-navigate;
- new users enter the correct onboarding path;
- recognized users do not repeat completed onboarding;
- preview-open users reach only the approved limited experience;
- preview-closed waitlisted users reach the personalized waiting-list home;
- incomplete users resume the correct step;
- invited users require a valid invitation state;
- lifecycle state persists across refresh, sign-out/sign-in, and a second device;
- no account inherits another user’s lifecycle, consent, referral, or waitlist data;
- analytics events fire once with correct source/campaign metadata and no sensitive content;
- preview-close controls and emergency rollback are verified;
- Type Check, unit/contract tests, route tests, and Playwright/Maestro journey proof
  pass for the changed surface.

## Stop conditions

Stop before mutation or launch when:

- the authoritative preview state or lifecycle owner is unclear;
- real user or sensitive teen data may enter the public preview or analytics path;
- private code, prompts, credentials, or admin behavior may be exposed;
- routing relies only on client state instead of canonical server truth;
- the waiting-list page cannot preserve recognized identity safely;
- platform publishing permissions, privacy requirements, or approval gates are unresolved;
- the launch lacks a verified rollback and emergency-close path;
- a success claim cannot be supported by evidence.

## Completion report

Report:

1. current verified reality;
2. premise red-team result;
3. lifecycle and authority map;
4. selected decision;
5. implementation red-team result;
6. exact files and behavior changed;
7. evidence and failures/skips;
8. brand, privacy, security, and provider impact;
9. rollback;
10. next founder approval gate.

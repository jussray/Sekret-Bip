# Se’kret Bip — Beehiiv Provider Run Receipt

Status: FILL DURING LIVE PROVIDER EXECUTION
Branch carrier: `fix/beehiiv-trial-harvest`
Purpose: prove the trial harvest actually happened without storing subscriber-level personal data in GitHub.

## Authority

- Provider: beehiiv
- Publication: Se’kret Bip
- Product/account authority: Se’kret Bip app, not beehiiv
- Canonical content source: `content/beehiiv/publication-kit.md`
- Operating plan: `content/beehiiv/trial-harvest-pack.md`
- Plugin boundary: `content/beehiiv/plugin-boundary.md`
- Immutable source commit used for provider copy/actions: `SOURCE_COMMIT_SHA=PENDING`

Before any provider mutation, replace `PENDING` with the exact commit SHA whose content is being executed. A branch name is not an immutable receipt.

## Founder approval receipts

A successful preview, login, CI run, or old approval does not authorize a new external action. Record a fresh approval receipt immediately before each bounded action.

| Action | Approval state | Approval timestamp | Evidence note |
| --- | --- | --- | --- |
| Enable built-in welcome email | OPEN |  |  |
| Publish/send Issue #001 | OPEN |  |  |
| Publish podcast episode | OPEN |  |  |
| Publish survey | OPEN |  |  |
| Activate optional automation | NOT_APPLICABLE |  | optional experiment only |
| Submit support ticket | OPEN |  |  |
| Change billing/plan | NOT_APPLICABLE |  | never implied by trial harvest |

Allowed approval states: `OPEN`, `APPROVED`, `NOT_APPLICABLE`.

## Trial clock

- Dashboard trial-expiry date/time: `UNKNOWN — capture from beehiiv Billing/Plan`
- Timezone shown by provider: `UNKNOWN`
- Provider-email inferred expiry date: `2026-09-15`
- Conservative fallback final-sweep deadline: `2026-09-14 12:00 America/New_York`

Once the provider cutoff is known, schedule the final sweep at least 12 hours before that cutoff, or use the conservative fallback if it is earlier. If the fallback has passed before authentication succeeds, perform durable exports immediately and skip optional premium experiments.

Provider-email countdown evidence:

- 2026-09-02: `13 days left on trial`
- 2026-09-03: `12 days left on trial`
- 2026-09-04: `11 days left on trial`
- 2026-09-05: `10 days left on trial`
- 2026-09-06: `9 days left on trial`

This supports only an inferred date. It does not establish the exact cutoff time or timezone.

## Billing posture baseline

Official source:

- beehiiv Help: **What’s included in the beehiiv Max trial**
- https://www.beehiiv.com/support/article/22101553752471

The official source states that trial accounts are technically on Launch with temporary higher-tier access and remain on Launch if the user does not upgrade. Account-level Billing/Plan state remains authoritative for this publication.

Classification: `INFERRED FREE-LAUNCH FALLBACK / DASHBOARD READBACK REQUIRED`.

Cash-protection rule:

- Do not add billing merely to preserve a trial experiment.
- Do not manually upgrade unless a separately evidenced paid capability is approved.
- If Billing/Plan shows a paid subscription or future charge, classify that separately and resolve it before any assumption about downgrade behavior.

## External discovery baseline

Public-web verification run: `2026-09-07 America/New_York`

Result at that time:

- no indexed Se’kret Bip beehiiv publication found;
- no indexed copy of **The first sentence is usually the hardest** found;
- no indexed **The First Sentence** Se’kret Bip podcast episode found.

Classification: `OPEN / NOT PUBLICLY VERIFIED`.

Search absence is not proof that a provider asset does not exist.

## Authentication attempt receipts

### Authentication attempt A

- Run: `71158dd4-8fa2-49c5-a626-29768e7f3665`
- Date: `2026-09-10 America/New_York`
- State: `BLOCKED`
- Cause: creator authentication required; no usable creator credential/session available to the browser
- Provider mutation: `NO`
- Billing mutation: `NO`
- Password reset: `NO`
- Publication mutation: `NO`

This attempt is a provider-access blocker only. It is not evidence that publication, billing, or content configuration failed.

### Authentication attempt B

- Run: `9ecdcc63-099a-464a-80d1-166315bb30ea`
- Date: `2026-09-11 America/New_York`
- State: `BLOCKED`
- Cause: browser reached Beehiiv/Google sign-in but timed out before creator authentication completed
- Provider mutation: `NO`
- Billing mutation: `NO`
- Password reset: `NO`
- Publication mutation: `NO`

This timeout is a separate receipt from attempt A. Neither receipt may stand in for the other.

### Desktop-handoff evidence

A prior beehiiv **Continue on desktop** email states that its creator handoff link expires after five minutes. The previously observed September 1 link was therefore expired and must not be stored, committed, or reused.

Safe recovery path:

1. obtain a fresh normal creator session or a newly generated desktop handoff;
2. do not paste or persist its token;
3. after login, capture publication/workspace identity and Billing/Plan truth before any mutation.

## Live run order

Mark every gate independently.

| Gate | State | Provider evidence | Timestamp |
| --- | --- | --- | --- |
| Beehiiv creator authentication | BLOCKED | attempts A and B above | 2026-09-11 |
| Publication/workspace identity captured | OPEN | dashboard readback |  |
| Exact trial cutoff captured | OPEN | Billing/Plan readback |  |
| Billing posture captured | OPEN | Billing/Plan current/upcoming state |  |
| Immutable source commit recorded | OPEN | exact Git commit SHA |  |
| Built-in welcome email configured | OPEN | provider screenshot/readback |  |
| Built-in welcome desktop preview | OPEN | preview evidence |  |
| Built-in welcome mobile preview | OPEN | preview evidence |  |
| Built-in welcome founder approval | OPEN | approval table above |  |
| Built-in welcome enabled | OPEN | provider state |  |
| Issue #001 desktop preview | OPEN | preview evidence |  |
| Issue #001 mobile preview | OPEN | preview evidence |  |
| Issue #001 founder approval | OPEN | approval table above |  |
| Issue #001 published/sent | OPEN | public URL/provider report |  |
| First Full Subscribers export | OPEN | private filename/checksum label only |  |
| First All Posts export | OPEN | private filename/checksum label only |  |
| Podcast generated | OPEN | provider editor evidence |  |
| Podcast audio recovery copy | OPEN | private filename or explicit unavailable receipt |  |
| Podcast published | OPEN | public URL/provider state |  |
| Podcast post-trial durability | UNKNOWN | support or post-downgrade readback required |  |
| `reading_context` test mapping | OPEN | synthetic profile + export readback |  |
| `primary_interest` test mapping | OPEN | synthetic profile + export readback |  |
| `preferred_cadence` test mapping | OPEN | synthetic profile + export readback |  |
| Survey founder approval | OPEN | approval table above |  |
| Survey published | OPEN | provider/public URL |  |
| Optional automation experiment | NOT_APPLICABLE | not required for Launch path |  |
| Support ticket founder approval | OPEN | approval table above |  |
| Support ticket submitted | OPEN | ticket ID only |  |
| Final Full Subscribers export | OPEN | private filename/checksum label only |  |
| Final All Posts export | OPEN | private filename/checksum label only |  |
| First snapshot purge | OPEN | purge timestamp/owner only |  |
| Final snapshot purge when due | OPEN | purge timestamp/owner only |  |
| Post-downgrade homepage | OPEN | browser evidence |  |
| Post-downgrade signup | OPEN | browser evidence |  |
| Post-downgrade Issue #001 | OPEN | browser evidence |  |
| Post-downgrade podcast episode | OPEN | browser evidence |  |
| Post-downgrade RSS | OPEN | browser evidence |  |
| Post-downgrade survey state | OPEN | browser/provider evidence |  |
| Post-downgrade export access | OPEN | provider evidence |  |

Allowed gate states: `OPEN`, `VERIFIED`, `INFERRED`, `UNKNOWN`, `BLOCKED`, `NOT_APPLICABLE`.

## Public asset receipts

### Issue #001

- Title: **The first sentence is usually the hardest**
- Source commit: `PENDING`
- Public URL: `PENDING`
- Published/sent at: `PENDING`
- Desktop preview: `PENDING`
- Mobile preview: `PENDING`
- Founder approval receipt: `PENDING`

Do not record recipient-level open/click histories in this receipt.

### Podcast

- Episode: **The First Sentence**
- Source commit: `PENDING`
- Public episode URL: `PENDING`
- RSS URL: `PENDING`
- Published at: `PENDING`
- Recovery audio filename/private label: `PENDING OR UNAVAILABLE`
- Post-trial durability: `UNKNOWN`
- Founder approval receipt: `PENDING`

### Built-in welcome email

- Subject: **Welcome to Se’kret Bip 🌙**
- Source commit: `PENDING`
- Configured: `PENDING`
- Desktop preview: `PENDING`
- Mobile preview: `PENDING`
- Enabled: `PENDING`
- Founder approval receipt: `PENDING`

### Survey

- Title: **What should Se’kret Bip send you?**
- Survey URL/provider identifier: `PENDING`
- Synthetic mapping test: `PENDING`
- Aggregate response count: `PENDING`
- Founder approval receipt: `PENDING`

### Optional automation experiment

- State: `NOT_APPLICABLE unless separately approved`
- `[ISSUE_001_URL]` resolved: `N/A`
- `[SURVEY_URL]` resolved: `N/A`
- Pause/disable control verified: `N/A`
- Queued-send stop behavior verified: `N/A`
- Operational baseline recorded: `N/A`

## Export receipts

Never paste subscriber rows, email addresses, response-level survey data, or export contents here.

### First export

- Full Subscribers filename: `beehiiv-sekret-bip-first-subscribers-YYYYMMDD-HHMMZ.csv`
- All Posts filename: `beehiiv-sekret-bip-first-posts-YYYYMMDD-HHMMZ.csv`
- Private storage label: `PENDING`
- Checksum/reference if available: `PENDING`
- Download verified: `NO`

### Final pre-downgrade export

- Full Subscribers filename: `beehiiv-sekret-bip-final-subscribers-YYYYMMDD-HHMMZ.csv`
- All Posts filename: `beehiiv-sekret-bip-final-posts-YYYYMMDD-HHMMZ.csv`
- Private storage label: `PENDING`
- Checksum/reference if available: `PENDING`
- Download verified: `NO`

### Retention and purge

- Restricted encrypted storage verified: `PENDING`
- First snapshot purge due/complete: `PENDING`
- Final snapshot purge due/complete: `PENDING`
- Purge owner: `PENDING`

Subscriber-level data remains outside GitHub.

## Trial support ticket

Canonical support message: `content/beehiiv/trial-harvest-pack.md` → **Gate 7 — Trial support ticket**.

Do not maintain a second competing support-ticket body in this receipt.

- Founder approval receipt: `PENDING`
- Ticket ID: `PENDING`
- Submitted at: `PENDING`
- Non-sensitive provider answer summary: `PENDING`

## Post-downgrade browser proof

Verify separately:

1. publication homepage;
2. standard signup;
3. built-in welcome state;
4. Issue #001 public state;
5. podcast episode public state;
6. RSS state;
7. survey state;
8. export-access state.

One successful check cannot mark the others verified.

## Completion rule

The beehiiv trial harvest is complete only when every required durable gate has its own receipt, the exact source commit is recorded for provider actions, external mutations have founder approval receipts, subscriber exports follow the retention/purge policy, and all remaining provider uncertainties are explicitly classified rather than converted into success by assumption.
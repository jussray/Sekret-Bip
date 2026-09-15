# Se’kret Bip — Beehiiv Trial Harvest Pack

Status: DURABLE OPERATING ARTIFACT
Canonical publication copy: `content/beehiiv/publication-kit.md`
Provider receipt: `content/beehiiv/provider-run-receipt.md`
Plugin boundary: `content/beehiiv/plugin-boundary.md`

## Objective

Use the remaining beehiiv trial only for value that survives downgrade, can be exported, or produces evidence worth keeping.

Beehiiv is an optional publication plugin. Chief AI, PromptOS, and Sol remain system-level components. Beehiiv never becomes product, identity, continuity, or governance authority.

## Authority gate

Every external action needs a founder-approval receipt immediately before execution. A repo commit, green check, old approval, provider login, or successful preview is not approval to publish or message people.

Record approval in `provider-run-receipt.md` before any of these actions:

- enabling a welcome email;
- publishing or sending Issue #001;
- publishing a podcast episode;
- publishing a survey;
- activating any automation;
- submitting a support ticket;
- changing billing or plan state.

Read-only inspection, previews, and local/repository edits do not expand provider authority.

## Trial clock

The beehiiv dashboard is authoritative for the exact trial cutoff and timezone.

Until that exact timestamp is captured, use this conservative fallback:

- inferred trial date: `2026-09-15`;
- fallback final-sweep deadline: `2026-09-14 12:00 America/New_York`;
- once the provider cutoff is known, schedule the final sweep at least 12 hours before the cutoff, or use the fallback above if it is earlier;
- if the fallback deadline has already passed and the exact cutoff is still unknown, perform the durable exports immediately after authentication and skip optional premium experiments.

Do not assume “September 15” means the end of a local calendar day.

## Official provider baseline

Official source checked for the trial model:

- beehiiv Help: **What’s included in the beehiiv Max trial**
- https://www.beehiiv.com/support/article/22101553752471

That source states that a trial account is technically on Launch with temporary higher-tier access, and that an account that does not upgrade remains on Launch after the trial. Account-level Billing/Plan state still overrides this general documentation.

## Priority order

### P0 — Durable gates first

#### Gate 0 — Authenticate without changing credentials

1. Use the founder’s normal beehiiv creator session.
2. Do not reset a password, create a second account, add billing, or widen permissions merely to finish the trial harvest.
3. Capture the publication/workspace identity shown after login.
4. Capture the exact Billing/Plan trial cutoff, timezone, current plan, and any future charge or renewal state.

If authentication fails, record each attempt separately in the provider receipt. Do not collapse multiple auth failures into one generic blocker.

#### Gate 1 — Configure the Launch-safe built-in welcome email

Use the exact welcome copy from `publication-kit.md`.

1. Configure the built-in welcome email.
2. Preview desktop.
3. Preview mobile.
4. Verify links and footer.
5. Record founder approval.
6. Enable only after that approval is recorded.

The built-in welcome email owns the immediate welcome message. Do not also activate a premium automation that sends the same welcome.

#### Gate 2 — Prepare Issue #001

Use the exact title, subject, preheader, and body from `publication-kit.md`.

1. Preview desktop.
2. Preview mobile.
3. Verify the privacy boundary and footer.
4. Verify all links.
5. Record founder approval.
6. Publish/send only after approval is recorded.

If recipient-level engagement tracking cannot be disabled for a teen-inclusive audience, do not email the issue to that audience. Keep it web-only or draft until a separately approved privacy boundary exists. Do not create an age/teen behavioral profile in beehiiv merely to measure the trial.

#### Gate 3 — Take the first ownership export immediately

Do this as soon as the normal publication and signup path works, before podcast, survey, or automation experiments.

Request:

- Full Subscribers export;
- All Posts export.

Use distinct timestamped filenames so later exports cannot overwrite the baseline:

- `beehiiv-sekret-bip-first-subscribers-YYYYMMDD-HHMMZ.csv`
- `beehiiv-sekret-bip-first-posts-YYYYMMDD-HHMMZ.csv`

If an optional premium gate is blocked, skip it and continue to the durable export gates.

#### Gate 4 — Podcast experiment

Create **The First Sentence** from the canonical script only if the trial tool is available without payment or upgrade.

Treat post-trial survival as `UNKNOWN` until provider readback or official support evidence confirms it for this account. A public URL by itself is not a durability receipt.

If beehiiv provides a download/export for the generated audio, save one copy to approved private storage before downgrade. If no download is available, record that limitation separately.

Only count the podcast as durable when at least one of these is true:

- post-downgrade browser proof confirms the public episode and RSS remain active;
- provider support confirms the behavior and the answer is retained in the receipt;
- a recoverable audio copy is held in approved private storage.

#### Gate 5 — Optional low-sensitivity preference survey

Do not collect an age or “teen” identity field.

Allowed fields:

- `reading_context` — `for_myself`, `family_conversations`, `supporting_sekret_bip`;
- `primary_interest` — `stories`, `conversation_tools`, `parent_perspective`, `build_updates`;
- `preferred_cadence` — `weekly`, `twice_monthly`, `monthly`.

Do not ask for journals, private family situations, mental-health details, safety events, or free-form secrets.

Before public distribution:

1. create the three custom fields;
2. create the survey;
3. submit one synthetic founder-controlled test response;
4. verify all three values on the test subscriber profile;
5. verify the same values in a Full Subscribers export;
6. delete or neutralize the synthetic test row if it is no longer needed;
7. record founder approval;
8. only then publish the survey.

A configuration screenshot alone is not proof that the custom fields persist.

#### Gate 6 — Optional automation experiment

Default state: `NOT_APPLICABLE`.

The durable Launch path must not depend on automation. If the founder explicitly chooses to test it while the trial is active:

1. use a founder-controlled synthetic test subscriber first;
2. verify the provider pause/disable control before activation;
3. verify how queued messages are stopped or cancelled;
4. ensure the built-in welcome email is not duplicated;
5. populate and verify both destination placeholders before activation:
   - `[ISSUE_001_URL]`
   - `[SURVEY_URL]`
6. record founder approval;
7. activate only for the bounded test scope.

Do not credit automation for reader engagement on a teen-inclusive list. If evaluating whether automation is worth paying for, use an operational comparison instead:

- baseline: manual minutes required to perform the same bounded sequence;
- experiment: automation setup minutes plus ongoing minutes;
- observation unit: the same synthetic workflow repeated at least three times;
- decision metric: verified operator time saved without widening tracking, authority, or data collection.

No baseline means no causal claim and no paid-plan justification.

#### Gate 7 — Trial support ticket

This file is the single canonical support-ticket draft. The provider receipt must reference this section rather than carrying a second competing message.

**Subject:** Confirm Se’kret Bip trial cutoff and Launch behavior

**Message:**

Hello beehiiv support,

I’m preparing Se’kret Bip for the end of its current trial and need exact account-level behavior, not an upgrade recommendation.

Please confirm:

1. the exact trial end date, time, and timezone for this publication;
2. whether a published AI-created podcast episode remains public after downgrade to Launch;
3. whether the existing podcast RSS feed remains active after downgrade;
4. whether automations become inactive on Launch and whether queued sends stop;
5. whether surveys become unpublished on Launch;
6. whether custom-field values remain present in a Full Subscribers export;
7. whether Full Subscribers and All Posts exports remain available after downgrade;
8. whether the normal publication website, built-in welcome email, and standard newsletter signup remain available on Launch without a premium automation.

Thank you.

Record founder approval before submitting this ticket. Store only the ticket ID and a non-sensitive answer summary in GitHub.

#### Gate 8 — Final pre-downgrade export

Run at least 12 hours before the authoritative provider cutoff, or by the conservative fallback deadline, whichever is earlier.

Use distinct filenames:

- `beehiiv-sekret-bip-final-subscribers-YYYYMMDD-HHMMZ.csv`
- `beehiiv-sekret-bip-final-posts-YYYYMMDD-HHMMZ.csv`

Verify each downloaded file exists and is readable before treating the export as complete.

## Export privacy, retention, and deletion

Subscriber exports contain personal data and must never be committed to GitHub, pasted into issues, or attached to PRs.

Approved handling:

- store only in restricted encrypted private storage controlled by the founder or an explicitly authorized operator;
- keep access limited to migration, backup verification, or deletion handling;
- record only filename, timestamp, checksum if available, and private-storage label in the provider receipt;
- delete the first snapshot after the final snapshot is verified unless it is still needed for a documented comparison;
- delete the final snapshot within 30 days after successful migration/downgrade verification if it is no longer operationally needed;
- if a subscriber deletion request arrives while an export is retained, remove that subscriber from every retained snapshot or regenerate a sanitized snapshot, then delete the superseded copy;
- record the purge date and owner without recording subscriber identity in GitHub.

These exports are temporary operational backups, not a permanent audience archive.

## Analytics boundary

Use aggregate evidence only where possible:

- total subscriber count;
- total signup count;
- public page visits where available without recipient profiling;
- aggregate survey response count;
- operational time saved in synthetic automation tests.

Do not create or retain recipient-level open/click histories for teen-identified subscribers. Do not add an age-identifying custom field to make tracking easier.

## Evidence ledger

For every gate, record one of:

- `VERIFIED` — direct provider/readback evidence exists;
- `INFERRED` — supported but not directly read back;
- `UNKNOWN` — not observed;
- `BLOCKED` — attempted and prevented, with its own receipt;
- `NOT_APPLICABLE` — intentionally skipped and not required.

Never let one failure receipt stand in for another.

## Provider run card

Use this order after authentication:

`Billing truth → built-in welcome preview → Issue #001 preview → founder approval → enable/publish bounded actions → first export → optional podcast → optional survey → optional automation → support ticket → final export → post-downgrade readback`

If any optional gate fails, record it separately and continue to the next durable gate.

## Downgrade test

After Launch behavior is active, verify independently:

1. publication homepage loads;
2. standard signup works without premium automation;
3. built-in welcome email remains configured if Launch permits it;
4. Issue #001 remains public if it was published;
5. podcast episode and RSS state are checked independently;
6. survey state is checked independently;
7. export access is checked independently.

Do not collapse these into one “downgrade passed” receipt.

## Pay-or-cancel decision rule

Do not pay because the trial is ending.

A paid plan is justified only by a separately evidenced capability need that cannot be met by Launch or another replaceable delivery mechanism. Optional automation must meet the operational comparison above before it can count as evidence for payment.

## Completion rule

The trial harvest is complete when all required durable gates have independent receipts, every external action has a founder-approval receipt, private exports follow the retention policy, and any remaining provider uncertainty is explicitly classified rather than guessed.
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

## Trial clock

- Dashboard trial-expiry date/time: `UNKNOWN — record from beehiiv Billing/Plan`
- Timezone shown by provider: `UNKNOWN`
- Provider-email inferred expiry date: `2026-09-15`
- Confidence: `HIGH for date, UNKNOWN for exact dashboard timestamp`
- Final 24-hour sweep scheduled for: `2026-09-14 evening America/New_York`

Provider-email countdown evidence:

- 2026-09-02: `13 days left on trial`
- 2026-09-03: `12 days left on trial`
- 2026-09-04: `11 days left on trial`
- 2026-09-05: `10 days left on trial`
- 2026-09-06: `9 days left on trial`

This sequence consistently points to September 15, 2026. Treat the date as provider-email inferred until beehiiv Billing/Plan shows the authoritative expiry timestamp. Do not overwrite the dashboard truth with email math once the dashboard is available.

## Live run order

Mark each row only when the provider state is visible and capture the proof location.

| Gate | State | Provider evidence | Timestamp |
| --- | --- | --- | --- |
| Trial expiry captured | OPEN | beehiiv Billing/Plan screenshot or note |  |
| Issue #001 previewed desktop | OPEN | preview screenshot |  |
| Issue #001 previewed mobile | OPEN | preview screenshot |  |
| Issue #001 published | OPEN | public URL + post report |  |
| AI podcast generated from Issue #001 | OPEN | provider episode editor screenshot |  |
| `The First Sentence` published | OPEN | public episode URL |  |
| Podcast RSS captured | OPEN | RSS URL |  |
| Preference survey published | OPEN | public/provider survey URL |  |
| `reader_role` mapping verified | OPEN | survey/custom-field screenshot |  |
| `primary_interest` mapping verified | OPEN | survey/custom-field screenshot |  |
| `preferred_cadence` mapping verified | OPEN | survey/custom-field screenshot |  |
| `Se’kret Bip — First 5 Days` activated | OPEN | automation screenshot |  |
| First Full Subscribers export downloaded | OPEN | private-storage filename only |  |
| First All Posts export downloaded | OPEN | private-storage filename only |  |
| Support ticket submitted | OPEN | ticket ID only |  |
| Final Full Subscribers export downloaded | OPEN | private-storage filename only |  |
| Final All Posts export downloaded | OPEN | private-storage filename only |  |
| Post-downgrade public path verified | OPEN | public URLs + browser screenshots |  |

Allowed state values: `OPEN`, `VERIFIED`, `BLOCKED`, `NOT_APPLICABLE`.

## Public asset receipts

### Issue #001

- Title: **The first sentence is usually the hardest**
- Public URL: `PENDING`
- Published at: `PENDING`
- Delivered: `PENDING`
- Opens: `PENDING`
- Clicks: `PENDING`

### Podcast

- Episode: **The First Sentence**
- Public episode URL: `PENDING`
- RSS URL: `PENDING`
- Published at: `PENDING`

### Survey

- Title: **What should Se’kret Bip send you?**
- Survey URL or provider identifier: `PENDING`
- Responses: `PENDING`

### Automation

- Name: **Se’kret Bip — First 5 Days**
- Activated at: `PENDING`
- Enrolled: `PENDING`
- Completed: `PENDING`

## Export receipts

Record filenames and private-storage location labels only. Never paste subscriber rows, email addresses, response-level survey data, or export contents here.

### First export

- Full Subscribers filename: `PENDING`
- All Posts filename: `PENDING`
- Private storage label/location: `PENDING`
- Download verified: `NO`

### Final pre-downgrade export

- Full Subscribers filename: `PENDING`
- All Posts filename: `PENDING`
- Private storage label/location: `PENDING`
- Download verified: `NO`

## Trial support ticket draft

Use trial support while it is available to obtain provider-written confirmation of the downgrade behavior we depend on.

**Subject:** Confirm what remains active after Se’kret Bip trial downgrade

**Message:**

Hello beehiiv support,

I’m preparing Se’kret Bip for the end of its current trial and want to verify the exact downgrade behavior before relying on any feature.

Could you please confirm for this publication:

1. whether an AI-generated podcast episode that is published before the trial ends remains publicly available after downgrade to Launch;
2. whether the existing podcast RSS feed remains active after downgrade;
3. whether automations created during the trial become inactive on Launch;
4. whether a survey created during the trial remains published or becomes unavailable on Launch;
5. whether custom-field values collected from subscribers remain included in a Full Subscribers export;
6. whether the normal publication website and standard newsletter signup remain available on Launch without depending on the premium automation.

I’m not asking for an upgrade recommendation. I only need the exact post-trial behavior so I can preserve the publication correctly.

Thank you.

After submission, record only the ticket ID and the non-sensitive provider answer summary below.

- Ticket ID: `PENDING`
- Submitted at: `PENDING`
- Provider answer summary: `PENDING`

## Post-downgrade browser proof

Run after the plan changes or at the earliest point the Launch behavior can be verified.

1. Public publication homepage loads.
2. Newsletter signup can be completed without requiring a premium automation.
3. Issue #001 still loads publicly.
4. `The First Sentence` episode still loads publicly.
5. RSS feed still resolves.
6. No premium-only page is required for the critical public path.

Record screenshots or trace locations, not subscriber PII.

## Completion rule

The beehiiv trial harvest is complete only when:

- both public content assets are live;
- the three audience preference fields were tested;
- the automation logic has been exercised while available;
- first and final exports were downloaded into private storage;
- the provider downgrade behavior is either verified directly or documented as an explicit remaining risk;
- the public post-downgrade path has browser evidence.

If one gate fails, mark it `BLOCKED`, record the evidence, preserve the durable assets, and replace only the delivery mechanism.

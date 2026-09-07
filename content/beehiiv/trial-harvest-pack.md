# Se’kret Bip — Beehiiv Trial Harvest Pack

Status: DURABLE OPERATING ARTIFACT
Working deadline: 2026-09-15 (verify the exact expiry in beehiiv before the final sweep)
Canonical publication copy: `content/beehiiv/publication-kit.md`

## Objective

Use the remaining beehiiv trial only for value that survives downgrade or can be exported before access disappears.

Durable value means one of four things:

1. an owned audience record we can export;
2. reusable copy or workflow logic stored outside beehiiv;
3. a public asset that stays live after downgrade;
4. provider evidence that tells us what actually worked.

Do not optimize trial-only cosmetics.

## Priority order

### P0 — Harvest before expiry

1. **Publish Issue #001.**
   - Source copy already lives in `publication-kit.md`.
   - Preview desktop and mobile before send.
   - Record published URL and send timestamp.

2. **Generate and publish one AI-created podcast episode from Issue #001.**
   - Episode title: **The First Sentence**
   - Use the existing script in `publication-kit.md`.
   - Record the public episode URL and RSS feed URL.
   - The trial-only advantage is beehiiv's AI-from-newsletter creation tool. Existing published AI-created episodes and the RSS feed remain active after trial.
   - After trial, the Launch plan can still host one recorded podcast episode per month; do not confuse loss of the AI creation tool with loss of podcast hosting.

3. **Run one lightweight welcome automation while the trial is active.**
   - Preserve the logic below in this repository because the provider automation can become inactive after downgrade.
   - Do not make the website signup path depend on the automation surviving.

4. **Collect only low-sensitivity audience preferences through one short survey.**
   - Bind every answer to a custom field.
   - Do not ask for journals, private family situations, mental-health details, safety events, or free-form secrets.
   - Treat the survey as a temporary collection surface: export the resulting audience fields before the trial ends because the survey itself will be unpublished on Launch.

5. **Export the audience and content twice.**
   - First export: as soon as the live publication path is working.
   - Final export: during the last 24 hours of the trial.
   - Request **Full Subscribers** and **All Posts**.
   - Download completed exports immediately; provider download links are temporary.
   - Never commit subscriber CSVs, email addresses, survey response rows, or other personal data to GitHub.

6. **Capture aggregate evidence before downgrade.**
   - subscriber count;
   - acquisition-source totals where available;
   - Issue #001 delivered/open/click totals;
   - survey response count;
   - automation enrollment/completion totals;
   - podcast public URL;
   - website/signup URL;
   - export filenames and local/private-storage location.

7. **Use trial-only support once.**
   - Submit the provider confirmation ticket below while ticket support is still available.
   - Save only the non-sensitive answer or a screenshot reference in the evidence ledger.

### P1 — Keep because Launch can still use it

- Keep the core newsletter, publication website, custom domain, and ordinary sends healthy.
- Keep the normal signup flow healthy. A published signup flow can remain active on Launch, but a flow linked to a premium automation can be unlinked or become inactive after downgrade.
- Keep the existing podcast RSS feed and published episode healthy.
- Keep all canonical copy in this repository.
- Keep free recommendation relationships only if they are genuinely relevant; they are not an expiry emergency.

### P2 — Do not spend the trial on these

- Paid recommendations: trial accounts can browse but cannot activate paid offers.
- Ad Network: unavailable during trial.
- Paid subscriptions: unavailable during trial.
- Premium-only custom pages or blocks that will not remain publishable after downgrade.
- Digital products that can be created but not published during the trial.
- Complex dynamic-content trees that produce no durable learning before expiry.

## Audience asset — one-screen preference survey

Survey title: **What should Se’kret Bip send you?**

Intro:

**Help us make the public Se’kret Bip newsletter more useful. Choose what you want more of. Please do not share private family details or personal stories here.**

Use multiple-choice or dropdown questions only.

### Question 1

**What brings you to Se’kret Bip?**

Custom field: `reader_role`

Options:

- Teen reader
- Parent or caregiver
- Educator or supporter
- Following the Se’kret Bip build
- Prefer not to say

### Question 2

**What would you like more of?**

Custom field: `primary_interest`

Options:

- Short stories
- Conversation starters
- Parent and grown-up perspective
- Se’kret Bip build updates

### Question 3

**How often should we show up in your inbox?**

Custom field: `preferred_cadence`

Options:

- About once a week
- About twice a month
- Major updates only

Success copy:

**Thank you. Your answers help shape the public newsletter. You can change your email preferences or unsubscribe anytime.**

## Automation asset — Welcome → useful idea → preference

Automation name: **Se’kret Bip — First 5 Days**

Re-entry: **No re-entry**

Trigger: **New newsletter subscription**

### Step 1 — Immediately

Send the existing welcome email from `publication-kit.md`.

### Step 2 — Delay 2 days

Email subject: **One sentence can be enough to begin**

Preheader: **You do not need the whole explanation before you start talking.**

Body:

# Start smaller than the whole conversation.

Sometimes the first sentence is the hardest because we expect it to explain everything.

It does not have to.

Try this structure:

**“I’m not sure how to say this yet, but I do want to talk with you. Can you listen while I figure it out?”**

The words can change. The useful part is the shape: name the difficulty, name the intention, ask for the space you need.

Issue #001 goes deeper into that idea and includes a version for parents and grown-ups too.

**Read: The first sentence is usually the hardest**

Se’kret Bip newsletter content is general educational and editorial material. Private product data and newsletter subscriptions stay separate.

### Step 3 — Delay 3 days

Email subject: **What should we send you more of?**

Preheader: **Three quick choices. No private story required.**

Body:

# Help shape the next issues.

Se’kret Bip can talk about a lot of things: short stories, conversation starters, parent perspective, and public build updates.

Rather than guess what you want, we made a tiny preference survey.

**Choose what you want more of →**

It is three quick multiple-choice questions. Please do not share private family details or personal stories.

Your answers help us make the public newsletter more useful without turning your inbox into noise.

## Export protocol

### First working-path export

After Issue #001 and the signup path are live:

- Settings → Export Data → Export All Subscribers (Full)
- Settings → Export Data → Export All Posts
- If a poll is used, export its results separately.
- Download each completed export immediately.

Store subscriber-level exports in private storage only. Do not add them to this repository.

### Final 24-hour export

Repeat:

- Full Subscribers
- All Posts
- poll data if used

Use filenames that preserve provider and date, for example:

- `beehiiv-sekret-bip-subscribers-full-2026-09-14.csv`
- `beehiiv-sekret-bip-posts-all-2026-09-14.csv`

Record only aggregate counts and filenames in the evidence ledger below.

## Evidence ledger

Fill this with aggregate evidence only.

| Evidence | Baseline | Final pre-downgrade | Proof location |
| --- | ---: | ---: | --- |
| Exact trial expiry |  |  | beehiiv Billing & Plan screenshot |
| Total subscribers |  |  | beehiiv analytics screenshot |
| Issue #001 delivered |  |  | beehiiv post report |
| Issue #001 opens |  |  | beehiiv post report |
| Issue #001 clicks |  |  | beehiiv post report |
| Survey responses |  |  | beehiiv survey report |
| Automation enrolled |  |  | beehiiv automation analytics |
| Automation completed |  |  | beehiiv automation analytics |
| Podcast episode published | no/yes |  | public episode URL |
| Podcast RSS captured | no/yes |  | RSS URL |
| Website/signup live | no/yes |  | public URL |
| Full subscriber export | no/yes |  | private-storage filename |
| All-post export | no/yes |  | private-storage filename |
| Provider downgrade confirmation | no/yes |  | support-ticket screenshot/reference |

## Provider run card

Use this order so one incomplete premium feature cannot block a durable one.

### Gate 1 — Billing truth

1. Open **Settings → Billing & Plan**.
2. Record the exact trial-end date shown by beehiiv.
3. Do not upgrade or add billing merely to preserve an experiment. The default decision is Launch unless measured evidence justifies paying.

### Gate 2 — Public written asset

1. Open the existing Issue #001 draft from `publication-kit.md`.
2. Preview desktop and mobile.
3. Verify the public-content boundary footer is present.
4. Publish or send.
5. Copy the public post URL into the evidence ledger.

### Gate 3 — Durable trial-only audio

1. Open **Podcasts** and create the Se’kret Bip show if it does not exist.
2. Use the trial AI-from-newsletter flow on Issue #001.
3. Title the episode **The First Sentence**.
4. Compare the generated result to the canonical podcast script in `publication-kit.md`; reject any invented clinical, private-data, or guaranteed-outcome language.
5. Publish the episode while the trial is active.
6. Capture the episode URL and the public RSS feed URL.

### Gate 4 — Audience preference evidence

1. Create the three custom fields exactly as named: `reader_role`, `primary_interest`, `preferred_cadence`.
2. Build the three-question survey above using choice controls only.
3. Publish the survey.
4. Do not make the surviving Launch signup path depend on that survey.

### Gate 5 — Automation experiment

1. Create **Se’kret Bip — First 5 Days**.
2. Trigger on new newsletter subscription.
3. No re-entry.
4. Send welcome immediately.
5. Delay 2 days, then send the useful-idea email.
6. Delay 3 more days, then send the preference-survey email.
7. Enroll only through a path you are willing to lose after downgrade.

### Gate 6 — First ownership export

1. Request **Export All Subscribers (Full)**.
2. Request **Export All Posts**.
3. Download both completed files immediately.
4. Store subscriber-level data privately.
5. Record only filenames and aggregate counts here.

### Gate 7 — Provider statement

Use **Help → submit a support ticket** while the trial still permits ticket access.

Ticket subject:

**Confirm post-trial Launch behavior for Se’kret Bip publication**

Ticket body:

> I am currently using the Max trial and expect to remain on the free Launch plan when it ends. Before the trial closes, please confirm the post-trial behavior for this publication: (1) a published normal signup flow, (2) a signup flow linked to an automation, (3) existing automations and their analytics, (4) a published survey and its collected custom-field data, (5) an existing public podcast RSS feed and a published AI-created episode, and (6) access to Full Subscriber and All Posts exports after downgrade. I am not asking to preserve paid-only functionality; I want to know exactly what remains live, what becomes read-only or inactive, and what should be exported first. Please also confirm the exact trial-end date/time visible for this workspace if support can see it.

Do not include subscriber data, secrets, private family information, or product-account data in the ticket.

### Gate 8 — Final 24-hour sweep

1. Capture the latest aggregate analytics.
2. Repeat Full Subscribers and All Posts exports.
3. Confirm the files are downloaded and recoverable.
4. Capture current public post, signup, podcast episode, and RSS URLs.
5. Record the provider support answer.

## Downgrade test

Before calling the harvest complete, verify the public path that must remain after trial:

1. public publication page loads;
2. normal newsletter signup still works without depending on the premium automation;
3. Issue #001 remains public;
4. the published podcast episode and RSS feed still resolve;
5. repository copy remains the canonical source for future migration;
6. subscriber exports are recoverable from private storage.

If any provider feature disappears, keep the promise and replace only the delivery mechanism.

## Pay-or-cancel decision rule

Do not pay for beehiiv because the trial is ending. Pay only if the evidence proves at least one premium capability is already creating value that cannot be replaced cheaply on Launch.

Upgrade evidence must be concrete, such as:

- automation materially improves activation or repeat reading;
- survey segmentation is producing enough useful audience behavior to justify keeping the live survey surface;
- AI podcast generation saves enough recurring production effort to justify Max;
- another premium feature is directly responsible for measurable audience growth or retained operating time.

If that evidence is absent, remain on Launch, keep the exported audience/content, keep the RSS episode, preserve the automation and copy logic in the repository, and revisit paid beehiiv only when demand earns it.

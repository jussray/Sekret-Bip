# Se'kret Bip Business Model

Status: **Founder-facing recommendation, not a locked contract**

Design-only per issue #142 — no code changes. Recommendations are
constrained by `docs/MVP_PRIVACY_CONTRACT.md`: nothing here may require
weakening teen privacy, turning safety into surveillance, or making
private content parent-visible as a paywall feature.

## Free teen experience

The teen side (Room, Pages, Calm, Circle, Bridge, Voice Bip, companions,
points/rewards browsing) stays free, permanently. Monetizing the teen
directly — teen-facing paywalls, teen-facing ads, selling teen behavioral
data — is out of scope for this model and should stay out of scope:
it conflicts with the "cool cousin, not a monitored product" standard in
issue #136, and a teen-facing paywall is also the fastest way to make a
teen feel like the product is charging *them* to have feelings.

## Parent subscription

Parent-side monetization is the primary revenue surface. Recommended tiers:

- **Free**: linked account, safety notices (per the restricted safety scope
  in `PARENT_WINDOW_CONSENT_CONTRACT.md`), Bridge share viewing, basic
  chore/reward approval.
- **Plus** (paid, monthly/annual): richer Parent Window summaries (still
  allowlist-based, never raw content per the consent contract), unlimited
  active chores/rewards instead of a free-tier cap, priority safety
  notification channels (SMS/push in addition to email), Parent Coach
  (Voice Bip parent-side) access.
- **Family plan**: one subscription covers multiple linked teens and
  co-parents/guardians on the same family unit, priced below N × single
  subscriptions. This is the plan to lead pricing pages with — most real
  households have more than one kid or two parents who both want access.

None of these tiers may gate a teen's own free experience. A lapsed parent
subscription should degrade gracefully to the free parent tier, not lock
the teen out of anything.

## School and youth-organization partnerships

- District/organization licenses (per-seat or per-school flat fee) for
  counselors or youth-program staff to get a *safety-scoped* view — not
  the same thing as a parent link, and not a backdoor around the consent
  contract. This needs its own visibility class if built (do not reuse
  `shared_with_parent`); flag as a follow-up design issue before building.
- Position as a companion tool for existing school counseling programs,
  not a replacement for them — Bip is not a clinical or crisis product
  (see `docs/MVP_PRIVACY_CONTRACT.md` §4, safety is not surveillance).

## Grants and nonprofit opportunities

- Youth mental health, digital wellbeing, and family-support foundations
  are the natural grant category. A grant-funded free tier for
  low-income families (waiving the parent subscription, not changing the
  privacy model) is a stronger pitch than a straight donation ask.
- Keep grant-funded seats indistinguishable from paid seats in the product
  — no "sponsored account" badge visible to the teen.

## Merchandise revenue

- Physical merch (see `docs/REWARDS_STORE_DESIGN.md`) is a secondary,
  break-even-or-better revenue line, not a primary one at launch — its
  first job is making the points economy feel real, not generating margin.
- Branded merch (stickers, room decor irl) doubles as marketing;
  price near cost early on rather than optimizing margin.

## Launch sequencing

1. Private beta (current phase, per `MVP_PRIVACY_CONTRACT.md`): invited
   families only, free, no Shopify checkout, no subscription billing yet —
   the goal is trust and retention data, not revenue.
2. Paid parent tier turns on once the free-tier Parent Window and
   chore/reward approval flow have run without a privacy incident through
   the beta.
3. Family plan and school partnerships follow once retention data exists
   to price them credibly.
4. Shopify/merch turns on last, gated on the points economy having real
   usage data (see anti-exploit caps in `docs/POINTS_ECONOMY_DESIGN.md`) —
   shipping physical fulfillment against an unaudited points system is a
   fraud/cost exposure, not just a UX risk.

## Early adopter plan

- Beta families get a locked-in discount or an extended free period on the
  future paid parent tier, not extra data access — the incentive is price,
  never privacy.
- Founder-curated reward catalog entries (small digital unlocks) for beta
  families who give structured feedback, tracked through the Founder
  Control Room's Founder Ideas module rather than an ad hoc spreadsheet.

## Cost ceilings

Set a per-teen monthly cost ceiling and alert (not hard-cutoff, to avoid a
service outage mid-conversation) in the Founder Control Room's
Infrastructure module once it exists (issue #186):

- **AI/companion replies**: cap tokens-per-message and messages-per-day per
  teen; degrade to shorter/cached responses before ever silently dropping
  a reply.
- **Voice**: TTS/STT are the most expensive per-unit cost — cap
  minutes/day per teen, and prefer cached/pre-rendered companion audio
  (see `docs/COMPANION_ENGINE_DESIGN.md`) over live synthesis wherever the
  content is repeatable.
- **Storage**: voice note and image retention windows should be finite by
  default (with explicit "keep forever" as an opt-in, not the default) to
  bound Supabase Storage growth.
- **Moderation**: safety-relevant text/voice moderation calls are the one
  cost category that should never be capped or degraded — moderation
  under-spend is a safety incident risk, not a cost optimization.

## Metrics needed before fundraising

- D7/D30 teen retention, broken out by whether a parent is linked (tests
  the "support doorway, not surveillance" thesis directly).
- Companion conversation depth/return rate per companion (validates
  differentiated companion investment — see
  `docs/COMPANION_ENGINE_DESIGN.md`).
- Bridge share rate (teens choosing to share something with a parent) as a
  trust proxy — a low share rate with high teen retention is a *good*
  signal under this product's privacy thesis, not a bad one; don't let an
  investor conversation push this metric toward "more parent visibility."
- Safety flow volume and outcome, reviewed only in aggregate/anonymized
  form for fundraising purposes — never export raw safety event content.
- Cost per active teen (AI + voice + storage + moderation) against the
  ceilings above, to show unit economics are bounded before scaling spend
  on user acquisition.

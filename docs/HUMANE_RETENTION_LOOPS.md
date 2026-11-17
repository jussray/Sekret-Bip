# Se’kret Bip Humane Retention Loops

Status: **Integrated source and Supabase contract; physical-device and controlled-account proof remain.**

Owner: [Issue #404](https://github.com/jussray/Sekret-Bip/issues/404)

## Product standard

Se’kret Bip is a private emotional home worth returning to while a teen grows up.
Retention must come from increasing product value:

1. the Room feels more personally useful;
2. expression produces relief or clarity;
3. regulation tools help in the moment;
4. private history helps the teen understand themselves;
5. connection happens only when the teen chooses it;
6. growth and rewards acknowledge effort without becoming a public rank.

The app does not optimize for maximum session length, infinite conversation, guilt, public popularity, or parent surveillance.

## Value moment

> I came in feeling something I could not explain, Bip met me without judging me, helped me do one useful thing, and remembered the safe part without exposing me.

A meaningful action is one of:

- mood check-in;
- journal save;
- Voice Bip completion;
- Comfort, breathing, or reset completion;
- Circle post or supportive reaction;
- Crew check-in;
- goal or Bippin 2 step completion;
- intentional Bridge share;
- private memory review.

Opening the app alone is not a meaningful action.

## Loop 1: Living Room

**Trigger → action → reward → reinvestment**

A feeling, time of day, weather, or need for privacy → enter the Room and choose expression, regulation, or connection → receive a privacy-safe return receipt and room acknowledgment → build a private Bip Story and increasingly useful Room.

### Day mapping

- **Day 2:** recognition. The teen does not have to start from zero.
- **Day 8:** understanding. Three meaningful active days can reveal a useful pattern.
- **Day 30:** ownership. The Room and History feel like a personal growth record.

### First build

`BipReturnOverlay` sits on the canonical teen Room route. It loads:

- local meaningful-action receipts;
- a metadata-only Supabase active-day snapshot;
- the latest intentional Bip Energy fade result;
- three value doors: let it out, help me settle, help me connect.

No raw journal, voice, Circle, or Bridge message content is used.

### Proof metrics

- first-session meaningful-action completion;
- Day-2 meaningful return;
- three meaningful active days in the first eight days;
- time to first useful action;
- “this feels like my space” rating;
- session length does not need to rise for return to improve.

## Loop 2: Expression to understanding

A thought keeps circling → write, Voice Bip, Cloud Thoughts, or companion prompt → receive bounded reflection and relief → preserve a private receipt and later see recurring patterns.

`meaningfulReturn.ts` maps safe activity types to acknowledgments. `MeaningfulHistoryScreen` shows active days, meaningful actions, and category counts rather than making a consecutive streak the only proof of growth.

Streaks still exist and can earn positive bonuses. A reset streak is not treated as erased growth.

## Loop 3: Regulation to personal toolkit

Anxious, overwhelmed, angry, tired, sad, restless, or unable to sleep → use Comfort, breathing, Calm, or Mind–Body Reset → receive an immediate state change or next step → learn which tools are worth returning to.

The current first build records completion receipts. Optional before/after state tracking remains a later controlled addition and must not become a medical score.

## Loop 4: Chosen connection

The teen wants support → use Circle, Crew, or Bridge → receive relevant connection without surrendering private content → reinvest in trustworthy relationships.

### Circle boundary

Public Circle keeps supportive reactions without turning them into a public score. The canonical feed RPC returns:

- the viewer’s own selected reaction;
- aggregate support totals only when the viewer owns the post;
- no aggregate totals for anybody else’s post.

Direct client `SELECT` access to `public_circle_posts` is revoked so a modified app cannot bypass the owner-only response contract and download the cached counts. The post owner sees a private “only you” support summary. Other viewers see only the actions they can take and whether their own support was sent. The author’s vulnerability cannot become a ranked popularity object, and there is no trending-vulnerability mechanic.

### Bridge response request

Before a Bridge signal, the teen chooses one support request:

- just listen;
- comfort me;
- help me plan;
- check later;
- give me space.

The preference is written to `bridge_signals.response_preference`. It does not grant access to journals, chats, mood history, voice notes, or other private content. Parent Bridge shows the latest request with a reminder to honor the privacy boundary.

## Loop 5: Growth receipts and Bip Energy

Meaningful growth action → receive points or a soft receipt → use energy for room growth and future rewards → return because showing up matters.

### Intentional slow fade

The slow point drain is a founding product rule, not an accidental penalty.

Current contract:

- applies to the existing `point_balances` wallet;
- one-day grace period;
- evaluated after teen login/session restore;
- at most once per day;
- at most five points per day;
- never below zero;
- recorded as `source_type = inactivity_adjustment`;
- shown as **Bip Energy faded a little**, not “you failed” or “you lost everything.”

Permanent value is outside the fading wallet:

- Bip Tickets remain permanent;
- redeemed physical or digital rewards remain permanent;
- unlocked room items remain permanent;
- parent-approved reservations and refunds keep their own ledger semantics.

The return copy is:

> Welcome back. Small steps still count.

The energy economy may make absence noticeable. It may not shame emotional struggle, remove already-earned permanent items, or erase the teen’s Bip Story.

## Data boundaries

The new return snapshot reads only `bip_events` and returns:

- active days in eight and thirty days;
- meaningful-action counts;
- latest event type and timestamp;
- allowlisted metadata keys: category, route, and receipt key.

It requires a permanent authenticated account. No raw emotional content is returned.

All new local receipt, adjustment, and Bridge-preference keys are included in private-account cache clearing.

## Red-team rules

Reject any future change that:

- subtracts Bip Tickets or unlocked rewards for inactivity;
- makes public reaction totals visible or downloadable for somebody else’s teen Circle post;
- ranks vulnerable posts by engagement;
- uses private content in return notifications;
- lets parent linkage unlock private teen content;
- makes a companion demand continued conversation;
- treats time spent as the main success metric;
- calls normal inconsistency failure.

## Verification state

Integrated:

- Supabase migrations applied to the Se’kret Bip project;
- Room return overlay;
- active-day History route;
- Circle owner-only reaction-total contract and private author summary;
- Bridge response-preference contract and parent card;
- intentional Bip Energy fade restored;
- source-contract test coverage;
- sign-out cleanup for new local keys.

Still required before `verified` or `released`:

- exact-head CI and type-check evidence;
- physical iOS and Android layout/accessibility QA;
- controlled two-account Bridge proof;
- controlled two-account Circle proof that only the post owner receives aggregate totals;
- confirmation that the parent receives the selected response request;
- return-copy usability testing with adults and appropriately governed teen research;
- production-release observation and rollback evidence.

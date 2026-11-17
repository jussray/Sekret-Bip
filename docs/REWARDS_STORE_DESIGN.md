# Se'kret Bip Rewards Store Design

Status: **Design contract for rewards + Shopify integration**

Grounded against the schema already shipped in
`supabase/migrations/20260627193000_phase_2_tasks_approvals_rewards.sql`
(`reward_catalog`, `reward_redemptions`, `request_reward_redemption`,
`review_reward_redemption`). No Shopify SDK or storefront integration exists
in the repo yet — this document defines what to build, not a retrofit of
existing code.

## Two distinct reward types

The schema already separates these via `reward_catalog.category` /
`fulfillment_type` — keep that separation explicit in every screen and
document, per issue #139's instruction not to conflate them:

1. **Earned rewards** — digital unlocks, room items/collectibles, cosmetic
   companion items, in-app recognition. `fulfillment_type = 'digital'` or
   `'manual'`. Point-cost only; never has a real-money price.
2. **Purchasable products** — physical merch bought directly (allowance,
   gift card, parent-funded). `fulfillment_type = 'shopify'`. Real checkout,
   real shipping, real refund policy — a different consent and safety
   surface than "spend points you earned."

Never present a Shopify checkout as something a teen "earned" with points
unless the redemption explicitly bridges points → a Shopify discount code
(see below) — don't blur "I did the thing" with "I bought the thing."

## Digital rewards and collectibles

- `fulfillment_type = 'digital'`: unlocking is the fulfillment. On
  `review_reward_redemption(approve=true)`, a follow-up step (not yet
  built) must grant the entitlement — e.g. insert a row into a
  `teen_unlocked_items` table keyed by `reward_catalog.slug`, or flip a flag
  the Room/companion screens read. Until that grant step exists, digital
  rewards must stay in "coming soon" state per `MVP_PRIVACY_CONTRACT.md`
  §7 — approving a redemption today records the point spend but does not
  yet unlock anything in-app.
- Room items/collectibles are the first digital category to wire end to
  end, since Room already reads per-user state
  (`getRoomScene`/`THEME_PACKS`) — a new unlocked-item check fits that
  existing read path rather than inventing a new one.

## Physical merch and Shopify

- `fulfillment_type = 'shopify'`: `reward_redemptions.fulfillment_reference`
  is reserved for the Shopify order ID once fulfillment completes.
- Recommended flow: teen redeems → parent approves (`requires_parent_approval`
  defaults `true` and should stay `true` for every `shopify` reward,
  regardless of point cost) → approval triggers a server-side (Cloudflare
  Worker or Supabase Edge Function) call to Shopify's Admin API to either
  (a) create a draft order pre-filled with the reward's product/variant, or
  (b) issue a single-use discount code sized to the point value, redeemed
  at the family's existing shipping address on file with the parent
  account. Never collect a new shipping address directly from the teen
  flow — physical-address collection from a minor is a COPPA-relevant
  surface; route it through the parent account.
- Inventory: `reward_catalog.inventory_count` already exists and is
  decremented implicitly by the `inventory_count > 0` check in
  `request_reward_redemption`'s `WHERE` clause, but nothing currently
  decrements it after a successful redemption — add that decrement inside
  `review_reward_redemption` when `p_approve = true` and
  `fulfillment_type = 'shopify'`, in the same transaction as the status
  update, so a race between two pending redemptions on the last unit can't
  both succeed.
- Order/fulfillment status should mirror Shopify's own states
  (`pending`, `fulfilled`, `cancelled`, `refunded`) rather than inventing a
  parallel vocabulary — store the literal Shopify status string in
  `reward_redemptions.metadata.shopify_status` and drive the UI off status
  transitions delivered via Shopify webhook, not polling.

## Point redemption UX

- Already correct in the schema: points are reserved at request time (see
  `docs/POINTS_ECONOMY_DESIGN.md`), so the redemption UI can show "pending
  parent approval" immediately without waiting on a round trip.
- Show the exact point cost and resulting balance before confirming — this
  is a "consent must be understandable" requirement, same standard as
  Bridge sharing in `PARENT_WINDOW_CONSENT_CONTRACT.md`.

## Parent approval

Already implemented client-side in `src/utils/parentApprovals.ts` and
`screens/ParentApprovalsScreen.tsx`. Extend, don't replace:

- Shopify-fulfillment rewards should surface shipping/order details to the
  approving parent (from the parent's own address on file, not a teen
  input) at approval time, not after.
- A parent must be able to reject with a note (`review_note` already
  exists) — surface it back to the teen as the reason, softened in tone
  (companion voice, not a raw admin string).

## Refunds and cancelled redemptions

- Cancellation before parent approval: teen-initiated cancel should call a
  new `cancel_reward_redemption` RPC (not yet built) that only succeeds
  while `status = 'pending_parent'`, releases the reserved points via the
  same `transaction_type = 'release'` pattern `review_reward_redemption`
  already uses, and sets `status = 'cancelled'`.
- Refund after Shopify fulfillment: a `status = 'refunded'` transition
  should be driven by a Shopify refund webhook, not a manual button, and
  should not automatically re-credit points unless the product was never
  shipped — a shipped-then-returned physical item is a Shopify-side refund
  concern, not a points reversal by default.
- Out-of-stock at approval time (inventory hit zero between request and
  approval): `review_reward_redemption` should check
  `inventory_count` again before marking `approved`, and if depleted,
  auto-transition to `rejected` with a review_note explaining why, and
  release the reserved points — never leave a teen's points reserved
  against a reward that can't be fulfilled.

## Age-appropriate purchase flow

- No teen-initiated real-money checkout. Every `shopify` fulfillment path
  requires parent approval before any Shopify API call is made — there is
  no "buy now" for a minor account.
- Digital/point-only rewards need no age gate beyond the existing
  age-gate/verification state already enforced at the route level.

## Failure and out-of-stock states

- Out-of-stock: disable the "redeem" action in the catalog UI when
  `inventory_count = 0`, but the authoritative check remains the
  `for update` row lock in `request_reward_redemption` — client disabling
  is UX, not the guarantee.
- Shopify API failure during fulfillment: must not silently leave a
  redemption stuck at `approved` forever. Add a `fulfillment_failed` status
  (or reuse `metadata.shopify_status`) surfaced to both the founder Control
  Room (issue #186's Rewards module) and the parent, with a retry action
  scoped to founder/admin.

## Not required for this design

Per `MVP_PRIVACY_CONTRACT.md` §7, none of the above needs to ship before
private beta. Digital/manual rewards with founder-curated inventory can
launch first; Shopify checkout is the last piece to wire, once the points
economy has real usage data to size point-cost-to-merch-value ratios (see
`docs/BUSINESS_MODEL.md`).

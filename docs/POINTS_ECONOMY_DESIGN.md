# Se'kret Bip Points Economy Design

Status: **Design contract for the points/rewards system**

This document defines the rules the points economy must follow. It reflects
what is already implemented in `src/features/activity/{events,ledger}.ts` and
`supabase/migrations/20260627193000_phase_2_tasks_approvals_rewards.sql`,
plus the schema fix in `20260703_reconcile_point_ledger_schema.sql` (see
"Known issue, now fixed" below). It does not introduce new UI.

## What earns points

Points are earned two ways:

1. **Automatic, from `ActivityEvent`s** (`src/features/activity/events.ts`).
   Every qualifying event is emitted via `emitEvent()` and, if it appears in
   `POINTS_PER_EVENT` (`src/features/activity/ledger.ts`), awarded
   automatically:

   | Event | Points |
   |---|---|
   | `mood_logged` | 2 |
   | `comfort_completed` / `breathe_completed` | 3 |
   | `streak_milestone` | 3 |
   | `goal_completed` | 4 |
   | `circle_post` | 4 |
   | `journal_saved` | 5 |
   | `voice_completed` | 5 |
   | `crew_checkin` | 6 |

   `companion_message` and `circle_reaction` are tracked events but **do not**
   award points — reacting or chatting must not become a farmable point
   source.

2. **Parent-approved `bip_tasks`** (chores/growth tasks a parent creates, or a
   teen self-creates with `point_value = 0`). Approval runs through
   `submit_bip_task` → `review_task_submission`, which inserts a
   `point_transactions` row with `transaction_type = 'earn'` once a parent
   approves (or immediately if `requires_approval = false`, which RLS only
   allows when `point_value = 0`).

There is no third path. Nothing in the client should insert directly into
`point_transactions` or `bip_events` outside `emitEvent()` and the task RPCs.

## Point values and daily caps

- Per-event point values are fixed constants (`POINTS_PER_EVENT`), not
  user- or server-configurable at runtime — changing the economy means
  changing that table and shipping a release, not a live config flip.
- **No caps exist yet.** This is the primary anti-exploit gap: a teen can
  currently call `emitEvent('mood_logged')` an unbounded number of times per
  day. Before this economy is exposed as a spendable currency (Shopify
  redemption, physical merch), add a daily cap per `event_type`, enforced
  **server-side** in a trigger or RPC on `point_transactions`, not in the
  client. Client-side caps are a UX nicety, not a control.
- Recommended starting caps (tune after real usage data, not before):
  mood 3/day, journal 2/day, voice 2/day, circle 3/day, comfort 3/day, crew
  1/day, goal 3/day, streak 1/day (streak milestones are naturally
  self-limiting).

## What reduces points

- **Spend**: redeeming a reward (`request_reward_redemption`) inserts a
  negative `amount` row with `transaction_type = 'reserve'`.
- **Release**: a rejected or cancelled redemption inserts a positive
  `amount` row with `transaction_type = 'release'` that returns the reserved
  points (`review_reward_redemption` when `p_approve = false`).
- **Adjustment**: reserved for founder/admin manual correction
  (`transaction_type = 'adjustment'`), e.g. reversing a fraud/duplicate
  event. Not yet wired to any RPC — add one, gated to
  `can_manage_app = true`, before relying on it.
- Points are never reduced by anything the teen didn't initiate. There is no
  general "penalty" mechanic — Bip does not punish emotional struggle (per
  the product standard in issue #136) by taking points away for inactivity
  in the moment; see inactivity decay below for the one exception.

## Inactivity decay

Not implemented. If added:

- Decay must be slow, floor-limited (never below 0, and never below a
  teen's already-redeemed/reserved balance), and framed as "the cloud is
  resting," not loss language.
- Decay must never fire while a teen is in an active safety flow — check
  `safetyCoordinator` state before applying.
- Decay is a scheduled job (Cloudflare Worker cron or Supabase scheduled
  function) writing `transaction_type = 'adjustment'` rows, never a
  synchronous path in the request cycle.

## Spending and reservation behavior

The reserve/release pattern already implemented is correct and should not
change:

1. `request_reward_redemption(reward_id)` locks the user's `point_balances`
   row `FOR UPDATE`, checks `available >= point_cost`, inserts the
   `reward_redemptions` row, then inserts a negative `point_transactions`
   row. The point spend and the redemption record are atomic within one
   `plpgsql` function — a teen can never reserve points for a redemption
   that fails to record, or vice versa.
2. Points are reserved (deducted) at **request** time, not at fulfillment —
   this prevents a teen from requesting the same limited-inventory reward
   twice while a parent approval is pending (`reward_redemptions_open_unique_idx`
   enforces one open redemption per teen per reward).
3. Rejection/cancellation must release via the same RPC path, never a
   client-side balance edit.

## Parent-approved tasks

Already covered by `bip_tasks`/`task_submissions`. Rules worth keeping
explicit:

- A parent can create a task with any `point_value` up to 10,000; a teen
  self-created task must have `point_value = 0` (RLS-enforced) — teens
  cannot self-award points.
- `task_submissions_one_open_idx` prevents a teen from submitting the same
  task twice while one submission is pending.
- Points post only on approval (or immediately for the zero-value,
  no-approval self-tasks, which award nothing).

## Duplicate-event protection

Not yet enforced. `emitEvent()` is fire-and-forget from arbitrary call
sites; nothing stops a screen from calling it twice for one user action.
Add a narrow uniqueness constraint before this economy is spendable:

- For discrete one-shot actions (`journal_saved`, `voice_completed`), key
  duplicate detection off the source record ID via `bip_events.metadata`,
  not off timestamp proximity.
- For repeatable actions (`mood_logged`, `circle_post`), a per-day cap
  (above) is the practical duplicate guard — the client should still
  debounce double-taps, but the server cap is what actually matters.

## Anti-exploit rules

1. All point-affecting writes go through `emitEvent()` (client, for the
   automatic path) or a `SECURITY DEFINER` RPC (for task/reward flows) —
   never a raw client insert into `point_transactions`. RLS on
   `point_transactions` currently allows `auth.uid() = user_id` for `FOR ALL`,
   which is broader than it needs to be now that RPCs exist for
   task/reward writes; tightening this to insert-only, and eventually to
   RPC-only, is worth a follow-up migration once `emitEvent()` also moves
   server-side (see Architecture Scale Audit).
2. Server-side daily caps (above) are the primary defense against
   scripted/automated farming — client-side checks are not defense, they're
   affordance.
3. `point_balances.available` is the only value read at redemption time; a
   teen cannot spend more than their locked, server-computed balance.
4. Point values and caps must never be exposed as client-writable config.

## Balance and transaction history UX

- `usePoints()` already returns a live per-category breakdown suitable for
  Bippin 2 (see issue #146 — Points absorbs into Bippin 2, not a standalone
  screen).
- A transaction history view should read `point_transactions` filtered to
  the signed-in user, ordered by `occurred_at desc`, and render `reason`
  (falling back to a friendly label derived from `event_type` for
  auto-earned rows, which don't set `reason`).
- Never surface `metadata` contents directly in UI — it may contain
  `source_id`/internal identifiers not meant for display.

## Merch conversion targets

Deferred to `docs/REWARDS_STORE_DESIGN.md` (issue #139) — this document
defines how points move, not what they're worth in the Shopify catalog.

## Known issue, now fixed

`20260627_point_ledger.sql` (event-based ledger: `event_type`, `points`,
NOT NULL) and `20260627193000_phase_2_tasks_approvals_rewards.sql`
(task/reward RPCs: `amount`, `reason`, `transaction_type`, `source_type`,
`source_id`, `metadata`, plus a `point_balances` read) both wrote to
`point_transactions` but neither migration created the columns/table the
other side depended on. Task approvals with `point_value > 0` and every
reward redemption attempt would fail at runtime. Fixed in
`20260703_reconcile_point_ledger_schema.sql`, which adds the missing
columns (nullable, backfilled from `points` where absent), creates
`point_balances` as a trigger-maintained table, and backfills it from
existing `point_transactions` rows.

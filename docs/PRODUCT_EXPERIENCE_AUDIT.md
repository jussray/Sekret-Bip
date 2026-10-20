# Se'kret Bip — Product Experience Audit

Status: **Audit per issue #136. No broad UI changes bundled with this document.**

Method: grounded against source (`screenPurpose.ts`, `screens/*.tsx`,
`supabase/migrations/*`, `src/features/*`) and the existing internal audits
(`docs/SCREEN_PURPOSE_AUDIT.md`, `docs/UX_AUDIT.md`,
`docs/MVP_PRIVACY_CONTRACT.md`, `docs/AGENT_L4_ARCHITECTURE.md`), not
inferred from product docs. This pass is static-code evidence, not live
interactive QA — flagged per-section below where a hands-on pass (via the
`run` skill / RN Web) would add confidence beyond what source review can
confirm.

## 1. Core loop: FEEL → EXPRESS → GET SUPPORT → TAKE ACTION → EARN → REFLECT → CONNECT → RETURN

| Stage | Supported by | Evidence |
|---|---|---|
| FEEL | Room mood check-in | `RoomScreen` presence + mood glow (`constants/moodGlow.ts`) |
| EXPRESS | Pages, Voice Bip, Circle | journal/voice/companion entry points, all wired |
| GET SUPPORT | Companion replies, Calm, safety flow | `companionEngine.ts`, `safetyCoordinator.ts` |
| TAKE ACTION | Bip tasks, comfort tools | `bip_tasks`/`submit_bip_task` (real, RLS-backed) |
| EARN | Point ledger | `usePoints()`, now schema-consistent (this audit's ledger fix) |
| REFLECT | Bippin 2 progress card | tier/progress/streak, now with breakdown (this session) |
| CONNECT | Circle, Crew, Bridge | separate, non-overlapping data models per `screenPurpose.ts` |
| RETURN | Streak, tiers | `bumpStreak()` on every `emitEvent()` call |

**Where the loop breaks:** EARN → REFLECT was the weakest link going into
this audit — points were earned invisibly (background ledger writes) with
no in-product "you got points for that" feedback moment before Bippin 2 was
opened. Not fixed here (out of scope for a document, and this document's
scope is audit, not visual redesign) — recommend a lightweight toast/nudge
at the moment of `emitEvent()` for point-earning types, so EARN feels
connected to the action that caused it instead of only visible on a later,
separate screen. TAKE ACTION → EARN has a real risk too: reward
redemption was silently broken until this session's schema fix (see
`docs/ARCHITECTURE_SCALE_AUDIT.md`) — a teen spending points that never
actually cleared their balance, or a task approval that never posted
points, is a broken-promise experience, not just a bug.

## 2. First 5 minutes

Not independently re-audited here — `docs/UX_AUDIT.md` already covers this
ground and explicitly defers to a fresh pass against the current Expo
Router app (its note: "A future UX audit should inspect the current Expo
Router application directly"). That fresh pass hasn't happened yet. Given
this document's time budget went to breadth across all 8 areas rather than
depth on one, flagging the first-5-minutes deep-dive as the single highest-
value follow-up if only one more audit pass gets scheduled — first-run
experience has outsized retention impact and hasn't been re-checked since
the router migration.

## 3. Screen-by-screen — single job

`screenPurpose.ts` already encodes the intended single job and
`mustNotBecome` boundary for every primary screen (both sides) and is
actively enforced (`SCREEN_PURPOSE_AUDIT.md` shows real fixes landed against
it: Pages comfort handoff, Room dashboard-content removal, Circle
moderation). Current adherence, from this session's checks:

- **Room**: clean — no dashboard content in either `RoomScreen.tsx` or
  `ParentRoomScreen.tsx` (confirmed by `SCREEN_PURPOSE_AUDIT.md` and a
  direct grep this session).
- **Pages**: comfort is now a link-out to Calm, not embedded (confirmed).
- **Calm**: owns its comfort tools; also the entry point Pages links to.
- **Circle**: now genuinely owns Messages (embedded `MessagesScreen` as a
  tab, both teen and parent Circle routes — confirmed this session), not a
  separate destination.
- **More**: confirmed this session to be the intended feature drawer
  exactly matching `TEEN_MORE_GROUPS`/`PARENT_MORE_GROUPS` — no drift
  between the doc's group definitions and what `MoreScreen.tsx` renders
  (it maps the constant directly, no hardcoded parallel list).
- **Bippin 2**: was under-scoped relative to its stated job (owns points
  per `TEEN_MORE_GROUPS`' old entry, but didn't show the earning
  breakdown) — extended this session (see issue #146 work) so it now
  fully owns points/progress/streak/breakdown instead of splitting that
  job with a separate Points screen.

**Orphaned parallel implementations found this session** (echoing the
pattern CLAUDE.md already calls out for `CircleScreen.tsx`/
`useAppState.ts`/`designTokens.ts`): `screens/InsightsScreen.tsx` has zero
real importers — not reachable from any route or `setScreen()` call. Left
in place (removing it wasn't requested by any specific issue and it's
inert, not harmful), but worth a repo-hygiene pass to either wire it up
with real purpose or delete it, so a future contributor doesn't mistake it
for a live screen.

## 4. Companion presence

- **Distinct tone**: real and enforced structurally — `COMPANION_PROFILES`
  gives each of the 5 a distinct title/vibe/accent color, sourced from
  `COMPANION_CURRICULUM` as single source of truth (see
  `docs/COMPANION_ENGINE_DESIGN.md`).
- **Memory continuity**: honestly L2 (stateless + client-passed history),
  not L3+ — `docs/AGENT_L4_ARCHITECTURE.md` already documents this
  precisely and has a concrete recommended path (Supabase `pgvector`).
  This is the single biggest gap between "feels like a cool cousin who
  remembers you" (the product standard) and current reality: today's
  companions don't remember across sessions beyond what's in the passed-in
  history array.
- **Correct emotional role / repeated responses**: not independently
  re-verified against live conversation transcripts this session (would
  need interactive QA, not source review) — `docs/AGENT_L4_ARCHITECTURE.md`
  and `COMPANION_PIPELINE.md` are the grounded references; no evidence
  found of a regression since those were last reviewed.
- **Present across the app, not trapped in chat**: real — `getPresenceMessage()`
  is called from Room ambient UI, not just the chat screen, and
  `suggestedComfortTool` on a companion reply already triggers a nudge UI
  in Pages (confirmed this session) that routes to Comfort. Voice Bip's
  presence integration wasn't independently re-checked this session.

## 5. Privacy and trust

Reaffirmed, not newly audited — `docs/MVP_PRIVACY_CONTRACT.md` (locked) and
the newer `docs/PARENT_WINDOW_CONSENT_CONTRACT.md` (PR #223, open) already
cover this exhaustively and are the canonical references. One connection
worth surfacing: the points/rewards schema bug this session found (see
`docs/ARCHITECTURE_SCALE_AUDIT.md`) had no privacy exposure — it was a
correctness bug (broken writes), not a data-exposure bug — but it's a
reminder that "does it feel like Bip" audits and privacy audits should
keep checking the same code, since a broken reward flow erodes exactly the
trust the privacy contract is trying to protect, just through a different
mechanism (broken promise vs. exposed data).

## 6. Rewards and return loop

- **Points clarity**: was genuinely broken until this session (see above) —
  approving a point-earning task, or redeeming a reward, threw a database
  error at the RPC layer. Fixed.
- **Anti-exploit behavior**: does not exist yet (no daily caps, no
  duplicate-event protection) — documented as the top launch-blocking gap
  in `docs/POINTS_ECONOMY_DESIGN.md`. Low risk today (manual abuse only,
  small beta), real risk once Shopify redemption goes live.
- **Task approval / reward redemption**: schema now consistent (this
  session); UI flow (`ParentApprovalsScreen.tsx`, `TeenChoresScreen.tsx`)
  was already built against the intended RPCs and needed no changes beyond
  the one broken navigation link fixed alongside the schema (issue #146).
- **Merch/Shopify readiness**: not built (no SDK integration exists in the
  repo) — full design in `docs/REWARDS_STORE_DESIGN.md`. Correctly gated
  as "not required for beta" per `MVP_PRIVACY_CONTRACT.md` §7.
- **Motivates without punishing struggle**: no penalty/inactivity-decay
  mechanic exists today, which is the *safe* default per the product
  standard — don't build decay before the anti-exploit caps exist, or the
  two together read as punitive rather than one being a safety net.

## 7. Visual identity

Not independently re-audited screen-by-screen this session (would require
rendering each screen, not just reading source) — `docs/UX_AUDIT.md`'s
historical notes ("Room remains the strongest expression of the product
identity," "duplicate home and dashboard concepts should not compete") are
the standing reference. The one piece of fresh evidence: Bippin 2's new
breakdown rows (added this session) were styled to match the file's
existing `scrapCard()`/color-token conventions rather than introducing a
new visual pattern — consistent with the "prefer shared tokens, match
existing sibling screens" guidance.

## 8. Technical experience risks

Covered in full in `docs/ARCHITECTURE_SCALE_AUDIT.md` (issue #141). Summary
relevant to "does it feel like Bip": the point ledger schema mismatch was
the one technical risk with direct, immediate user-facing impact (broken
promises around points/rewards) found this session; the rest (last-write-
wins sync, no retry queue, L2 companion memory) degrade experience quality
gradually rather than breaking a specific promised interaction.

## Deliverable summary

### Critical trust or privacy issues
None found this session beyond what `MVP_PRIVACY_CONTRACT.md` and
`PARENT_WINDOW_CONSENT_CONTRACT.md` already govern.

### Broken or confusing user flows
1. Point-earning task approval and reward redemption were broken at the
   database layer — **fixed this session**.
2. Chores screen's back arrow linked to a standalone Points screen that
   issue #146 requires removed from navigation — **fixed this session**.

### High-impact experience improvements
1. Add an immediate point-earned feedback moment at the action itself
   (EARN → REFLECT loop gap, §1).
2. Move companion memory from L2 toward L3 per `AGENT_L4_ARCHITECTURE.md`
   — highest-leverage move toward "remembers you."
3. Re-run a first-5-minutes pass against the current Expo Router app
   (§2) — the last such pass predates the router migration.

### Visual identity inconsistencies
Not newly found this session; re-affirm `docs/UX_AUDIT.md`'s standing
notes until a fresh screen-by-screen visual pass is scheduled.

### Retention gaps
Anti-exploit/point caps don't exist (§6) — low risk now, blocks safe
Shopify launch later. Companion memory continuity (§4) is the larger
retention lever.

### Technical debt affecting the experience
`screens/InsightsScreen.tsx` orphaned (§3); no retry queue for failed
Supabase writes (`docs/ARCHITECTURE_SCALE_AUDIT.md`); last-write-wins sync
with no user-visible conflict signal.

### Recommended build order
1. Ship the point ledger fix (done).
2. Add point-earning daily caps before any Shopify/merch work starts.
3. Re-run first-5-minutes + visual identity passes with live interactive
   QA (the one thing this document couldn't do from source alone).
4. Invest in companion memory (L2 → L3) as the highest-leverage "feels like
   Bip" improvement once the above are stable.

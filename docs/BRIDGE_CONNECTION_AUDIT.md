# Bridge / S2Tell / Doorbell Audit

## Original product intent

Bridge is the private teen-parent connection system.

- **Doorbell** is the lightweight signal layer inside Bridge.
- **S2Tell** is the vulnerable share composer inside Bridge.
- **Parent Bridge** is the parent-side view of the same linked relationship.
- **Circle is unrelated** and remains community-only.

## Drift found

1. Doorbell became a standalone parent dashboard route.
2. Parent More listed Doorbell and Bridge as separate products.
3. S2Tell had its own screen implementation even though its route already aliases into Bridge.
4. Bridge signals were cloud-synced, but the main Teen Bridge composer collected text without persisting that intentional S2Tell content while still showing delivery-success copy.
5. Teen and parent side switching in More made one account imitate both people instead of exercising a linked-account relationship.
6. Parent Bridge exposed an activity pulse that risks turning the connection layer into monitoring; Bridge should prioritize intentionally shared content.
7. The routed Parent Bridge had drifted down to summaries and one signal card, leaving the shared S2Tell/reply thread available only in a legacy non-routed screen.
8. Several Bridge readers collapsed provider failure into an empty array, allowing failed reads to masquerade as “nothing shared.”

## Reconciled implementation

- Doorbell is defined as `signals` owned by Bridge.
- The former parent Doorbell route redirects into Parent Bridge signals.
- The Teen Bridge composer writes intentional message text to the existing `bridge_shares` S2Tell path before it can claim delivery success.
- `bridge_signals` remains the lightweight metadata/support-signal path. A signal-write failure cannot erase or falsely invalidate an already-confirmed S2Tell message; the UI reports the partial failure.
- `parent_notes` remains the parent-to-teen reply path.
- No generic `bridge_messages` table was introduced. The existing product-specific tables remain authoritative: `bridge_signals`, `bridge_shares`, and `parent_notes`.
- The routed parent authority remains `app/(parent)/bridge.tsx` → `ParentBridgeSummaryScreen`. The legacy `screens/ParentBridgeScreen.tsx` is retained as reference code, not runtime authority.
- `ParentBridgeSummaryScreen` now composes the response-request card, a shared Bridge thread, and the consent-bounded Bridge Summary inbox.
- The shared Parent Bridge thread renders only signals, explicit S2Tell shares, and the parent’s replies for the currently linked teen. It deliberately excludes raw journal/mood data because generated summaries own that consent-bounded surface.
- Parent-linked hooks clear stale teen snapshots before relationship re-verification and on read failure, so revoked or unverifiable relationships cannot keep old shared content visible.
- Result-aware readers distinguish successful empty state from provider failure for Bridge signals, S2Tell shares, parent notes, and Bridge Summary history.
- Parent note history is scoped to the currently linked teen instead of all notes ever sent by that parent account.
- Side-switch controls remain internal-test-only.

## Canonical structure

### Teen Bridge

- Signals / Doorbell metadata
- S2Tell composer using `bridge_shares`
- Parent replies from `parent_notes`
- Consent-bounded Bridge Summary history
- Connection history with explicit loading/error/empty states

### Parent Bridge

- Teen signals
- S2Tell shares
- Parent reply composer
- Consent-bounded Bridge Summaries
- Connection history with explicit loading/error/empty states

## Privacy boundary

Bridge may contain only content a participant intentionally sends into the linked relationship. It must never read or expose unshared teen journals, companion chats, private voice notes, Circle posts, or general activity history.

The routed Parent Bridge intentionally does **not** render raw journal or mood rows in its shared thread. Those sources can appear only through the separate Bridge Summary consent/generation path after teen confirmation.

## Failure-truth boundary

A provider, auth, or relationship-authority failure is not an empty Bridge.

- Linked-teen state fails closed while authority is re-verified.
- S2Tell/share readers return explicit success/failure results.
- Teen and parent history views show retry/error state when any authoritative source fails.
- Delivery success is shown only after the core S2Tell share write succeeds.
- Marking a parent reply as read updates local UI only after the database confirms the update.

## Runtime authority

- Teen: `app/(teen)/bridge.tsx` → `screens/BridgeScreen.tsx`
- Parent: `app/(parent)/bridge.tsx` → `src/features/bridge/ParentBridgeSummaryScreen.tsx`
- Relationship authority: `src/services/parentEntryState.ts`
- Signals/notes compatibility layer: `src/utils/parentBridgeCompat.ts`
- S2Tell share layer: `src/features/bridge/bridgeShareCompat.ts`
- Generated summary layer: `src/services/bridgeSummaryService.ts` / `src/services/parentBridgeSummaryService.ts`

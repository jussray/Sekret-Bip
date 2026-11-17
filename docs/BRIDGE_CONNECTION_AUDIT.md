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
4. Bridge signals were cloud-synced, but message content still depended on local side switching and local storage paths.
5. Teen and parent side switching in More made one account imitate both people instead of exercising a linked-account relationship.
6. Parent Bridge exposed an activity pulse that risks turning the connection layer into monitoring; Bridge should prioritize intentionally shared content.

## Refactor completed

- Doorbell is now defined as `signals` owned by Bridge.
- The former parent Doorbell route redirects into Parent Bridge signals.
- S2Tell continues to enter Teen Bridge through the Bridge route.
- A dedicated `bridge_messages` table was considered but retired in favor of the existing product-specific tables (`supabase/migrations/20260630004000_bridge_linked_accounts.sql`): `bridge_signals` for Doorbell, `bridge_shares` for S2Tell, and `parent_notes` for parent replies.
- Added RLS that permits only the active linked teen and parent to read or write the shared Bridge thread.
- Added a Bridge client service that resolves the active parent link instead of relying on side-switch state.
- Removed Doorbell as a separate item from Parent More.
- Kept all Circle tables and routes outside the Bridge service.
- Side-switch controls are hidden unless `EXPO_PUBLIC_ENABLE_SIDE_SWITCH=true` is explicitly set for internal testing.

## Canonical structure

### Teen Bridge

- Signals / Doorbell
- S2Tell composer
- Parent replies
- Shared moments
- Connection history

### Parent Bridge

- Teen signals
- S2Tell shares
- Parent reply composer
- Shared moments
- Connection history

## Privacy boundary

Bridge may contain only content a participant intentionally sends into the linked relationship. It must never read teen journals, companion chats, private voice notes, Circle posts, or general activity history.

## Remaining UI pass

Completed. `ParentBridgeScreen` no longer embeds the duplicate Se'kret Advice
topic picker (that capability lives at its real home,
`src/parent/features/sekret/ParentSekretCoachScreen.tsx`, linked from Bridge
via a single CTA) or the legacy Activity Pulse card. Both `BridgeScreen`
(teen) and `ParentBridgeScreen` (parent) now expose a chronological
Connection history view built from the existing `bridge_signals`,
`bridge_shares`, and `parent_notes` tables — no new `bridge_messages` table
was introduced; the canonical structure above is realized entirely on the
existing linked-account data contract.

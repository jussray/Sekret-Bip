# Se'kret Bip — UX/UI Audit

## Current Expo Router audit — 2026-09-17

Authoritative source audited: `jussray/Sekret-Bip` `main@ac88297d45cd97d4bcf51c358a20e3348e9e4452`.

Candidate repair lane: `fix/ux-navigation-clarity`.

This pass inspected the current Expo Router entry path, Teen and Parent primary navigation, Room interaction model, More drawers, first-run age setup, existing UX audit history, screen-purpose contracts, and current Playwright coverage. It does **not** treat historical screenshots, prior green CI, or the old monolithic-router audit as proof for this candidate.

### VERIFIED in source

- Teen primary navigation is Room, Pages, Calm, Circle, More.
- Parent primary navigation is Room, Bridge, Pages, Circle, More.
- Room remains the visual home base and still uses in-scene hotspots rather than becoming a dashboard.
- Parent Room keeps an explicit unlinked state and routes link-required destinations to linking instead of an empty relationship surface.
- Parent Bridge copy continues to state the non-surveillance boundary: intentionally shared relationship content only.
- Route-group layouts keep hidden/detail destinations out of the permanent tab bar and apply side-entry guards.
- Existing Product Design Playwright coverage already exercises the canonical Teen Room composition and direct Journal hotspot path.

### UX/UI gaps repaired in this candidate

1. **Room hotspot discoverability**
   - Problem: most Room destinations were invisible hit targets; only selected hotspots pulsed, and the automatic hint exposed Journal only.
   - Repair: add an optional, compact `What can I tap?` guide on Teen and linked Parent Room. It preserves the cinematic Room while exposing the main destinations and accessible button names.
   - Evidence path: `components/rooms/RoomExploreGuide.tsx`, `app/(teen)/room.tsx`, `app/(parent)/room.tsx`.

2. **Duplicate destination: Teen Bip Points**
   - Problem: More still linked to a standalone Bip Points destination even though Bippin 2 is the current owner of points/progress.
   - Repair: remove the duplicate drawer entry and keep Bippin 2 as the growth/points destination.
   - Evidence path: `src/constants/screenPurpose.ts`.

3. **Duplicate destinations: Parent Bridge and Parent Circle**
   - Problem: Parent More repeated two destinations that already have permanent bottom tabs.
   - Repair: remove the duplicate drawer entries while keeping connection-management and support tools in More.
   - Evidence path: `src/constants/screenPurpose.ts`.

4. **More hierarchy/copy mismatch**
   - Problem: Teen More copy said Voice Bip kept its own primary job while Voice Bip actually lives inside More.
   - Repair: describe More as the home for tools that do not need a permanent tab, and rename the first drawer group around the user's goal rather than navigation mechanics.
   - Evidence path: `screens/MoreScreen.tsx`, `src/constants/screenPurpose.ts`.

5. **First-run implementation jargon**
   - Problem: age setup exposed implementation terms such as “age bucket,” “assurance status,” and “account side.”
   - Repair: use person-facing language (`age range`, `right Bip space`, `next safe step`) while preserving the same storage, age-assurance, guardian, and routing behavior.
   - Evidence path: `app/(onboarding)/welcome.tsx`.

6. **Regression coverage for clarity**
   - Added source contracts that prevent the duplicate drawer destinations and onboarding jargon from returning.
   - Extended the existing Room Playwright path to require the shortcut affordance, verify non-overlap with existing Room controls, open the shortcut panel, and navigate to Journal through it.
   - Evidence path: `test/screen-purpose-parity.test.mjs`, `test/ux-clarity-contract.test.mjs`, `e2e/room-canonical-display.spec.ts`.

### OPEN receipts — do not collapse these into “UX done”

#### UX-STATE-001 — Parent Bridge history failure can look empty

`fetchParentSentNotes()` currently ignores the Supabase query `error` field and returns `data ?? []`. A backend/read failure can therefore be indistinguishable from a genuinely empty history. Parent Bridge also has no explicit history error state or retry action.

Status: **OPEN**. This requires a small data-result contract change shared with the other consumer (`MessagesScreen`) so the UI can distinguish `empty` from `error` without creating a false-empty state.

#### UX-PROOF-001 — exact-head automated proof

The branch contains focused Node contract coverage and an extended Playwright spec, but GitHub had no workflow run for the exact candidate head when this audit was written.

Status: **BLOCKED until exact-head CI / Product Design Playwright runs**.

#### UX-PROOF-002 — live visual/runtime proof

The connected Opera Browser Connector was unavailable (`Browser not connected`) during this pass, so the live deployed experience could not be visually compared against the source candidate.

Status: **BLOCKED on browser/runtime access**.

### Merge rule

Do not merge or call the UX/UI repair complete until:

1. focused source contracts pass on the exact candidate head;
2. the Product Design Playwright Room path passes on that same head and produces screenshots;
3. the current live/runtime surface is checked after deployment for mobile-width layout, overlap, navigation, and first-run copy;
4. `UX-STATE-001` is either repaired with honest error/empty distinction or explicitly kept out of the release gate with a separate accepted receipt.

---

## Historical audit context

The original audit was written when the app used a monolithic `app/index.tsx` string router. The repository now uses Expo Router with separate `app/(teen)/` and `app/(parent)/` route groups, so router-specific conclusions from that older pass are not current proof.

Historical findings that still informed the current pass:

- Room remains the strongest expression of the product identity.
- Room hotspots need consistent discoverability.
- Duplicate home and dashboard concepts should not compete.
- More menus need grouping and hierarchy.
- Loading, empty, offline, retry, and permission states should use shared patterns.
- Parent copy must preserve the non-surveillance promise.
- Bridge must contain only intentionally shared relationship content.
- Parent and teen routes need complete back, deep-link, and guard behavior.

Current supporting references:

- `CURRENT_STATUS.md`
- `ARCHITECTURE.md`
- `RESTRUCTURE.md`
- `BRIDGE_CONNECTION_AUDIT.md`
- `AGENT_L4_ARCHITECTURE.md`
- `PRODUCT_EXPERIENCE_AUDIT.md`

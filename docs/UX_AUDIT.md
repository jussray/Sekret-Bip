# Se'kret Bip — UX/UI + runtime truth audit

## Current Expo Router audit — 2026-09-17

Authoritative repository base audited: `jussray/Sekret-Bip` `main@ac88297d45cd97d4bcf51c358a20e3348e9e4452`.

Candidate repair lane: `fix/ux-navigation-clarity`.

This pass treats the current Expo Router tree, production Supabase schema/policies, exact Git history, and exact-head GitHub evidence as authority. Historical screenshots, old monolithic-router conclusions, founder-preview sample data, and prior green runs are not proof for this candidate.

## Product goal used for this audit

Se'kret Bip is a privacy-first emotional-growth and self-expression product for young people and families. The Teen side should make expression, support, calming, reflection, connection, and growth easy to discover without turning the Room into a dashboard. The Parent side should support connection without surveillance. Bridge may expose only relationship data deliberately shared through the product's consent model.

The approved visual front-door direction remains family-artwork first: no visible Night/Suhana/Sy name strip on the opening hero, Cloud unobstructed, with character names preserved for accessibility/internal canon and later character-specific surfaces.

## VERIFIED in source and provider state

- Teen primary navigation is Room, Pages, Calm, Circle, More.
- Parent primary navigation is Room, Bridge, Pages, Circle, More.
- Room remains the visual home base and still uses in-scene hotspots rather than becoming a dashboard.
- Parent Room now resolves the existing server-backed `resolveParentEntryState()` authority before unlocking Bridge/Connection/Growth shortcuts. The local `linked_teen_id` cache is not allowed to create relationship authority.
- The live Parent Bridge route is `app/(parent)/bridge.tsx` → `ParentBridgeSummaryScreen` → `ParentBridgeResponseRequestCard` + `ParentBridgeSummaryInbox`.
- `screens/ParentBridgeScreen.tsx` is a legacy/non-routed implementation. It is retained, not treated as production proof.
- Parent Bridge copy preserves the non-surveillance boundary: intentionally shared relationship content only.
- `MessagesScreen` is still live inside Teen and Parent Circle routes, so its note-loading state is not dead code.
- Production Supabase project `tbsevonvegdnlyjgplmm` is `ACTIVE_HEALTHY` and has the expected Bridge tables and relationship-gated RLS policies.
- Production currently has zero rows in `parent_links`, `bridge_signals`, `bridge_share_requests`, `bridge_summaries`, and `bridge_summary_views`. This proves an empty production dataset, not a completed linked-family journey.
- The repository has no `AnthropicHTTPClient` or Anthropic provider path. The current companion provider implementation is OpenAI-backed. Anthropic-specific checks are therefore not applicable to this project.

## UX/UI gaps repaired in this candidate

1. **Room hotspot discoverability**
   - Added a compact `What can I tap?` guide on Teen Room and only on a server-confirmed linked Parent Room.
   - Preserves cinematic hotspots while exposing the primary destinations and accessible button names.
   - Parent relationship-required hotspots remain locked while link state is loading or failed.

2. **Duplicate navigation ownership**
   - Removed Teen `Bip Points` from More because Bippin 2 owns points/progress.
   - Removed Parent Bridge and Parent Circle from More because they already own permanent tabs.
   - Updated More hierarchy/copy so its purpose matches the actual navigation model.

3. **First-run implementation jargon**
   - Replaced visible `age bucket`, `assurance status`, and `account side` terminology with person-facing age-range and safe-next-step language without changing the underlying age/guardian routing contract.

4. **False-empty Bridge and Warm Notes states**
   - Added bounded result contracts for parent notes, Bridge signals, and parent-shared consent reads.
   - Failed reads no longer masquerade as successful empty data.
   - Live Parent Bridge response-request and Summary inbox surfaces expose explicit failure/retry states.
   - Raw Supabase error strings are no longer returned to the Bridge Summary UI.

5. **Relationship authority race**
   - Parent Room no longer trusts AsyncStorage `linked_teen_id` as unlock authority.
   - Relationship-required routes are inert until `resolveParentEntryState()` confirms `ready`.
   - Failed authority checks keep the relationship routes locked and expose retry.

6. **Regression path**
   - Source contracts cover drawer ownership, onboarding language, server-backed Parent Room authority, live Parent Bridge routing, failure-vs-empty behavior, and the non-routed legacy ParentBridgeScreen.
   - Product Design Playwright now runs those focused contracts plus lint and type-check before browser proof.
   - Room Playwright covers shortcut discoverability and Journal navigation in addition to the canonical direct hotspot path.

## Metrics audit

The repo has two intentionally different event stores:

- `bip_events`: canonical product-activity/points ledger written by `emitEvent()`.
- `app_events`: sparse service-only retention/dev analytics, including authenticated Teen `session_start`.

The Vercel Analytics components are deliberate no-ops on the shipped Cloudflare app and are not an active data source.

Production currently contains zero rows in both `app_events` and `bip_events`. No real retention total exists yet.

### METRICS-SEMANTICS-001 — repaired in candidate

The deployed `v_d7_retention` definition treated every distinct session date as another possible day zero. That does not answer first-session D7 retention and could distort the business signal once events exist.

Candidate migration `20260917225500_fix_d7_retention_first_session.sql` anchors each account to its first `session_start`, excludes cohorts whose full D6-D8 observation window has not elapsed, counts each returning user once, filters null account identity, and preserves service-role-only view access.

Raw `app_events` is append-only and has no idempotency key. For the current D7/WAU question, duplicate session rows do not inflate the metric because cohort/return/WAU aggregation is distinct by account. No CSV or historical-import subsystem exists in the product architecture, and none is added solely to satisfy an unrelated generic analytics shape.

## Security/provider receipts

- Bridge share-create/revoke SECURITY DEFINER functions were inspected live and enforce permanent-account/ownership/active-link constraints.
- Parent-link RPCs are intentionally callable by permanent authenticated accounts; existing repository proof explicitly keeps relationship consent independent from guardian identity review. Parent route entry still requires a verified guardian before the Parent runtime becomes ready.
- Guardian review authorization is delegated to `can_manage_guardian_reviews()`, which permits service role or a non-anonymous founder/admin profile with app-management authority.
- Supabase security advisors still report broader SECURITY DEFINER/anonymous-policy warnings and leaked-password protection disabled. Those warnings are separate security receipts and must not be collapsed into this UX candidate.

## OPEN receipts — do not collapse these into “UX done”

### UX-PROOF-001 — exact-head automated proof

The candidate must have exact-head lint, type-check, focused Node contracts, and Product Design Playwright screenshots. The Product Design workflow is PR-triggered for this path and verifies the PR head SHA before running.

Status: **OPEN until the final candidate head run is green**.

### UX-PROOF-002 — live deployed visual/runtime proof

The connected Opera Browser Connector was unavailable during this audit. A source/preview Playwright pass is not a substitute for post-deployment proof against the actual runtime/domain.

Status: **BLOCKED on browser/runtime access after deployment**.

### UX-DATA-001 — real linked-family journey

Production Bridge/link tables currently contain zero rows. Schema and RLS can be verified, but there is no existing authorized linked teen/parent record with which to prove the complete live Bridge journey.

Status: **BLOCKED on an authorized real/controlled linked-family runtime fixture or account journey**. Do not create or infer teen relationship data solely to make this receipt green.

### SECURITY-AUTH-001 — leaked-password protection

Supabase security advisor reports leaked-password protection disabled.

Status: **OPEN external configuration receipt**. It is not evidence that the UX candidate failed, but it remains relevant to launch security.

### SECURITY-ADVISOR-002 — broad advisor warnings

Supabase reports SECURITY DEFINER and anonymous-access-policy warnings across multiple subsystems. Some audited functions are intentionally exposed and internally authorized; others require separate function-by-function review. Do not mass-revoke or weaken existing APIs from a generic advisor warning.

Status: **OPEN portfolio/security hardening receipt**, separate from UX proof.

## Merge rule

Do not merge or call this repair complete until:

1. final exact candidate head passes lint and type-check;
2. focused UX/navigation/metrics contracts pass on that same head;
3. Product Design Playwright passes on that same head and uploads its screenshots/artifacts;
4. the PR diff/review shows no unrelated or dead-path implementation being used as production proof;
5. deployment/runtime identity is verified after merge before live UX is called complete.

The real linked-family Bridge journey and Supabase account-security warnings remain separate receipts even if this source candidate becomes mergeable.

---

## Historical context retained

The original audit was written when the app used a monolithic `app/index.tsx` string router. The repository now uses Expo Router with separate Teen and Parent route groups, so router-specific conclusions from the old pass are not current proof.

Still-valid product principles:

- Room is the strongest expression of the product identity.
- Room hotspots need consistent discoverability.
- Duplicate destinations should not compete for ownership.
- More needs goal-based hierarchy.
- Loading, empty, error, retry, offline, and permission states must not misrepresent failure as absence.
- Parent UX must preserve the non-surveillance promise.
- Bridge contains only intentionally shared relationship content.
- Teen and Parent routes require complete guard/deep-link/recovery behavior.

# Phase 2 — Crew Accountability

Parent goal: #238 (Relationship Layer)  
Feature flag: `crewAccountability` in `src/constants/relationshipFeatureFlags.ts`  
Unlimited Crew/privacy owner: [#432](https://github.com/jussray/Sekret-Bip/issues/432)

## What it is

A teen can post a daily emoji check-in and optionally share it with any number of accepted Crew members. Crew members can respond with a preset encouragement.

There is no numeric Crew cap. Access is limited by relationship quality, not an arbitrary member count.

No raw Crew content is visible to parents. No access or private account identity is granted to strangers, pending invites, removed connections, or blocked connections.

## Identity rule

All accounts remain anonymous to other users by default.

- Pending invite: anonymous account + Bip invite/status only.
- Accepted Crew: private display identity may appear inside private Crew surfaces.
- Blocked or removed: trusted identity and active content access end immediately.
- Public Circle remains anonymous even when two accounts are accepted Crew.

The client cannot type another account’s identity during acceptance. `redeem_crew_invite` resolves the accepted identity from the completed account profile.

## Schema and RPCs

| Contract | Purpose |
|---|---|
| `crew_members` | Owner-scoped invite and relationship state |
| `crew_check_ins` | Teen-owned check-in content |
| `crew_check_in_shares` | Deliberate per-recipient sharing |
| `crew_encouragements` | Preset support from accepted recipients |
| `get_crew_connection_profiles(uuid[])` | Accepted-Crew-only private identity resolver |
| `create_crew_check_in(...)` | Unlimited atomic check-in and share creation |
| `set_crew_connection_status(...)` | Either participant may leave or block |

Migrations:

- `20260707020922_crew_accountability.sql`
- `20260714183100_remove_crew_caps_and_guard_relationships.sql`
- `20260714183200_guard_crew_invite_acceptance.sql`
- `20260714183300_accepted_crew_identity_rpc.sql`
- `20260714183400_unlimited_crew_check_in_rpc.sql`
- `20260714183500_harden_crew_membership_paths.sql`

## Access model

| Table | Owner | Permitted readers |
|---|---|---|
| `crew_check_ins` | teen (`owner_user_id`) | Owner + accepted recipient through an active share |
| `crew_check_in_shares` | teen (`owner_user_id`) | Owner + the accepted recipient |
| `crew_encouragements` | Crew member (`sender_user_id`) | Sender + recipient teen |

RLS and guarded database functions enforce accepted status on every Crew content read and write. Block or remove causes immediate loss of access.

## Service

Canonical entry: `src/services/crewAccountabilityService.ts`  
Implementation: `src/services/crewAccountabilityServiceV2.ts`

| Function | Actor | Description |
|---|---|---|
| `createCheckIn` | Teen | Atomically creates one check-in and shares it with all selected accepted Crew members, without a numeric cap |
| `revokeCheckInShare` | Teen | Revokes one specific share immediately |
| `fetchMyCheckIns` | Teen | Own history with share status |
| `fetchCrewFeed` | Crew member | Check-ins deliberately shared with that account |
| `sendEncouragement` | Crew member | Sends a preset reaction to the teen |

## Implemented UI

- [x] Unlimited Crew connection manager
- [x] Pending anonymous invite state
- [x] Accepted-Crew trusted identity resolver
- [x] Unlimited recipient selection and select-all
- [x] Teen check-in composer
- [x] Teen check-in history
- [x] Crew incoming feed
- [x] Preset encouragement picker
- [x] Leave and block controls for either participant
- [x] Founder Preview local samples with explicit labeling
- [ ] Push notification on new share

## Gate before flag flip to `enabled`

- [ ] All RLS tests pass: owner, accepted member, pending, blocked, removed, stranger, parent, anonymous, service role
- [ ] Two-account identity test proves anonymous before acceptance
- [ ] Public Circle remains anonymous after Crew acceptance
- [ ] More than fifteen accepted fixture members load without a cap
- [ ] More than ten accepted recipients receive one atomic check-in
- [ ] One invalid recipient causes a complete rollback
- [ ] Note sanitization verified: 280-character maximum and trimming
- [ ] No raw content appears in error messages or metadata
- [ ] Individual share revocation removes access within one query
- [ ] Block/remove immediately revokes shares and trusted identity
- [ ] iOS and Android long-list/accessibility checks pass

## Privacy invariants

- Parents have no access path to check-ins, shares, encouragements, or Crew identity.
- Safety escalation does not grant Bridge, Crew, or Scrapbook access.
- Crew feeds show only check-ins shared with that specific accepted account.
- Preset encouragements only; no free-text Crew replies.
- Owner-authored pending labels are private notes, not another account’s identity.
- Unlimited membership never weakens acceptance, blocking, revocation, or RLS requirements.

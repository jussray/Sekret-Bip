# Se’kret Bip Parent Window Visibility and Consent Contract

Status: **Canonical product and authorization contract**

This document defines who may read, write, share, revoke, summarize, cache, and retain Bip content across teen, parent, crew, Circle, safety, and rewards surfaces. It expands the private-beta rules in `docs/MVP_PRIVACY_CONTRACT.md` without weakening them.

## Core rules

1. Teen-created content is `private_self` by default.
2. A parent link never grants blanket access to private teen content.
3. Sharing is explicit, item-specific, recipient-specific, and purpose-specific.
4. UI visibility is not authorization; Supabase RLS and server-side checks are authoritative.
5. Unlinking stops future Parent Window delivery and removes future access to revocable shared records.
6. Sign-out clears private local caches from that device.
7. Safety intervention must collect and disclose the minimum information required for the approved safety flow.
8. Parent summaries may contain only information explicitly shareable under this contract and must never reconstruct private teen activity.

## Visibility classes

### `private_self`

Readable and writable only by the teen account owner, except for narrowly scoped service processing required to provide the feature or execute an approved safety flow. It is never parent-browsable.

### `shared_with_parent`

A specific item intentionally shared by the teen with one or more currently linked parent or guardian accounts. The share record must identify the source item, recipient, shared fields, created time, and revocation state.

### `trusted_crew`

Content shared with accepted, active crew relationships only. Pending, declined, blocked, removed, or expired relationships have no access and must not reveal real identity by default.

### `friends_circle`

Content visible only inside a defined friends-circle audience. Membership and visibility must be checked server-side at read time.

### `public_circle`

Content visible to the eligible Circle audience using the teen’s anonymous Bip identity. Public Circle must not expose private profile fields, legal name, email, phone number, parent linkage, journals, or hidden activity.

## Content rules

### Pages and journals

- Default: `private_self`.
- Read/write: teen owner only.
- Parent access: only a separate, specific Bridge share created by the teen.
- Parent summaries: may include only the exact intentionally shared excerpt or item.
- Forbidden: journal browsing, entry counts, titles, inferred themes, or reconstruction of private activity.
- Unlinking: future reads of revocable shares stop; the original journal remains private.

### Voice notes and recordings

- Default: `private_self`.
- Read/write: teen owner only.
- Parent access: only a specific recording or approved transcript intentionally shared through Bridge.
- Forbidden: exposing unshared recordings, recording history, duration, transcript, or media existence.
- Cache: temporary media and transcripts clear on sign-out.

### Circle posts

- Visibility: `trusted_crew`, `friends_circle`, or `public_circle`, selected intentionally by the teen.
- Never silently promote content to a broader audience.
- Parent linking does not grant Circle access.
- `public_circle` uses the anonymous Bip identity.
- Author may delete or reduce visibility; expanding visibility requires a fresh explicit action.

### Bridge / Se’krets 2 Tell shares

- Visibility: `shared_with_parent`.
- Read: teen sender and named active parent recipients only.
- Write: teen creates the share; parent may respond only where the flow permits.
- Revocation: teen may revoke where supported; unlinking stops future delivery and access to revocable shares.
- Audit metadata may remain for integrity without exposing the content.

### Companion conversations and memory

- Default: `private_self`.
- Raw chat history, prompt text, memory graphs, inferred traits, mood patterns, and hidden recaps are never parent-browsable.
- A teen may intentionally share a specific excerpt through Bridge.
- Companion services may process only the minimum data required to provide the feature.
- Local transcript and memory caches clear on sign-out.

### Mood history, check-ins, Cloud Thoughts, and comfort activity

- Default: `private_self`.
- Parent summaries must not include private mood timelines, usage frequency, inactivity, inferred diagnosis, or hidden analytics.
- A teen may share a specific output or message without sharing the underlying history.

### Parent summaries / Bip Replay

Parent summaries may be assembled only from eligible shared inputs.

Allowed:

- a Bridge item the teen explicitly shared;
- the recipient and time of that share;
- the parent’s own response state;
- an explicitly parent-managed chore or reward status;
- a narrowly scoped safety notice authorized by the approved safety policy.

Not allowed:

- private journal counts, titles, excerpts, sentiment, or inferred themes;
- unshared voice-note existence, duration, transcript, or media;
- raw companion chats, memory, prompts, or inferred traits;
- private mood history, comfort usage, inactivity, or streak loss;
- Circle activity not separately and intentionally shared;
- any reconstructed timeline of private teen behavior.

### Safety events

- Safety is a dedicated restricted scope, not ordinary Parent Window visibility.
- Only authorized safety services and recipients required by the approved intervention policy may access the minimum necessary event.
- Safety must never become a private-content browser or raw archive.
- Link state does not override required emergency handling, but it does stop ordinary Parent Window delivery.

### Rewards, points, chores, and balances

- Account-private by default.
- Linked parents may access only explicitly parent-managed tasks, approvals, or fulfillment records.
- Private teen activity must never become visible merely because it affects a point balance.
- The server ledger remains authoritative and is not user-editable.

## Consent requirements

Before a teen confirms a share, the interface must identify:

- the exact recipient or recipient group;
- the exact item and fields being shared;
- whether text, image, audio, video, mood, timestamp, companion output, or identity metadata is included;
- whether a delivered copy may remain after revocation;
- how to revoke access when supported.

Consent must not be bundled into account creation, parent linking, verification, or general terms as blanket access to private content.

## Revocation, unlinking, and sign-out

### Revocation

Revoking a share must prevent future authorized reads of the revocable shared record. The interface must not promise deletion of copies already exported, downloaded, screenshotted, or otherwise retained by a recipient.

### Unlinking

When a teen-parent link becomes revoked, expired, declined, removed, or inactive:

- no new Parent Window items or summaries are delivered;
- parent queries must fail authorization against the current link state;
- parent navigation must not fall back into teen routes;
- private teen content remains private;
- account-specific Parent Window cache is cleared or invalidated on session refresh;
- audit metadata needed to prove prior consent or revocation may remain without exposing content.

### Sign-out and account switching

Sign-out must clear private local caches, including journals, voice notes, companion history and memory cache, mood data, Circle drafts/feed cache, Bridge cache, crew cache, reward cache, and profile identity cache. A new account must never inherit the prior account’s local data.

## Identity contract

- `public_circle` uses the teen’s anonymous Bip identity.
- Real names are limited to `private_self` or an explicitly accepted trusted relationship where policy permits them.
- Pending, blocked, declined, expired, removed, or unverified relationships display only safe invite/account identifiers.
- Parent linkage must never be exposed to Circle audiences.

## Authorization requirements

Every protected read must validate, as applicable:

- authenticated user ID;
- current account side and role;
- current authoritative verification state;
- current active parent or crew link;
- item owner;
- item visibility class;
- named recipient or audience membership;
- revocation or deletion state.

Client-side route hiding, AsyncStorage values, cached profile state, or possession of an item ID are never sufficient authorization.

## Release gate

A Parent Window feature may ship only when:

1. private journals and voice notes cannot be browsed by parents;
2. every parent-visible teen item has an explicit eligible share or policy basis;
3. unlinking and revocation are enforced server-side;
4. summaries are generated from an allowlist of eligible shared inputs;
5. sign-out and account switching clear private local caches;
6. tests cover owner, intended recipient, unrelated parent, inactive link, revoked share, and wrong-side access;
7. logs and analytics do not store private content unnecessarily.

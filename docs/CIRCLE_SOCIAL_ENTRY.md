# Circle Social Entry Boundary

> Se'kret Bip | Product contract for familiar-app entry into Circle

## Purpose

Circle Social Entry makes it easier for people to reach Se'kret Circle from apps they already understand, such as TikTok, Instagram, and Facebook.

This does not change Circle Core.

Circle Core remains the Se'kret-owned experience where feelings are validated, posts follow circle-safe rules, Bip Crew members and trusted friends work as intended, and private Se'kret boundaries stay protected.

## Product rule

```text
Familiar app discovery
→ approved Circle entry link or handoff
→ Se'kret-owned Circle experience
→ feeling validation, circle-safe sharing, Bip Crew/friend support, and moderation stay inside Se'kret
```

External platforms may help people discover or enter Circle. They must not replace Circle's validation model, trusted-friend and Bip Crew flows, moderation rules, identity rules, or private data boundary.

## Circle Core stays unchanged

Circle Social Entry must not alter these Circle Model V1 rules:

- Open Bip remains anonymous by default.
- My Circle remains mutual-add/friend-scoped.
- Crew Bip remains invite-only and bounded to the close chosen group.
- Parent Bridge remains a data bridge, not a feed or post destination.
- Every post still requires an in-app circle selection before publish.
- Parent Bridge never receives raw posts.
- User-facing copy must keep Se'kret Bip language, not generic social-network language.

## Familiar-app entry is allowed to do

- Present approved public-safe prompts.
- Present book/source-inspired Circle entry prompts.
- Link back into Se'kret Circle.
- Invite a user to continue reflection inside Se'kret.
- Support parent/community awareness without exposing teen private content.
- Carry reduced metadata such as source hash, platform, prompt type, and approval status.

## Familiar-app entry must not do

- Host the full Circle experience on TikTok, Instagram, or Facebook.
- Turn public platform comments into Circle posts.
- Import follower counts, clout loops, open stranger DMs, or public diary pressure into Circle.
- Send private teen journals, Bridge content, safety-scan content, or private parent/teen data to external platforms.
- Imply that Meta or TikTok performs Se'kret's feeling validation.
- Bypass Se'kret moderation, identity rules, or circle-scoping.
- Publish without a separate reviewed platform integration gate.

## Feeling validation boundary

Feeling validation is a Se'kret Circle behavior.

External posts may invite a person into a feeling-validating prompt, but public platform comment threads are not the source of truth for emotional support, trust tiers, or Circle membership.

Bip Crew members, trusted friends, and in-app Circle flows must continue working the way the product intends. Familiar-app entry only reduces the friction of arriving there.

## Story Engine handoff

L99 Story Engine may generate public-safe draft artifacts from approved source material, such as:

- short-form hooks;
- reel or TikTok scripts;
- caption packs;
- carousel outlines;
- quote-card copy;
- Circle entry prompts.

Se'kret Bip owns the product contract for what happens after a user enters Circle.

A Story Engine artifact that references Circle must preserve this handoff:

```text
Story Engine draft
→ founder/product approval
→ platform-safe social post or link
→ Circle Social Entry
→ Se'kret-owned Circle Core
```

## Implementation gate

Before runtime code ships Circle Social Entry, the change must prove:

1. Circle Core behavior remains unchanged;
2. Open Bip, My Circle, Crew Bip, and Parent Bridge visibility rules still pass tests;
3. Bip Crew/friend flows are not replaced by platform-native followers, comments, or DMs;
4. external posts carry only public-safe content or reduced metadata;
5. any deep link or handoff returns to a Se'kret-owned surface;
6. moderation and identity rules are enforced by Se'kret, not assumed from external platforms;
7. no private teen data, raw journals, Bridge content, safety-scan content, or parent/teen protected data crosses the external-platform boundary;
8. product copy clearly communicates that the safe conversation continues inside Se'kret;
9. Playwright or integration evidence covers any user-visible Circle entry route;
10. implementation-ledger status stays honest: entry support is not full external-platform Circle.

## Current status

- Circle Social Entry: product contract only.
- Runtime implementation: not implemented.
- External publishing: not implemented.
- Circle Core change: not intended.
- Secret configuration: not added.

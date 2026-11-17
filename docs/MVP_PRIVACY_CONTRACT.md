# Se’kret Bip MVP Privacy Contract

Status: **Locked for private beta**

This document defines the minimum privacy and product rules that must remain true for the first controlled beta. Broader Parent Window, rewards, subscription, and public-launch policy work can expand these rules later, but may not weaken them.

## 1. Private by default

Teen-created content starts as `private_self` unless the teen takes a clear, intentional sharing action.

This includes:

- Pages and journal entries
- voice notes and recordings
- companion conversations and companion memory
- Cloud Thoughts and comfort activity
- drafts, check-ins, mood history, and personal insights

A parent link does **not** convert private content into shared content.

## 2. Parent access is share-specific

Parents may see only content that the teen intentionally sends through a supported sharing flow, such as Bridge / Se’krets 2 Tell.

The parent side must never provide:

- a browser for private journals or Pages
- access to unshared voice notes or recordings
- access to raw companion chat history or companion memory
- a hidden activity feed reconstructed from private teen behavior
- a fallback route that exposes teen-only screens

Sharing one item does not grant access to earlier or future items.

## 3. Sharing must be understandable and reversible

Before sharing, the teen must be able to understand:

- what is being shared
- which linked parent or guardian will receive it
- whether the shared item includes text, media, mood, or companion-generated content

Where the product supports revocation, removing access must stop future reads. Unlinking a parent must not expose new private data and must stop future Parent Window delivery.

## 4. Safety does not become surveillance

Safety features may create the minimum event or intervention required by the approved safety flow. They must not silently provide parents with ongoing access to private journals, recordings, or companion conversations.

Safety routes must remain available to restricted users, while social and sharing routes may be limited by authoritative verification state.

## 5. Identity boundaries

Public Circle content uses the teen’s anonymous Bip identity. Real names are limited to private-self or explicitly trusted contexts.

Pending, blocked, removed, or otherwise untrusted crew relationships must not reveal the teen’s real identity.

## 6. Companion and voice boundaries

Only Raylene, Rylane, Cloud, and Night are AI voice companions.

`me`, `oracle`, unknown, and fallback entry types:

- must not receive a companion voice ID
- must not show a “hear this” companion-TTS control
- must not call the companion reply or voice endpoints as another character

## 7. Beta rewards boundary

The private beta may show points, approved chores, balances, and non-purchasable progress where already supported.

The following are **not required for beta** and must not be presented as fully available until their rules are approved:

- Shopify checkout or product fulfillment
- physical merchandise redemption
- finalized inactivity decay
- final point-to-merch conversion rates
- unrestricted reward redemption
- subscription-gated rewards

Unfinished reward actions should be hidden, disabled with honest “coming soon” language, or limited to test data. The app must not promise a physical reward it cannot fulfill.

## 8. Enforcement rule

UI hiding alone is not authorization. Supabase RLS, server-side checks, and authoritative account/link state remain the source of truth for protected data.

Any implementation that conflicts with this contract is a launch blocker, even if the screen appears to work.

## Private beta release gate

A beta build may proceed only when:

1. private teen content is not parent-browsable;
2. sharing is explicit and item-specific;
3. sign-out and unlinking do not leak cached private content;
4. non-AI entries cannot invoke companion reply or voice services;
5. protected route access uses authoritative verification/account state where required;
6. unfinished rewards are not represented as fulfilled or purchasable.

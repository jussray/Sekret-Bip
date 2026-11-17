# Beehiiv Optional-Plugin Boundary

Status: ENFORCEABLE ARCHITECTURE CONTRACT

## Role

Beehiiv is an optional edge plugin for publication, distribution, audience capture, analytics, and trial-only media tooling.

Beehiiv is **not** a main system, operating system, reasoning authority, governance authority, continuity authority, identity authority, or product/account authority.

System-level authority remains with the founder stack. In the current architecture, **Chief AI, PromptOS, and Sol** are system-level components. Beehiiv may receive bounded work from those systems and return provider evidence, but it may not redefine their intent, rules, state, or authority.

## Allowed responsibilities

Beehiiv may:

- publish approved public newsletter content;
- host the public publication website;
- collect ordinary newsletter subscriptions and low-sensitivity preference fields;
- run bounded publication automations while available;
- provide aggregate publication analytics;
- host or generate public podcast assets when the active plan permits it;
- export provider-owned publication and subscriber records for private retention;
- return receipts, URLs, analytics, and provider-state evidence to the founder stack.

## Forbidden authority

Beehiiv must not:

- become the canonical source of founder intent or operating rules;
- become the canonical source of Se’kret Bip product identity, authentication, consent, verification, or private user state;
- treat newsletter subscription as product-account creation;
- receive journals, voice notes, private family situations, safety events, or other sensitive product data;
- force Chief AI, PromptOS, Sol, or Se’kret Bip architecture to depend on Beehiiv-specific semantics;
- make a paid-plan feature part of the critical product path without explicit evidence and founder approval;
- retain unique business logic that cannot be reconstructed from repository-owned artifacts;
- silently widen permissions, billing, data collection, or publication scope.

## Integration shape

```text
Founder intent
→ Chief AI / PromptOS / Sol
→ bounded publication task
→ Beehiiv plugin
→ provider action
→ evidence / URL / aggregate metrics
→ founder stack
```

Beehiiv is downstream of intent and authority. It is upstream only of provider evidence.

## Replaceability rule

A Beehiiv outage, downgrade, pricing change, authentication failure, API change, or product decision may remove convenience but must not remove the publication’s canonical copy, operating logic, audience-export strategy, or ability to migrate.

If Beehiiv becomes unavailable or unsuitable:

1. preserve repository-owned copy and workflow logic;
2. export permitted provider data into private storage;
3. preserve public promises and consent boundaries;
4. replace only the delivery mechanism;
5. keep Chief AI, PromptOS, Sol, and Se’kret Bip product authority unchanged.

## Completion test

Any Beehiiv implementation is acceptable only when all of these remain true:

- Beehiiv can be removed without redesigning the main systems;
- canonical publication copy exists outside Beehiiv;
- private product/account state remains outside Beehiiv;
- provider actions are bounded and reversible where possible;
- provider results return as evidence rather than authority;
- paid or trial-only features are optional to the critical path;
- migration remains possible without changing the product promise.

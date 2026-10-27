<!-- truth-mode: durable -->
# Se’kret Bip — Issue Authority

This document maps durable outcomes to canonical GitHub trackers. It intentionally does not copy live issue state, current PR heads, current SHAs, or latest provider results.

## Live truth boundary

For current issue state, assignees, labels, PR ownership, latest evidence, and closure/reopen history, read GitHub live. A copied status sentence in Markdown never overrides the GitHub issue state or newer issue evidence.

When a previously accepted completion is contradicted by newer authoritative evidence, preserve the older observation as history and follow the newer evidence for current use. See `docs/TRUTH_AUTHORITY.md`.

## Canonical Trust outcomes

The `Trust-01` through `Trust-09` identifiers are reserved for these canonical outcomes:

| Trust area | Canonical issue |
|---|---:|
| Privacy inventory and data map | #412 |
| Consent and onboarding disclosures | #413 |
| Persistent crisis-support surface | #414 |
| Safety-trigger detection and supportive response | #415 |
| Bridge consent integrity and parent boundary | #416 |
| Complete and verifiable account deletion | #417 |
| COPPA, GDPR, age policy, and jurisdiction posture | #418 |
| AI companion boundary hardening | #419 |
| App Store and Google Play submission readiness | #420 |

Supporting issues may own focused implementation or evidence, but closing or renaming a supporting tracker never silently completes the canonical Trust outcome.

## Launch-program ownership

| Outcome | Canonical issue |
|---|---:|
| Teen + Parent V1 launch program | #259 |
| Long-horizon relationship-layer roadmap | #238 |
| Parent-first onboarding without a teen code | #323 |
| Unified frontend-to-Worker contract/release matrix | #402 |
| Exact production release packet and deployed-SHA proof | #696 |
| Cloudflare Worker branch/build production-authority gate | #646 |

The release packet, provider-authority gate, and product launch program are related but not interchangeable evidence classes.

## Security and privacy ownership

| Outcome | Canonical issue |
|---|---:|
| Supabase authorization release gate | #399 |
| Supabase Auth configuration/performance hardening | #344 |
| Auth/session/endpoint/logging/device-access hardening | #425 |
| Relationship settings, unlink, retry, and device-state UI | #271 |
| Controlled two-account Bridge production proof | #270 |
| User-facing data export and deletion controls | #426 |
| Accessibility and store-quality sweep | #428 |
| Claims and copy audit | #429 |
| Incident and breach response plan | #430 |

## Ownership rules

Before opening or closing a tracker:

1. search live open and recently closed GitHub issues/PRs for the same outcome;
2. prefer the issue with the strongest acceptance criteria and evidence model;
3. keep one canonical owner for each durable outcome and link focused supporting work to it;
4. close true duplicates only after preserving every unique requirement under a canonical owner;
5. close implementation work as completed only when its own code and declared evidence gates are satisfied;
6. never treat duplicate cleanup, title normalization, preview deployment, or supporting-PR merge as completion of a broader launch/privacy/security outcome;
7. treat zero-step or no-log workflow failures as infrastructure evidence, not passing evidence and not a code diagnosis;
8. if newer evidence contradicts a former completion, reconcile the live issue state and preserve both observation windows rather than repeating the older status in current prose;
9. resolve current PR heads, review threads, and mergeability live rather than hard-coding them here.

## Historical detail

Previous decompositions, stale-PR lineage, exact historical heads, and older issue-status snapshots remain available in Git history and issue timelines. They are evidence for their observation windows, not evergreen current state.

<!-- truth-mode: durable -->
# Se’kret Bip — Launch Roadmap

This roadmap defines durable launch sequence and exit evidence. It intentionally does not store the live repository SHA, current issue state, latest provider result, or launch verdict.

## Live truth boundary

Before using this roadmap to make a go/no-go decision, resolve fresh `main`, the newest exact-production receipt on issue #696, Cloudflare provider/runtime evidence, the intended Supabase project, and applicable browser/account/device evidence. `docs/TRUTH_AUTHORITY.md` governs expiry and supersession.

## Launch path

```text
Foundation integrated
→ Launch trust spine
→ Relationship/privacy lifecycle proof
→ Device quality/accessibility/safety
→ Controlled alpha
→ Launch clearance
→ Public launch
```

L4 continuity memory and L5 cross-companion synthesis remain separately gated future lanes unless a newer approved product plan explicitly changes launch scope.

## Status vocabulary

- **Integrated** — code or contract exists on `main`; production behavior is not implied.
- **Evidence in progress** — runtime exists but required production, denial, journey, or device proof is incomplete.
- **Blocked** — a named authority/evidence dependency prevents promotion.
- **Verified** — the required authority observed the required state for the exact target.
- **Historical** — previously valid evidence whose observation window is no longer current.
- **Superseded** — newer authoritative evidence contradicts or replaces current use of an older claim.
- **Planned** — direction exists without an implementation claim.

## Phase 0 — Foundation integrated

**Outcome:** one technical spine exists for auth/onboarding, Teen/Parent routes, Supabase, canonical Worker, canonical Pages, shared contracts, privacy boundaries, and exact-release verification machinery.

**Exit rule:** architecture is integrated without claiming public readiness.

## Phase 1 — Launch trust spine

**Goal:** make launch claims observable, deniable, reversible, and bound to one canonical runtime path.

Required evidence classes include:

- exact current-main repository proof for the release target;
- exact deployed Pages identity;
- canonical Worker identity and health;
- live Supabase migration/runtime/authorization evidence;
- auth, session restore, recovery, and onboarding journeys;
- read-only production browser proof for Teen, Bip Jr, and Parent entry paths;
- explicit blocker classification and rollback for failures.

**Exit rule:** the same intended release is proven across repository, provider, database, and production-browser layers without evidence substitution.

## Phase 2 — Relationship and privacy lifecycle proof

**Goal:** prove the teen-parent trust model without widening private content access.

Required controlled journeys include linking, approved sharing, denial, revocation, unlink, relationship lifecycle states, second-user isolation, and deletion/cleanup across database, Auth, Storage, caches, and durable receipts where applicable.

**Exit rule:** relationship access is proven to start, narrow, revoke, and clean up correctly.

## Phase 3 — Device quality, accessibility, and safety

**Goal:** prove a real mobile product rather than only a web build.

Evidence should cover physical iOS/Android journeys, accessibility, safe areas, touch targets, motion, offline/network errors, timeout/rate-limit/unavailable states, notifications, moderation/safety surfaces, and privacy-safe telemetry.

**Exit rule:** no launch-critical device state remains UNKNOWN without owner and gate.

## Phase 4 — Controlled alpha

**Goal:** learn from a deliberately small cohort under explicit support, privacy, rollout, pause, rollback, and stop conditions.

Alpha must not be used to bypass unresolved safety, privacy, authorization, or production-identity gates.

## Phase 5 — Launch clearance

**Goal:** satisfy non-code responsibilities required for a responsible public launch.

Evidence includes legal/privacy/consent/deletion alignment, safeguarding/moderation/escalation, store metadata and age-rating review, accessibility/device proof, monitoring/incident response, backup/restore/rollback, and support ownership. Pricing/entitlement evidence is required only for paid capabilities that actually ship.

## Phase 6 — Public launch and learning

**Goal:** launch only from a verified release packet, then observe metadata-safe product health and reconcile regressions quickly.

A previously verified launch condition may later regress. New contradictory evidence must supersede the old current-state claim rather than being hidden by the earlier green receipt.

## Operating rule

At every phase boundary use:

```text
State → Evidence → Claim → Expiry → Supersession
```

No phase advances from a merge, provider upload, screenshot, or old receipt alone.

<!-- truth-mode: durable -->
# Se’kret Bip — Truth Authority Contract

This document defines how a claim earns, keeps, loses, and regains authority. It is intentionally durable: it does not store current SHAs, issue states, provider outcomes, or launch verdicts.

## Live truth boundary

Resolve volatile state from the system that owns it before making a current claim:

- repository branch, PR, issue state, checks, reviews, jobs, and logs → GitHub live read;
- Pages, Workers Builds, Access, routes, and deployment identity → Cloudflare live read or retained exact-run provider receipt;
- migrations, catalog, grants, policies, Auth, Storage, and runtime database state → the intended Supabase project;
- browser behavior → production Playwright against the exact deployed release;
- physical-device behavior → retained device evidence;
- real-account behavior → controlled account journey evidence.

Repository documents may explain invariants, procedures, ownership, acceptance criteria, and where to find live evidence. They must not duplicate volatile state as if it were evergreen.

## Claim lifecycle

Every material operational claim has these fields conceptually:

```text
claim_id
state
observed_at
target_sha
repository_head_sha
release_target_sha
scope
authority
evidence_ref
expiry_rule
superseded_by
```

`repository_head_sha` is exact GitHub repository truth. `release_target_sha` is the exact source commit represented by a production release witness. They are often equal, but they are not the same concept and must not be forced equal after a positively verified non-production-only merge.

Use the smallest evidence class that actually proves the claim.

### VERIFIED

A claim may be called verified only when the named authority observed the named state for the named target and scope. Verification is scoped, not contagious: a provider build does not prove browser behavior, and a browser screenshot does not prove database authorization.

### HISTORICAL

Evidence remains true about what was observed at that time even after it stops being current. Historical truth should be preserved, clearly labeled, and never promoted back into current authority without a fresh observation.

### REVOKED / SUPERSEDED

If newer trustworthy evidence contradicts a previously verified current-state claim, the old claim becomes historical for current-use purposes. Do not rewrite history by pretending the earlier observation never happened. Do not keep using it as present tense either.

Operational rule:

```text
VERIFIED@T1 + contradictory authoritative evidence@T2
= historical at T1, revoked/superseded for current use at T2
```

### UNKNOWN

Missing, unreadable, unauthenticated, stale, zero-step, or scope-mismatched evidence is UNKNOWN or BLOCKED—not success and not failure of unrelated code.

## Scope-aware expiry rules

Repository truth and production release truth expire on different events. Keep both exact.

- Exact-head repository evidence expires for current-main repository claims whenever `main` moves.
- PR evidence expires for merge authority when the PR head changes.
- Production provider/runtime evidence is superseded by newer authoritative evidence of the same production surface that contradicts it.
- A `main` move invalidates production release authority when the exact merged diff changes a production build input, deployment/configuration authority, canonical Worker/Pages surface, Supabase production boundary, native release input, or when release impact is unknown.
- A `main` move does **not** by itself invalidate a previously verified production release when the exact merged diff is positively classified as non-production-only. In that case, record both the new `repository_head_sha` and the still-current `release_target_sha` rather than fabricating a deployment that did not occur.
- Non-production-only classification is fail-closed. It requires the exact merged diff plus current repository ownership/build contracts. Workflow path filters are useful evidence but are never sufficient by themselves. If any changed path or runtime effect is ambiguous, classify release truth UNKNOWN and re-verify.
- A tooling, documentation, test-only, or isolated internal-control-plane change may qualify as non-production-only only when it cannot change the canonical app, `sekret-backend`, `sekret-bip`, Supabase production behavior, native release artifact, production route, secret/config binding, or deployment authority.
- Issue-body prose never overrides the live GitHub issue state or a newer marked evidence receipt.
- A provider upload, preview, or HTTP success never silently upgrades to production release proof.
- A production browser claim requires the exact `release_target_sha` identity first.

Scope-aware expiry must never be used to convert a failed provider check into success. A known failed or contradictory production observation remains a blocker until newer authoritative evidence supersedes it.

## State → Evidence → Claim

For every completion or blocker statement record:

1. **State** — what actually changed or was observed.
2. **Evidence** — exact witness, target, and scope.
3. **Claim** — the narrow conclusion supported by that witness.
4. **Expiry** — what event invalidates current use of the claim.
5. **Supersession** — what newer evidence, if any, replaced it.

## Operator UX rule

Any surface presenting live status should make freshness visible at the point of use. Prefer a compact status object over prose that forces a founder to mentally reconcile several dated documents.

At minimum show:

```text
STATE
OBSERVED_AT
REPOSITORY_HEAD_SHA
RELEASE_TARGET_SHA (when production release identity applies)
SCOPE
AUTHORITY
EVIDENCE_REF
CURRENT | HISTORICAL | SUPERSEDED | UNKNOWN
```

When the two SHAs differ, the status must say why, name the exact non-production-only change evidence, and keep the production release witness tied to its original release target.

## Data-quality metrics

Founder Control Room and reporting systems may safely track metadata-only quality indicators such as:

- stale-current-claim count;
- superseded-claim count;
- claims missing an authority or evidence reference;
- repository-head/release-target divergence without a scope classification;
- time from contradiction detection to status reconciliation.

The target for canonical durable documentation is `stale-current-claim count = 0`.

## Privacy boundary

Truth receipts and analytics must remain metadata-safe. Never place raw teen journal text, private messages, voice transcripts, safety content, credentials, private identifiers, or broad database exports into documentation, CI artifacts, status dashboards, or issue comments.

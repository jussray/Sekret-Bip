# Se’kret Bip main governance phase contract

Contract: `juss/se-kret-bip-governance-phase@v1`

## Current phase: founder-only

Until a second trusted independent reviewer/code owner actually exists, release authority is:

`explicit founder approval + required machine/evidence gates`

The live provider rule for this phase should therefore require:

- pull request integration into `main`;
- `required_approving_review_count: 0`;
- `require_code_owner_review: false`;
- `require_last_push_approval: false`;
- deletion protection retained;
- strict required status checks retained, including the live `deploy` check;
- CodeQL enforcement retained at the existing thresholds;
- exact-head repository, browser/Playwright, deployability, ledger, privacy, and other project proof contracts remain load-bearing where applicable;
- no new convenience bypass actor may be introduced by this phase change.

`dismiss_stale_reviews_on_push` may remain enabled. In the current zero-required-review phase it does not create merge authority and becomes relevant again when independent review is re-enabled.

Founder approval is explicit intent. It does not waive machine/security evidence, exact-head freshness, provider/runtime proof, privacy boundaries, rollback requirements, or project-specific production gates.

## PR continuity

This governance phase also requires `juss/pr-continuity@v1` from `docs/PR_CONTINUITY.md`. When `main` advances, existing same-repository PR branches are rolled forward only through a conflict-free, history-preserving provider update. Any resulting head is a new proof subject. Predecessor CI, review, runtime, provider, artifact, and Playwright evidence expires and must not be inherited. Forks, conflicts, races, malformed continuity metadata, and provider uncertainty fail closed. A continuity receipt never grants merge or deploy authority.

## Future phase: independent review

When a real second trusted reviewer/code owner is available, upgrade governance to:

`explicit founder approval + independent current-head review + required machine/evidence gates`

At that transition, re-enable at minimum:

- at least one qualifying approving review;
- code-owner review where ownership is actually configured;
- approval of the most recent push/current head;
- stale-approval invalidation;
- the same or stronger machine/security gates.

The future reviewer requirement must not be treated as present authority before that reviewer exists.

## Provider convergence

Repository policy and GitHub enforcement must converge. Until the live `main-governance` ruleset reads back the founder-only values above, classify provider enforcement as `BLOCKED / POLICY DRIFT`, not complete.

Current observed ruleset ID at this decision: `21250004`.

## Fingerprint and continuity

Canonical policy fingerprint:

`sha256:a64af7012231ad169ec4a610a570af52492ff3ab560411eccbc02aae33a6eef7`

Continuity marker:

- `authorizing=false`
- `approvalCarryForward=false`
- `standingMutationAuthority=false`

The fingerprint/cookie preserve continuity only. They never create authority.

## Rollback

If this founder-only phase is later found inappropriate, restore the independent-review parameters without weakening deletion protection, CodeQL, required checks, exact-head proof, or privacy/runtime gates.

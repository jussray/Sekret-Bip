# Founder Dev Flow

Use this skill for every nontrivial implementation, audit, review, repair, merge, deployment, migration, or cross-system integration in Se'kret Bip.

This is the executable form of the founder stack. It combines Juss's operating flow with durable engineering practices. It does not promise that failure is impossible. It makes failure visible earlier, limits blast radius, and preserves a truthful recovery path.

## Required stack

Run the full sequence. Repeated red-team passes are intentional.

```text
/elonmusk /garyvee lindymode redteam l99 STEAL redteam ooda /truthmode
```

## STEAL loop

### S — Scan reality

Inspect before proposing or changing anything.

- Verify repository, branch, target, exact head SHA, active imports, existing implementation, open PRs, recent merges, deployment configuration, and relevant issue history.
- Read `AGENTS.md`, `GLOBAL_AI.md`, the task-specific skills, and current release-truth evidence.
- Search for an existing capability before creating a new helper, state system, provider adapter, route, schema, or workflow.
- Separate repository truth, CI truth, deployment truth, live-runtime truth, and device truth.

Output: a concise current-state model and the unresolved uncertainty.

### T — Trace the whole path

Follow the requested behavior from source to user-visible result.

Trace as applicable:

```text
input → route → auth → service → provider/database → response → telemetry → UI/device
```

Also trace:

- compatibility identifiers and normalization;
- secrets and privileged boundaries;
- retries, fallbacks, timeouts, and error classes;
- state ownership and active importers;
- consent, revocation, deletion, and second-user isolation;
- deployment target, rollback switch, and post-merge behavior.

Output: the canonical path, bypasses, duplicates, and failure points.

### E — Establish evidence and gates

Define what proves the change before writing it.

Use the smallest proof that exercises the real behavior:

1. static/type/contract checks;
2. unit or service behavior tests;
3. integration tests;
4. Playwright for user-facing web/runtime paths;
5. Maestro or controlled device proof for native-critical paths;
6. exact-head GitHub and Cloudflare evidence;
7. production canary where deployment truth matters.

Classify missing or failed evidence honestly. No jobs or no logs are infrastructure evidence, not automatic code failure. A successful build is not automatic runtime proof.

Output: explicit pass, fail, blocked, and inapplicable gates.

### A — Act surgically

Make the smallest reversible change that fixes the canonical path.

- Wire existing code before replacing it.
- Preserve compatibility at boundaries.
- Keep one bounded fallback unless the product contract explicitly requires more.
- Avoid new dependencies and broad refactors.
- Do not weaken auth, RLS, privacy, consent, types, tests, or observability to produce a green badge.
- Document required environment variables in the same change.
- Never expose secrets or private user content in code, tests, issues, logs, or evidence.

Output: focused diff, stated blast radius, and rollback.

### L — Lock the result

Do not stop at “code written.”

- Review the complete diff and every changed configuration surface.
- Re-run the defined gates on the exact PR head.
- Resolve critical review threads.
- Verify Cloudflare/Founder Control Room when deployment or release truth is involved.
- When the current task scope and explicit founder approval authorize repository-host mutations, update stale PR and tracker descriptions so the record matches reality. Otherwise, report the stale record and leave it unchanged.
- Merge only with an exact-head guard.
- Verify the merge SHA and post-merge deployment/runtime state.
- Record remaining debt as a separate issue rather than hiding it in “done.”

Output: merge truth, deployment truth, rollback truth, and the next gate.

## Two red-team passes

### Redteam I: premise

Before implementation, attack:

- whether the requested feature or fix is actually needed;
- whether the claimed root cause is evidenced;
- whether an existing path already solves it;
- whether teen privacy, consent, identity, cost, or complexity makes the premise unsafe.

### Redteam II: implementation

After selecting the path, attack:

- bypasses and duplicate active paths;
- cross-user or parent/teen leakage;
- stale state and compatibility breakage;
- retry storms, cascading fallbacks, and silent partial success;
- missing telemetry or misleading success metadata;
- migration and deployment blast radius;
- rollback failure;
- proof gaps between code, CI, Cloudflare, production, and device behavior.

## Practices that must be preserved

These practices are durable because they prevent common expensive failures:

- exact-head review and merge guards;
- trunk-focused, short-lived branches;
- small reversible changes;
- compatibility adapters before destructive migrations;
- idempotent operations and bounded retries;
- explicit timeouts and typed errors;
- least privilege and server-side secrets;
- defense in depth for auth, RLS, validation, and route guards;
- observability that distinguishes success, fallback, denial, and failure;
- canary rollout and a tested rollback switch;
- post-merge verification instead of assuming merge equals release;
- blameless evidence classification instead of guessing.

## Default report format

1. Reality
2. Risk I: premise
3. L99 system trace
4. Decision
5. Risk II: implementation
6. Action
7. Proof
8. Rollback
9. Post-merge state
10. Next gate

## Stop rules

Stop and report the exact blocker instead of improvising when:

- the repository, target environment, or active owner cannot be verified;
- a required mapped skill is missing;
- a secret, paid-service, DNS, auth/RLS, destructive data, production deployment, or external-publication gate lacks explicit approval;
- evidence contradicts the proposed fix;
- the change would create a second active implementation without a canonicalization plan;
- required privacy or rollback guarantees cannot be maintained.

# bip-typescript-strict-review

## Trigger

Activate whenever an agent is asked to review a TypeScript, TSX, Node, Worker, Supabase-adjacent, test, PR, draft PR, or patch change for Se’kret Bip.

Also activate when an agent is about to claim a PR is ready, mergeable, safe, or approved.

## Required with

- `bip-typescript-audit` before conclusions about root cause or repo state
- `bip-typescript-minimal-patch` when exact fixes are requested
- `bip-repo-truth`
- `bip-release-gate` for PR, merge, deployment, or evidence claims
- `bip-auth-onboarding` when signup, login, age gate, consent, guardian, or post-auth routing is touched
- `bip-supabase-guardian` when Supabase, migrations, RLS, RPCs, Edge Functions, or SQL-adjacent code is touched
- `bip-privacy-redteam` when teen, parent, journal, Bridge, safety, notification, telemetry, or private content boundaries are touched
- `bip-worker-guardian` when Cloudflare Workers, Pages, env bindings, or observability are touched

## Input contract

Normalize the request into this frame:

```text
Review this change like a strict senior reviewer for a production TypeScript app.

Priorities, in order:
1. Correctness
2. Regression risk
3. Type safety
4. Target-stack compatibility
5. Supabase / Worker integration safety
6. Minimal blast radius

Input:
[paste diff / PR summary]

Output:
1. Critical issues (blockers)
2. Medium-risk concerns
3. What is good and should stay unchanged
4. Suggested exact fixes
5. Merge recommendation: YES / NO / YES WITH CHANGES
```

## Review contract

- Correctness outranks passing builds.
- Never approve a change only because `mergeable: true`.
- Draft PRs are review targets but are not merge-ready by default.
- Separate code blockers from evidence blockers.
- Treat zero-step/no-log GitHub Actions as infrastructure evidence, not code proof.
- Treat Cloudflare evidence as Worker, Pages, or deployment truth only.
- Do not recommend deleting behavior, weakening guards, reducing tests, or suppressing types merely to pass checks.
- Do not ask for broad rewrites when a surgical fix is enough.

## Required output

Return exactly:

1. Critical issues, blockers.
2. Medium-risk concerns.
3. What is good and should stay unchanged.
4. Suggested exact fixes.
5. Merge recommendation: YES, NO, or YES WITH CHANGES.

Use `NO` when there is an unresolved correctness, security, privacy, type-safety, integration, review, stack-order, draft, or exact-head evidence blocker.

Use `YES WITH CHANGES` only when the change is conceptually safe but needs a bounded correction before merge.

Use `YES` only when the change is focused, non-draft, current, reviewed, and backed by executed evidence for touched behavior.

## Done

A strict review is complete only when blockers are separated from concerns, good parts are preserved, exact fixes are suggested, and merge recommendation respects release gates.
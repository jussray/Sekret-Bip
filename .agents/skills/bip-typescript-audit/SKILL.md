# bip-typescript-audit

## Trigger

Activate whenever an agent is asked to audit, inspect, debug, or prepare edits for TypeScript, TSX, Expo, React Native, Next.js, Node, Supabase client code, Workers, tests, build failures, PR review feedback, or repository merge readiness.

Also activate when the user says any of:

- "senior TypeScript engineer";
- "audit first";
- "before edits";
- "make it mergeable";
- "batches";
- "PR drafts";
- "root issue";
- "safe to change".

## Required with

- `bip-repo-truth`
- `bip-release-gate` for PR, merge, deployment, or evidence claims
- `bip-auth-onboarding` when signup, login, age gate, consent, guardian, or post-auth routing is touched
- `bip-supabase-guardian` when Supabase, migrations, RLS, RPCs, Edge Functions, or SQL-adjacent code is touched
- `bip-privacy-redteam` when teen, parent, journal, Bridge, safety, notification, telemetry, or private content boundaries are touched
- `bip-worker-guardian` when Cloudflare Workers, Pages, deployment, env bindings, or observability are touched

## Core rule

Audit first, then suggest. Do not edit until the current repo state, branch or PR context, relevant files, logs, and review comments are understood enough to name the likely root issue.

Prefer minimal, surgical changes. Do not remove functionality just to make build, type-check, lint, tests, Playwright, or deployment pass.

If secrets or environment variables are involved, never expose, invent, hardcode, log, commit, or request private keys in chat. Use placeholders, `.env.example`, GitHub Secrets, Supabase secrets, Cloudflare bindings, or documented setup steps.

If something cannot be verified from the available material, say so clearly and classify it as unverified rather than filling gaps with confidence fog.

## PR and draft scope

Open draft PRs are part of the work. Treat drafts as first-class audit targets, not as invisible backlog.

When the task involves PR batches:

1. include open non-draft PRs;
2. include open draft PRs;
3. preserve declared stack order and base-branch dependencies;
4. inspect comments, review findings, changed files, mergeability, exact head SHA, base SHA, and check/run evidence;
5. do not mark ready, merge, retarget, close, or rewrite a draft unless the user asked for that specific mutation and the release gate allows it.

Draft means "not ready to merge yet," not "safe to ignore."

## Audit input template

When the user supplies or implies a repo audit request, normalize it into this frame:

```text
You are a senior TypeScript engineer auditing my repo before any edits.

Project:
- Repo: [REPO]
- Stack: [STACK]
- Goal: [GOAL]

GUARDRAILS:
- Audit first, then suggest — no edits until you understand the repo state
- Prefer minimal, surgical changes
- Do not remove functionality just to make the build pass
- If secrets/env handling is involved, never expose or hardcode keys
- If something cannot be verified from the material I gave you, say so clearly

INPUT:
[paste tree / files / logs / commit]

OUTPUT FORMAT:
1. Current repo state as you understand it
2. Likely root issues (ranked)
3. What is blocked vs safe to change
4. Recommended next step only — not a full rewrite
```

## Required audit output

Return exactly this structure unless the user asks for another format:

1. Current repo state as understood
2. Likely root issues, ranked
3. Blocked vs safe to change
4. Recommended next step only

The next step must be one move, not a sprawling rewrite plan. If a code change is appropriate, describe the smallest safe patch and its verification command or evidence gate.

## Mergeability triage contract

For each PR or branch under audit, classify:

- `clean_candidate`: focused scope, current base, no unresolved review findings, required evidence executed and passed;
- `review_blocked`: unresolved review comment, requested change, or known correctness gap;
- `evidence_blocked`: checks missing, queued, runner-startup/no-log, Cloudflare failed, Playwright missing, or exact-head proof absent;
- `dependency_blocked`: stacked behind another PR, wrong base, stale base, or declared order not satisfied;
- `scope_blocked`: mixed concerns, unsafe removal, migration/deployment/secrets/account action without separate approval.

Never treat `mergeable: true` alone as safe to merge. It only means Git can build a merge commit. It does not satisfy evidence, review, draft, stack, founder, or deployment gates.

## Verification hierarchy

Prefer evidence in this order:

1. exact-head local or hosted checks that actually executed and produced logs;
2. focused contract/unit tests for the touched behavior;
3. TypeScript type-check and lint for changed TypeScript surfaces;
4. Playwright or device proof for user-facing flows;
5. Cloudflare build/deployment logs only for Worker/Page behavior and deployment truth;
6. static diff review for scoping, never as sole runtime proof when behavior changed.

Zero-step/no-log GitHub Actions runs are infrastructure evidence, not code proof.

## Forbidden shortcuts

Do not:

- delete tests, assertions, types, route guards, privacy checks, consent checks, RLS assumptions, or safety copy just to make a check pass;
- collapse teen, parent, guardian, consent, or verification states into a single unchecked boolean;
- convert private data into logs, comments, PR descriptions, screenshots, or generated reports;
- use production DDL/DML, deployments, external account mutation, spending, credentials, or live-user data without a separate explicit gate;
- claim a PR is merge-ready while it is draft, stacked behind another PR, has unresolved review feedback, or lacks executed exact-head evidence.

## Minimal patch policy

When edits are authorized, change the smallest set of files that addresses the ranked root issue. Keep unrelated cleanup out of the patch. Preserve existing public API shape unless the audit proves the API itself is the defect.

Every patch summary must include:

- files changed;
- behavior changed;
- behavior deliberately not changed;
- verification performed or still blocked;
- any remaining risk.

## Example response skeleton

```text
1. Current repo state as I understand it
[precise state, branch/PR, stack, evidence, unknowns]

2. Likely root issues, ranked
1. [root issue] — [evidence]
2. [secondary issue] — [evidence]

3. Blocked vs safe to change
Blocked: [items requiring evidence, review, secrets, migration, deployment, or founder gate]
Safe: [minimal files or comments safe to update]

4. Recommended next step only
[one surgical next move plus verification command/evidence]
```

# bip-typescript-root-cause-debugger

## Trigger

Activate whenever an agent is asked to debug, diagnose, find root cause, explain why something failed, inspect an error log, inspect a stack trace, inspect screenshots, or repair a specific feature or screen in Se’kret Bip.

## Required with

- `bip-typescript-audit` before claims about repo state, PR state, or branch evidence
- `bip-typescript-minimal-patch` when a code fix is requested
- `bip-typescript-strict-review` after patching or before merge-ready claims
- `bip-repo-truth`
- `bip-release-gate` for PR, merge, deployment, or evidence claims
- `bip-auth-onboarding` when signup, login, age gate, consent, guardian, or post-auth routing is touched
- `bip-supabase-guardian` when Supabase, migrations, RLS, RPCs, Edge Functions, or SQL-adjacent code is touched
- `bip-privacy-redteam` when teen, parent, journal, Bridge, safety, notification, telemetry, or private content boundaries are touched
- `bip-worker-guardian` when Cloudflare Workers, Pages, env bindings, or observability are touched

## Input contract

Normalize the request into this frame:

```text
Act like a calm senior debugger. I want root-cause analysis, not a list of unrelated guesses.

Context:
- Repo: [REPO]
- Feature / screen: [FEATURE]
- Expected: [EXPECTED]
- Actual: [ACTUAL]
- Recent change, if any: [CHANGE]

Evidence:
[paste error log / stack trace / code / screenshots]

Rules:
- Restate the problem first
- Rank top 3 most likely causes by probability
- Give fastest checks in order
- Suggest only minimal TypeScript changes
- Do not replace architecture unless absolutely necessary

Return:
1. Diagnosis
2. Ordered debug checklist
3. Smallest viable patch
4. Regression risks after patch
```

## Diagnosis contract

- Restate the problem first in concrete terms.
- Rank no more than three likely causes by probability.
- Tie every likely cause to evidence and mark unknowns as unverified.
- Give fastest checks in order before edits.
- Separate code defects from stale branches, missing evidence, runner-startup failures, Cloudflare failures, Supabase/config failures, and user-data/precondition issues.
- Do not treat zero-step/no-log GitHub Actions as application failure.
- Do not treat Cloudflare build failure as TypeScript runtime logic failure without logs.

## Required output

Return exactly:

1. Diagnosis.
2. Ordered debug checklist.
3. Smallest viable patch.
4. Regression risks after patch.

The smallest viable patch must touch only the files needed to fix the highest-probability verified cause.

## Forbidden shortcuts

Do not:

- list unrelated guesses;
- propose broad rewrites before the fastest checks;
- delete guards, tests, types, privacy checks, consent checks, auth checks, RLS assumptions, or validation to make symptoms disappear;
- invent logs, env values, secrets, API behavior, database state, or user actions;
- use fake mocks or placeholders unless explicitly requested;
- replace architecture unless the evidence proves the architecture itself is the defect.

## Done

Root-cause debugging is complete only when the problem is restated, top causes are ranked, checks are ordered, the smallest viable patch is named, and regression risks after that patch are explicit.
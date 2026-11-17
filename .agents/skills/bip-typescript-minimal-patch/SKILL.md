# bip-typescript-minimal-patch

## Trigger

Activate whenever an agent is asked to write a minimal patch, fix a specific TypeScript/TSX/Node/Worker/test bug, address a focused PR review finding, or provide exact replacement blocks for Se’kret Bip code.

## Required with

- `bip-typescript-audit`
- `bip-typescript-strict-review` after patching
- `bip-repo-truth`
- `bip-release-gate` for PR or merge claims
- `bip-auth-onboarding` when signup, login, age gate, consent, guardian, or post-auth routing is touched
- `bip-supabase-guardian` when Supabase, migrations, RLS, RPCs, Edge Functions, or SQL-adjacent code is touched
- `bip-privacy-redteam` when teen, parent, journal, Bridge, safety, notification, telemetry, or private content boundaries are touched
- `bip-worker-guardian` when Cloudflare Workers, Pages, env bindings, or observability are touched

## Input contract

Normalize the request into this frame:

```text
You are writing a minimal patch for a TypeScript codebase.

Task: Fix [BUG] in [FILE/MODULE]

Constraints:
- Keep existing behavior unless directly related to the bug
- Touch as few files as possible, no broad refactors
- No placeholder logic, no fake mocks unless explicitly requested
- Explain why each change is necessary in exactly one sentence

Input:
[paste relevant code]

Return:
- Unified diff or exact replacement blocks
- One-paragraph explanation
- Manual test steps
```

## Patch contract

- Audit before patching.
- Keep existing behavior unless directly related to the bug.
- Touch as few files as possible.
- Prefer a unified diff when enough surrounding code is available; otherwise provide exact replacement blocks.
- Do not remove functionality, tests, types, route guards, privacy checks, consent checks, RLS assumptions, safety copy, or validation just to make a check pass.
- Do not add placeholder logic, fake mocks, fake provider behavior, invented env values, hardcoded secrets, or live-user data.
- Do not perform production DDL, DML, deployment, credential, paid-capacity, or external-account actions from a patch request.

## Required output

Return:

1. Unified diff or exact replacement blocks.
2. One-paragraph explanation.
3. Manual test steps.

Every change group must include exactly one sentence explaining why that change is necessary.

## Verification

Name the smallest verification path available:

- focused unit or contract test for touched behavior;
- `npm run type-check` for TypeScript surfaces;
- lint when static rules or formatting are touched;
- Playwright when user-facing runtime flow changes;
- Cloudflare build evidence only when Worker or Pages behavior changed.

If verification was not run or cannot be run, say so clearly.

## Done

A minimal patch is complete only when it fixes the verified bug with minimal blast radius, preserves unrelated behavior, names or runs verification, keeps rollback obvious, and is ready for strict review.
# bip-typescript-behavior-tests

## Trigger

Activate whenever an agent is asked to write, repair, replace, review, or retire tests for TypeScript, TSX, JavaScript, Expo, React Native, Node, Cloudflare Worker, Supabase client, route, policy, guard, or PR behavior.

Also activate when the user says any of:

- "write TypeScript tests";
- "generate tests";
- "test real behavior";
- "old tests";
- "no longer need";
- "Jest";
- "Vitest";
- "stale test";
- "delete tests";
- "coverage".

## Required with

- `bip-repo-truth`
- `bip-typescript-audit` before selecting test targets
- `bip-typescript-root-cause-debugger` when tests are failing and the cause is unknown
- `bip-typescript-minimal-patch` when production code must change
- `bip-typescript-strict-review` before merge-ready or ready-for-review claims
- `bip-auth-onboarding` when auth, signup, age gate, consent, guardian, or route guards are involved
- `bip-supabase-guardian` when Supabase, migrations, RLS, RPCs, Edge Functions, or SQL-adjacent behavior is involved
- `bip-privacy-redteam` when teen, parent, journal, Bridge, safety, notification, telemetry, or private content boundaries are involved
- `bip-release-gate` for PR, merge, deployment, or evidence claims

## Core prompt

```text
Write TypeScript tests for the following code.

Rules:
- Test real behavior, not implementation details
- Cover happy path, edge cases, and failure modes
- No tests that would pass if the function were deleted
- Use Jest or Vitest (match the project's test runner)
- No mocks unless strictly necessary for external dependencies

Code:
[paste code]

Return:
- Test file with descriptive test names
- Brief note on what each test block covers
```

## Test-authoring contract

Before writing tests:

1. inspect `package.json`, existing tests, and test config to match the repo runner;
2. inspect nearby tests for naming, imports, setup, and assertion style;
3. define the behavior contract from the user-facing, API-facing, or data-boundary outcome;
4. cover the smallest complete set of happy path, edge cases, and failure modes;
5. mock only external dependencies such as network, provider calls, filesystem, clock, randomness, platform APIs, database clients, or unavailable native modules.

A valid test must fail if the protected behavior is removed or broken. A test that would still pass when the target function, route, guard, policy, screen, or integration is deleted is not release evidence.

## Test retirement contract

Old tests may be removed or replaced only after proving at least one of:

- the behavior under test no longer exists and the product/API contract was intentionally retired;
- a stronger behavior-level test covers the same regression;
- the test asserts implementation details that block a correct implementation and has behavior-test replacement coverage;
- the test depends on stale route, workflow, provider, schema, or architecture authority and the new authority is documented.

When proposing test deletion or replacement, report:

- the old test file and test name;
- the behavior it used to protect;
- the replacement test or proof;
- why coverage is preserved or intentionally retired;
- remaining regression risk.

Never delete tests merely to make GitHub Actions green.

## Output format

Return:

1. `Test file` with descriptive test names;
2. `Coverage notes` for happy path, edge cases, and failure modes;
3. `Mocks used` or `No mocks used`, with justification;
4. `Retirement notes` when replacing or deleting old tests;
5. `Verification` with the exact Jest or Vitest command to run.

## Se'kret Bip safety boundaries

Do not weaken or remove tests protecting:

- auth, signup, login, age gate, guardian, consent, parent linking, Limited Mode, or post-auth routing;
- teen/parent privacy, journal data, Bridge visibility, safety scan, notifications, telemetry, or RLS expectations;
- release-truth classification, exact-head evidence, runner-startup/no-log handling, or Founder Control Room gates.

## Definition of done

A test change is done only when it matches the project runner, proves behavior, fails on behavior deletion, covers success and failure, documents mocks, and preserves old coverage or records an explicit behavior retirement.
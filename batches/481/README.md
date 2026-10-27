# PR #481 Batch Decomposition

PR #481 is retained as historical review evidence only. It is no longer the merge vehicle because its branch accumulated unrelated stacked work and diverged heavily from `main`.

The replacement is four ordered, reviewable batches. Each batch receives its own branch, draft pull request, exact-head checks, review threads, rollback note, and merge decision.

## Ordered batches

1. **Executable Control Room Core**
   - guarded loopback mission server;
   - allowlisted local missions;
   - process-tree timeout safety;
   - retained local and Playwright evidence;
   - repository checkout and GitHub-route diagnostics.

2. **Founder Operator**
   - founder-only Operator surface;
   - mission-to-artifact planning;
   - append-only local history;
   - fixed-path evidence persistence;
   - approval remains separate from executed verification.

3. **GitHub Failure Routing**
   - exact-run and `main` failure capture;
   - zero-step/no-log infrastructure classification;
   - Control Room report artifacts;
   - no merge, deploy, migration, or source mutation authority.

4. **Room Production + Product Design**
   - locked five-tab teen navigation;
   - Night production manifest and prompt pack;
   - Figma runtime blueprint;
   - fail-closed asset validation and runtime wiring;
   - dedicated room Playwright and CI gates.

## Merge order

```text
batch/481-01-control-room-core
→ batch/481-02-founder-operator
→ batch/481-03-github-failure-routing
→ batch/481-04-room-production-product-design
```

Every later branch is based on the exact head of the previous batch. After a batch merges, the next batch must be retargeted to `main`, refreshed, and reverified.

## Exact-head rule

A head change invalidates earlier browser, workflow, and review evidence. A batch may move from draft to ready only when all required artifacts point to the same exact commit SHA.

Missing jobs, stale SHA evidence, unresolved review threads, `steps: null`, missing logs, or unverifiable routes block merge. Zero-step/no-log failures are `runner_startup_failure`, not a code failure and not a pass.

## Preservation rule

No source branch or historical PR is deleted. PR #481 may be closed unmerged only after all replacement PRs exist and a comparison proves no intended file or review correction remains unique to it.

## Human-only gates

The batch workflow does not silently merge, deploy, publish, spend, create accounts, use credentials, apply migrations, or delete data. Each batch stops at its own evidence-backed merge gate.

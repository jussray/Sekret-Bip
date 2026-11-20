# Batch 3 — GitHub Failure Routing

## Outcome

Route failed GitHub Actions evidence into Founder Control Room without giving the scanner authority to modify code, merge, deploy, or diagnose failures without executed evidence.

## Intended files

- `.github/workflows/ci.yml` — terminal failure-routing job
- `.github/workflows/control-room-github-failures.yml`
- `docs/CONTROL_ROOM_GITHUB_FAILURES.md`
- `implementation-ledger.extensions/github-failure-routing.json`
- `package.json` — scan and ingest commands
- `scripts/control-room-ingest-github-failures.mjs`
- `test/control-room-github-failure-routing.test.mjs`

## Acceptance gates

- scanner accepts one exact run, open-PR failures, and completed `main` push failures;
- classification examines failed jobs only;
- jobs with no executed steps and no logs become `runner_startup_failure` or `workflow_no_jobs`;
- executed failing steps may become `workflow_step_failure` only when step evidence supports it;
- reports contain repository, workflow, run, job, PR when applicable, and exact head SHA;
- credentials remain environment-only and never enter reports;
- report generation works without Supabase ingestion credentials;
- workflow recursion is prevented;
- exact-head contract tests and implementation-ledger verification execute and pass.

## Explicit exclusions

No merge, source edit, workflow retry loop, deployment, migration, publication, credential mutation, or deletion authority.

## Rollback

Revert the focused workflow, scanner, documentation, and ledger files. Existing reports remain inert evidence.

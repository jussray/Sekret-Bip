# Founder Control Room — GitHub Failure Routing

## Permanent operating rule

Every GitHub failure must be checked against Founder Control Room first.

A failed GitHub status is a signal, not a diagnosis. The operating sequence is:

1. capture the exact repository, pull request or branch, head SHA, workflow, run, event, conclusion, and job evidence;
2. classify whether GitHub executed real steps;
3. write the result to the local Control Room report;
4. upload the report from the failing workflow path;
5. when server-side Supabase credentials are available, publish the event into `audit_events` and upsert the matching `control_room_issues` record;
6. use local Control Room verification to reproduce any real code failure;
7. do not merge until the required proof exists.

## Automatic routing

The primary CI workflow contains a final `route-failure` job. It runs after lint, type-check, test, build, and Control Room audit jobs and invokes the scanner whenever any dependency does not succeed.

The scanner receives the exact current `github.run_id` and head SHA. It reads the failed jobs from that run, writes:

```text
reports/control-room/github-failures-latest.json
```

and uploads the report as a workflow artifact.

A separate `workflow_run` watcher handles completed failures from:

- Quality Gate;
- Type Check;
- Implementation Evidence;
- Playwright Smoke and Guardrails.

The watcher is scan-only unless separately configured with approved server-side Supabase credentials. It cannot modify code, merge, deploy, or promote an implementation claim.

## Covered scopes

The scanner supports three evidence paths:

- one exact workflow run through `CONTROL_ROOM_GITHUB_RUN_ID`;
- failed pull-request workflow runs for open PRs or one selected PR;
- completed failed `push` workflow runs on `main` or the configured main branch.

Main-branch failures use a branch-scoped fingerprint instead of pretending a pull request exists.

## Failure classes

### `runner_startup_failure`

Use this when jobs exist but no executable steps ran, no step timestamps exist, or GitHub reports `startup_failure`.

This is infrastructure evidence. It is not proof of a code regression.

Required response:

- preserve the exact-head GitHub failure;
- look to Founder Control Room local verification;
- do not rewrite application code merely to make the red GitHub badge disappear;
- rerun GitHub Actions only after runner capacity or workflow-startup conditions recover.

### `workflow_no_jobs`

Use this when a failed workflow run returns no jobs.

Treat this as a workflow or platform-startup failure until job or log evidence proves otherwise.

### `workflow_step_failure`

Use this only when GitHub actually executed one or more steps and a step or job failed.

Required response:

- inspect the failed step and logs;
- reproduce the same command locally through Control Room;
- fix the smallest supported root cause;
- rerun local verification;
- rerun exact-head GitHub Actions.

## Commands

Scan one exact workflow run:

```bash
GH_TOKEN=... \
CONTROL_ROOM_GITHUB_RUN_ID=29623978302 \
CONTROL_ROOM_GITHUB_HEAD_SHA=119972af1c4c46bc8ff192c170f2c6095f06f6fe \
npm run control-room:github-failures:scan
```

Scan open pull requests plus completed `main` push failures without writing to Supabase:

```bash
GH_TOKEN=... npm run control-room:github-failures:scan
```

Scan one pull request:

```bash
GH_TOKEN=... CONTROL_ROOM_GITHUB_PR=477 npm run control-room:github-failures:scan
```

Scan and publish failures into Founder Control Room:

```bash
GH_TOKEN=... \
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
npm run control-room:github-failures:ingest
```

## Control Room issue identity

Pull-request failures use:

```text
github_actions:<repository>:pr-<number>:<workflow-id>:<head-sha>
```

Branch failures use:

```text
github_actions:<repository>:branch-<branch>:<workflow-id>:<head-sha>
```

A rerun of the same workflow against the same exact head updates the same issue. A new head creates a new evidence record rather than overwriting history.

## Required issue evidence

Every GitHub failure record must retain:

- pull request number and URL when one exists;
- otherwise the affected branch;
- head branch and exact SHA;
- base branch when available;
- workflow name and ID;
- run ID, number, attempt, URL, and trigger event;
- GitHub conclusion or failed-job conclusion;
- Control Room failure classification;
- job names, conclusions, step counts, and failed-step names when present;
- a recommended next action.

## Security boundary

- GitHub tokens are read only from `GH_TOKEN` or `GITHUB_TOKEN` in a server-side shell.
- Supabase service credentials are read only from server-side environment variables.
- Tokens and keys must never enter React Native, Expo public variables, reports, audit metadata, PR comments, or committed files.
- The scanner may read GitHub status and write Control Room evidence. It cannot merge, deploy, modify source code, accept terms, or apply database migrations.
- Workflow artifacts contain failure evidence only, never credentials.
- Never use teen private content as CI, audit, or issue metadata.

## Truth rule

A green local Control Room result does not become GitHub Actions proof. A red zero-step GitHub run does not become code-failure proof.

Both signals remain separately labeled until the exact required witness exists.
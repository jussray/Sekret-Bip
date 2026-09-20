# Founder Control Room — GitHub Failure Routing

## Permanent operating rule

Every GitHub failure **and every skipped proof witness** must be checked against Founder Control Room first.

A failed or skipped GitHub/test status is a signal, not a diagnosis. The operating sequence is:

1. capture the exact repository, pull request or branch, head SHA, workflow, run, event, conclusion, job, command, and test evidence that exists;
2. classify whether GitHub executed real steps and whether a skip is a missing prerequisite, explicit gate/inapplicability, job/workflow skip, or unresolved explicit skip;
3. write the result to the local Control Room report;
4. upload the report from the workflow path;
5. when server-side Supabase credentials are available, publish each event into `audit_events` and upsert the matching `control_room_issues` record;
6. use local Control Room verification to reproduce any real code failure or skipped witness;
7. do not merge until every required proof witness actually executes and is green.

## Skip truth law

A skip is **not a pass** and is **not automatically a code failure**.

Each observed skipped test is bound to a non-secret continuity fingerprint and proof cookie containing the authoritative repository/head plus normalized runner, command, test identity, and skip reason. Those markers always retain:

```text
authority = false
merge_authority = false
proof_satisfied = false
investigation_required = true
blocks_claimed_proof = true
```

Fingerprints and proof cookies preserve continuity only. They never create execution, merge, deployment, provider, or founder authority.

A phase-gated or intentionally inapplicable test may remain skipped when the governing scope says it is not required. It still remains visible. A test required for a claimed release, runtime, integration, or user-flow proof cannot be borrowed as green evidence while skipped.

## Automatic routing

The primary CI workflow contains a final `route-failure` job. It runs after lint, type-check, test, build, and Control Room audit jobs and invokes the failure scanner whenever a dependency does not succeed.

The failure scanner receives the exact current `github.run_id` and head SHA, writes:

```text
reports/control-room/github-failures-latest.json
```

and uploads the report as a workflow artifact.

A separate `workflow_run` watcher inspects completed runs from:

- CI;
- Quality Gate;
- Type Check;
- Implementation Evidence;
- Playwright Smoke and Guardrails;
- Production Smoke;
- Live Signup Proof;
- Controlled Account Cloud Comfort Proof;
- Owned Bip Signup Proof.

For non-success, non-skipped conclusions it preserves the existing failure route. Independently, every completed watched run is scanned for:

- `CONTROL_ROOM_TEST_SKIP_RECEIPT` markers emitted by Node or Playwright;
- skipped GitHub jobs;
- an entirely skipped workflow.

That scanner writes:

```text
reports/control-room/github-test-skips-latest.json
```

and uploads the receipt even when the parent workflow otherwise succeeded. This is how a green workflow can no longer hide a skipped proof witness.

The watcher is scan-only unless separately configured with approved server-side Supabase credentials. It cannot modify code, merge, deploy, or promote an implementation claim.

## Local routing

`npm test` uses Node's TAP reporter, preserves the test process exit code, emits one sanitized skip marker per skipped unit test, and writes:

```text
reports/control-room/test-skips-latest.json
```

Playwright paths that can currently skip tests load the Control Room skip reporter and write:

```text
reports/control-room/playwright-test-skips-latest.json
```

`npm run verify:local` records the current Git repository, exact HEAD, branch, whether the worktree was clean at verification start, and whether the result is eligible for cross-source correlation. It does not persist changed filenames or diff content merely to establish that identity.

A local result is cross-source correlatable only when all of these are true:

- the repository identity is valid;
- the exact 40-character HEAD is known;
- the worktree is clean.

Dirty or unidentified local work remains useful local evidence, but it receives a source-local incident subject and can never impersonate a GitHub exact-head failure.

Before a local report is written, command output tails redact environment-held secret values and common credential shapes. Opt-in external ingestion deliberately omits raw stdout/stderr tails from issue metadata.

`npm run verify:local` treats a successful required check containing a skip receipt as **warning/yellow**, not green. Warnings do not manufacture a code failure, but they make `demoReady` false and prevent the report from being described as complete proof.

`npm run verify:local:ingest`, when separately authorized with server-side Supabase credentials, publishes each skipped witness under its own fingerprint instead of collapsing multiple skips into one issue.

## Failure continuity law

Executed failures use two related but deliberately different markers.

### Incident fingerprint

The incident fingerprint is source-neutral only for evidence that is eligible to correlate. It is derived from:

```text
juss-v10/test-failure-incident@v1
repository
exact head SHA
canonical failure key
```

and is rendered as:

```text
test_failure:<sha256>
```

A clean local `unit-tests` failure and a GitHub `Run npm test` failure at the same repository and exact HEAD therefore converge on the same incident fingerprint. A head change creates a new incident. Dirty local work never shares this source-neutral subject.

Canonical aliases are intentionally narrow and repository-grounded. For example, current CI step names such as `Run npm test`, `Run npm run type-check`, `Run npm run lint`, `Run npm run test:oracle`, `Run npm run test:voice-intelligence`, `Run npm run audit:runtime-assets`, and `Run npm run verify:room-archives` map to the corresponding existing local verification check IDs. Unknown step names keep their own normalized key rather than being guessed into an unrelated incident.

### Proof cookie

Every local or GitHub witness gets its own source-specific proof cookie derived from:

```text
juss-v10/test-failure-proof@v1
incident fingerprint
source
source-specific evidence identity
```

and rendered as:

```text
juss/proof-cookie@v1:<sha256>
```

Every failure identity retains:

```text
authority = false
merge_authority = false
proof_satisfied = false
browser_cookie = false
authorizing = false
```

The word “cookie” here means an evidence continuity marker only. It is never a browser cookie, session token, credential, approval, merge permission, or execution authority.

### Distinct failure receipts

A failed GitHub workflow is still preserved as one run-level record for compatibility, but it is no longer collapsed into one evidence receipt. Each failed step receives its own proof receipt. A failed job with no failed-step detail receives a job-level receipt. Startup/no-job failures receive one infrastructure receipt and remain non-code evidence.

Multiple proof receipts may point to the same incident fingerprint when they are genuinely witnessing the same canonical failure on the same exact head. They remain separate receipts, so no witness disappears merely because another source observed the same incident.

## Covered failure scopes

The failure scanner supports three evidence paths:

- one exact workflow run through `CONTROL_ROOM_GITHUB_RUN_ID`;
- failed pull-request workflow runs for open PRs or one selected PR;
- completed failed `push` workflow runs on `main` or the configured main branch.

Main-branch failures use the same exact-head incident law and retain branch/run metadata without pretending a pull request exists.

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

## Skip classes

### `missing_prerequisite`

The test declared a missing environment variable, credential name, configured fixture, or other prerequisite. Record the missing **name/reason only**, never a secret value. Restore the prerequisite only when the governing proof requires it.

### `gated_or_inapplicable`

The test was phase-gated, intentionally inapplicable, stale/superseded, or outside current authority. Keep the receipt; do not pretend it ran.

### `explicit_skip`

The runner marked the test skipped but the reason does not fit a known prerequisite or gate. This stays investigation-required until classified.

### `job_skipped` / `workflow_skipped`

GitHub skipped a job or the entire workflow before the witness executed. This is not a successful proof receipt, even when the skip was operationally correct.

## Commands

Scan one exact failed workflow run:

```bash
GH_TOKEN=... \
CONTROL_ROOM_GITHUB_RUN_ID=29623978302 \
CONTROL_ROOM_GITHUB_HEAD_SHA=119972af1c4c46bc8ff192c170f2c6095f06f6fe \
npm run control-room:github-failures:scan
```

Inspect skipped proof witnesses from one exact completed GitHub run:

```bash
GH_TOKEN=... \
CONTROL_ROOM_GITHUB_RUN_ID=35523301958 \
CONTROL_ROOM_GITHUB_HEAD_SHA=0b30723788d66be4c404b9876396ad0f91bd35e7 \
node scripts/control-room-ingest-github-test-skips.mjs
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

Executed local/GitHub failures use the `test_failure:<sha256>` incident contract above. `upsert_control_room_issue` uses that incident fingerprint as the issue identity. The proof cookie remains attached to the individual evidence event/metadata so separate witnesses are retained even when they converge on one incident.

Skipped tests keep their separate skip continuity contract: a SHA-256 fingerprint over exact repository/head, runner, normalized command, test identity/file, reason, and skip class. A head, test, command, or reason change creates a new skip evidence subject instead of overwriting history.

A rerun of the same canonical failure against the same exact head may update the same incident issue while adding a new proof receipt. A new head creates a new incident instead of preserving false continuity.

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
- canonical failure key;
- incident fingerprint and source-specific proof cookie;
- job identity and failed-step name/number when present;
- `authority=false`, `merge_authority=false`, `proof_satisfied=false`, `browser_cookie=false`, and `authorizing=false`;
- a recommended next action.

Every skip record must retain the exact repository/head, runner, normalized command, test identity, sanitized reason, classification, fingerprint, proof cookie, observation surface, and `authority=false` state.

## Security boundary

- GitHub tokens are read only from `GH_TOKEN` or `GITHUB_TOKEN` in a server-side shell.
- Supabase service credentials are read only from server-side environment variables.
- Tokens and keys must never enter React Native, Expo public variables, reports, audit metadata, PR comments, or committed files.
- Local verification output is redacted before persistence; external failure ingestion never publishes raw stdout/stderr tails.
- Test-skip sanitization strips common token/secret assignments and email addresses before a marker or report is written.
- The scanners may read GitHub status/logs and write Control Room evidence. They cannot merge, deploy, modify source code, accept terms, or apply database migrations.
- Workflow artifacts contain failure/skip evidence only, never credentials.
- Never use teen private content as CI, audit, or issue metadata.

## Truth rule

A green local Control Room result does not become GitHub Actions proof. A red zero-step GitHub run does not become code-failure proof. A skipped test does not become a passing witness.

A matching local/GitHub incident fingerprint means only that separate witnesses point to the same exact-head failure subject. It does not merge their authority, erase either receipt, or convert one witness into another.

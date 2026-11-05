# PR #481 focused SAST triage — exact review basis

This record documents two narrow false-positive classes without changing scanner configurations, disabling rules globally, or suppressing other findings.

## DevSkim DS162092: local loopback fixtures

The 9 new DS162092 notes in the retained DevSkim SARIF for the PR concern `services/piper-tts/test_auth_guard.py`, lines with loopback IP strings. These are test inputs that explicitly assert local-mode access is limited to direct loopback and rejects remote, mapped, forwarded, and malformed peers. No localhost endpoint is introduced to production by those tests.

The exact affected test lines carry an inline `DevSkim: ignore DS162092` annotation. The production authentication code remains scanned.

## Bearer javascript_lang_path_traversal: Room foreman path guards

Three PR-introduced notices target `scripts/room-production-foreman.mjs`, specifically:
- `lstatSync(candidate)`, part of the symlink-rejection procedure after repository-root confinement;
- `mkdirSync(runDir)`, where `runDir` is equal-checked against a path composed from a strict timestamp-format `runId` under `.room-foreman/runs`;
- `writeFileSync(reportPath(...))`, where `reportPath` accepts only a strict `runId` and fixed report basename and uses exclusive creation.

All three calls have a single-line `bearer:disable javascript_lang_path_traversal` annotation with the reason next to them, rather than globally skipping the rule. Existing contract tests exercise traversal refusal, name validation and symlink rejection. These checks do not prove immunity to concurrent local-filesystem tampering; filesystem permissions and a controlled CI workspace remain part of the operating boundary.

## Evidence and remaining gates

Compared to the previously retained parent-head Bearer scan, 38 logger warnings were eliminated by removing raw error-object logging. The remaining repository findings are not being blanket-suppressed.

Scanner output is still independent evidence: new exact-head scan results must confirm whether these annotations are honored. A green scanner is not proof of no vulnerabilities. The PR cannot merge until all mandatory checks, including exact-head ledger and merge-membrane, finish successfully. Production release also needs exact deployed-version and browser evidence.

## Current GHAS review and remediation (2026-11-05)

The exact-head GitHub Advanced Security Bearer check on `e4f414ea301def4cb8039415eecfc7bac611e610` reported four new errors; the retained SARIF has 363 total results. The changed source includes three candidate findings in `control-room-server.mjs` (report-path write, dynamic CORS, dynamic readiness logging) and one in `services/piper-tts/server.py` (subprocess execution). Exact check annotations were not available through the connected review API, so that mapping is inferred from scanner file locations and changed paths.

- **CORS:** Browser origins now match only explicit local Control Room or Expo web ports. The response echoes only an origin selected from the server-constructed allowlist, never the raw request header. `CONTROL_ROOM_WEB_PORT` overrides the default Expo web port (8081) when needed.
- **Logs:** The local listener prints a fixed status code instead of an interpolated host and port.
- **Report-path warning:** The dynamic filename is confined by the exact plan ID grammar; parent directories reject symlinks and `wx` creation rejects existing files, including final symlinks. The one-line Bearer exception does not authorize other dynamic paths. An integration test rejects traversal identifiers.
- **Piper command warning:** User content is passed as subprocess standard input. The command is a fixed argument array with an installed, validated model, private output filename and explicit `shell=False`; no shell parses client text. A narrow exception is retained with regression checks.

Re-run exact-head CodeQL/Bearer/DevSkim and the Control Room ledger to verify before any merge. Scanner success alone does not establish production safety.

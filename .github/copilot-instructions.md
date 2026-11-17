# GitHub Copilot Instructions

Read and follow repository-root `AGENTS.md`, `GLOBAL_AI.md`, and the routed Bip skills before nontrivial work.

## Operating contract

Seek, build, fix, verify. Turn founder intent into the smallest safe verified implementation. Do not wander, rewrite unrelated systems, or claim success without evidence.

Before changing code, identify the authoritative repository, target branch, current HEAD, current goal, suspected failure area, exact files/tests/logs needed first, and stop condition.

Classify material findings as `VERIFIED`, `INFERRED`, `UNKNOWN`, or `BLOCKED`. A failed lookup is not proof of absence.

Prefer one cause before many symptoms, the smallest reversible patch, the narrowest useful test, and existing architecture over parallel systems. Working code takes priority over new documentation unless existing docs become false because of the change.

Never suppress failing signals, convert a real failure into `null`, hide exceptions, weaken tests to manufacture green CI, fabricate successful state, or perform unrelated refactors.

## Proof ladder

Run the cheapest valid proof first:

1. lint or typecheck for touched code
2. focused unit or integration test
3. targeted Playwright proof for browser-visible or runtime paths
4. exact-head CI
5. deployment/build verification when applicable
6. runtime/observability evidence when applicable

Do not escalate past a cheaper failing proof.

## Bip safety and privacy boundaries

- GitHub is repository, branch, PR, Actions, and security evidence.
- Playwright is synthetic browser proof. Use isolated Chromium and synthetic/test accounts only. Never submit real teen, parent, or private user data.
- Supabase remains project-scoped and read-only through standing MCP configuration. Schema changes are migration-first, reviewed, denied by default, and separately applied with proof.
- Cloudflare Builds is deployment evidence, not user-path proof.
- Cloudflare Observability is minimized runtime evidence. Never copy raw teen, parent, message, journal, Oracle, or other private content into prompts, logs, screenshots, or reports.
- Figma and Product Design are design evidence only and never replace exact-head tests, privacy gates, auth proof, or deployment evidence.
- Documentation providers are documentation only, never runtime proof.
- Bright Data remains code-package metadata only when explicitly configured; browser, scraping, ecommerce, and broad web-data modes remain forbidden.

Never expose credentials or perform production deployment, rollback, DNS, billing, auth, destructive account actions, live signup writes, or other production mutations without the repository's required founder approval and exact-head gate.

## Browser rule

Any browser-visible UI/runtime claim requires targeted Playwright verification against the exact preview or intended artifact. Verify the real path and, when relevant, loading, success, empty, denied, offline, error, retry, and recovery states.

Source inspection alone never proves that a screen, signup flow, auth transition, Comfort flow, Cloud flow, or parent/teen onboarding path works.

## Merge and issue gates

A successful commit does not prove deployment. A successful deployment does not prove runtime health. Compilation alone does not justify merge.

Merge only when the focused change has sufficient exact-head evidence. Preserve unrelated work. Do not close an issue merely because a patch exists; close it only when its acceptance condition is verified.

Stop when the focused cause is repaired, focused tests pass, the real path is verified where applicable, remaining risk is stated, and rollback is known.

## Report

Return only:

`REALITY:` what is verified now.

`FIX:` exactly what changed.

`PROOF:` tests, Playwright, CI, deployment, logs, screenshots, traces, or artifacts.

`RISK:` what could still fail.

`ROLLBACK:` how to safely reverse the change.

`NEXT GATE:` one exact founder decision or next action.

# Batch 1 — Executable Control Room Core

## Outcome

Create the smallest founder-only local execution core on current `main` without introducing Founder Operator planning, GitHub failure ingestion, or room-production behavior yet.

## Intended files

- `batches/481/**`
- `docs/CONTROL_ROOM_GITHUB_ROUTE.md`
- `package.json` — core Control Room commands only
- `playwright.config.ts` — retained browser evidence support
- `scripts/control-room-agent.mjs`
- `scripts/control-room-dev.mjs`
- `scripts/control-room-github-route.mjs`
- `scripts/control-room-server.mjs` — allowlisted mission endpoint only
- `scripts/control-room-verify-frontend.mjs`
- `src/config/controlRoomOs.ts`
- `src/services/controlRoomLocalAgent.ts` — health and mission calls only
- `test/control-room-core-contract.test.mjs`
- `test/control-room-github-route.test.mjs`
- `test/control-room-os.test.mjs`
- `test/control-room-server-process-tree.test.mjs`
- `test/control-room-verify-frontend.test.mjs`

## Acceptance gates

- server binds only to `127.0.0.1`;
- token is ephemeral and at least 32 characters;
- only fixed mission IDs execute;
- arbitrary commands and browser-selected filesystem paths remain impossible;
- one mission runs at a time;
- timeout terminates the complete process tree and does not release the lock early;
- frontend verification retains JSON, HTML, trace, screenshot, video, and test-result evidence when Playwright runs;
- fallback evidence never claims browser proof;
- focused tests and exact-head type/lint checks execute and pass.

## Explicit exclusions

No Founder Operator UI, plan persistence, GitHub failure scanner, room production assets, merge, deployment, migration, publication, credential use, or deletion.

## Rollback

Revert the focused batch commit. No external state cleanup is required.

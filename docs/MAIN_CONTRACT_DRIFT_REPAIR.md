# Main contract drift repair

## Decision

Current production authority is the repository configuration already used by `main`, not the stale assertions that still described an older Worker wrapper and release marker.

## Reconciled authority

- `worker/voice-entry.ts` is the configured production Worker entrypoint.
- It delegates ordinary HTTP traffic to `worker/observed-index.ts` and retains inbound email handling.
- The production release marker is `https://sekretbip.net/.well-known/sekret-release.json`.
- `deploy:worker` delegates to the explicit `deploy:api:production` script.

## Boundary

This repair changes repository inventory, tests, and CI evidence only. It does not execute deployment, mutate a database, use credentials, change an account, or alter an external platform.

## Verification

The exact-head workflow runs the focused contracts, the complete unit suite, and TypeScript before integration.

## Rollback

Revert the focused merge and rerun the exact-head gate. No production rollback is required because this lane performs no deployment.

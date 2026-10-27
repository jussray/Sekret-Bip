# Batch 2 — Founder Operator

## Outcome

Add the founder-only mission-to-artifact planning surface on top of Batch 1’s guarded local core.

## Intended files

- `.agents/skills/bip-control-room/SKILL.md`
- `docs/CONTROL_ROOM_FOUNDER_OPERATOR.md`
- `implementation-ledger.extensions/founder-operator.json`
- `scripts/control-room-server.mjs` — fixed-path plan persistence extension
- `src/features/control-room/FounderOperatorPanel.tsx`
- `src/screens/DevControlRoomScreen.tsx`
- `src/services/controlRoomFounderOperator.ts`
- `src/services/controlRoomLocalAgent.ts` — plan persistence client extension
- `src/types/controlRoomFounderOperator.ts`
- `test/control-room-founder-operator-server.test.mjs`
- `test/control-room-founder-operator.test.mjs`

## Acceptance gates

- founder profile is checked before any Control Room surface or history renders;
- ULTRATHINK, Bill Gates Artifacts, and Elon Musk Execution are explicit planning modes;
- every artifact has one owner, evidence requirements, path hint, status, and approval boundary;
- free-form founder text never becomes a command;
- local history has no delete action;
- persisted reports use fixed server-owned paths and version instead of overwriting history;
- private-content-shaped and credential-shaped payloads are rejected;
- founder approval is recorded separately while external-action artifacts remain `human-required`;
- plan generation alone remains `plan-only` evidence;
- exact-head focused tests, type, lint, and browser access-control proof execute and pass.

## Explicit exclusions

No provider activation, account connection, external sending, merge, deployment, migration, spending, secret operation, or deletion.

## Rollback

Revert the focused batch commit. Versioned local reports may remain as inert evidence; no production cleanup is required.

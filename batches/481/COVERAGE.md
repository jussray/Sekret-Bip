# PR #481 Replacement Coverage

This record compares historical draft PR #481 with the four replacement batches.

## Replacement PRs

| Order | PR | Scope |
|---|---:|---|
| 1 | #604 | Executable Control Room core |
| 2 | #606 | Founder Operator |
| 3 | #608 | GitHub failure routing |
| 4 | #610 | Room production + Product Design |

The final stacked head is based on current `main` and contains the intended executable core, Operator, failure routing, room-production contract, Product Design gates, tests, evidence contracts, and batch documentation.

## Historical files intentionally superseded

### `README.md`

The old PR added a broad Control Room section to a README that has advanced significantly since #481’s original base. The replacement does not overwrite that current product front door. Operational instructions live in the batch contracts and the focused Control Room documents instead.

### `docs/CONTROL_ROOM.md`

The old patch described running missions from an Operations **Missions** tab. The replacement intentionally centralizes executable controls in the founder-gated **Operator** surface, so those instructions would be stale and misleading. Canonical execution and planning contracts now live in:

- `batches/481/01-control-room-core.md`
- `docs/CONTROL_ROOM_GITHUB_ROUTE.md`
- `batches/481/02-founder-operator.md`
- `docs/CONTROL_ROOM_FOUNDER_OPERATOR.md`

### `src/screens/DevControlRoomWorkspace.tsx`

The historical PR added a second set of mission buttons to Operations. That duplicate control surface is intentionally not copied. `FounderOperatorPanel` is the single founder-gated place for safe local mission execution and artifact planning, while the existing Operations and Fallbacks surfaces remain preserved.

## Already present or no longer unique

Files such as `test/control-room-os.test.mjs` either already match current `main` or are exercised by the replacement batch contracts and therefore do not require a new diff.

## Preservation status

- PR #481 remains open and draft as historical review evidence.
- Its source branch is not deleted.
- None of the replacement branches are merged or deployed by this decomposition step.
- #481 may be closed unmerged only after all four replacement batches pass exact-head review and the founder accepts this coverage record.

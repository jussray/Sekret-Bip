# Control Room Evidence Provenance

## Purpose

This contract prevents the Control Room from silently rewriting an earlier evidence-backed conclusion when later evidence changes the interpretation.

It belongs to the repository-truth and founder-observability layer. It does **not** belong in teen-facing runtime, parent-facing runtime, Supabase private-user tables, journal storage, voice storage, Circle content, or private-message paths.

## Evidence chain

The project binds evidence in this order:

1. source identity
2. source SHA-256
3. canonical observation SHA-256
4. claim binding and claim SHA-256
5. supersession receipt
6. receipt SHA-256

A later observation never erases the earlier one. The earlier claim can move from `verified_current` to `superseded_historical`, while the latest accepted interpretation becomes `verified_current`.

## Fail-closed rules

- Source hashes must be valid SHA-256 values.
- Canonical JSON rejects unsupported, undefined, or non-finite values and preserves own JSON keys such as `__proto__` without prototype-setter collisions.
- Claim binding must match source ID, source digest, and observation digest.
- A supplied/deserialized claim must reproduce its stored `claimSha256` before supersession.
- Only a `verified_current` claim can be superseded.
- New evidence must have a later observation timestamp before supersession.
- Strategy mutation is required on a supersession receipt.
- Byte-level file changes fail source verification.
- `juss-proof/v1` supersession uses only the existing UUID receipt-reference array supported by Founder Control Room.
- A prior Juss proof is eligible for supersession only when its schema, project, repository verification authority, operation, and chronology are compatible with the new exact-head proof.

## Privacy boundary

Only sanitized operational evidence is allowed in this layer.

Never ingest or emit:

- journal text
- voice recordings or transcripts
- teen or parent names or contact information
- Circle post content
- private messages
- credentials
- raw provider logs containing private content

The provenance layer hashes evidence; hashing does not make private content safe to export. Private content must stay out of the provenance packet entirely.

## Project integration

Runtime primitives:

- `scripts/control-room-provenance.mjs`
- `scripts/control-room-juss-proof.mjs`

Tests:

- `test/control-room-provenance.test.mjs`
- `test/control-room-juss-proof-provenance.test.mjs`
- `test/control-room-juss-proof.test.mjs`

Ledger evidence:

- `implementation-ledger.extensions/control-room-evidence-provenance-supersession.json`

The repository's existing `npm test` recursively discovers every `test/**/*.test.mjs` file, so the provenance tests automatically enter the unit-test gate without creating a parallel test runner.

## Review lineage

PR #1036 contains the original implementation and review history. It was closed without merge after Repository Truth correctly rejected its version-pattern branch name. The same reviewed history was preserved on the compliant branch `feat/control-room-provenance-supersession` and continues through PR #1038. No historical branch was deleted.

## Verification status

Implementation status is `integrated` on the review branch.

Do not mark this capability `verified` or `released` until exact-head CI succeeds for the final PR head and the reviewed content is merged to `main`.

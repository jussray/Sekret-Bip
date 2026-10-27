<!-- truth-mode: durable -->
# Founder Control Room README Sync Policy

## Purpose

Founder Control Room decides whether a repository change must update README or another canonical document. Documentation is a guardrail, not a second live control plane.

## Live truth boundary

Durable docs carry invariants, procedures, ownership, acceptance criteria, and pointers to live evidence. They must not copy volatile main SHAs, issue state, provider outcomes, run IDs, or production verdicts as evergreen truth.

See `docs/TRUTH_AUTHORITY.md` for claim expiry and supersession.

## Required README impact decision

Every nontrivial incident, fix, merge, deployment change, migration change, validation change, or authority change records one value:

```text
required
not_required
deferred_with_reason
```

Use `required` when a durable contract changed. Use `not_required` only when durable documentation remains accurate. Use `deferred_with_reason` only when another active PR owns the edit and the owner, PR, and deadline are recorded.

## Truth classes

Canonical status-oriented material is one of:

- **durable** — invariants, procedures, and pointers;
- **historical** — a clearly labeled observation window;
- **live receipt** — a machine/provider/account observation with target, authority, time, and evidence reference.

Do not create another ambiguous current-status Markdown surface when a live receipt or owning-system read is the correct authority.

## Revocation and supersession

Verification is scoped and can expire.

- Exact-head evidence expires for current-main claims when the head moves.
- Newer authoritative evidence that contradicts a prior verified state supersedes current use of the older claim while preserving the old observation as history.
- Live GitHub issue state outranks copied issue-state prose.
- A merged fix does not complete an external evidence gate unless that gate's acceptance evidence passes.
- A zero-step or no-log job remains `runner_startup_failure` infrastructure evidence unless later evidence changes that classification.

## Completion gate

Before merge, the active agent must:

1. classify README/document impact;
2. update durable docs when the contract changed;
3. keep volatile outcomes in retained receipts/live systems instead of evergreen prose;
4. state what is verified, blocked, unknown, historical, or superseded;
5. run `node scripts/audit-documentation-truth.mjs`;
6. avoid claiming deployment or live proof from a merge alone.

The final diff must be reviewed like any other repository change.

# Repository Health and Duplicate-Work Policy

## Purpose

Keep `jussray/Sekret-Bip` understandable, reversible, and easy to operate by maintaining one canonical implementation branch and pull request for each logical change.

This policy governs future branch creation and provides an evidence-first process for reviewing historical branch sprawl. It never authorizes automatic deletion.

## Canonical ownership

Before creating a branch, identify:

- the issue, mission, or user outcome that owns the work;
- the current canonical implementation, if one exists;
- the exact `main` commit used as the branch base;
- the single branch and pull request that will carry the change;
- the proof and rollback required before merge.

If an open branch or pull request already owns the same logical change, continue there unless preserving it would be unsafe or materially block the outcome.

## Branch rules

- Branch once from current `main`.
- Use one of:
  - `fix/<clear-problem>`
  - `chore/<clear-maintenance-task>`
  - `feat/<clear-user-outcome>`
- Keep one active pull request per logical change.
- Resolve review comments, failed checks, and merge conflicts on that branch.
- Synchronize the existing branch with `main` instead of starting a renamed copy.

## Prohibited duplicate naming

Do not create branch names containing duplicate-version patterns such as:

- `-v2`, `-v3`, or another version suffix used only to restart the same work;
- `-current-main`;
- `-copy`;
- `-backup`;
- `-duplicate`.

A product version may appear in a branch only when the version itself is the actual named product scope, not a workaround for branch hygiene.

## Historical inventory classifications

The branch-hygiene auditor classifies remote branches as:

- `current-mission-branch`;
- `active-branch`;
- `merged-awaiting-cleanup`;
- `stale-unmerged-review-required`;
- `prohibited-versioned-or-duplicate`.

The report is evidence, not deletion authority.

## Cleanup procedure

For every branch proposed for cleanup:

1. identify the branch SHA and last commit date;
2. identify any open or merged pull request;
3. compare it with `main` and the canonical branch;
4. preserve unique commits, evidence, screenshots, traces, or documentation;
5. record the branch classification and rationale;
6. obtain explicit founder approval for deletion when deletion is still appropriate;
7. delete only the reviewed branch;
8. rerun the inventory and store the resulting report.

Unknown or ambiguous branches remain preserved until reviewed.

## Proof standard

Branch hygiene is proven only when:

- the current branch name passes the policy;
- the full remote-branch inventory is captured for the exact commit;
- every historical debt branch has a reviewed disposition;
- any authorized deletion has a before-and-after record;
- no unique founder work was lost;
- the final inventory is stored as evidence.

A written rule alone does not prove historical cleanup.

# bip-current-state

## 5W1H operating contract

Before planning, editing, or claiming completion, establish and state:

- **Who** — the requester, decision owner, affected users, data subjects, and execution authority.
- **What** — the requested outcome, concrete deliverable, non-goals, and existing work that must be preserved.
- **Where** — the exact repository, branch, environment, runtime, route, service, table, or provider boundary involved.
- **When** — the current lifecycle or release state, required ordering, timing constraint, and rollback window.
- **Why** — the user problem and verified evidence that justify the work.
- **How** — the smallest safe implementation, required permissions, verification evidence, rollout, and rollback.

Inspect repository and runtime truth for unknowns. Ask the user only when a missing answer would materially change the safe solution or authority. Re-run 5W1H after red-team/OODA findings change the plan. Finish by mapping the result, evidence, remaining blocker, and next owner back to these six questions.


## Trigger

Use at the start and end of every working session, and before making claims
about current PR, deploy, migration, backend, or release state.

## Source of Current State

Read `/SPRINT.md`.

`SPRINT.md` is a cache of recently verified state, not unquestionable truth.
Verify material claims using:
`.agents/skills/bip-repo-truth/SKILL.md`

## Required Sequence

1. Read `SPRINT.md`
2. Run the relevant repo-truth verification
3. Compare recorded state with verified state
4. Work only from the verified result
5. Update `SPRINT.md` if the state changed

## Update Rules

Read and verify `SPRINT.md` at the start of each working session.
Update it only after verification when the recorded state has changed,
and again before ending a session that changed repository, deployment,
or database state.

Update `SPRINT.md` when:
- a PR opens, closes, changes status, or merges
- CI blockers appear or resolve
- deployment ownership, target, or health changes
- Supabase migrations or Edge Functions change
- the next committed task changes

For implementation and fix claims, use this order:

1. implement the scoped change;
2. run exact-head PR checks and the system-specific proof;
3. merge only the tested head;
4. verify the merged `main` content and the correct production authority;
5. update `implementation-ledger.json`, `SPRINT.md`, `docs/CURRENT_STATUS.md`, and `docs/WIRING_STATUS.md` in a separate truth-only change.

Do not update status documentation before merge merely because a branch exists or an agent reports success. Cloudflare evidence proves Worker/Pages deployment; Supabase migration parity and authorization probes prove database boundaries. Do not substitute one witness for another.

Do not write guesses, planned architecture, secrets, API keys, personal data,
or unverified deployment claims into `SPRINT.md`.

## Hard Rails

- Never commit directly to `main`
- Keep PR scope isolated
- Do not edit Worker configuration from unrelated PRs
- Do not modify companion asset or continuity tests unless their contracts change
- Do not add runtime, screen, or database work to tooling-only PRs
- Do not mix implementation changes into a post-merge current-state documentation PR

## Output

State:
`Verified current state as of <timestamp>: <summary>`

If `SPRINT.md` disagrees with verified state, update it in the current scoped PR
or record the mismatch explicitly.

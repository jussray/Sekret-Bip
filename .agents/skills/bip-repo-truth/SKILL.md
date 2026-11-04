# bip-repo-truth

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
Any session where you are about to: fix a bug, add a feature, diagnose a deploy
failure, or make claims about what is in the repo.

## The Rule
**Session memory is not ground truth. The repo is.**
Never trust what you remember from a previous message about:
- Which branch is deployed
- What the current worker version is
- Whether a PR was merged
- What a file currently contains

## Verification Commands (run before acting)

### Repo State
```bash
git log --oneline -10           # What actually shipped last
git status                      # Uncommitted state
git branch -a                   # What branches exist
git diff main..HEAD             # What is in this branch vs main
```

### Worker Deploy State
```bash
wrangler deployments list       # Actual Cloudflare deploy history
wrangler tail                   # Live worker logs
```

### Supabase Migration State
```bash
supabase migration list         # Applied migrations
supabase db diff                # Schema drift
```

## Phantom Blocker Protocol
If you hit a blocker that "shouldn't exist" given your mental model:
1. STOP — do not spiral into workarounds
2. Run the verification commands above
3. Compare actual state to expected state
4. The delta IS the bug — fix that specifically

## Session Start Checklist
Before doing anything in a Bip session:
- [ ] Confirm current branch
- [ ] Confirm last deploy timestamp (worker + Expo)
- [ ] Confirm no pending migration drift
- [ ] Confirm which PRs are actually merged vs. open

## Output
State explicitly: "Verified repo state as of [timestamp]: [findings]"
Never proceed with "I think the current state is..."

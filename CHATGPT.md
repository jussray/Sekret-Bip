# ChatGPT Operating Contract — Sekret-Bip

This file governs ChatGPT (chat.openai.com, desktop, API, Codex tasks) when working in `jussray/Sekret-Bip`.

## 5W1H — Required Before Every Nontrivial Action

- **Who** — requester, decision owner, affected data subjects, execution authority.
- **What** — requested outcome, deliverable, non-goals, existing IP to preserve.
- **Where** — `jussray/Sekret-Bip`, exact branch, environment, runtime, and IP asset boundary.
- **When** — lifecycle/release state, ordering, timing, rollback window.
- **Why** — verified creative problem and evidence.
- **How** — smallest safe implementation, permissions, verification, rollout, rollback.

## Repository Identity

**Repository:** `jussray/Sekret-Bip`
**Role:** Private creative universe — Se’kret Bip characters, lore, stories, and IP assets.

## Non-Negotiable Boundaries

- Never expose unreleased characters, lore, story arcs, or IP assets in any public or model-visible context.
- Never blend Se’kret Bip IP with other Chief AI project content.
- Codex must use branch + PR, never push directly to `main`.
- Credentials and signing keys must stay in vault — never in code or PR descriptions.
- Creative and publishing decisions require explicit founder approval.

## Codex-Specific Rules

- Run any available lint/build checks before PR.
- PR descriptions must not expose unreleased IP, story beats, or character details.
- Include rollback steps before requesting merge.

## Governed Gap-to-Merge Workflow

When the founder invokes `/gaps`, `/blueprint`, `/rent`, `/implement`, `/review`, `/merge`, `/cont`, or equivalent stacked language, load `.ai-skills/skills/gap-blueprint-implement-review.md` and execute:

`GAPS → BLUEPRINT → RENT → IMPLEMENT → VERIFY → REVIEW → MERGE GATE → CONTINUE`

The loop must read current repository, `main`, PR, Founder Control Room, provider, database, checks, jobs, steps, logs, and review evidence before judging. Label claims `VERIFIED`, `INFERRED`, `UNKNOWN`, or `BLOCKED`. A failed lookup is `UNKNOWN`, never absence. Missing runs are not `workflow_no_jobs`. Never claim a code regression without an executed failing step and logs. Require Playwright or device proof for rendered changes. Do not mutate production or merge without explicit authority, and stop if the verified head moves before merge.

## Seek, Learn, Find — No-Assumption Rule

For every nontrivial diagnosis, status claim, repair, merge, deployment, provider, secret, CI, database, or release decision, use this sequence:

`SEEK → INSPECT → VERIFY → LEARN → COMPARE → CONCLUDE → ACT`

- Seek and find available authoritative evidence before asking the founder to repeat information or filling a gap with a guess.
- Inspect the exact current repository, branch, head SHA, workflow run, provider state, database state, or other authority relevant to the claim.
- Verify before concluding. A plausible explanation is not a verified fact.
- If evidence is missing, inaccessible, stale, or contradictory, label the claim `UNKNOWN`, `INFERRED`, or `BLOCKED` instead of upgrading it to `VERIFIED`.
- Keep provider truth, repository truth, CI truth, runtime truth, browser truth, device truth, and account truth separate unless direct evidence proves they match.
- If `main` moves, re-read the new head and inspect intervening commits before acting or reusing prior conclusions.
- A workflow rerun is not automatically equivalent to a newly queued run. For claims involving changed secrets, environment, permissions, provider state, or other queue-time inputs, require a fresh run unless platform documentation and exact evidence prove the rerun is equivalent.
- Never use an old receipt, stale run, cached assumption, prior conversation statement, or historical issue status as proof of current state when a fresher authority can be checked.
- When two evidence sources disagree, investigate the disagreement before naming a cause.
- Confess and correct an evidence mistake immediately; do not defend a conclusion after its proof boundary has failed.

## Approval Gates

Require explicit founder approval before: merging, publishing, deploying, releasing IP, changing platform configs, or rotating secrets.

## Output Format

Return: completed 5W1H · repo/branch/SHA · files touched · checks run · preserved work · rollback path · blocker and next owner.

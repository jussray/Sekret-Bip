# Claude Operating Contract — Sekret-Bip

This file governs Claude (claude.ai, Claude Code, MCP-connected sessions) when working in `jussray/Sekret-Bip`.

## 5W1H — Required Before Every Nontrivial Action

- **Who** — requester, decision owner, affected users, data subjects, execution authority.
- **What** — requested outcome, deliverable, non-goals, existing work to preserve.
- **Where** — `jussray/Sekret-Bip`, exact branch, environment, runtime, route, data store, and provider boundary.
- **When** — current lifecycle/release state, ordering, timing, rollback window.
- **Why** — verified user problem and evidence.
- **How** — smallest safe implementation, permissions, verification, rollout, rollback.

## Repository Identity

**Repository:** `jussray/Sekret-Bip`
**Role:** Private creative universe and world-building system for the Se’kret Bip brand — characters, lore, stories, production tools, and IP assets.
**Separation:** Strictly separate from Chief AI ops, JBH, Think Tank, L99, and Untold Stories in all dimensions.

## Current-facing canon

- Suhana
- Sy
- Night
- Cloud

Legacy database and code keys such as `raylene` and `rylane` are compatibility identifiers only. Do not rename, reinterpret, or migrate them without a dedicated database migration, rollback plan, generated-type update, and client compatibility proof.

## Room-production contract

The first production vertical slice is Night only. The teen bottom navigation remains exactly:

`Room`, `Pages`, `Calm`, `Circle`, `More`

Companion rooms are permanent focused destinations. Dashboard cards, streaks, reminders, rewards, and account clutter belong in the User Room.

Read `docs/ROOM_PRODUCTION_SUPABASE_TRUTH.md` before changing room persistence or companion identifiers.

## Supabase boundary

Room-production work is schema-neutral unless the pull request explicitly declares a database migration. Do not:

- apply migrations;
- alter RLS policies;
- add direct client writes;
- change character-key constraints;
- claim Supabase security completion.

The existing Supabase security-advisor backlog must be treated as separate remediation work and never hidden inside Product Design completion language.

## Never signal success on failure

Do not show a success message or set a success flag inside a `catch` block.

If an operation throws or returns a failure Result, the user-visible state must reflect failure. Success may appear only after the intended operation completed and the relevant result was verified.

Truthful fallback and graceful degradation are allowed when they are represented honestly. A fallback reply must remain labeled as fallback; a failed reminder must never say it was set.

Run `node scripts/audit-failure-truth.mjs --strict` when failure handling changes. Any exception must be narrow, reasoned, and registered in `config/failure-truth-allowlist.json`.

## Branch hygiene

Maintain one active implementation branch and one pull request per logical change.

- Branch once from current `main` as `fix/*`, `chore/*`, or `feat/*`.
- Continue review fixes, CI repairs, and main synchronization on that branch.
- Do not create duplicate `-v2`, `-v3`, `-current-main`, `-copy`, `-backup`, or `-duplicate` branches to restart the same work.
- Do not delete historical branches automatically or without reviewed evidence and explicit authority.

Read `REPO_HEALTH_DUPLICATES.md` and run `node scripts/audit-branch-hygiene.mjs` for repository-health work.

## Non-Negotiable Boundaries

- Never expose unreleased characters, lore, story arcs, proprietary world-building systems, or IP assets to public or model-visible contexts.
- Never blend Se’kret Bip IP with other project content.
- Credentials, signing keys, and platform tokens must stay in vault — never in code or PR descriptions.
- All production-touching actions require explicit founder approval.
- Never claim a feature is complete from documentation or a manifest alone.
- Zero-step or no-log GitHub Actions failures are infrastructure evidence, not code proof.

## Required Loop

1. Observe exact branch, world-state, IP asset inventory, deployment boundary, and Supabase compatibility state.
2. Complete 5W1H and identify authority or safety gaps.
3. Red-team IP exposure, lore consistency, canon integrity, persistence compatibility, and rollback.
4. Choose the smallest reversible action preserving existing work.
5. Implement within the confirmed repository role.
6. Require the exact pull-request head to prove applicable unit, type, lint, browser, and retained-artifact gates.
7. Report proven, inferred, blocked, and next owner.

## Governed Gap-to-Merge Workflow

When the founder invokes `/gaps`, `/blueprint`, `/rent`, `/implement`, `/review`, `/merge`, `/cont`, or equivalent stacked language, load `.ai-skills/skills/gap-blueprint-implement-review.md` and execute its phases in order:

`GAPS → BLUEPRINT → RENT → IMPLEMENT → VERIFY → REVIEW → MERGE GATE → CONTINUE`

This workflow is authoritative for the repair loop:

- read current repository, `main`, PR, Founder Control Room, provider, database, and review evidence before judging;
- label claims `VERIFIED`, `INFERRED`, `UNKNOWN`, or `BLOCKED`;
- treat failed lookups as `UNKNOWN`, not absence;
- require executed steps and logs before claiming a code regression;
- require Playwright or device proof for changed rendered behavior;
- keep production mutation separate unless explicitly authorized;
- never merge merely because GitHub reports `mergeable: true`;
- stop if the verified final head changes before merge.

## Approval Gates

Require explicit founder approval before: merging, publishing, deploying, releasing IP assets, changing platform configurations, rotating secrets, applying database migrations, or external communications.

## Output Format

Return: completed 5W1H · repo/branch/SHA · files touched · checks run · preserved work · rollback path · blocker and next owner.

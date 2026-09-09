# Repo Hygiene — History Cleanup Runbook

Last reviewed: 2026-07-13

> **Destructive maintenance procedure, not routine setup.** This runbook rewrites Git history. Do not execute it without an approved issue, a verified backup, collaborator coordination, and an explicit maintenance window.

## Why this exists

Historical audits found duplicate binary assets and design directories that could increase clone size. The working tree now uses Git LFS for large production artwork, so current repository size and duplicate hashes must be re-measured before any cleanup.

Do not assume the original duplicate-file list is still complete or current.

## Preconditions

Before proceeding:

1. Open a GitHub issue describing the measured repository-size problem.
2. Record current `main` SHA and branch-protection settings.
3. Confirm all collaborators understand that a history rewrite requires re-cloning or resetting.
4. Export a verified mirror backup.
5. Re-run duplicate-blob analysis against the current repository.
6. Confirm no protected production asset, migration, release artifact, or audit evidence is included in the deletion set.

## Tools

```bash
npm install -g bfg-repo-cleaner  # or install BFG through the local package manager
java -version                    # BFG requires a compatible JRE
```

## Step 1 — Create a fresh mirror backup

```bash
git clone --mirror git@github.com:jussray/Sekret-Bip.git Sekret-Bip-mirror
cp -R Sekret-Bip-mirror Sekret-Bip-mirror-backup
cd Sekret-Bip-mirror
```

Verify both mirror directories before continuing.

## Step 2 — Generate a current deletion manifest

Do not reuse an old hard-coded UUID list without verifying every blob against current canonical assets.

The deletion manifest must record:

- historical path;
- blob SHA;
- canonical retained path, when one exists;
- reason for deletion;
- reviewer approval.

Keep the manifest with the maintenance issue and PR evidence.

## Step 3 — Remove only approved historical blobs

Use BFG or `git filter-repo` with the reviewed manifest. Examples must be adapted to the approved list:

```bash
bfg --delete-files '<approved-pattern-or-file-list>'
bfg --delete-folders '<approved-folder-list>'
```

Never delete current canonical `assets/images/bg-*.png`, required archive evidence, Supabase migrations, Worker source, release metadata, or security evidence merely to reduce clone size.

## Step 4 — Expire and garbage collect

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

## Step 5 — Validate the rewritten mirror

Before any force-push:

- inspect `main` and recent release commits;
- verify LFS pointers and objects;
- clone the rewritten mirror into a temporary working directory;
- run `npm ci`, tests, type-check, Expo export, room archive validation, and Playwright;
- verify Supabase migrations and deployment files are present;
- compare expected branch and tag counts.

## Step 6 — Force-push only during the approved window

```bash
git push --force --mirror
```

Immediately record the resulting `main` SHA and restore or verify branch-protection rules.

## Step 7 — Re-clone and verify

```bash
cd ..
rm -rf Sekret-Bip-local
git clone git@github.com:jussray/Sekret-Bip.git Sekret-Bip-local
cd Sekret-Bip-local
git lfs pull
npm ci
npm run verify:prepush
npm run test:e2e
```

All collaborators must re-clone or reset to the rewritten history. Old branches must not be pushed back without review, or the removed history can return like a particularly determined mold colony.

## Post-cleanup dependency maintenance

Dependency cleanup is a separate reviewed change:

```bash
npm install
npm dedupe
npm run verify:prepush
```

Commit the lockfile only after the full validation matrix passes.

## Protected content

History cleanup must preserve:

- canonical production assets and their LFS objects;
- application, Worker, Supabase, and test source;
- ordered migration history;
- implementation ledger and security baselines;
- release and incident evidence required for auditability;
- configuration files that contain no secrets but define production behavior.

# Asset Backup Rules

This document governs the `assets/images/archive/` directory. Read it before touching any room background.

## Why the Archive Exists

Phase 2 will overwrite the live `bg-*.png` files with composited illustrations (characters painted into the room). The archive holds the original, untouched room backgrounds so that:

- Any composite can be rolled back to the original
- `npm run verify:room-archives` can detect if a live file has been replaced with a composite
- `npm run verify:room-archives -- --strict-match` blocks Phase 2 from starting if archives are missing or corrupt

## The LFS Stub Problem

Git LFS stores large files as small pointer stubs (~86–95 bytes) in the repository. When you clone or pull without running `git lfs pull`, all PNG files in the repo are these pointer stubs — not real image data.

The archive was seeded with stubs instead of real bytes. This causes `verify:room-archives` to fail with:

```
❌ archive is an LFS pointer stub (92 bytes)
❌ DO NOT START PHASE 2
```

## Repair Procedure (Run This Once)

```bash
# Step 1: Hydrate all LFS assets
git lfs pull

# Step 2: Confirm live files are real (expect 2–3 MB each)
ls -lh assets/images/bg-*.png

# Step 3: Copy real bytes into archive
cp -f assets/images/bg-*.png assets/images/archive/

# Step 4: Verify archive sizes (expect 2–3 MB each — no 80–100 byte stubs)
ls -lh assets/images/archive/bg-*.png

# Step 5: Run the repair helper script (alternative to steps 1–4)
# node scripts/repair-archive-stubs.js

# Step 6: Commit
git add assets/images/archive/
git commit -m "fix: replace LFS stub archive copies with real PNG bytes"
git push

# Step 7: Verify
npm run verify:room-archives -- --strict-match
# Expected: ✅ ALL 28 ARCHIVE FILES MATCH LIVE — strict-match passed.
# Expected: ✅ Phase 2 may proceed.
```

## Archive Rules (Ongoing)

| Rule | Detail |
|---|---|
| **Never modify archive files** | Archive files are read-only originals. Only the live `bg-*.png` files are replaced during Phase 2. |
| **Never delete archive files** | Even after Phase 2, keep archive files for rollback. |
| **One archive file per live background** | Naming must exactly match: `archive/bg-X-room-Y.png` mirrors `bg-X-room-Y.png`. |
| **Archive files must be real PNGs** | Minimum 1 MB. LFS pointer stubs are not valid archive files. |
| **Strict match required before Phase 2** | `npm run verify:room-archives -- --strict-match` must pass (exit 0) before any composite is pushed. |

## What verify:room-archives Checks

Default mode (`npm run verify:room-archives`):
1. Every live `bg-*.png` has a counterpart in `archive/`
2. Archive file is not an LFS pointer stub
3. Archive file is >= 1 MB
4. Reports whether each file is pre-composite or has been composited

Strict mode (`npm run verify:room-archives -- --strict-match`):
- All of the above, plus:
- SHA-256 of live file must exactly match archive file
- Use **before** pushing any Phase 2 composite to confirm originals are preserved

## Rollback Procedure

If a composite needs to be reverted to the original:

```bash
# Restore single file
cp assets/images/archive/bg-X-room-Y.png assets/images/bg-X-room-Y.png

# Restore all files (nuclear option)
cp -f assets/images/archive/bg-*.png assets/images/

git add assets/images/
git commit -m "revert: restore original room backgrounds from archive"
git push
```

## Codespaces / CI Note

In GitHub Codespaces, run `git lfs pull` immediately after the environment starts. LFS assets are not automatically hydrated. Add to your Codespaces startup:

```bash
git lfs pull
```

See `docs/CODESPACES.md` for full setup.

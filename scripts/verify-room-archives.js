#!/usr/bin/env node
// verify-room-archives.js
// Enforces archive backup rules for Phase 2 room integration.
// Run: node scripts/verify-room-archives.js
// Or:  npm run verify:room-archives

const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const LIVE_DIR    = path.join(__dirname, '..', 'assets', 'images');
const ARCHIVE_DIR = path.join(LIVE_DIR, 'archive');
const MIN_SIZE_BYTES = 1024 * 1024;
const STRICT_MATCH = process.argv.includes('--strict-match');

function sha256Buffer(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function readSnapshot(filepath) {
  try {
    const bytes = fs.readFileSync(filepath);
    return {
      exists: true,
      bytes,
      size: bytes.length,
      lfsPointer: bytes.length <= 512
        && bytes.toString('utf8', 0, Math.min(bytes.length, 64)).startsWith('version https://git-lfs'),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, bytes: null, size: 0, lfsPointer: false };
    throw error;
  }
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  if (n >= 1024) return (n / 1024).toFixed(1) + ' KB';
  return n + ' bytes';
}

const liveFiles = fs
  .readdirSync(LIVE_DIR)
  .filter(f => f.startsWith('bg-') && f.endsWith('.png'))
  .sort();

if (liveFiles.length === 0) {
  console.error('\n❌ No bg-*.png files found in assets/images/ — check your working directory.');
  process.exit(1);
}

if (!fs.existsSync(ARCHIVE_DIR)) {
  console.error('\n❌ assets/images/archive/ does not exist.');
  console.error('Create it and copy original backgrounds into it before Phase 2.');
  console.error('See docs/ASSET_BACKUP_RULES.md');
  process.exit(1);
}

const liveSnapshots = new Map();
const liveStubs = [];
for (const filename of liveFiles) {
  const snapshot = readSnapshot(path.join(LIVE_DIR, filename));
  liveSnapshots.set(filename, snapshot);
  if (snapshot.lfsPointer) liveStubs.push(filename);
}
if (liveStubs.length > 0) {
  console.error('\n❌ LIVE files are LFS pointer stubs. Run git lfs pull first.');
  console.error(`   Stub count: ${liveStubs.length} of ${liveFiles.length}`);
  console.error('   git lfs pull');
  process.exit(1);
}

let allOk = true;
const results = [];
let stubCount = 0;

for (const filename of liveFiles) {
  const liveSnapshot = liveSnapshots.get(filename);
  const archivePath = path.join(ARCHIVE_DIR, filename);
  const archiveSnapshot = readSnapshot(archivePath);

  if (!archiveSnapshot.exists) {
    results.push({ ok: false, filename, reason: 'MISSING from archive/' });
    allOk = false;
    continue;
  }

  if (archiveSnapshot.lfsPointer) {
    stubCount++;
    results.push({
      ok: false,
      filename,
      reason: `archive is an LFS pointer stub (${archiveSnapshot.size} bytes).\n    Fix: git lfs pull && cp -f assets/images/${filename} assets/images/archive/${filename}`,
    });
    allOk = false;
    continue;
  }

  if (archiveSnapshot.size < MIN_SIZE_BYTES) {
    results.push({
      ok: false,
      filename,
      reason: `archive is ${formatBytes(archiveSnapshot.size)} — too small to be a real PNG. Minimum: 1 MB.`,
    });
    allOk = false;
    continue;
  }

  const liveSha = sha256Buffer(liveSnapshot.bytes);
  const archiveSha = sha256Buffer(archiveSnapshot.bytes);

  if (STRICT_MATCH) {
    if (liveSha !== archiveSha) {
      results.push({
        ok: false,
        filename,
        reason: `--strict-match: SHA differs (live has been modified from original)\n    live:    ${liveSha}\n    archive: ${archiveSha}`,
      });
      allOk = false;
      continue;
    }
    results.push({ ok: true, filename, size: archiveSnapshot.size, note: 'identical to archive ✓ (pre-composite)' });
  } else {
    const same = liveSha === archiveSha;
    results.push({
      ok: true,
      filename,
      size: archiveSnapshot.size,
      note: same ? 'pre-composite (matches original)' : 'composite active ✦',
    });
  }
}

console.log('');
console.log(STRICT_MATCH
  ? '── verify-room-archives [--strict-match] ──'
  : '── verify-room-archives ──');
console.log('');

for (const r of results) {
  if (r.ok) {
    console.log(`✅ ${r.filename.padEnd(44)} ${formatBytes(r.size).padStart(9)}  ${r.note || ''}`);
  } else {
    console.log(`❌ ${r.filename}`);
    console.log(`   ${r.reason}`);
  }
}

console.log('');

if (!allOk) {
  const failures = results.filter(r => !r.ok).length;
  console.log(`❌ ${failures} of ${liveFiles.length} archive checks FAILED.`);
  if (stubCount > 0) {
    console.log(`   ${stubCount} LFS pointer stub(s) found in archive/.`);
    console.log('');
    console.log('   ── REPAIR COMMANDS ──────────────────────────────────────────');
    console.log('   git lfs pull');
    console.log('   cp -f assets/images/bg-*.png assets/images/archive/');
    console.log('   git add assets/images/archive/');
    console.log('   git commit -m "fix: replace LFS stub archive copies with real PNG bytes"');
    console.log('   git push');
    console.log('   ─────────────────────────────────────────────────────────────');
    console.log('');
    console.log('   Or run the repair helper:');
    console.log('   node scripts/repair-archive-stubs.js');
  }
  console.log('');
  console.log('❌ DO NOT START PHASE 2 — fix archive backups first.');
  console.log('   See docs/ASSET_BACKUP_RULES.md');
  process.exit(1);
}

const composited = results.filter(r => r.note && r.note.includes('✦')).length;
const pristine = results.filter(r => r.note && r.note.includes('pre-composite')).length;
console.log(`✅ ${liveFiles.length} of ${liveFiles.length} archive files verified.  All real PNGs >= 1 MB.`);
if (composited > 0) {
  console.log(`   ${composited} composite(s) active  |  ${pristine} still pre-composite`);
} else {
  console.log(`   All ${pristine} files are pre-composite originals.`);
}
if (STRICT_MATCH) {
  console.log('✅ ALL 28 ARCHIVE FILES MATCH LIVE — strict-match passed.');
}
console.log('✅ Phase 2 may proceed.');
process.exit(0);

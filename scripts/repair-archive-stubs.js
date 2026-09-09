#!/usr/bin/env node
// repair-archive-stubs.js
// Detects LFS pointer stubs in assets/images/archive/ and replaces them
// with the real byte-identical copy from assets/images/ (the live files).
//
// Prerequisites:
//   git lfs pull        ← must be run first so live files are real PNGs
//
// Usage:
//   node scripts/repair-archive-stubs.js
//
// After running this script:
//   git add assets/images/archive/
//   git commit -m "fix: replace LFS stub archive copies with real PNG bytes"
//   git push
//   npm run verify:room-archives -- --strict-match

const fs   = require('fs');
const path = require('path');

const LIVE_DIR    = path.resolve(__dirname, '..', 'assets', 'images');
const ARCHIVE_DIR = path.resolve(LIVE_DIR, 'archive');
const MIN_SIZE    = 1024 * 1024; // 1 MB

function readSnapshot(filepath) {
  try {
    const bytes = fs.readFileSync(filepath);
    return {
      exists: true,
      size: bytes.length,
      lfsPointer: bytes.length <= 512
        && bytes.toString('utf8', 0, Math.min(bytes.length, 64)).startsWith('version https://git-lfs'),
    };
  } catch (error) {
    if (error?.code === 'ENOENT') return { exists: false, size: 0, lfsPointer: false };
    throw error;
  }
}

function isLfsPointer(filepath) {
  return readSnapshot(filepath).lfsPointer;
}

function formatBytes(n) {
  if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(2) + ' MB';
  return n + ' bytes';
}

// ── Sanity checks ──────────────────────────────────────────────────────────
if (!fs.existsSync(LIVE_DIR)) {
  console.error('❌ assets/images/ not found. Run from repo root.');
  process.exit(1);
}
if (!fs.existsSync(ARCHIVE_DIR)) {
  console.error('❌ assets/images/archive/ not found. Create it first.');
  process.exit(1);
}

// ── Collect bg-*.png live files ────────────────────────────────────────────
const liveFiles = fs
  .readdirSync(LIVE_DIR)
  .filter(f => f.startsWith('bg-') && f.endsWith('.png'))
  .sort();

if (liveFiles.length === 0) {
  console.error('❌ No bg-*.png found in assets/images/. Check working directory.');
  process.exit(1);
}

// ── Check live files are real ──────────────────────────────────────────────
const liveStubs = liveFiles.filter(f => isLfsPointer(path.join(LIVE_DIR, f)));
if (liveStubs.length > 0) {
  console.error('');
  console.error('❌ Live files are still LFS pointer stubs.');
  console.error('   Run git lfs pull before using this script.');
  console.error(`   Stubs: ${liveStubs.join(', ')}`);
  process.exit(1);
}

console.log('');
console.log('── repair-archive-stubs ──');
console.log('');

let repaired = 0;
let alreadyOk = 0;
let errors = 0;

for (const filename of liveFiles) {
  const livePath    = path.join(LIVE_DIR, filename);
  const archivePath = path.join(ARCHIVE_DIR, filename);
  const liveSize    = fs.statSync(livePath).size;
  const archiveState = readSnapshot(archivePath);

  const needsRepair = !archiveState.exists
    || archiveState.lfsPointer
    || archiveState.size < MIN_SIZE;

  if (!needsRepair) {
    alreadyOk++;
    console.log(`✅ ${filename.padEnd(44)} ${formatBytes(liveSize).padStart(9)}  already OK`);
    continue;
  }

  try {
    fs.copyFileSync(livePath, archivePath);
    const copiedSize = fs.statSync(archivePath).size;
    repaired++;
    console.log(`🔧 ${filename.padEnd(44)} ${formatBytes(copiedSize).padStart(9)}  repaired (was stub)`);
  } catch (err) {
    errors++;
    console.error(`❌ ${filename}  — copy failed: ${err.message}`);
  }
}

console.log('');
console.log(`── Summary ──────────────────────────────────────────────────────`);
console.log(`   Total files   : ${liveFiles.length}`);
console.log(`   Already OK    : ${alreadyOk}`);
console.log(`   Repaired      : ${repaired}`);
console.log(`   Errors        : ${errors}`);
console.log('');

if (errors > 0) {
  console.error('❌ Some files could not be repaired. Check permissions and disk space.');
  process.exit(1);
}

if (repaired > 0) {
  console.log('✅ Repair complete. Now commit and verify:');
  console.log('');
  console.log('   git add assets/images/archive/');
  console.log('   git commit -m "fix: replace LFS stub archive copies with real PNG bytes"');
  console.log('   git push');
  console.log('   npm run verify:room-archives -- --strict-match');
} else {
  console.log('✅ All archive files were already valid. No repair needed.');
  console.log('   npm run verify:room-archives -- --strict-match');
}

console.log('');
process.exit(0);

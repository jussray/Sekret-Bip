import { readFileSync, existsSync, openSync, readSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Export Contract validator for the teen companion production pipeline (spec v2.0).
 *
 * Reads the pose set, manifest statuses, and image registry from source (text),
 * then checks every expected asset against the Export Contract:
 *   - PNG format, present where status is `production`
 *   - one file per companion+pose at assets/images/companions/teen/<c>/<pose>.png
 *   - every `production` pose is wired with a require() in companionImages.ts
 *   - resolution >= 2048x2048 (soft: warns, does not fail — phone-optimized art is allowed)
 *
 * Exit non-zero only on a hard failure (production asset missing / unwired / not a PNG).
 */

const root = resolve(import.meta.dirname, '..');
const read = (rel) => readFileSync(resolve(root, rel), 'utf8');

const MIN_DIMENSION = 2048;
const assetRel = (companion, pose) =>
  `assets/images/companions/teen/${companion}/${pose}.png`;

// Batch 0 neutrals are intentionally phone-optimized (under the 2048 floor).
const RESOLUTION_WAIVERS = new Set([
  'assets/images/companions/teen/raylene/neutral.png',
  'assets/images/companions/teen/night/neutral.png',
  'assets/images/companions/teen/rylane/neutral.png',
]);

const COMPANIONS = ['raylene', 'rylane', 'night'];

/** Parse the pose arrays from src/types/companions.ts. */
function parsePoses() {
  const src = read('src/types/companions.ts');
  const poses = {};
  for (const companion of COMPANIONS) {
    const match = src.match(new RegExp(`${companion}:\\s*\\[([^\\]]*)\\]`));
    poses[companion] = match
      ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1])
      : [];
  }
  return poses;
}

/** Parse which poses are marked `production` in companionManifest.ts. */
function parseProduction() {
  const src = read('src/constants/companionManifest.ts');
  const production = {};
  for (const companion of COMPANIONS) {
    const match = src.match(
      new RegExp(`buildEntries\\('${companion}',\\s*\\{([^}]*)\\}`),
    );
    production[companion] = new Set(
      match
        ? [...match[1].matchAll(/(\w+):\s*'production'/g)].map((m) => m[1])
        : [],
    );
  }
  return production;
}

/** Parse which poses have a require() wired in companionImages.ts. */
function parseWired() {
  const src = read('src/constants/companionImages.ts');
  const wired = {};
  for (const companion of COMPANIONS) {
    const block = src.match(
      new RegExp(`${companion}:\\s*\\{([\\s\\S]*?)\\}`),
    );
    wired[companion] = new Set(
      block
        ? [...block[1].matchAll(/(\w+):\s*require\(/g)].map((m) => m[1])
        : [],
    );
  }
  return wired;
}

/** Read PNG signature + IHDR dimensions without external deps. */
function inspectPng(absPath) {
  const fd = openSync(absPath, 'r');
  try {
    const head = Buffer.alloc(24);
    readSync(fd, head, 0, 24, 0);
    const isPng =
      head.toString('hex', 0, 8) === '89504e470d0a1a0a' &&
      head.toString('ascii', 12, 16) === 'IHDR';
    return {
      isPng,
      width: isPng ? head.readUInt32BE(16) : 0,
      height: isPng ? head.readUInt32BE(20) : 0,
    };
  } finally {
    closeSync(fd);
  }
}

const poses = parsePoses();
const production = parseProduction();
const wired = parseWired();

const rows = [];
const errors = [];
const warnings = [];

for (const companion of COMPANIONS) {
  for (const pose of poses[companion]) {
    const rel = assetRel(companion, pose);
    const abs = resolve(root, rel);
    const isProduction = production[companion].has(pose);
    const present = existsSync(abs);

    let detail = '';
    let state;

    if (!isProduction) {
      state = present ? 'PRESENT (not yet production)' : 'pending';
    } else if (!present) {
      state = 'FAIL';
      detail = 'marked production but file missing';
      errors.push(`${rel}: ${detail}`);
    } else {
      const { isPng, width, height } = inspectPng(abs);
      if (!isPng) {
        state = 'FAIL';
        detail = 'not a valid PNG';
        errors.push(`${rel}: ${detail}`);
      } else if (!wired[companion].has(pose)) {
        state = 'FAIL';
        detail = 'production PNG not wired in companionImages.ts';
        errors.push(`${rel}: ${detail}`);
      } else {
        const underFloor = width < MIN_DIMENSION || height < MIN_DIMENSION;
        if (underFloor && RESOLUTION_WAIVERS.has(rel)) {
          state = 'PASS';
          detail = `${width}x${height} — waived (phone-optimized Batch 0)`;
        } else if (underFloor) {
          state = 'PASS*';
          detail = `${width}x${height} — below ${MIN_DIMENSION}px floor`;
          warnings.push(`${rel}: ${detail}`);
        } else {
          state = 'PASS';
          detail = `${width}x${height}`;
        }
      }
    }

    rows.push({ asset: `${companion}/${pose}`, state, detail });
  }
}

const pad = (s, n) => String(s).padEnd(n);
console.log('Companion asset validation (Export Contract v2.0)\n');
console.log(`${pad('ASSET', 22)}${pad('STATE', 30)}DETAIL`);
console.log('-'.repeat(78));
for (const r of rows) {
  console.log(`${pad(r.asset, 22)}${pad(r.state, 30)}${r.detail}`);
}

const productionCount = rows.filter((r) => r.state.startsWith('PASS')).length;
console.log(
  `\n${productionCount} production asset(s) checked, ` +
    `${warnings.length} warning(s), ${errors.length} error(s).`,
);

if (warnings.length) {
  console.log('\nWarnings (non-blocking):');
  warnings.forEach((w) => console.log(`  - ${w}`));
}

if (errors.length) {
  console.error('\nExport Contract failures:');
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exitCode = 1;
} else {
  console.log('\nExport Contract: PASS');
}

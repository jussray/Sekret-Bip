/**
 * Companion display-name canon (docs/COMPANION_NAME_CANON.md).
 *
 * Layer 1 (internal id truth): `raylene` / `rylane` / `soft` stay valid as
 * persisted ids, route keys, asset keys and analytics values.
 * Layer 2 (display-name truth): no runtime surface may render the pre-cutover
 * names. Every user-facing label resolves to Suhana / Sy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.dirname(new URL(import.meta.url).pathname).replace(/\/test$/, '');

const RUNTIME_DIRS = [
  'app',
  'components',
  'constants',
  'hooks',
  'screens',
  'src',
  'worker',
  'utils',
  'services',
  'context',
  'lib',
];

const LEGACY_DISPLAY_NAME = /\b(?:Raylene|Rylane)\b/;

const ALLOWED = [
  {
    file: 'app/(teen)/continuity.tsx',
    reason: 'comment explaining why the id is not title-cased for display',
    match: /^\s*\/\//,
  },
  {
    file: 'constants/presence/avatarStates.ts',
    reason: 'the reference-sheet artwork is physically signed with the old name',
    match: /^\s*\/\//,
  },
  {
    file: 'src/utils/sekretCompanion.ts',
    reason: 'comment naming the pre-cutover labels the normalizer still accepts',
    match: /^\s*\/\//,
  },
];

function sourceFiles(dir) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];

  return fs.readdirSync(abs, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(rel);
    return /\.tsx?$/.test(entry.name) ? [rel] : [];
  });
}

test('no runtime surface renders the pre-cutover companion display names', () => {
  const offenders = [];

  for (const file of RUNTIME_DIRS.flatMap(sourceFiles)) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (!LEGACY_DISPLAY_NAME.test(line)) return;

      const allowed = ALLOWED.some((entry) => entry.file === file && entry.match.test(line));
      if (!allowed) offenders.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `Use the canonical display names (Suhana / Sy). Internal ids stay as they are.\n${offenders.join('\n')}`,
  );
});

test('no runtime surface renders a lowercase legacy name inside prose', () => {
  const PROSE_LITERAL = /(['"`])((?:[^'"`\\\n]|\\.)*\s(?:[^'"`\\\n]|\\.)*)\1/g;
  const offenders = [];

  for (const file of RUNTIME_DIRS.flatMap(sourceFiles)) {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');

    lines.forEach((line, index) => {
      if (/^\s*(?:\/\/|\*|\/\*)/.test(line)) return;

      for (const [, , literal] of line.matchAll(PROSE_LITERAL)) {
        if (!/\b(?:raylene|rylane)\b(?!-)/i.test(literal)) continue;
        if (literal.includes('characterId must be')) continue;

        offenders.push(`${file}:${index + 1}: ${line.trim()}`);
      }
    });
  }

  assert.deepEqual(
    offenders,
    [],
    `Copy must use the canonical names (suhana / sy):\n${offenders.join('\n')}`,
  );
});

test('legacy and pre-id aliases still resolve to the canonical companions', () => {
  const source = fs.readFileSync(
    path.join(root, 'src/features/identity/legacyCompanionIdMigration.ts'),
    'utf8',
  );

  const mapMatch = /const LEGACY_TO_CANONICAL[^=]*= \{([\s\S]*?)\n\};/.exec(source);
  assert.ok(mapMatch, 'LEGACY_TO_CANONICAL must be extractable from source');

  const map = Object.fromEntries(
    [...mapMatch[1].matchAll(/^\s*(\w+): '(\w+)',/gm)].map(([, from, to]) => [from, to]),
  );

  assert.equal(map.raylene, 'suhana');
  assert.equal(map.rylane, 'sy');
  assert.equal(map.soft, 'suhana');
});

test('the canonical display map is the only source of the visible twin names', () => {
  const ids = fs.readFileSync(path.join(root, 'src/features/identity/companionIds.ts'), 'utf8');

  assert.match(ids, /suhana: 'Suhana'/);
  assert.match(ids, /sy: 'Sy'/);
  assert.doesNotMatch(ids, LEGACY_DISPLAY_NAME);
});

test('companion state normalizes display names and preserves legacy persisted ids', () => {
  const companion = fs.readFileSync(path.join(root, 'src/utils/sekretCompanion.ts'), 'utf8');

  assert.match(companion, /soft:\s*'Suhana'/);
  assert.match(companion, /raylene:\s*'Suhana'/);
  assert.match(companion, /suhana:\s*'Suhana'/);
  assert.match(companion, /rylane:\s*'Sy'/);
  assert.match(companion, /sy:\s*'Sy'/);
  assert.match(companion, /switch \(normalizeSekretPersonality\(personality\)\)/);
  assert.match(companion, /case 'sy':\s*\n\s*return 'rylane';/);
  assert.match(companion, /personality:\s*canonicalDisplayPersonality\(/);
  assert.doesNotMatch(companion, /personality === '(?:Sy|Suhana)'/);
});

test('founder preview uses canonical names while legacy route ids remain stable', () => {
  const preview = fs.readFileSync(path.join(root, 'src/constants/founderPreview.ts'), 'utf8');

  assert.match(preview, /Suhana Chat/);
  assert.match(preview, /Sy Chat/);
  assert.match(preview, /\/\(teen\)\/chat\/raylene/);
  assert.match(preview, /\/\(teen\)\/chat\/rylane/);
  assert.doesNotMatch(preview, /Raylene Chat|Rylane Chat/);
});

test('newer Joseema naming survives the companion-name reconciliation', () => {
  const pages = fs.readFileSync(path.join(root, 'app/(teen)/pages/history.tsx'), 'utf8');
  const personalities = fs.readFileSync(path.join(root, 'src/services/ai/personalities.ts'), 'utf8');

  assert.match(pages, /oracle:\s*\{ label: 'Joseema'/);
  assert.match(personalities, /name:\s*'Joseema'/);
  assert.match(personalities, /You are Joseema/);
});

test('the Worker prompt names the canonical companions directly', () => {
  const prompt = fs.readFileSync(path.join(root, 'worker/sekret-reply.ts'), 'utf8');

  assert.match(prompt, /^CHARACTER: Suhana$/m);
  assert.match(prompt, /^CHARACTER: Sy$/m);
  assert.doesNotMatch(prompt, LEGACY_DISPLAY_NAME);
});

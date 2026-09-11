import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('legacy companion IDs migrate to canonical Suhana/Sy IDs', () => {
  const migration = read('src/features/identity/legacyCompanionIdMigration.ts');
  assert.match(migration, /soft:\s*'suhana'/);
  assert.match(migration, /raylene:\s*'suhana'/);
  assert.match(migration, /rylane:\s*'sy'/);
});

test('canonical companion display map stays Suhana and Sy', () => {
  const ids = read('src/features/identity/companionIds.ts');
  assert.match(ids, /suhana:\s*'Suhana'/);
  assert.match(ids, /sy:\s*'Sy'/);
});

test('companion state normalizes display names and preserves legacy persisted IDs', () => {
  const companion = read('src/utils/sekretCompanion.ts');
  assert.match(companion, /soft:\s*'Suhana'/);
  assert.match(companion, /rylane:\s*'Sy'/);
  assert.match(companion, /switch \(normalizeSekretPersonality\(personality\)\)/);
  assert.match(companion, /case 'sy':\s*\n\s*return 'rylane';/);
  assert.match(companion, /personality:\s*canonicalDisplayPersonality\(/);
});

test('founder preview uses canonical names while legacy route IDs remain stable', () => {
  const preview = read('src/constants/founderPreview.ts');
  assert.match(preview, /Suhana Chat/);
  assert.match(preview, /Sy Chat/);
  assert.match(preview, /\/\(teen\)\/chat\/raylene/);
  assert.match(preview, /\/\(teen\)\/chat\/rylane/);
  assert.doesNotMatch(preview, /Raylene Chat|Rylane Chat/);
});

test('worker character prompts use canonical visible names', () => {
  const worker = read('worker/sekret-reply.ts');
  assert.match(worker, /CHARACTER:\s*Suhana/);
  assert.match(worker, /CHARACTER:\s*Sy/);
  assert.doesNotMatch(worker, /CHARACTER:\s*Raylene|CHARACTER:\s*Rylane/);
});

test('known user-visible companion copy does not regress to legacy display names', () => {
  const visibleFiles = [
    'constants/voiceBip.ts',
    'screens/ComfortStreaksScreen.tsx',
    'screens/HistoryScreen.tsx',
    'screens/PeriodCalendarScreen.tsx',
    'src/constants/founderPreview.ts',
    'src/services/ai/personalities.ts',
    'src/services/founderAudit.ts',
  ];

  for (const file of visibleFiles) {
    const source = read(file);
    assert.doesNotMatch(source, /['"`]([^'"`\n]*\b(?:Raylene|Rylane)\b[^'"`\n]*)['"`]/, file);
  }
});

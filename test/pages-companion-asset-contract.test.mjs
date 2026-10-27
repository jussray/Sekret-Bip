import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pages = readFileSync('app/(teen)/pages/index.tsx', 'utf8');
const registry = readFileSync('src/constants/companionImages.ts', 'utf8');
const manifest = readFileSync('src/constants/companionManifest.ts', 'utf8');

test('Teen Pages resolves human companion portraits through the canonical registry', () => {
  assert.match(pages, /import \{ getTeenCompanionAsset \} from '@\/utils\/companions';/);
  assert.match(pages, /character = normalizeAvatar\(character\);/);
  assert.match(pages, /getTeenCompanionAsset\('raylene'/);
  assert.match(pages, /getTeenCompanionAsset\('rylane'/);
  assert.match(pages, /getTeenCompanionAsset\('night'/);

  assert.doesNotMatch(
    pages,
    /suhana:\s*\{\s*neutral:\s*IMAGES\.rayleneNeutral/,
    'Pages must not bypass the canonical Suhana asset registry',
  );
  assert.doesNotMatch(
    pages,
    /sy:\s*\{\s*neutral:\s*IMAGES\.rylaneNeutral/,
    'Pages must not bypass the canonical Sy asset registry',
  );
  assert.doesNotMatch(
    pages,
    /night:\s*\{\s*neutral:\s*IMAGES\.nightNeutral/,
    'Pages must not bypass the canonical Night asset registry',
  );
});

test('canonical neutral sprites remain present and production-marked', () => {
  for (const companion of ['raylene', 'rylane', 'night']) {
    assert.match(
      registry,
      new RegExp(`${companion}: \\{[\\s\\S]*neutral: require\\('\\.\\.\\/\\.\\.\\/assets\\/images\\/companions\\/teen\\/${companion}\\/neutral\\.png'\\)`),
      `missing canonical ${companion} neutral registry entry`,
    );
    assert.match(
      manifest,
      new RegExp(`${companion}: buildEntries\\('${companion}', \\{ neutral: 'production' \\}\\)`),
      `canonical ${companion} neutral must remain production-marked`,
    );
  }
});

test('Cloud stays on its existing asset system during the human companion migration', () => {
  assert.match(pages, /const cloud: Record<SekretAvatarState, any> = \{/);
  assert.match(pages, /neutral:\s*IMAGES\.cloudAvatarNeutral/);
  assert.match(pages, /thinking:\s*IMAGES\.cloudAvatarThinking/);
  assert.match(pages, /responding:\s*IMAGES\.cloudAvatarWriting/);
});

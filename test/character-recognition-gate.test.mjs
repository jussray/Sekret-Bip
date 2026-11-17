import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const registry = JSON.parse(read('sekret-bip-character-canon/registry.json'));
const byPair = new Map(registry.sorian_pairs.map(pair => [pair.key, pair]));

test('Sorian pair recognition contracts preserve the approved architecture', () => {
  assert.equal(registry.recognition_contract.principle, 'Pairs rhyme, never clone.');
  assert.deepEqual(registry.recognition_contract.silhouette_review_sizes_px, [128, 64]);

  assert.equal(byPair.get('awareness').original.character_key, 'night');
  assert.equal(byPair.get('awareness').counterpart.key, 'nyra');
  assert.equal(byPair.get('awareness').symbol, 'Crescent Eye');

  assert.equal(byPair.get('belonging').original.character_key, 'suhana');
  assert.equal(byPair.get('belonging').counterpart.key, 'suhan');
  assert.equal(byPair.get('belonging').symbol, 'Open Circle');

  assert.equal(byPair.get('discovery').original.character_key, 'sy');
  assert.equal(byPair.get('discovery').counterpart.key, 'sya');
  assert.equal(byPair.get('discovery').symbol, 'Split Star');
});

test('pending counterparts fail closed instead of fabricating provider authority', () => {
  for (const pair of registry.sorian_pairs) {
    const counterpart = pair.counterpart;
    assert.equal(counterpart.status, 'design-contract-approved-reference-pending');
    assert.equal(counterpart.character_authority_bound, false);
    assert.equal(counterpart.provider_reference_bound, false);
    assert.equal(counterpart.generation_allowed, false);
    assert.equal(counterpart.continuity_cookie_eligible, false);
    assert.equal(Object.hasOwn(counterpart, 'trigger'), false);
    assert.equal(Object.hasOwn(counterpart, 'higgsfield_element_id'), false);
    assert.ok(counterpart.silhouette_contract.length >= 3);
  }
});

test('approved originals keep exact provider-bound authority', () => {
  const characters = new Map(registry.characters.map(character => [character.key, character]));
  for (const pair of registry.sorian_pairs) {
    const original = characters.get(pair.original.character_key);
    assert.ok(original, `missing original ${pair.original.character_key}`);
    assert.equal(original.status, 'approved');
    assert.match(original.trigger, /^@/);
    assert.match(original.higgsfield_element_id, /^[0-9a-f-]{36}$/i);
    assert.equal(pair.original.character_authority_bound, true);
    assert.equal(pair.original.provider_reference_bound, true);
    assert.equal(pair.original.generation_allowed, true);
  }
});

test('machine verifier passes the checked-in canon registry', () => {
  const result = spawnSync(process.execPath, ['scripts/verify-character-canon.mjs'], {
    cwd: new URL('..', import.meta.url),
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /CHARACTER_CANON_VERIFY_PASS/);
  assert.match(result.stdout, /counterparts_generation_blocked=3/);
});

test('short engine cannot promote a design contract into generation authority', () => {
  const engine = read('sekret-bip-short-engine.md');
  assert.match(engine, /design contract alone never satisfies character authority/i);
  assert.match(engine, /generation_allowed != true/);
  assert.match(engine, /provider_reference_bound != true/);
});

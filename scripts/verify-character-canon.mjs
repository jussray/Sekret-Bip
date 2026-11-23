import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const registryPath = path.join(root, 'sekret-bip-character-canon', 'registry.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const failures = [];
const fail = (message) => failures.push(message);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

if (registry.authority !== 'character') fail('registry.authority must remain character');
if (!String(registry.source?.note ?? '').includes('forbidden as character authority')) {
  fail('registry source must explicitly reject world/ensemble images as character authority');
}

const characters = new Map();
for (const character of registry.characters ?? []) {
  if (!character?.key) {
    fail('every provider-bound character requires a key');
    continue;
  }
  if (characters.has(character.key)) fail(`duplicate character key: ${character.key}`);
  characters.set(character.key, character);

  if (character.status === 'approved') {
    if (!String(character.trigger ?? '').startsWith('@')) fail(`${character.key}: approved character requires repository trigger`);
    if (!uuid.test(String(character.higgsfield_element_id ?? ''))) fail(`${character.key}: approved character requires valid provider element id`);
  }
}

const recognition = registry.recognition_contract;
if (!recognition) fail('recognition_contract is required');
if (recognition?.principle !== 'Pairs rhyme, never clone.') fail('recognition principle drifted');
if (recognition?.design_contract_is_character_authority !== false) fail('design contract must never equal character authority');
if (recognition?.world_or_ensemble_art_may_promote_identity !== false) fail('world/ensemble art must never promote identity');

const reviewSizes = recognition?.silhouette_review_sizes_px ?? [];
for (const size of [128, 64]) {
  if (!reviewSizes.includes(size)) fail(`missing required silhouette review size: ${size}px`);
}

const expectedPairs = new Map([
  ['awareness', { original: 'night', counterpart: 'nyra', symbol: 'Crescent Eye' }],
  ['belonging', { original: 'suhana', counterpart: 'suhan', symbol: 'Open Circle' }],
  ['discovery', { original: 'sy', counterpart: 'sya', symbol: 'Split Star' }],
]);

const pairKeys = new Set();
const counterpartKeys = new Set();
for (const pair of registry.sorian_pairs ?? []) {
  if (pairKeys.has(pair.key)) fail(`duplicate Sorian pair key: ${pair.key}`);
  pairKeys.add(pair.key);

  const expected = expectedPairs.get(pair.key);
  if (!expected) {
    fail(`unexpected Sorian pair: ${pair.key}`);
    continue;
  }

  if (pair.symbol !== expected.symbol) fail(`${pair.key}: symbol must remain ${expected.symbol}`);
  if (pair.original?.character_key !== expected.original) fail(`${pair.key}: original must remain ${expected.original}`);

  const original = characters.get(expected.original);
  if (!original || original.status !== 'approved') fail(`${pair.key}: original must resolve to approved character authority`);
  if (pair.original?.character_authority_bound !== true) fail(`${pair.key}: original must stay character-authority bound`);
  if (pair.original?.provider_reference_bound !== true) fail(`${pair.key}: original must stay provider-reference bound`);
  if (pair.original?.generation_allowed !== true) fail(`${pair.key}: approved original must remain generation eligible`);

  const counterpart = pair.counterpart;
  if (counterpart?.key !== expected.counterpart) fail(`${pair.key}: counterpart must remain ${expected.counterpart}`);
  if (counterpartKeys.has(counterpart?.key)) fail(`duplicate counterpart key: ${counterpart?.key}`);
  counterpartKeys.add(counterpart?.key);

  if (counterpart?.status !== 'design-contract-approved-reference-pending') {
    fail(`${pair.key}/${expected.counterpart}: counterpart must remain reference-pending until exact visual authority is bound`);
  }
  if (counterpart?.character_authority_bound !== false) fail(`${expected.counterpart}: pending counterpart cannot claim character authority`);
  if (counterpart?.provider_reference_bound !== false) fail(`${expected.counterpart}: pending counterpart cannot claim provider reference`);
  if (counterpart?.generation_allowed !== false) fail(`${expected.counterpart}: pending counterpart must be generation-blocked`);
  if (counterpart?.continuity_cookie_eligible !== false) fail(`${expected.counterpart}: pending counterpart cannot be continuity-cookie eligible`);
  if ('trigger' in counterpart || 'higgsfield_element_id' in counterpart) {
    fail(`${expected.counterpart}: pending counterpart must not carry a fake trigger or provider element id`);
  }
  if (!Array.isArray(counterpart?.silhouette_contract) || counterpart.silhouette_contract.length < 3) {
    fail(`${expected.counterpart}: counterpart requires explicit silhouette differentiation contract`);
  }
}

for (const key of expectedPairs.keys()) {
  if (!pairKeys.has(key)) fail(`missing required Sorian pair: ${key}`);
}

if ((registry.sorian_pairs ?? []).length !== expectedPairs.size) {
  fail(`expected exactly ${expectedPairs.size} Sorian pair contracts`);
}


const referenceReview = registry.provider_reference_review;
const reviewByCharacter = new Map();
if (referenceReview) {
  if (referenceReview.benchmark_sha256 !== registry.visual_benchmark?.sha256) {
    fail('provider reference review must bind current visual benchmark');
  }
  for (const review of referenceReview.evaluations ?? []) {
    if (reviewByCharacter.has(review.character_key)) fail(`duplicate provider review: ${review.character_key}`);
    reviewByCharacter.set(review.character_key, review);
    const original = characters.get(review.character_key);
    if (!original) fail(`provider review character not registered: ${review.character_key}`);
    if (original && review.higgsfield_element_id !== original.higgsfield_element_id) fail(`provider review element mismatch: ${review.character_key}`);
    if (review.review_status !== 'approved-current-benchmark' && review.generation_allowed !== false) {
      fail(`unapproved provider review must block generation: ${review.character_key}`);
    }
    if (review.generation_allowed === true && (
      review.review_status !== 'approved-current-benchmark' ||
      !review.isolated_reference_sha256 ||
      !review.still_review_sha256
    )) fail(`approved provider review lacks isolated still/identity evidence: ${review.character_key}`);
  }
}

const castFlag = process.argv.find(arg => arg.startsWith('--video-cast='));
if (castFlag) {
  const requested = castFlag.slice('--video-cast='.length).split(',').map(x => x.trim()).filter(Boolean);
  if (requested.length === 0) fail('video cast must have at least one character');
  const pending = new Map((registry.pending_character_authority ?? []).map(character => [character.key, character]));
  for (const key of requested) {
    if (pending.has(key)) {
      fail(`${key}: isolated reference not yet approved; video blocked`);
      continue;
    }
    const character = characters.get(key);
    const review = reviewByCharacter.get(key);
    if (!character || character.status !== 'approved') fail(`${key}: character identity not approved; video blocked`);
    if (!review || review.generation_allowed !== true || review.review_status !== 'approved-current-benchmark') {
      fail(`${key}: exact provider reference not approved for current benchmark; video blocked`);
    }
  }
}

if (failures.length > 0) {
  console.error('CHARACTER_CANON_VERIFY_FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('CHARACTER_CANON_VERIFY_PASS');
console.log(`approved_provider_characters=${characters.size}`);
console.log(`sorian_pairs=${pairKeys.size}`);
console.log(`counterparts_generation_blocked=${counterpartKeys.size}`);
console.log(`silhouette_review_sizes_px=${reviewSizes.join(',')}`);

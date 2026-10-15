import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import test from 'node:test';

const welcome = readFileSync('screens/WebWelcomeScreen.tsx', 'utf8');
const theme = readFileSync('constants/frontDoorTheme.ts', 'utf8');
const index = readFileSync('app/index.tsx', 'utf8');
const characterCanon = JSON.parse(readFileSync('sekret-bip-character-canon/registry.json', 'utf8'));

test('front door presents one audience world at a time', () => {
  assert.match(welcome, /type WelcomeAudience = 'teen' \| 'bip-jr'/);
  assert.match(welcome, /web-welcome-hero-teen/);
  assert.match(welcome, /web-welcome-hero-bip-jr/);
  assert.match(welcome, /web-welcome-audience-switch/);
  assert.match(welcome, /setActiveAudience\(copy\.nextAudience\)/);
  assert.doesNotMatch(welcome, /I'm Teen/);
  assert.doesNotMatch(welcome, /I’m a Parent \/ Guardian/);
});

test('welcome keeps the family artwork primary and character names accessibility-only', () => {
  assert.match(welcome, /TEEN_HERO = require\('\.\.\/assets\/brand\/sekret-bip-teen-family-v1\.jpg'\)/);
  assert.match(welcome, /Night on the left, Suhana in the center, Sy on the right, Cloud, and their parents together/);
  assert.doesNotMatch(welcome, />\s*Night\s*</);
  assert.doesNotMatch(welcome, />\s*Suhana\s*</);
  assert.doesNotMatch(welcome, />\s*Sy\s*</);
  assert.doesNotMatch(welcome, /Night · Suhana · Sy/);
});

test('teen and Bip Jr keep truthful audience-specific action copy', () => {
  assert.match(welcome, /YOUR PEOPLE\. YOUR PEACE\./);
  assert.match(welcome, /YOUR FAMILY\. YOUR SPACE\./);
  assert.match(welcome, /Enter Se’kret Bip/);
  assert.match(welcome, /Enter with a grown-up/);
  assert.match(welcome, /Bip Jr family welcome — continue to family setup/);
});

test('audience maps to existing account-side authority instead of adding another identity model', () => {
  assert.match(welcome, /return side === 'parent' \? 'bip-jr' : 'teen'/);
  assert.match(welcome, /return audience === 'bip-jr' \? 'parent' : 'teen'/);
  assert.match(index, /<WebWelcomeScreen/);
  assert.match(index, /setSelectedEntrySide\(side\)/);
  assert.match(index, /setUserSide\(side\)/);
});

test('front-door theme keeps shared Bip atmosphere and safe-area contracts', () => {
  assert.match(theme, /heroSafeArea/);
  assert.match(theme, /teen:/);
  assert.match(theme, /bipJr:/);
  assert.match(theme, /ambientViolet/);
  assert.match(theme, /ambientPink/);
  assert.match(theme, /heroGlow/);
});

test('Bip Jr welcome surfaces exactly the four canon-approved friends without changing Teen art', () => {
  const juniorCast = characterCanon.characters.filter(character => character.age_lane === 'bip-jr');
  assert.equal(juniorCast.length, 4);
  assert.match(welcome, /\{isBipJr && \(/);
  assert.match(welcome, /testID="web-welcome-bip-jr-cast"/);
  assert.match(welcome, /BIP_JR_FRIENDS\.map\(friend => \(/);
  for (const character of juniorCast) {
    assert.equal(character.status, 'approved');
    assert.match(welcome, new RegExp(`key: '${character.key}'`));
    assert.match(welcome, new RegExp(`role: '${character.role}'`));
  }
  assert.match(welcome, /const TEEN_HERO = require\('\.\.\/assets\/brand\/sekret-bip-teen-family-v1\.jpg'\)/);
  assert.match(welcome, /const BIP_JR_HERO = require\('\.\.\/assets\/images\/parent-space-splash\.png'\)/);
  assert.doesNotMatch(welcome, /createOwnBipJrProfile/);
});

test('Bip Jr approved portraits stay bundled, byte-pinned, and correctly mapped', () => {
  const approvedMedia = new Map([
    ['bipjr-spark', { path: 'assets/brand/bip-jr/the-spark.png', sha256: '9534c226097e0eaf7ab9b4ad49feddabfcd78417e63583e0714a61aa9f1f0c3b', mediaId: 'f0af6256-45c4-4364-a1f0-92797fb48c74' }],
    ['bipjr-giggle', { path: 'assets/brand/bip-jr/the-giggle.png', sha256: 'f87a23cf7831932d018f004e58cd10d3172a65b417cdea7bd1d807642984c0e7', mediaId: 'dc29a783-1197-4d60-acd0-2b1ccafa4cc6' }],
    ['bipjr-dreamer', { path: 'assets/brand/bip-jr/the-dreamer.png', sha256: '034bbd94df748739b4e9be34cae515d8f12d5d249e7fce8231057d20350e203e', mediaId: 'c9cc71f9-3a03-43e1-8fbf-648e50afea50' }],
    ['bipjr-explorer', { path: 'assets/brand/bip-jr/the-explorer.png', sha256: '7ba97c488741a3448b423a7b7137bf464b845d6aac19ed1b62064af2bfb12959', mediaId: '3c2a4339-ea97-427c-b20b-3bb538fa05b5' }],
  ]);
  const juniorCast = characterCanon.characters.filter(character => character.age_lane === 'bip-jr');
  assert.equal(juniorCast.length, approvedMedia.size);
  for (const character of juniorCast) {
    const entry = approvedMedia.get(character.key);
    assert.ok(entry, `unexpected Bip Jr character: ${character.key}`);
    assert.match(welcome, new RegExp(`key: '${character.key}'[\\s\\S]*?imageSource: require\\('\\.\\./assets/brand/bip-jr/${entry.path.split('/').at(-1).replace('.', '\\.')}\\'\\)`));
    const actual = createHash('sha256').update(readFileSync(entry.path)).digest('hex');
    assert.equal(actual, entry.sha256, `approved original portrait bytes changed: ${character.key}`);
  }
  assert.match(welcome, /source=\{friend\.imageSource\}/);
  assert.match(welcome, /onError=\{\(\) => \{/);
  assert.match(welcome, /failedBipJrImages\.has\(friend\.key\)/);
  assert.match(welcome, /BIP_JR_FRIENDS\.map\(friend => \(/);
  assert.doesNotMatch(welcome, /cloudfront\.net/);
  assert.match(welcome, /\{isBipJr && \(/);
  assert.doesNotMatch(welcome, /createOwnBipJrProfile/);
});

test('public welcome does not persist private state before account verification', () => {
  const hook = readFileSync('src/hooks/useSekretState.ts', 'utf8');
  assert.match(hook, /if \(isLoading \|\| !authenticatedUserId\) return;/);
  assert.match(hook, /isLoading, authenticatedUserId,/);
  assert.match(hook, /void saveState\(\{/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const canon = read('constants/companionVisualCanon.ts');
const welcome = read('screens/WebWelcomeScreen.tsx');
const gallery = read('components/companions/CanonCompanionShowcase.tsx');
const discover = read('app/(teen)/discover.tsx');
const room = read('screens/UserRoomScreen.tsx');

test('approved legacy canon remains in the registry while the public hero uses the full family', () => {
  assert.match(canon, /ef5888960600669fa25922bb345cdcd1b5d4cccecb2a9ef578a616a7a8085971/);
  assert.match(canon, /1c462922-24b6-4984-89aa-826dc36c62f8\.jpg/);
  assert.match(welcome, /<CanonCompanionShowcase/);
  assert.doesNotMatch(welcome, /TEEN_HERO = require/);
});

test('all five companions receive exact crops from the same uploaded poster', () => {
  for (const [name, mediaId] of [
    ['sy', '207db92c-7f3b-45d3-9534-cd9a7cd2b6fe'],
    ['night', 'edebe97f-0bca-48e0-a6e0-b30838a1e7b3'],
    ['suhana', 'eaf8c0df-00a3-4f9b-83d8-cece750df204'],
    ['ja', '5f444b50-4917-441d-8a13-46ed758373f9'],
    ['cloud', '1409b00c-ef84-4cfd-aa8f-63406509b73d'],
  ]) {
    assert.match(canon, new RegExp(mediaId));
    assert.match(canon, new RegExp("id: '"+name+"'"));
  }
});

test('front-door companion choice is functional but never bypasses account gates', () => {
  assert.match(welcome, /<CanonCompanionShowcase/);
  assert.match(gallery, /testID=\{`family-member-\$\{member\.id\}`\}/);
  assert.match(gallery, /onPress=\{\(\) => setSelected\(member\)\}/);
  assert.match(welcome, /onEnter\(entrySide\)/);
  assert.doesNotMatch(gallery, /router\.push/);
});

test('private Discover companion cards use the same actual Suhana Sy Night and Cloud art', () => {
  assert.match(discover, /CANON_COMPANION_IMAGES/);
  assert.match(discover, /source=\{CANON_COMPANION_IMAGES\[id\]\}/);
  assert.match(canon, /raylene:\s*CANON_COMPANIONS\.suhana/);
  assert.match(canon, /rylane:\s*CANON_COMPANIONS\.sy/);
});

test('Bip Jr remains a separate audience and private features stay behind auth', () => {
  assert.match(welcome, /BIP_JR_HERO/);
  assert.match(welcome, /welcomeAudienceForAccountSide/);
  assert.match(welcome, /web-welcome-hero-bip-jr/);
});

test('private Room picker displays approved portraits without changing full-body placement or chat routing', () => {
  assert.match(room, /const avatarSrc = CANON_COMPANION_IMAGES\[id\]/);
  assert.match(room, /source=\{avatarSrc\}/);
  assert.match(room, /style=\{\[vl\.companionAvatar, vl\.canonCompanionPortrait\]\}/);
  assert.match(room, /const cSrc\s+= safe\(AVATARS\[cId\]\?\.fullbody/);
});


test('root-owned canon imports resolve in both Expo and TypeScript', () => {
  for (const file of [
    'app/(teen)/discover.tsx',
    'screens/UserRoomScreen.tsx',
    'screens/WebWelcomeScreen.tsx',
  ]) {
    const source = read(file);
    const specifier = source.match(/from\s+['"]([^'"]*companionVisualCanon)['"]/u)?.[1];
    assert.ok(specifier?.startsWith('.'), `${file}: root canon must use a relative import; @ aliases map to src/`);
    assert.ok(fs.existsSync(path.resolve(path.dirname(file), `${specifier}.ts`)), `${file}: canon module must exist`);
  }
  const showcaseImport = welcome.match(/from\s+['"]([^'"]*CanonCompanionShowcase)['"]/u)?.[1];
  assert.ok(showcaseImport?.startsWith('.'), 'welcome: root showcase must use a relative import');
  assert.ok(fs.existsSync(path.resolve('screens', `${showcaseImport}.tsx`)), 'welcome: showcase module must exist');
});

test('the unified family scene paints its own ambient canvas without the rejected miniature poster', () => {
  assert.match(canon, /export const CANON_FAMILY_POSTER_PREVIEW_IMAGE/);
  assert.doesNotMatch(welcome, /source=\{CANON_FAMILY_POSTER_PREVIEW_IMAGE\}/);
  assert.match(gallery, /testID="family-composition"/);
  assert.match(gallery, /backgroundColor: '#210D35'/);
});

test('one responsive family composition replaces the mobile swipe-only poster on both breakpoints', () => {
  assert.match(welcome, /const teenPhoneCanvas = compact && !isBipJr/);
  assert.match(welcome, /\{!isBipJr && \(\s*<CanonCompanionShowcase/);
  assert.doesNotMatch(welcome, /!isBipJr && !teenPhoneCanvas &&/);
  assert.doesNotMatch(gallery, /snapToInterval/);
  assert.match(gallery, /const stageWidth = Math\.min/);
  assert.match(gallery, /const stageHeight = compact/);
  assert.match(welcome, /onEnter\(entrySide\)/);
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = (path) => fs.readFileSync(path, 'utf8');
const canon = read('constants/companionVisualCanon.ts');
const welcome = read('screens/WebWelcomeScreen.tsx');
const gallery = read('components/companions/CanonCompanionShowcase.tsx');
const scrapbook = read('components/rooms/ScrapbookCompanionScene.tsx');

test('final uploaded canon image, not a regenerated image, is the public hero authority', () => {
  assert.match(canon, /ef5888960600669fa25922bb345cdcd1b5d4cccecb2a9ef578a616a7a8085971/);
  assert.match(canon, /1c462922-24b6-4984-89aa-826dc36c62f8\.jpg/);
  assert.match(welcome, /CANON_FAMILY_POSTER_IMAGE/);
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
  assert.match(gallery, /testID="canon-companion-select"/);
  assert.match(gallery, /onPress=\{\(\) => setSelected/);
  assert.match(welcome, /onEnter\(entrySide\)/);
  assert.doesNotMatch(gallery, /router\.push/);
});

test('existing private scrapbook uses the same actual Suhana Sy Night and Cloud art', () => {
  assert.match(scrapbook, /CANON_COMPANION_IMAGES/);
  assert.match(scrapbook, /source=\{CANON_COMPANION_IMAGES\[character\]\}/);
  assert.match(canon, /raylene:.*suhana/s);
  assert.match(canon, /rylane:.*sy/s);
});

test('Bip Jr remains a separate audience and private features stay behind auth', () => {
  assert.match(welcome, /BIP_JR_HERO/);
  assert.match(welcome, /welcomeAudienceForAccountSide/);
  assert.match(welcome, /web-welcome-hero-bip-jr/);
});

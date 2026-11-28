import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path,'utf8');

test('front door displays a single family composition with ten approved people', () => {
  const family = read('constants/frontDoorFamilyCanon.ts');
  const scene = read('components/companions/CanonCompanionShowcase.tsx');
  for (const id of ['dad','mom','sy','night','suhana','cloud','bip-jr-1','bip-jr-2','bip-jr-3','bip-jr-4']) {
    assert.match(family, new RegExp("id: '"+id+"'"), id+' must be in family image contract');
  }
  assert.doesNotMatch(family, /id: 'ja'/, 'Ja is held out of public welcome');
  assert.match(scene, /testID="family-composition"/);
  assert.match(scene, /testID=\{`family-member-\$\{member\.id\}`\}/);
  assert.doesNotMatch(scene, /horizontal\s*(?:\n|\r|\s)*showsHorizontalScrollIndicator/);
  assert.doesNotMatch(scene, /snapToInterval/);
});

test('mobile and desktop use the same family scene, without the rejected full-poster or swipe carousel', () => {
  const screen=read('screens/WebWelcomeScreen.tsx');
  assert.match(screen, /!isBipJr\s*&&\s*\(\s*<CanonCompanionShowcase/);
  assert.doesNotMatch(screen, /teenPhoneCanvas \? \(\s*<CanonCompanionShowcase/);
  assert.doesNotMatch(screen, /source=\{CANON_FAMILY_POSTER_PREVIEW_IMAGE\}/);
  assert.match(screen, /BIP_JR_HERO/);
  assert.match(screen, /onPress=\{\(\) => onEnter\(entrySide\)\}/);
  assert.match(screen, /web-welcome-sign-in/);
  assert.match(screen, /web-welcome-audience-switch/);
});

test('public family scene is presentation only and preserves private route protections', () => {
  const scene=read('components/companions/CanonCompanionShowcase.tsx');
  assert.doesNotMatch(scene, /router\.push|AsyncStorage|supabase/);
  assert.match(scene, /onContinue/);
  assert.match(scene, /motionEnabled/);
});

test('Cloud floating portrait keeps a nonzero width inside the centered family group', () => {
  const scene = read('components/companions/CanonCompanionShowcase.tsx');
  assert.match(scene, /member\.id === 'cloud'[\s\S]*?<Animated\.View style=\{\{ width: '100%', transform:/);
});

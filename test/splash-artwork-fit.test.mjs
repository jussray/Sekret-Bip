import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('splash artwork shows the full image on wide screens', async () => {
  const source = await read('screens/SplashScreen.tsx');
  assert.match(source, /resizeMode="contain"/);
  assert.match(source, /Math\.min\(/);
  assert.match(source, /onLoad=/);
  assert.match(source, /nativeEvent\.source\?\.width/);
  assert.match(source, /nativeEvent\.source\?\.height/);
  assert.doesNotMatch(source, /Image\.resolveAssetSource/);
  assert.match(source, /art\.left \+ art\.width \* btn\.left/);
  assert.match(source, /maxWidth: "100%"/);
  assert.match(source, /maxHeight: "100%"/);
  assert.doesNotMatch(source, /resizeMode="cover"/);
});

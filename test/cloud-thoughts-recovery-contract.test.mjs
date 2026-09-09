import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const read = path => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

const cloud = await read('screens/CloudThoughtsScreen.tsx');
const api = await read('src/utils/api.ts');
const route = await read('app/(teen)/cloud.tsx');

test('Cloud keeps legacy compatibility IDs behind canonical visible names', () => {
  assert.match(cloud, /normalizeSekretCharacter\(selectedSekret\)/);
  assert.match(cloud, /getVisibleSekretName\(characterId\)/);
  assert.doesNotMatch(cloud, /selectedSekret === 'rylane' \? 'Rylane'/);
  assert.doesNotMatch(cloud, /'Raylene';/);

  assert.match(api, /raw === 'suhana' \|\| raw === 'raylene'/);
  assert.match(api, /raw === 'sy' \|\| raw === 'rylane'/);
  assert.match(api, /suhana: 'Suhana'/);
  assert.match(api, /sy: 'Sy'/);
});

test('Cloud reply requests always clear busy state and expose bounded recovery', () => {
  assert.match(cloud, /if \(!text \|\| isThinking\) return/);
  assert.match(cloud, /setRequestError\(null\)/);
  assert.match(cloud, /setIsThinking\(true\)/);
  assert.match(cloud, /try \{/);
  assert.match(cloud, /await fetchSekretReply\(/);
  assert.match(cloud, /catch \{/);
  assert.match(cloud, /Cloud couldn't answer right now\. Try again when you're ready\./);
  assert.match(cloud, /finally \{\s*setIsThinking\(false\);\s*\}/s);
  assert.match(cloud, /onPress=\{\(\) => void sendThought\(lastThought\)\}/);
  assert.match(cloud, /testID="cloud-thought-retry"/);
  assert.doesNotMatch(cloud, /console\.(?:log|warn|error)\([^)]*(?:text|input|lastThought)/s);
});

test('Cloud does not offer duplicate actions while a request is active', () => {
  assert.match(cloud, /const sendDisabled = !input\.trim\(\) \|\| isThinking/);
  assert.match(cloud, /const retryDisabled = !lastThought \|\| isThinking/);
  assert.match(cloud, /disabled=\{sendDisabled\}/);
  assert.match(cloud, /accessibilityState=\{\{ disabled: sendDisabled, busy: isThinking \}\}/);
  assert.match(cloud, /if \(isThinking \|\| key === activeMode\) return/);
  assert.match(cloud, /accessibilityState=\{\{ selected, disabled: isThinking \}\}/);
});

test('Cloud provides explicit input, alert, and retry accessibility semantics', () => {
  assert.match(cloud, /testID="cloud-thought-input"/);
  assert.match(cloud, /accessibilityLabel="Cloud thought"/);
  assert.match(cloud, /accessibilityRole="radiogroup"/);
  assert.match(cloud, /accessibilityRole="radio"/);
  assert.match(cloud, /testID="cloud-thought-error"/);
  assert.match(cloud, /accessibilityRole="alert"/);
  assert.match(cloud, /accessibilityLiveRegion="assertive"/);
  assert.match(cloud, /accessibilityLabel="Retry Cloud reply"/);
});

test('Cloud privacy language describes processing without absolute confidentiality', () => {
  assert.match(cloud, /What you type is processed to create a reply/);
  assert.match(cloud, /Share only details you are comfortable sending to the service/);
  assert.doesNotMatch(cloud, /stays between you and Se'kret/i);
  assert.doesNotMatch(cloud, /Only you can see this|Nothing is shared|No one is reading this/i);
  assert.doesNotMatch(cloud, /safe space|just for you/i);
});

test('Cloud route remains a thin canonical wrapper without local storage or database authority', () => {
  assert.match(route, /import \{ CloudThoughtsScreen \} from '@screens\/CloudThoughtsScreen'/);
  assert.match(route, /<CloudThoughtsScreen/);
  assert.doesNotMatch(route, /AsyncStorage|cloud_thoughts|src\/lib\/supabase/);
});

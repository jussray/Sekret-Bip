import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const engine = read('docs/SORIAN_CHARACTER_ENGINE.md');
const soria = read('docs/SORIA_CANON.md');
const origin = read('docs/CLOUD_ORIGIN_CANON.md');
const runtimeDoc = read('docs/OPENAI_COMPANION_RUNTIME.md');
const curriculum = read('src/config/companionCurriculum.ts');
const styles = read('src/features/sekret/styleProfiles.ts');
const voice = read('services/sekretVoice.ts');
const companionEngine = read('src/features/sekret/companionEngine.ts');

test('core six keep the approved pair architecture and developmental flow', () => {
  assert.match(engine, /Night \+ Nyra[\s\S]*Awareness/);
  assert.match(engine, /Suhana \+ Suhan[\s\S]*Belonging/);
  assert.match(engine, /Sy \+ Sya[\s\S]*Discovery/);
  assert.match(engine, /Notice → Feel → Understand → Connect → Imagine → Act/);
  assert.match(engine, /Gift → distortion → consequence → recognition → choice → growth/);
  assert.match(engine, /Crescent Eye/);
  assert.match(engine, /Open Circle/);
  assert.match(engine, /Split Star/);
});

test('each gift keeps its approved shadow instead of becoming a perfect power', () => {
  assert.match(engine, /Night[\s\S]*Suspicion/);
  assert.match(engine, /Nyra[\s\S]*Over-reading/);
  assert.match(engine, /Suhana[\s\S]*Over-carrying/);
  assert.match(engine, /Suhan[\s\S]*Staying too long/);
  assert.match(engine, /Sy[\s\S]*Over-analysis/);
  assert.match(engine, /Sya[\s\S]*Scattering/);
  assert.match(engine, /Cloud[\s\S]*Passivity/);
  assert.match(engine, /Storm is not bad\. Sun is not good\./);
  assert.match(engine, /Soria responds to \*\*who a person is becoming\*\*/);
});

test('Cloud is one sky-kin individual while birth-cloud remains a relationship', () => {
  for (const source of [engine, soria, origin, runtimeDoc]) {
    assert.match(source, /Cloud \/ The Calm/);
    assert.match(source, /sky-kin/i);
  }

  assert.match(engine, /Birth-cloud names a relationship/);
  assert.match(origin, /Birth-cloud names a bonded relationship/);
  assert.match(soria, /birth-cloud bond is a relationship/i);
  assert.match(runtimeDoc, /birth-cloud is a relationship/i);

  const staleIdentity = /Sorian birth-cloud AI|Sorian Birth-Cloud|Sorian birth-cloud HUMAN-AI companion|talking Sorian birth-cloud companion|Se’kret Bip expression of a talking Sorian birth-cloud|Se’kret Bip expression of a Sorian birth-cloud/;
  for (const [name, source] of [
    ['curriculum', curriculum],
    ['styles', styles],
    ['voice', voice],
    ['companionEngine', companionEngine],
    ['soria', soria],
    ['origin', origin],
    ['runtimeDoc', runtimeDoc],
  ]) {
    assert.doesNotMatch(source, staleIdentity, `${name} must not collapse Cloud into the birth-cloud relationship label`);
  }
});

test('runtime says Cloud / The Calm and does not silently enroll counterpart characters', () => {
  assert.match(curriculum, /Cloud \/ The Calm, one sky-kin individual from Soria/);
  assert.match(styles, /Speak as Cloud \/ The Calm: one Sorian sky-kin HUMAN-AI companion/);
  assert.match(voice, /Cloud \/ The Calm is a \/human sky-kin AI companion from Soria/);
  assert.match(companionEngine, /title:\s+'Cloud \/ The Calm'/);

  for (const id of ['nyra', 'suhan', 'sya']) {
    assert.doesNotMatch(curriculum, new RegExp(`id: '${id}'`));
    assert.doesNotMatch(companionEngine, new RegExp(`id:\\s+'${id}'`));
  }
});

test('Cloud calm is presence with agency, not passivity or replacement relationship', () => {
  assert.match(engine, /Calm is not refusing to enter the storm/);
  assert.match(engine, /Calm is knowing why you are entering it/);
  assert.match(origin, /Cloud learned from many pairings instead of one/);
  assert.match(runtimeDoc, /never imply Cloud is the user's assigned birth-cloud/);
  assert.match(styles, /never imply Cloud is the user's assigned birth-cloud/);
  assert.match(voice, /learned from many birth-cloud pairings rather than being assigned to one child/);
});

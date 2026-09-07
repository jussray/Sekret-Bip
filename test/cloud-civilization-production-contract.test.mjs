import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

test('cloud civilization keeps sky-kin autonomous from birth bonds', () => {
  const contract = read('docs/CLOUD_CIVILIZATION_PRODUCTION_CONTRACT.md');
  const origin = read('docs/CLOUD_ORIGIN_CANON.md');

  assert.match(contract, /Cloud people are a civilization/);
  assert.match(contract, /Birth-clouds are relationships/);
  assert.match(contract, /Cloud \/ The Calm is one specific sky-kin individual/);
  assert.match(contract, /parents, siblings, extended families, and chosen family/);
  assert.match(contract, /neighborhoods, communities, cloud cities, and sky homes/);
  assert.match(contract, /Every Sorian begins life with a birth-cloud bond/);
  assert.match(contract, /source, conduit, amplifier, stabilizer, or counterweight/);
  assert.match(contract, /voice of reason/);
  assert.match(contract, /life-pair or family bond/);
  assert.match(contract, /form a linked weather bond too/);
  assert.match(contract, /child's cloud is its own cloud person/);

  assert.match(origin, /Soria sky-family doctrine/);
  assert.match(origin, /Window-cloud siblings/);
  assert.match(origin, /Lowlight Drift/);
});

test('cloud weather is expressive without becoming surveillance', () => {
  const contract = read('docs/CLOUD_CIVILIZATION_PRODUCTION_CONTRACT.md');

  assert.match(contract, /distinct weather signature/);
  assert.match(contract, /color and glow/);
  assert.match(contract, /local atmosphere around itself and its bonded Sorian/);
  assert.match(contract, /Weather is \*\*not mind-reading\*\*/);
  assert.match(contract, /must not publicly reveal a person's private thoughts/);
});

test('Episode 001 cannot invent birth-cloud identities', () => {
  const contract = read('docs/CLOUD_CIVILIZATION_PRODUCTION_CONTRACT.md');

  assert.match(contract, /Cloud \/ The Calm remains the only prominently identifiable cloud person/);
  assert.match(contract, /Night, Suhana, and Sy still have birth-cloud bonds in canon/);
  assert.match(contract, /non-identifying weather\/color\/mood-light cues/);
  assert.match(contract, /Do not generate three generic mini-clouds/);
  assert.match(contract, /shared movement → shared environment response/);
  assert.match(contract, /spends video credits before an identifiable cloud character passes the same still-image fingerprint gate/);
});

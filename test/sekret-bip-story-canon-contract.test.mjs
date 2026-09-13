import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function readJson(path) {
  return JSON.parse(read(path));
}

test('visual story production keeps character, world, and episode authority separate', () => {
  const world = read('sekret-bip-world-bible.md');
  const engine = read('sekret-bip-short-engine.md');

  assert.match(world, /Character canon = Who exists/);
  assert.match(world, /World canon\s+= Where magic happens/);
  assert.match(world, /Episode canon\s+= What this story means/);
  assert.match(world, /Magic is emotional infrastructure/);
  assert.match(world, /World-authority images must never be used to infer or replace character identity/);
  assert.match(engine, /Character reference: identity only/);
  assert.match(engine, /World reference: world only/);
});

test('canonical character registry binds every approved fingerprint and trigger', () => {
  const registry = readJson('sekret-bip-character-canon/registry.json');
  const byTrigger = new Map(registry.characters.map((character) => [character.trigger, character]));

  const expected = new Map([
    ['@NIGHT_CANON', '25b76824-adb9-4cc6-803f-9d272ed8417b'],
    ['@SUHANA_CANON', 'b504054a-ee65-491e-aa37-0dccc740458c'],
    ['@SY_CANON', 'd0705c8f-4941-47f3-9d00-cb6161f1c9d3'],
    ['@CLOUD_CANON', '45cc0133-5ad3-4182-90a5-4dca0d5b58fa'],
    ['@DAD_GUARDIAN_CANON', 'b7f88401-c66d-4b54-9460-94313b28e886'],
    ['@MOM_HEART_CANON', 'e8d19172-ae3d-41d5-b42f-01666d322b9d'],
    ['@BIPJR_SPARK', '663a9e85-30e8-409d-b408-846f4c73ab46'],
    ['@BIPJR_GIGGLE', '508d8676-c053-4ecd-942f-06030b6142ee'],
    ['@BIPJR_DREAMER', 'cc4bc603-0250-4e99-b8f8-227dab2d93ea'],
    ['@BIPJR_EXPLORER', '5a9dfde6-11a0-4345-8e98-4bfffb743ec8'],
  ]);

  assert.equal(registry.authority, 'character');
  assert.equal(registry.characters.length, expected.size);

  for (const [trigger, elementId] of expected) {
    const character = byTrigger.get(trigger);
    assert.ok(character, `missing canonical trigger ${trigger}`);
    assert.equal(character.status, 'approved');
    assert.equal(character.higgsfield_element_id, elementId);
  }
});

test('short engine fails closed before video and guards paid generation', () => {
  const engine = read('sekret-bip-short-engine.md');

  assert.match(engine, /VIDEO_ALLOWED = false/);
  assert.match(engine, /if still_status != APPROVED:/);
  assert.match(engine, /estimate the requested generation cost/);
  assert.match(engine, /never spend video credits to discover identity or cast errors/);
  assert.match(engine, /review all seven final shot keyframes before animating any of them/);
});

test('Episode 001 preserves the final seven-shot story and exact default cast', () => {
  const episode = read('season-01/01-the-bridge-that-listens.md');

  assert.match(episode, /Episode 001 — The Bridge That Listens/);
  assert.match(episode, /Belonging through cooperation/);
  assert.match(episode, /bridge cannot be activated by one character alone/i);
  assert.match(episode, /Bip Jr\. is \*\*not in the default Episode 001 cast\*\*/);
  assert.match(episode, /Shot 3 world keyframe is reused/);
  assert.match(episode, /Seven approved final shot keyframes exist/);

  for (const shot of ['| 1 |', '| 2 |', '| 3 |', '| 4 |', '| 5 |', '| 6 |', '| 7 |']) {
    assert.ok(episode.includes(shot), `missing ${shot}`);
  }

  for (const trigger of ['@NIGHT_CANON', '@SUHANA_CANON', '@SY_CANON', '@CLOUD_CANON']) {
    assert.ok(episode.includes(trigger), `episode must bind ${trigger}`);
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reviewed = new Map([
  ['85970c17b72faf91a8f14fd9fbb26e8b_0', 'control-room-server.mjs'],
  ['a63c81d4ff80d236fe4d1a920ae9485c_0', 'room-production-foreman.mjs'],
  ['a63c81d4ff80d236fe4d1a920ae9485c_1', 'room-production-foreman.mjs'],
  ['a63c81d4ff80d236fe4d1a920ae9485c_2', 'room-production-foreman.mjs'],
  ['af3644deb9abff7349edcc04af2dff8e_0', 'control-room-server.mjs'],
]);

test('Bearer ignores only the five exact findings reviewed for PR 481', () => {
  const ignored = JSON.parse(fs.readFileSync(path.join(root, 'bearer.ignore'), 'utf8'));
  assert.deepEqual(Object.keys(ignored).sort(), [...reviewed.keys()].sort());
  for (const [fingerprint, file] of reviewed) {
    const entry = ignored[fingerprint];
    assert.equal(entry.false_positive, true);
    assert.ok(entry.comment.includes(file), "missing reviewed source for " + fingerprint);
    assert.ok(entry.comment.length >= 40, "missing threat analysis for " + fingerprint);
    assert.match(entry.ignored_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  }
});

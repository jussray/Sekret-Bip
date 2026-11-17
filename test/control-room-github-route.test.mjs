import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const route = fs.readFileSync('scripts/control-room-github-route.mjs', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('GitHub route is fixed to Se’kret Bip and has explicit status and ensure commands', () => {
  assert.equal(packageJson.scripts['control-room:github-status'], 'node scripts/control-room-github-route.mjs --json');
  assert.equal(packageJson.scripts['control-room:github-route'], 'node scripts/control-room-github-route.mjs --ensure --fetch');
  assert.match(route, /const EXPECTED_REPOSITORY = 'jussray\/Sekret-Bip'/);
  assert.match(route, /CONTROL_ROOM_REPO_DIR/);
  assert.match(route, /gh', \['repo', 'clone'/);
  assert.match(route, /gh', \['api'/);
  assert.match(route, /git', \['-C', targetDir, 'fetch', '--prune', 'origin'\]/);
  assert.match(route, /github-route-latest\.json/);
});

test('GitHub route fails closed and never performs branch-changing or credential-leaking operations', () => {
  assert.match(route, /checkout_target_not_empty/);
  assert.match(route, /repository_origin_mismatch/);
  assert.match(route, /repository_clone_failed/);
  for (const command of ['pull', 'reset', 'checkout', 'switch', 'merge', 'rebase', 'push', '--force']) {
    assert.doesNotMatch(route, new RegExp(`run\\('git', \\[[^\\]]*'${command}'`, 's'));
  }
  assert.doesNotMatch(route, /https:\/\/[^\s'"`]*@github\.com/i);
  assert.match(route, /ghp_\|github_pat_/);
  assert.match(route, /no pull, reset, checkout, merge, rebase, push, or force/);
});

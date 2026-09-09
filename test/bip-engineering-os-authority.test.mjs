import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('GLOBAL_AI subordinates both Bip OS copies to current authority', async () => {
  const global = await read('GLOBAL_AI.md');

  assert.match(global, /Bip Engineering OS proposal status/);
  assert.match(global, /\[`bip-os\.md`\]\(bip-os\.md\)/);
  assert.match(global, /\[`control-room\/bip-os\.md`\]\(control-room\/bip-os\.md\)/);
  assert.match(global, /non-authoritative proposal and checklist references/);
  assert.match(global, /Founder Control Room evidence/);
  assert.match(global, /do not authorize builds, deployment, credentials, paid capacity, publishing, or database application/);
});

test('Parent Bridge remains consented and minimized', async () => {
  const [global, status] = await Promise.all([
    read('GLOBAL_AI.md'),
    read('docs/BIP_ENGINEERING_OS_STATUS.md'),
  ]);

  assert.match(global, /Any statement suggesting parents can see everything a teen sees is invalid/);
  assert.match(status, /Bridge is a consented bridge, not a surveillance window/);
  assert.match(status, /generated summaries must be authorized by an active, unrevoked share/);
  assert.match(status, /Complete parent visibility \| Rejected/);
});

test('fictional monorepo and release YAML are explicitly non-claims', async () => {
  const status = await read('docs/BIP_ENGINEERING_OS_STATUS.md');

  assert.match(status, /not the proposed `apps\/mobile` \/ `packages\/\*` monorepo/);
  assert.match(status, /The YAML blocks in both proposal copies are illustrative sketches only/);
  assert.match(status, /`supabase db push` is safe or authorized/);
  assert.match(status, /Production build\/deploy\/migrate chain \| Prohibited/);
});

test('Control Room location does not elevate proposal authority', async () => {
  const status = await read('docs/BIP_ENGINEERING_OS_STATUS.md');

  assert.match(status, /Placement under `control-room\/` does not convert source material into Founder Control Room evidence/);
  assert.match(status, /Root or Control Room file location \| Does not elevate proposal status/);
});

test('actual repository path map keeps migration and runtime authority explicit', async () => {
  const status = await read('docs/BIP_ENGINEERING_OS_STATUS.md');

  for (const path of [
    '`app/`',
    '`src/`',
    '`context/`',
    '`supabase/migrations/`',
    '`supabase/probes/`',
    '`worker/`',
    '`test/`',
  ]) {
    assert.ok(status.includes(path), `missing current repository path ${path}`);
  }
  assert.doesNotMatch(status, /`contexts\/`/);
  assert.doesNotMatch(status, /`workers\/`/);
  assert.match(status, /Database application must use reviewed ordered migrations and separate live approval/);
});

test('both source copies are preserved rather than deleted', async () => {
  const status = await read('docs/BIP_ENGINEERING_OS_STATUS.md');
  assert.match(status, /preserve both proposal copies as source material/);
  assert.match(status, /do not execute either as instructions/);
});

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pagesPath = new URL('../app/(teen)/pages/index.tsx', import.meta.url);
const servicePath = new URL('../src/services/bridgeSummaryService.ts', import.meta.url);
const pages = await readFile(pagesPath, 'utf8');
const service = await readFile(servicePath, 'utf8');

test('Pages screen shares real journal entries into Bridge, not synthetic ids', () => {
  assert.match(pages, /createBridgeShareRequest/);
  // The source id passed to Bridge must be derived from the entry's own id
  // (the entryId param threaded through handleShareWithParent), never a
  // hardcoded literal, a random value, or a different table's id.
  assert.match(pages, /sourceId:\s*String\(entryId\)/);
  assert.match(pages, /kind:\s*'journal'/);
  assert.doesNotMatch(pages, /sourceId:\s*['"`]/); // no string-literal source id
  assert.doesNotMatch(pages, /sourceId:\s*crypto\.randomUUID/);
  assert.doesNotMatch(pages, /sourceId:\s*Math\.random/);
});

test('journal Bridge share idempotency key is derived from the real entry id', () => {
  // Deterministic per (teen, entry) so retries/double-taps hit the RPC's
  // own unique-constraint upsert instead of minting duplicate share rows.
  assert.match(pages, /idempotencyKey:\s*`journal-\$\{entryId\}`/);
});

test('journal share resolves an actual linked parent before creating a request', () => {
  assert.match(pages, /fetchLinkedParentId/);
  assert.match(pages, /if \(!linkedParentId\)/);
});

test('journal share status lookup is scoped to real per-entry Bridge sources', () => {
  assert.match(service, /fetchBridgeShareStatusesForJournalEntries/);
  assert.match(service, /source_kind.*'journal'|'journal'.*source_kind/s);
  // Status is keyed by parsing the stored source_id back to the entry id —
  // never a fabricated or sequential placeholder.
  assert.match(service, /Number\(row\.source_id\)/);
});

test('freeform Bridge Summary creation stays disabled', async () => {
  const bridgeScreen = await readFile(new URL('../screens/BridgeScreen.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(bridgeScreen, /createBridgeShareRequest/);
});

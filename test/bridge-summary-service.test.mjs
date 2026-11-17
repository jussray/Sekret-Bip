import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const servicePath = new URL('../src/services/bridgeSummaryService.ts', import.meta.url);
const bridgeScreenPath = new URL('../screens/BridgeScreen.tsx', import.meta.url);
const source = await readFile(servicePath, 'utf8');
const bridgeScreen = await readFile(bridgeScreenPath, 'utf8');

test('teen Bridge service remains behind disabled feature flag', () => {
  assert.match(source, /isRelationshipFeatureAvailable\('bridgeSummaries'/);
  assert.match(source, /Bridge Summaries are not available yet/);
});

test('preview clearly states summary-only sharing and revocation', () => {
  assert.match(source, /generated summary, not your full private content/i);
  assert.match(source, /revoke access later/i);
});

test('share creation uses canonical RPC then Worker route', () => {
  assert.match(source, /create_bridge_share_request/);
  assert.match(source, /api\/bridge\/summary\/generate/);
  assert.match(source, /idempotencyKey/);
});

test('share creation surfaces missing Worker configuration instead of silent success', () => {
  assert.match(source, /!BASE_URL/);
  assert.match(source, /ai_unavailable/);
  assert.match(source, /EXPO_PUBLIC_BACKEND_URL/);
});

test('revoke uses canonical RPC', () => {
  assert.match(source, /revoke_bridge_share_request/);
  assert.match(source, /p_request_id/);
});

test('history reads summary tables rather than raw legacy Bridge payloads', () => {
  assert.match(source, /bridge_share_requests/);
  assert.match(source, /bridge_summaries/);
  assert.doesNotMatch(source, /bridge_shares/);
  assert.doesNotMatch(source, /journal_entries/);
  assert.doesNotMatch(source, /mood_history/);
});


test('freeform Bridge signals route summary setup to Pages without fabricating source IDs', () => {
  assert.doesNotMatch(bridgeScreen, /sourceId:\s*`bridge-/);
  assert.doesNotMatch(bridgeScreen, /createBridgeShareRequest/);
  assert.match(bridgeScreen, /setScreen\('pages'\)/);
  assert.match(bridgeScreen, /choose something in Pages/);
});

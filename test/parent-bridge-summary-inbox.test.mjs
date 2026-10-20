import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const servicePath = new URL('../src/services/parentBridgeSummaryService.ts', import.meta.url);
const componentPath = new URL('../src/features/bridge/ParentBridgeSummaryInbox.tsx', import.meta.url);

const serviceSource = await readFile(servicePath, 'utf8');
const componentSource = await readFile(componentPath, 'utf8');

test('parent summary inbox remains behind Bridge feature flag', () => {
  assert.match(serviceSource, /isRelationshipFeatureAvailable\('bridgeSummaries'/);
  assert.match(serviceSource, /Bridge Summaries are not available yet/);
});

test('parent inbox reads only summary tables', () => {
  assert.match(serviceSource, /bridge_share_requests/);
  assert.match(serviceSource, /bridge_summaries/);
  assert.match(serviceSource, /bridge_summary_views/);
  assert.doesNotMatch(serviceSource, /bridge_shares/);
  assert.doesNotMatch(serviceSource, /journal_entries/);
  assert.doesNotMatch(serviceSource, /mood_history/);
});

test('view state uses parent-owned summary view records', () => {
  assert.match(serviceSource, /bridge_summary_views/);
  assert.match(serviceSource, /\.insert\(\{ summary_id: summaryId, parent_user_id: parentUserId \}\)/);
  assert.doesNotMatch(serviceSource, /bridge_share_requests'[\s\S]*\.update\(/);
});

test('parent component separates themes, starters, and limitations', () => {
  assert.match(componentSource, /Themes noticed/);
  assert.match(componentSource, /Conversation starters/);
  assert.match(componentSource, /summary\.limitations/);
  assert.match(componentSource, /Only summaries your teen deliberately shares/);
});

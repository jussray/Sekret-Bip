import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const indexPath = new URL('../worker/index.ts', import.meta.url);
const observedPath = new URL('../worker/observed-index.ts', import.meta.url);
const handlerPath = new URL('../worker/bridge-summary.ts', import.meta.url);
const storePath = new URL('../worker/bridge-summary-store.ts', import.meta.url);
const parentInboxPath = new URL('../src/features/bridge/ParentBridgeSummaryInbox.tsx', import.meta.url);
const parentServicePath = new URL('../src/services/parentBridgeSummaryService.ts', import.meta.url);

const indexSource = await readFile(indexPath, 'utf8');
const observedSource = await readFile(observedPath, 'utf8');
const handlerSource = await readFile(handlerPath, 'utf8');
const storeSource = await readFile(storePath, 'utf8');
const parentInboxSource = await readFile(parentInboxPath, 'utf8');
const parentServiceSource = await readFile(parentServicePath, 'utf8');

test('Worker exposes Bridge summary generation route behind API auth', () => {
  assert.match(indexSource, /api\/bridge\/summary\/generate/);
  assert.match(indexSource, /authenticate\(request, env\)/);
  assert.match(indexSource, /handleBridgeSummaryGenerate\(request, env, principal, cors\)/);
});

test('production Worker wrapper classifies Bridge summary telemetry', () => {
  assert.match(observedSource, /api\/bridge\/summary\/generate/);
  assert.match(observedSource, /bridge_summary_success/);
  assert.match(observedSource, /bridge_summary_fallback/);
});

test('Bridge summary route requires a user principal', () => {
  assert.match(handlerSource, /principal\.kind !== 'user'/);
  assert.match(handlerSource, /user_jwt_required/);
});

test('Bridge summary generation is scoped to the authenticated teen owner', () => {
  assert.match(storeSource, /teen_user_id=eq\.\$\{encodeURIComponent\(userId\)\}/);
  assert.match(handlerSource, /store\.fetchOwnedRequest\(requestId, userId\)/);
  assert.match(handlerSource, /request not found/);
  assert.match(handlerSource, /store\.patchRequestStatus\(requestId, userId/);
});

test('revoked and expired requests cannot generate summaries', () => {
  assert.match(handlerSource, /row\.revoked_at/);
  assert.match(handlerSource, /revoked', 'expired', 'deleted/);
  assert.match(handlerSource, /status: 'revoked'/);
});

test('Bridge summaries default to a server-side disabled rollout', () => {
  assert.match(handlerSource, /unset or 'disabled' -> fail closed/);
  assert.match(handlerSource, /bridge_summaries_disabled/);
});

test('Bridge summary persistence stores only generated summary fields', () => {
  assert.match(storeSource, /themes: summary\.themes/);
  assert.match(storeSource, /conversation_starters: summary\.conversationStarters/);
  assert.match(storeSource, /limitations: summary\.limitations/);
  assert.doesNotMatch(storeSource, /source_text/);
  assert.doesNotMatch(storeSource, /raw_source/);
});

test('Bridge summary generation reads source content only as ephemeral LLM input, never writes it back', () => {
  assert.match(storeSource, /journal_entries\?user_id=eq/);
  assert.match(storeSource, /mood_history\?user_id=eq/);
  assert.match(handlerSource, /Teen-selected private content to summarize for a parent/);

  const persistenceBody = storeSource.slice(
    storeSource.indexOf('async function upsertSummary'),
    storeSource.indexOf('async function fetchShareSources'),
  );
  assert.doesNotMatch(persistenceBody, /snippets|row\.text|source_text|raw_source/);
});

test('missing and partial sources fail explicitly instead of producing a ready fallback', () => {
  assert.match(handlerSource, /failureCode: 'no_sources'/);
  assert.match(handlerSource, /failureCode: 'source_not_available'/);
  assert.match(storeSource, /throw new Error\('source_not_available'\)/);
  assert.match(storeSource, /A partial result is/);
});

test('Bridge provider calls are time bounded and do not persist raw exception text', () => {
  assert.match(handlerSource, /BRIDGE_OPENAI_REQUEST_TIMEOUT_MS = 12_000/);
  assert.match(handlerSource, /signal: AbortSignal\.timeout\(BRIDGE_OPENAI_REQUEST_TIMEOUT_MS\)/);
  assert.match(handlerSource, /patchRequestStatus\(requestId, userId, 'failed', 'server_error'\)/);
  assert.doesNotMatch(handlerSource, /patchRequestStatus\(requestId, userId, 'failed', message\.slice/);
  assert.doesNotMatch(handlerSource, /patchRequestStatus\(requestId, userId, 'failed', failure\.slice/);
});

test('Bridge fallback provenance is persisted and visible to the parent audience', () => {
  assert.match(handlerSource, /No provider model output was accepted; Se’kret used its conservative built-in fallback\./);
  assert.match(handlerSource, /usedFallback: true/);
  assert.match(parentInboxSource, /item\.usedFallback/);
  assert.match(parentInboxSource, /CONSERVATIVE FALLBACK/);
  assert.match(parentInboxSource, /No provider model output was accepted for this summary/);
});

test('Parent Bridge inbox never forwards raw Supabase error strings into UI messages', () => {
  assert.doesNotMatch(parentServiceSource, /message:\s*requestError\.message/);
  assert.doesNotMatch(parentServiceSource, /message:\s*summaryError\.message/);
  assert.doesNotMatch(parentServiceSource, /message:\s*viewError\.message/);
  assert.doesNotMatch(parentServiceSource, /message:\s*existingError\.message/);
  assert.match(parentServiceSource, /Bridge Summaries could not complete that action\./);
});

test('Bridge summary route does not expose notification or email delivery behavior', () => {
  assert.doesNotMatch(handlerSource + storeSource, /send email/i);
  assert.doesNotMatch(handlerSource + storeSource, /push notification/i);
  assert.doesNotMatch(handlerSource + storeSource, /notification_deliveries/i);
});

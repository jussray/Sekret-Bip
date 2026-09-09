import assert from 'node:assert/strict';
import test from 'node:test';

// This module has no imports, so Node's native TypeScript stripping exercises
// the actual Worker data-access behavior with an injected fetch mock.
const { createBridgeSummaryStore } = await import('../worker/bridge-summary-store.ts');

const ENV = {
  SUPABASE_URL: 'https://project.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function asUrl(input) {
  return typeof input === 'string' ? input : input.toString();
}

test('fetchOwnedRequest scopes the lookup to request and authenticated teen', async () => {
  const calls = [];
  const store = createBridgeSummaryStore(ENV, async (input, init) => {
    calls.push({ url: asUrl(input), init });
    return jsonResponse([{
      id: 'request-1',
      teen_user_id: 'teen-1',
      status: 'pending',
      revoked_at: null,
      expires_at: null,
    }]);
  });

  const row = await store.fetchOwnedRequest('request-1', 'teen-1');
  assert.equal(row.id, 'request-1');
  assert.match(calls[0].url, /bridge_share_requests\?id=eq\.request-1&teen_user_id=eq\.teen-1/);
  assert.equal(calls[0].init.headers.apikey, ENV.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${ENV.SUPABASE_SERVICE_ROLE_KEY}`);
});

test('patchRequestStatus remains owner-scoped and records explicit failure codes', async () => {
  let captured;
  const store = createBridgeSummaryStore(ENV, async (input, init) => {
    captured = { url: asUrl(input), init };
    return new Response(null, { status: 204 });
  });

  await store.patchRequestStatus('request-1', 'teen-1', 'failed', 'no_sources');
  assert.match(captured.url, /id=eq\.request-1&teen_user_id=eq\.teen-1/);
  assert.equal(captured.init.method, 'PATCH');
  assert.equal(captured.init.headers.Prefer, 'return=minimal');
  const body = JSON.parse(captured.init.body);
  assert.equal(body.status, 'failed');
  assert.equal(body.failure_code, 'no_sources');
  assert.equal(typeof body.updated_at, 'string');
});

test('upsertSummary stores generated fields but never raw source content', async () => {
  let captured;
  const store = createBridgeSummaryStore(ENV, async (input, init) => {
    captured = { url: asUrl(input), init };
    return new Response(null, { status: 201 });
  });

  await store.upsertSummary('request-1', {
    themes: ['feeling unheard'],
    conversationStarters: ['Want to tell me what support would help?'],
    limitations: 'Generated context, not private content or proof.',
    promptVersion: 'bridge-summary-v3',
    model: 'gpt-test',
    usedFallback: false,
  });

  assert.match(captured.url, /bridge_summaries\?on_conflict=request_id/);
  const body = JSON.parse(captured.init.body);
  assert.deepEqual(body.themes, ['feeling unheard']);
  assert.deepEqual(body.conversation_starters, ['Want to tell me what support would help?']);
  assert.equal(body.prompt_version, 'bridge-summary-v3');
  assert.equal(body.used_fallback, false);
  assert.equal('source_text' in body, false);
  assert.equal('snippets' in body, false);
});

test('fetchSourceContent resolves every selected journal and mood source for the teen', async () => {
  const calls = [];
  const store = createBridgeSummaryStore(ENV, async (input, init) => {
    const url = asUrl(input);
    calls.push({ url, init });
    if (url.includes('/journal_entries?')) {
      return jsonResponse([
        { id: 'journal-1', text: 'School felt loud today.', mood: 'overwhelmed' },
        { id: 'journal-2', text: 'I felt better after music.', mood: 'calm' },
      ]);
    }
    if (url.includes('/mood_history?')) {
      return jsonResponse([{ id: 'mood-1', mood: 'tired', date: '2026-07-12' }]);
    }
    throw new Error(`unexpected fetch ${url}`);
  });

  const snippets = await store.fetchSourceContent('teen-1', [
    { source_kind: 'journal', source_id: 'journal-1' },
    { source_kind: 'journal', source_id: 'journal-2' },
    { source_kind: 'mood', source_id: 'mood-1' },
  ]);

  assert.equal(snippets.length, 3);
  assert.match(snippets[0], /School felt loud today/);
  assert.match(snippets[2], /felt tired/);
  assert.equal(calls.every((call) => call.url.includes('user_id=eq.teen-1')), true);
  assert.match(calls[0].url, /select=id,text,mood/);
  assert.match(calls[1].url, /select=id,mood,date/);
});

test('fetchSourceContent fails closed when any selected source is missing', async () => {
  const store = createBridgeSummaryStore(ENV, async () => jsonResponse([
    { id: 'journal-1', text: 'Only one row resolved.', mood: 'quiet' },
  ]));

  await assert.rejects(
    store.fetchSourceContent('teen-1', [
      { source_kind: 'journal', source_id: 'journal-1' },
      { source_kind: 'journal', source_id: 'journal-2' },
    ]),
    /source_not_available/,
  );
});

test('fetchSourceContent rejects unsupported source kinds without making a fetch', async () => {
  let callCount = 0;
  const store = createBridgeSummaryStore(ENV, async () => {
    callCount += 1;
    return jsonResponse([]);
  });

  await assert.rejects(
    store.fetchSourceContent('teen-1', [{ source_kind: 'goal', source_id: 'goal-1' }]),
    /source_not_available/,
  );
  assert.equal(callCount, 0);
});

test('fetchSourceContent reports upstream Supabase lookup failures separately', async () => {
  const store = createBridgeSummaryStore(ENV, async () => jsonResponse({ error: 'unavailable' }, 503));
  await assert.rejects(
    store.fetchSourceContent('teen-1', [{ source_kind: 'journal', source_id: 'journal-1' }]),
    /source_lookup_failed/,
  );
});

test('store fails before any network call when Supabase is not configured', async () => {
  let called = false;
  const store = createBridgeSummaryStore({}, async () => {
    called = true;
    return jsonResponse([]);
  });

  await assert.rejects(store.fetchShareSources('request-1'), /supabase_not_configured/);
  assert.equal(called, false);
});

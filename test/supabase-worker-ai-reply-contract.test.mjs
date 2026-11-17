import assert from 'node:assert/strict';
import test from 'node:test';

/**
 * Supabase → Cloudflare Worker → AI reply contract test.
 *
 * Required env vars for the live contract path:
 * - SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL: Supabase project URL.
 * - SUPABASE_SERVICE_ROLE_KEY: server-only key used by this test process to
 *   create/read/delete a non-teen fixture row in public.app_events.
 * - EXPO_PUBLIC_BACKEND_URL or AI_REPLY_CONTRACT_WORKER_URL: Worker base URL.
 * - EXPO_PUBLIC_BACKEND_TOKEN or AI_REPLY_CONTRACT_WORKER_TOKEN: bearer token
 *   matching the Worker's SEKRET_CLIENT_TOKEN when the Worker enforces auth.
 * - AI_REPLY_CONTRACT_WORKER_MODE: must be one of:
 *   - fallback: caller asserts the target Worker has no OPENAI_API_KEY and will
 *     serve the built-in fallback reply path; the test rejects openai replies.
 *   - fixture: caller asserts the target Worker is configured for a no-cost
 *     fixture/mocked AI reply mode; the test rejects openai replies.
 *   - paid: explicitly permits a paid AI-backed Worker reply.
 *
 * Missing env vars skip the test clearly. Paid AI is never called by default:
 * the Worker request is skipped unless AI_REPLY_CONTRACT_WORKER_MODE is set.
 */

const SAFE_EVENT_TYPE = 'control_room_contract_ai_reply_fixture';
const SAFE_MESSAGE = 'contract fixture: hello from a no-teen-data smoke test';

function env(name) {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function missingEnv() {
  const supabaseUrl = env('SUPABASE_URL') || env('EXPO_PUBLIC_SUPABASE_URL');
  const supabaseKey = env('SUPABASE_SERVICE_ROLE_KEY');
  const workerUrl = env('AI_REPLY_CONTRACT_WORKER_URL') || env('EXPO_PUBLIC_BACKEND_URL');
  const workerToken = env('AI_REPLY_CONTRACT_WORKER_TOKEN') || env('EXPO_PUBLIC_BACKEND_TOKEN');
  const workerMode = env('AI_REPLY_CONTRACT_WORKER_MODE');

  const missing = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL');
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!workerUrl) missing.push('AI_REPLY_CONTRACT_WORKER_URL or EXPO_PUBLIC_BACKEND_URL');
  if (!workerToken) missing.push('AI_REPLY_CONTRACT_WORKER_TOKEN or EXPO_PUBLIC_BACKEND_TOKEN');
  if (!workerMode) missing.push('AI_REPLY_CONTRACT_WORKER_MODE=fallback|fixture|paid');
  if (workerMode && !['fallback', 'fixture', 'paid'].includes(workerMode)) {
    missing.push('AI_REPLY_CONTRACT_WORKER_MODE must be fallback, fixture, or paid');
  }

  return { supabaseUrl, supabaseKey, workerUrl, workerToken, workerMode, missing };
}

async function supabaseRequest(baseUrl, serviceRoleKey, pathname, init = {}) {
  const response = await fetch(`${baseUrl.replace(/\/$/, '')}${pathname}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...init.headers,
    },
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(`Supabase ${init.method || 'GET'} ${pathname} failed with ${response.status}: ${text}`);
  }

  return { response, data };
}

function assertReplyShape(data, workerMode) {
  assert.equal(typeof data, 'object');
  assert.notEqual(data, null);
  assert.equal(typeof data.reply, 'string');
  assert.ok(data.reply.trim().length > 0, 'reply must be non-empty');
  assert.equal(typeof data.tone, 'string');
  assert.equal(typeof data.safetyFlag, 'boolean');
  assert.ok('parentShareSummary' in data, 'parentShareSummary key must exist');
  assert.ok('suggestedComfortTool' in data, 'suggestedComfortTool key must exist');
  assert.ok(['fallback', 'openai'].includes(data.replySource), 'replySource must be fallback or openai');

  if (workerMode === 'fallback' || workerMode === 'fixture') {
    assert.equal(
      data.replySource,
      'fallback',
      `AI_REPLY_CONTRACT_WORKER_MODE=${workerMode} must not return a paid openai reply`,
    );
  }
}

test('Supabase fixture write/read boundary reaches Worker reply-shaped response', async (t) => {
  const config = missingEnv();
  if (config.missing.length > 0) {
    t.skip(`contract test skipped; missing env: ${config.missing.join(', ')}`);
    return;
  }

  const correlationId = `contract-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const fixture = {
    user_id: null,
    event_type: SAFE_EVENT_TYPE,
    metadata: {
      source: 'control_room_contract_test',
      correlationId,
      containsTeenData: false,
      workerMode: config.workerMode,
    },
  };

  let insertedId = null;
  try {
    const insert = await supabaseRequest(config.supabaseUrl, config.supabaseKey, '/rest/v1/app_events?select=id,event_type,metadata,created_at', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify(fixture),
    });

    assert.equal(Array.isArray(insert.data), true, 'Supabase insert must return an array');
    assert.equal(insert.data.length, 1, 'Supabase insert must return one fixture row');
    insertedId = insert.data[0].id;
    assert.ok(insertedId, 'fixture row must have an id');
    assert.equal(insert.data[0].event_type, SAFE_EVENT_TYPE);
    assert.equal(insert.data[0].metadata.correlationId, correlationId);

    const read = await supabaseRequest(
      config.supabaseUrl,
      config.supabaseKey,
      `/rest/v1/app_events?id=eq.${encodeURIComponent(insertedId)}&select=id,event_type,metadata`,
    );
    assert.equal(read.data.length, 1, 'Supabase read must find the fixture row');
    assert.equal(read.data[0].metadata.containsTeenData, false);

    const workerResponse = await fetch(`${config.workerUrl.replace(/\/$/, '')}/api/sekret/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.workerToken}`,
        'X-Control-Room-Contract-Test': correlationId,
      },
      body: JSON.stringify({
        characterId: 'raylene',
        surface: 'journal',
        userText: SAFE_MESSAGE,
        mood: 'neutral',
        memory: {
          source: 'control_room_contract_test',
          supabaseBoundaryEventId: insertedId,
          containsTeenData: false,
        },
        parentSharingEnabled: false,
      }),
    });

    const workerText = await workerResponse.text();
    let workerData = null;
    assert.equal(workerResponse.ok, true, `Worker reply request failed with ${workerResponse.status}: ${workerText}`);
    assert.doesNotMatch(workerText, /SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|sk-/, 'Worker response must not leak secrets');
    assert.doesNotMatch(workerText, /contract fixture: hello from a no-teen-data smoke test/i, 'Worker response should not echo full fixture text');
    assert.doesNotThrow(() => { workerData = JSON.parse(workerText); }, 'Worker response must be JSON');
    assertReplyShape(workerData, config.workerMode);

    const update = await supabaseRequest(
      config.supabaseUrl,
      config.supabaseKey,
      `/rest/v1/app_events?id=eq.${encodeURIComponent(insertedId)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          metadata: {
            ...fixture.metadata,
            workerStatus: workerResponse.status,
            replySource: workerData.replySource,
            replyShapeValid: true,
          },
        }),
      },
    );
    assert.equal(update.data[0].metadata.replyShapeValid, true, 'Supabase write-back must record reply-shape result');
  } finally {
    if (insertedId) {
      await supabaseRequest(
        config.supabaseUrl,
        config.supabaseKey,
        `/rest/v1/app_events?id=eq.${encodeURIComponent(insertedId)}`,
        { method: 'DELETE' },
      );
    }
  }
});

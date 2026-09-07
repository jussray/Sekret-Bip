import assert from 'node:assert/strict';
import test from 'node:test';

const { handleBridgeFamilyVisitSummaryGenerate, isBridgeFamilyVisitsRolloutAllowed } = await import('../worker/bridge-family-visit.ts');

const CORS = { 'Access-Control-Allow-Origin': 'https://sekretbip.net' };
const PRINCIPAL = { kind: 'user', userId: 'pro-user' };
const ENV = {
  SUPABASE_URL: 'https://project.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-key',
  BRIDGE_FAMILY_VISITS_ROLLOUT: 'enabled',
};

function request(sessionId = 'session-1') {
  return new Request('https://api.sekretbip.net/api/bridge/summary/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId }),
  });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function installSupabaseMock(overrides = {}) {
  const writes = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';

    if (url.includes('/bridge_family_visit_sessions?') && method === 'GET') {
      return jsonResponse([overrides.session ?? {
        id: 'session-1',
        assignment_id: 'assignment-1',
        state: 'reflection',
        capture_mode: 'none',
        teen_acknowledged_at: '2026-09-07T20:00:00Z',
        parent_acknowledged_at: '2026-09-07T20:01:00Z',
        professional_acknowledged_at: '2026-09-07T20:02:00Z',
      }]);
    }
    if (url.includes('/bridge_case_assignments?') && method === 'GET') {
      return jsonResponse([overrides.assignment ?? {
        id: 'assignment-1',
        teen_user_id: 'teen-user',
        parent_user_id: 'parent-user',
        professional_user_id: 'pro-user',
        status: 'active',
        expires_at: null,
      }]);
    }
    if (url.includes('/bridge_professional_profiles?') && method === 'GET') {
      return jsonResponse([overrides.professional ?? {
        user_id: 'pro-user',
        verification_status: 'verified',
      }]);
    }
    if (url.includes('/bridge_family_visit_markers?') && method === 'GET') {
      return jsonResponse(overrides.markers ?? [
        { actor_role: 'teen', marker_key: 'needed_pause', created_at: '2026-09-07T20:05:00Z' },
      ]);
    }
    if (url.includes('/bridge_family_visit_reflections?') && method === 'GET') {
      return jsonResponse(overrides.reflections ?? [
        {
          actor_role: 'teen',
          felt_heard: 'somewhat',
          felt_comfortable: 'somewhat',
          could_pause: 'yes',
          connection_after: 'same',
          next_support: 'listen',
          review_signal: null,
          submitted_at: '2026-09-07T20:20:00Z',
        },
        {
          actor_role: 'professional',
          felt_heard: null,
          felt_comfortable: null,
          could_pause: null,
          connection_after: null,
          next_support: null,
          review_signal: 'mixed',
          submitted_at: '2026-09-07T20:21:00Z',
        },
      ]);
    }
    if (url.includes('/bridge_family_visit_summaries?') && method === 'POST') {
      const body = JSON.parse(String(init.body ?? '{}'));
      writes.push({ kind: 'summary', body });
      return new Response(null, { status: 201 });
    }
    if (url.includes('/bridge_family_visit_sessions?') && method === 'PATCH') {
      writes.push({ kind: 'session', body: JSON.parse(String(init.body ?? '{}')) });
      return jsonResponse([{ id: 'session-1' }]);
    }

    throw new Error(`unexpected fetch: ${method} ${url}`);
  };

  return {
    writes,
    restore() { globalThis.fetch = original; },
  };
}

test('family visit rollout fails closed unless enabled or allowlisted', () => {
  assert.equal(isBridgeFamilyVisitsRolloutAllowed({}, 'pro-user'), false);
  assert.equal(isBridgeFamilyVisitsRolloutAllowed({ BRIDGE_FAMILY_VISITS_ROLLOUT: 'disabled' }, 'pro-user'), false);
  assert.equal(isBridgeFamilyVisitsRolloutAllowed({ BRIDGE_FAMILY_VISITS_ROLLOUT: 'enabled' }, 'pro-user'), true);
  assert.equal(isBridgeFamilyVisitsRolloutAllowed({ BRIDGE_FAMILY_VISITS_ROLLOUT: 'other,pro-user' }, 'pro-user'), true);
  assert.equal(isBridgeFamilyVisitsRolloutAllowed({ BRIDGE_FAMILY_VISITS_ROLLOUT: 'other' }, 'pro-user'), false);
});

test('authorized professional generation stores separate audience rows but returns no summary content', async () => {
  const mock = installSupabaseMock();
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ready');
    assert.deepEqual(body.summariesGenerated, ['parent', 'professional']);
    assert.equal(body.usedFallback, true); // no OPENAI_API_KEY in this deterministic test
    assert.equal('summary' in body, false);
    assert.equal('parent' in body, false);
    assert.equal('professional' in body, false);

    const summaryWrites = mock.writes.filter((write) => write.kind === 'summary');
    assert.equal(summaryWrites.length, 2);
    assert.deepEqual(summaryWrites.map((write) => write.body.audience).sort(), ['parent', 'professional']);
    assert.equal(summaryWrites.find((write) => write.body.audience === 'parent').body.content.disposition, undefined);
    assert.equal(summaryWrites.find((write) => write.body.audience === 'professional').body.content.disposition, 'insufficient_evidence');

    const sessionWrites = mock.writes.filter((write) => write.kind === 'session');
    assert.equal(sessionWrites.length, 1);
    assert.equal(sessionWrites[0].body.state, 'ready');
  } finally {
    mock.restore();
  }
});

test('generation blocks before data sharing when one visible acknowledgement is missing', async () => {
  const mock = installSupabaseMock({
    session: {
      id: 'session-1',
      assignment_id: 'assignment-1',
      state: 'reflection',
      capture_mode: 'none',
      teen_acknowledged_at: '2026-09-07T20:00:00Z',
      parent_acknowledged_at: null,
      professional_acknowledged_at: '2026-09-07T20:02:00Z',
    },
  });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.failureCode, 'participant_acknowledgement_required');
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation blocks any capture-mode drift away from none', async () => {
  const mock = installSupabaseMock({
    session: {
      id: 'session-1',
      assignment_id: 'assignment-1',
      state: 'reflection',
      capture_mode: 'audio',
      teen_acknowledged_at: '2026-09-07T20:00:00Z',
      parent_acknowledged_at: '2026-09-07T20:01:00Z',
      professional_acknowledged_at: '2026-09-07T20:02:00Z',
    },
  });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();
    assert.equal(response.status, 409);
    assert.equal(body.failureCode, 'capture_mode_invalid');
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation blocks a different professional even with a valid user JWT', async () => {
  const mock = installSupabaseMock();
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, { kind: 'user', userId: 'other-pro' }, CORS);
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.failureCode, 'professional_assignment_required');
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation blocks when professional verification is suspended', async () => {
  const mock = installSupabaseMock({
    professional: { user_id: 'pro-user', verification_status: 'suspended' },
  });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();
    assert.equal(response.status, 403);
    assert.equal(body.failureCode, 'professional_verification_required');
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation blocks stale assignment and wrong session state', async () => {
  const expired = installSupabaseMock({
    assignment: {
      id: 'assignment-1',
      teen_user_id: 'teen-user',
      parent_user_id: 'parent-user',
      professional_user_id: 'pro-user',
      status: 'revoked',
      expires_at: null,
    },
  });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).failureCode, 'assignment_not_current');
  } finally {
    expired.restore();
  }

  const active = installSupabaseMock({
    session: {
      id: 'session-1',
      assignment_id: 'assignment-1',
      state: 'active',
      capture_mode: 'none',
      teen_acknowledged_at: '2026-09-07T20:00:00Z',
      parent_acknowledged_at: '2026-09-07T20:01:00Z',
      professional_acknowledged_at: '2026-09-07T20:02:00Z',
    },
  });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).failureCode, 'reflection_state_required');
  } finally {
    active.restore();
  }
});

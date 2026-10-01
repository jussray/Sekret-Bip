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

const DEFAULT_SESSION = {
  id: 'session-1',
  assignment_id: 'assignment-1',
  state: 'reflection',
  capture_mode: 'none',
  teen_acknowledged_at: '2026-09-07T20:00:00Z',
  parent_acknowledged_at: '2026-09-07T20:01:00Z',
  professional_acknowledged_at: '2026-09-07T20:02:00Z',
  updated_at: '2026-09-07T20:21:00Z',
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

function completeReflections() {
  return [
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
      actor_role: 'parent',
      felt_heard: 'yes',
      felt_comfortable: 'yes',
      could_pause: 'yes',
      connection_after: 'closer',
      next_support: 'listen',
      review_signal: null,
      submitted_at: '2026-09-07T20:20:30Z',
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
  ];
}

function installSupabaseMock(overrides = {}) {
  const writes = [];
  const original = globalThis.fetch;

  globalThis.fetch = async (input, init = {}) => {
    const url = String(input);
    const method = init.method ?? 'GET';

    if (url.includes('/bridge_family_visit_sessions?') && method === 'GET') {
      return jsonResponse([{ ...DEFAULT_SESSION, ...(overrides.session ?? {}) }]);
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
      return jsonResponse(overrides.reflections ?? completeReflections());
    }
    if (url.includes('/rpc/finalize_bridge_family_visit_summaries') && method === 'POST') {
      const body = JSON.parse(String(init.body ?? '{}'));
      writes.push({ kind: 'finalize', body });
      return jsonResponse(overrides.finalizeResult ?? 'ready');
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

test('authorized generation sends one atomic audience pair and returns no summary content', async () => {
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

    const finalizations = mock.writes.filter((write) => write.kind === 'finalize');
    assert.equal(finalizations.length, 1);
    const payload = finalizations[0].body;
    assert.equal(payload.p_session_id, 'session-1');
    assert.equal(payload.p_expected_updated_at, DEFAULT_SESSION.updated_at);
    assert.equal(payload.p_parent_content.disposition, undefined);
    assert.equal(payload.p_professional_content.disposition, 'insufficient_evidence');
    assert.equal(payload.p_used_fallback, true);
    assert.equal(payload.p_prompt_version, 'bridge-family-visit-human-v1');
    assert.equal(payload.p_model, null);
  } finally {
    mock.restore();
  }
});

test('concurrent winner reuses frozen summaries without claiming losing-request provenance', async () => {
  const mock = installSupabaseMock({ finalizeResult: 'already_ready' });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ready');
    assert.equal(body.reusedExisting, true);
    assert.equal('usedFallback' in body, false);
    assert.equal('promptVersion' in body, false);
    assert.equal(mock.writes.filter((write) => write.kind === 'finalize').length, 1);
  } finally {
    mock.restore();
  }
});

test('evidence mutation during generation returns a retryable conflict and no partial write path exists', async () => {
  const mock = installSupabaseMock({ finalizeResult: 'evidence_changed' });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.status, 'blocked');
    assert.equal(body.failureCode, 'evidence_changed_retry');
    assert.equal(mock.writes.length, 1);
    assert.equal(mock.writes[0].kind, 'finalize');
  } finally {
    mock.restore();
  }
});

test('authority mutation during generation is reported separately from evidence drift', async () => {
  const mock = installSupabaseMock({ finalizeResult: 'authority_changed' });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.failureCode, 'professional_authority_changed');
    assert.equal(mock.writes.length, 1);
  } finally {
    mock.restore();
  }
});

test('already-ready session returns frozen status without generating or claiming provenance', async () => {
  const mock = installSupabaseMock({ session: { state: 'ready' } });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, 'ready');
    assert.equal(body.reusedExisting, true);
    assert.equal('usedFallback' in body, false);
    assert.equal('promptVersion' in body, false);
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation waits for teen, parent, and professional reflections before freezing summaries', async () => {
  const mock = installSupabaseMock({ reflections: completeReflections().filter((row) => row.actor_role !== 'parent') });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.status, 'blocked');
    assert.equal(body.failureCode, 'participant_reflections_required');
    assert.equal(mock.writes.length, 0);
  } finally {
    mock.restore();
  }
});

test('generation blocks before data sharing when one visible acknowledgement is missing', async () => {
  const mock = installSupabaseMock({ session: { parent_acknowledged_at: null } });
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
  const mock = installSupabaseMock({ session: { capture_mode: 'audio' } });
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

  const active = installSupabaseMock({ session: { state: 'active' } });
  try {
    const response = await handleBridgeFamilyVisitSummaryGenerate(request(), ENV, PRINCIPAL, CORS);
    assert.equal(response.status, 409);
    assert.equal((await response.json()).failureCode, 'reflection_state_required');
  } finally {
    active.restore();
  }
});

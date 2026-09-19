export interface BridgeFamilyVisitStoreEnv {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
}

export interface BridgeFamilyVisitSessionRow {
  id: string;
  assignment_id: string;
  state: string;
  capture_mode: string;
  teen_acknowledged_at: string | null;
  parent_acknowledged_at: string | null;
  professional_acknowledged_at: string | null;
  updated_at: string;
}

export interface BridgeCaseAssignmentRow {
  id: string;
  teen_user_id: string;
  parent_user_id: string;
  professional_user_id: string;
  status: string;
  expires_at: string | null;
}

export interface BridgeProfessionalProfileRow {
  user_id: string;
  verification_status: string;
}

export interface BridgeFamilyVisitMarkerRow {
  actor_role: 'teen' | 'parent' | 'professional';
  marker_key: string;
  created_at: string;
}

export interface BridgeFamilyVisitReflectionRow {
  actor_role: 'teen' | 'parent' | 'professional';
  felt_heard: string | null;
  felt_comfortable: string | null;
  could_pause: string | null;
  connection_after: string | null;
  next_support: string | null;
  review_signal: string | null;
  submitted_at: string;
}

export interface StoredFamilyVisitSummary {
  audience: 'parent' | 'professional';
  content: Record<string, unknown>;
  limitations: string;
  promptVersion: string;
  model: string | null;
  usedFallback: boolean;
}

export type FamilyVisitFinalizeResult = 'ready' | 'already_ready';
export type BridgeFamilyVisitFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function requireSupabase(env: BridgeFamilyVisitStoreEnv): { url: string; key: string } {
  const url = env.SUPABASE_URL?.replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('supabase_not_configured');
  return { url, key };
}

function serviceHeaders(key: string): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
}

async function oneOrNull<T>(response: Response, errorCode: string): Promise<T | null> {
  if (!response.ok) throw new Error(errorCode);
  const rows = await response.json() as T[];
  return rows[0] ?? null;
}

export function createBridgeFamilyVisitStore(env: BridgeFamilyVisitStoreEnv, fetchImpl: BridgeFamilyVisitFetch = fetch) {
  const observedSessionVersions = new Map<string, string>();

  async function fetchSession(sessionId: string): Promise<BridgeFamilyVisitSessionRow | null> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_family_visit_sessions?id=eq.${encodeURIComponent(sessionId)}&select=id,assignment_id,state,capture_mode,teen_acknowledged_at,parent_acknowledged_at,professional_acknowledged_at,updated_at`,
      { headers: serviceHeaders(key) },
    );
    const session = await oneOrNull<BridgeFamilyVisitSessionRow>(response, 'family_visit_session_lookup_failed');
    if (session?.updated_at) observedSessionVersions.set(sessionId, session.updated_at);
    return session;
  }

  async function fetchAssignment(assignmentId: string): Promise<BridgeCaseAssignmentRow | null> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_case_assignments?id=eq.${encodeURIComponent(assignmentId)}&select=id,teen_user_id,parent_user_id,professional_user_id,status,expires_at`,
      { headers: serviceHeaders(key) },
    );
    return oneOrNull<BridgeCaseAssignmentRow>(response, 'family_visit_assignment_lookup_failed');
  }

  async function fetchProfessionalProfile(userId: string): Promise<BridgeProfessionalProfileRow | null> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_professional_profiles?user_id=eq.${encodeURIComponent(userId)}&select=user_id,verification_status`,
      { headers: serviceHeaders(key) },
    );
    return oneOrNull<BridgeProfessionalProfileRow>(response, 'family_visit_professional_lookup_failed');
  }

  async function fetchMarkers(sessionId: string): Promise<BridgeFamilyVisitMarkerRow[]> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_family_visit_markers?session_id=eq.${encodeURIComponent(sessionId)}&select=actor_role,marker_key,created_at&order=created_at.asc`,
      { headers: serviceHeaders(key) },
    );
    if (!response.ok) throw new Error('family_visit_markers_lookup_failed');
    return await response.json() as BridgeFamilyVisitMarkerRow[];
  }

  async function fetchReflections(sessionId: string): Promise<BridgeFamilyVisitReflectionRow[]> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_family_visit_reflections?session_id=eq.${encodeURIComponent(sessionId)}&select=actor_role,felt_heard,felt_comfortable,could_pause,connection_after,next_support,review_signal,submitted_at&order=submitted_at.asc`,
      { headers: serviceHeaders(key) },
    );
    if (!response.ok) throw new Error('family_visit_reflections_lookup_failed');
    return await response.json() as BridgeFamilyVisitReflectionRow[];
  }

  async function finalizeSummaries(
    sessionId: string,
    parentSummary: StoredFamilyVisitSummary,
    professionalSummary: StoredFamilyVisitSummary,
  ): Promise<FamilyVisitFinalizeResult> {
    const { url, key } = requireSupabase(env);
    const expectedUpdatedAt = observedSessionVersions.get(sessionId);
    if (!expectedUpdatedAt) throw new Error('family_visit_session_version_missing');
    if (parentSummary.audience !== 'parent' || professionalSummary.audience !== 'professional') {
      throw new Error('family_visit_summary_audience_invalid');
    }
    if (parentSummary.promptVersion !== professionalSummary.promptVersion
        || parentSummary.model !== professionalSummary.model
        || parentSummary.usedFallback !== professionalSummary.usedFallback) {
      throw new Error('family_visit_summary_provenance_mismatch');
    }

    const response = await fetchImpl(`${url}/rest/v1/rpc/finalize_bridge_family_visit_summaries`, {
      method: 'POST',
      headers: serviceHeaders(key),
      body: JSON.stringify({
        p_session_id: sessionId,
        p_expected_updated_at: expectedUpdatedAt,
        p_parent_content: parentSummary.content,
        p_parent_limitations: parentSummary.limitations,
        p_professional_content: professionalSummary.content,
        p_professional_limitations: professionalSummary.limitations,
        p_prompt_version: parentSummary.promptVersion,
        p_model: parentSummary.model,
        p_used_fallback: parentSummary.usedFallback,
      }),
    });
    if (!response.ok) throw new Error('family_visit_summary_finalize_failed');

    const result = await response.json() as string;
    if (result === 'ready' || result === 'already_ready') return result;
    if (result === 'evidence_changed') throw new Error('family_visit_evidence_changed');
    if (result === 'authority_changed') throw new Error('family_visit_authority_changed');
    if (result === 'reflections_incomplete') throw new Error('family_visit_reflections_changed');
    if (result === 'session_invalid') throw new Error('family_visit_session_invalid');
    throw new Error('family_visit_summary_finalize_invalid_result');
  }

  return Object.freeze({
    fetchSession,
    fetchAssignment,
    fetchProfessionalProfile,
    fetchMarkers,
    fetchReflections,
    finalizeSummaries,
  });
}

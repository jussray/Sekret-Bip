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
  async function fetchSession(sessionId: string): Promise<BridgeFamilyVisitSessionRow | null> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_family_visit_sessions?id=eq.${encodeURIComponent(sessionId)}&select=id,assignment_id,state,capture_mode,teen_acknowledged_at,parent_acknowledged_at,professional_acknowledged_at`,
      { headers: serviceHeaders(key) },
    );
    return oneOrNull<BridgeFamilyVisitSessionRow>(response, 'family_visit_session_lookup_failed');
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

  async function upsertSummary(sessionId: string, summary: StoredFamilyVisitSummary): Promise<void> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(`${url}/rest/v1/bridge_family_visit_summaries?on_conflict=session_id,audience`, {
      method: 'POST',
      headers: { ...serviceHeaders(key), Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        session_id: sessionId,
        audience: summary.audience,
        content: summary.content,
        limitations: summary.limitations,
        prompt_version: summary.promptVersion,
        model: summary.model,
        used_fallback: summary.usedFallback,
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error('family_visit_summary_write_failed');
  }

  async function markSessionReady(sessionId: string): Promise<void> {
    const { url, key } = requireSupabase(env);
    const response = await fetchImpl(
      `${url}/rest/v1/bridge_family_visit_sessions?id=eq.${encodeURIComponent(sessionId)}&state=eq.reflection`,
      {
        method: 'PATCH',
        headers: { ...serviceHeaders(key), Prefer: 'return=representation' },
        body: JSON.stringify({ state: 'ready', updated_at: new Date().toISOString() }),
      },
    );
    if (!response.ok) throw new Error('family_visit_session_ready_failed');
    const rows = await response.json() as Array<{ id?: string }>;
    if (!rows[0]?.id) throw new Error('family_visit_session_state_changed');
  }

  return Object.freeze({
    fetchSession,
    fetchAssignment,
    fetchProfessionalProfile,
    fetchMarkers,
    fetchReflections,
    upsertSummary,
    markSessionReady,
  });
}

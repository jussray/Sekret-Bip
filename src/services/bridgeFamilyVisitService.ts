import type {
  BridgeFamilyVisitAssignment,
  BridgeFamilyVisitBundle,
  BridgeFamilyVisitMarkerKey,
  BridgeFamilyVisitParticipantReflectionInput,
  BridgeFamilyVisitResult,
  BridgeFamilyVisitReviewSignal,
  BridgeFamilyVisitSession,
  BridgeFamilyVisitSummaryRow,
  BridgeProfessionalCapability,
} from '@/types/bridgeFamilyVisit';
import { backendAuthHeaders } from '@/utils/backendAuth';
import { getSupabase } from '@/utils/supabase';

const BASE_URL = ((process.env as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

interface ProfessionalRow {
  user_id: string;
  organization_kind: BridgeProfessionalCapability['organizationKind'];
  organization_label: string;
  verification_status: BridgeProfessionalCapability['verificationStatus'];
}

interface AssignmentRow {
  id: string;
  teen_user_id: string;
  parent_user_id: string;
  professional_user_id: string;
  status: BridgeFamilyVisitAssignment['status'];
  expires_at: string | null;
}

interface SessionRow {
  id: string;
  assignment_id: string;
  state: BridgeFamilyVisitSession['state'];
  capture_mode: 'none';
  teen_acknowledged_at: string | null;
  parent_acknowledged_at: string | null;
  professional_acknowledged_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  declined_by_role: BridgeFamilyVisitSession['declinedByRole'];
  created_at: string;
}

interface SummaryRow {
  id: string;
  session_id: string;
  audience: BridgeFamilyVisitSummaryRow['audience'];
  content: BridgeFamilyVisitSummaryRow['content'];
  limitations: string;
  generated_at: string;
  used_fallback: boolean;
}

function unavailable<T>(message = 'Family Visit Mode is not configured yet.'): BridgeFamilyVisitResult<T> {
  return { ok: false, code: 'not_configured', message };
}

function serverError<T>(message: string): BridgeFamilyVisitResult<T> {
  return { ok: false, code: 'server_error', message, retryable: true };
}

async function currentPermanentUserId(): Promise<BridgeFamilyVisitResult<string>> {
  const sb = getSupabase();
  if (!sb) return unavailable();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user || data.user.is_anonymous) {
    return { ok: false, code: 'not_authenticated', message: 'A permanent signed-in account is required.' };
  }
  return { ok: true, value: data.user.id };
}

export async function fetchProfessionalBridgeCapability(): Promise<BridgeFamilyVisitResult<BridgeProfessionalCapability | null>> {
  const sb = getSupabase();
  if (!sb) return unavailable();
  const user = await currentPermanentUserId();
  if (!user.ok || !user.value) return user as BridgeFamilyVisitResult<BridgeProfessionalCapability | null>;

  const { data, error } = await sb
    .from('bridge_professional_profiles')
    .select('user_id,organization_kind,organization_label,verification_status')
    .eq('user_id', user.value)
    .maybeSingle();

  if (error) return unavailable();
  if (!data) return { ok: true, value: null };
  const row = data as ProfessionalRow;
  return {
    ok: true,
    value: {
      userId: row.user_id,
      organizationKind: row.organization_kind,
      organizationLabel: row.organization_label,
      verificationStatus: row.verification_status,
    },
  };
}

export async function fetchBridgeFamilyVisitBundle(): Promise<BridgeFamilyVisitResult<BridgeFamilyVisitBundle>> {
  const sb = getSupabase();
  if (!sb) return unavailable();
  const user = await currentPermanentUserId();
  if (!user.ok || !user.value) return user as BridgeFamilyVisitResult<BridgeFamilyVisitBundle>;
  const userId = user.value;

  const capabilityResult = await fetchProfessionalBridgeCapability();
  if (!capabilityResult.ok) return capabilityResult as BridgeFamilyVisitResult<BridgeFamilyVisitBundle>;

  const { data: assignmentsData, error: assignmentsError } = await sb
    .from('bridge_case_assignments')
    .select('id,teen_user_id,parent_user_id,professional_user_id,status,expires_at')
    .order('created_at', { ascending: false });
  if (assignmentsError) return unavailable();

  const assignments = ((assignmentsData ?? []) as AssignmentRow[]).map((row): BridgeFamilyVisitAssignment => ({
    id: row.id,
    teenUserId: row.teen_user_id,
    parentUserId: row.parent_user_id,
    professionalUserId: row.professional_user_id,
    status: row.status,
    expiresAt: row.expires_at,
    role: row.teen_user_id === userId ? 'teen' : row.parent_user_id === userId ? 'parent' : 'professional',
  }));

  if (assignments.length === 0) {
    return { ok: true, value: { capability: capabilityResult.value ?? null, assignments: [], sessions: [], summaries: [] } };
  }

  const { data: sessionsData, error: sessionsError } = await sb
    .from('bridge_family_visit_sessions')
    .select('id,assignment_id,state,capture_mode,teen_acknowledged_at,parent_acknowledged_at,professional_acknowledged_at,started_at,ended_at,declined_by_role,created_at')
    .in('assignment_id', assignments.map((assignment) => assignment.id))
    .order('created_at', { ascending: false });
  if (sessionsError) return serverError(sessionsError.message || 'Could not load Family Visit sessions.');

  const sessions = ((sessionsData ?? []) as SessionRow[]).map((row): BridgeFamilyVisitSession => ({
    id: row.id,
    assignmentId: row.assignment_id,
    state: row.state,
    captureMode: row.capture_mode,
    teenAcknowledgedAt: row.teen_acknowledged_at,
    parentAcknowledgedAt: row.parent_acknowledged_at,
    professionalAcknowledgedAt: row.professional_acknowledged_at,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    declinedByRole: row.declined_by_role,
    createdAt: row.created_at,
  }));

  let summaries: BridgeFamilyVisitSummaryRow[] = [];
  if (sessions.length > 0) {
    const { data: summariesData, error: summariesError } = await sb
      .from('bridge_family_visit_summaries')
      .select('id,session_id,audience,content,limitations,generated_at,used_fallback')
      .in('session_id', sessions.map((session) => session.id))
      .order('generated_at', { ascending: false });
    if (summariesError) return serverError(summariesError.message || 'Could not load Family Visit summaries.');

    summaries = ((summariesData ?? []) as SummaryRow[]).map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      audience: row.audience,
      content: row.content,
      limitations: row.limitations,
      generatedAt: row.generated_at,
      usedFallback: row.used_fallback,
    }));
  }

  return {
    ok: true,
    value: {
      capability: capabilityResult.value ?? null,
      assignments,
      sessions,
      summaries,
    },
  };
}

async function rpc<T>(name: string, params: Record<string, unknown>): Promise<BridgeFamilyVisitResult<T>> {
  const sb = getSupabase();
  if (!sb) return unavailable();
  const user = await currentPermanentUserId();
  if (!user.ok) return user as BridgeFamilyVisitResult<T>;

  const { data, error } = await sb.rpc(name, params);
  if (error) {
    const lower = error.message?.toLowerCase() ?? '';
    if (lower.includes('required') || lower.includes('not current') || lower.includes('authority')) {
      return { ok: false, code: 'not_authorized', message: error.message };
    }
    return serverError(error.message || `Could not complete ${name}.`);
  }
  return { ok: true, value: data as T };
}

export function startBridgeFamilyVisitSession(assignmentId: string): Promise<BridgeFamilyVisitResult<string>> {
  return rpc<string>('start_bridge_family_visit_session', { p_assignment_id: assignmentId });
}

export function acknowledgeBridgeFamilyVisitSession(sessionId: string): Promise<BridgeFamilyVisitResult<string>> {
  return rpc<string>('acknowledge_bridge_family_visit_session', { p_session_id: sessionId });
}

export function declineBridgeFamilyVisitSession(sessionId: string): Promise<BridgeFamilyVisitResult<boolean>> {
  return rpc<boolean>('decline_bridge_family_visit_session', { p_session_id: sessionId });
}

export function endBridgeFamilyVisitSession(sessionId: string): Promise<BridgeFamilyVisitResult<boolean>> {
  return rpc<boolean>('end_bridge_family_visit_session', { p_session_id: sessionId });
}

export function recordBridgeFamilyVisitMarker(sessionId: string, markerKey: BridgeFamilyVisitMarkerKey): Promise<BridgeFamilyVisitResult<string>> {
  return rpc<string>('record_bridge_family_visit_marker', { p_session_id: sessionId, p_marker_key: markerKey });
}

export function submitBridgeFamilyVisitParticipantReflection(
  sessionId: string,
  input: BridgeFamilyVisitParticipantReflectionInput,
): Promise<BridgeFamilyVisitResult<string>> {
  return rpc<string>('submit_bridge_family_visit_reflection', {
    p_session_id: sessionId,
    p_felt_heard: input.feltHeard,
    p_felt_comfortable: input.feltComfortable,
    p_could_pause: input.couldPause,
    p_connection_after: input.connectionAfter,
    p_next_support: input.nextSupport,
    p_review_signal: null,
  });
}

export function submitBridgeFamilyVisitProfessionalReflection(
  sessionId: string,
  reviewSignal: BridgeFamilyVisitReviewSignal,
): Promise<BridgeFamilyVisitResult<string>> {
  return rpc<string>('submit_bridge_family_visit_reflection', {
    p_session_id: sessionId,
    p_felt_heard: null,
    p_felt_comfortable: null,
    p_could_pause: null,
    p_connection_after: null,
    p_next_support: null,
    p_review_signal: reviewSignal,
  });
}

export async function generateBridgeFamilyVisitHumanSummaries(sessionId: string): Promise<BridgeFamilyVisitResult<{ ready: boolean }>> {
  if (!BASE_URL) return unavailable('Family Visit summary generation is not configured.');
  const user = await currentPermanentUserId();
  if (!user.ok) return user as BridgeFamilyVisitResult<{ ready: boolean }>;

  try {
    const headers = await backendAuthHeaders();
    const response = await fetch(`${BASE_URL}/api/bridge/summary/generate`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    });
    const body = await response.json().catch(() => null) as { status?: string; failureCode?: string } | null;
    if (!response.ok) {
      if (response.status === 403 || response.status === 409) {
        let message = 'This Family Visit session is not ready for summary generation.';
        if (body?.failureCode === 'family_visit_mode_disabled') {
          message = 'Family Visit summary generation is not enabled for this account yet.';
        } else if (body?.failureCode === 'participant_reflections_required') {
          message = 'Waiting for the child, parent, and professional to each save a structured reflection.';
        }
        return {
          ok: false,
          code: 'not_authorized',
          message,
        };
      }
      return { ok: false, code: 'ai_unavailable', message: 'Se’kret could not prepare the summaries yet.', retryable: true };
    }
    return { ok: true, value: { ready: body?.status === 'ready' } };
  } catch {
    return { ok: false, code: 'ai_unavailable', message: 'Se’kret could not prepare the summaries yet.', retryable: true };
  }
}

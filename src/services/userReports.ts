// Client-side wiring for the narrow self-report primitive.
// Backed by the `report_own_audit_event_issue` RPC (see
// supabase/migrations/20260710235500_report_own_audit_event_issue.sql).
// This intentionally carries NO founder/escalation power: a user can only
// flag an audit_events row they own, the RPC re-checks ownership + eligibility
// + rate limits server-side, and the resulting control_room_issues row is
// always inserted with trust_level='unverified' for founder triage.

import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import { logRuntimeAuditEvent } from '@/services/runtimeAudit';

export interface ReportResult {
  reported: boolean;
  reportRef: string | null;
  message: string;
}

const OFFLINE_RESULT: ReportResult = {
  reported: false,
  reportRef: null,
  message: 'not available offline',
};

const GENERIC_ERROR_RESULT: ReportResult = {
  reported: false,
  reportRef: null,
  message: 'something went wrong, try again',
};

/**
 * Calls report_own_audit_event_issue directly for an audit_events row the
 * signed-in user already owns. Use this when you already have an event id
 * (e.g. from captureRuntimeError's return value) and want to offer a
 * "report this" action tied to that exact event.
 */
export async function reportOwnAuditEvent(
  eventId: string,
  note?: string | null,
): Promise<ReportResult> {
  if (!isSupabaseConfigured) return OFFLINE_RESULT;
  const sb = getSupabase();
  if (!sb) return OFFLINE_RESULT;

  const { data, error } = await sb.rpc('report_own_audit_event_issue', {
    p_event_id: eventId,
    p_note: note ?? null,
  });

  if (error) {
    console.warn('[userReports] report_own_audit_event_issue failed:', error.message);
    return GENERIC_ERROR_RESULT;
  }

  // Table-returning RPCs come back as an array of rows via supabase-js.
  const row = Array.isArray(data) ? data[0] : data;
  return {
    reported: Boolean(row?.reported),
    reportRef: row?.report_ref ?? null,
    message: row?.message ?? '',
  };
}

/**
 * Full "report a problem" flow for free text that isn't already tied to a
 * captured error. Logs a fresh audit_events row under the caller's own
 * account (severity fixed to 'warning' so it's always eligible for
 * reporting), then immediately reports it through the RPC above.
 */
export async function reportProblem(
  note: string,
  screen?: string | null,
): Promise<ReportResult> {
  const trimmed = note.trim();
  if (!trimmed) {
    return { reported: false, reportRef: null, message: 'add a short description first' };
  }

  const event = await logRuntimeAuditEvent('manual', {
    event_type: 'user_reported_issue',
    screen: screen ?? null,
    severity: 'warning',
    message: trimmed.slice(0, 240),
  });

  if (!event) return GENERIC_ERROR_RESULT;

  return reportOwnAuditEvent(event.id, trimmed);
}

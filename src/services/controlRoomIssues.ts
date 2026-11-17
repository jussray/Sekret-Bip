import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import {
  assignIssue,
  buildFingerprint,
  deriveIssueFields,
  getIssueHistory,
  getLinkedEvents,
  ingestAuditEvent,
  listNormalizedIssues,
  normalizeRecentEvents,
  updateIssueNotes,
  updateIssueStatus,
  type NormalizedIssue,
} from '@/services/issueNormalizer';

export type {
  NormalizedIssue as ControlRoomIssue,
  IssueStatus,
  IssueSeverity,
  IssueSource,
  IssueCategory,
  IssueFilter,
  IssueHistoryEntry,
} from '@/services/issueNormalizer';

export {
  listNormalizedIssues,
  updateIssueStatus,
  updateIssueNotes,
  assignIssue,
  ingestAuditEvent,
  normalizeRecentEvents,
  getLinkedEvents,
  getIssueHistory,
  buildFingerprint,
  deriveIssueFields,
};

async function listAllIssues(limit = 300): Promise<NormalizedIssue[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from('control_room_issues')
    .select('*')
    .order('last_seen_at', { ascending: false })
    .limit(limit);
  if (error) {
    console.warn('[controlRoomIssues] listAllIssues error:', error.message);
    return [];
  }
  return (data ?? []).map((issue) => ({
    ...(issue as NormalizedIssue),
    affected_surface: (issue as { affected_surface?: string | null }).affected_surface ?? undefined,
  }));
}

export const controlRoomIssuesService = {
  list: listNormalizedIssues,
  listAll: listAllIssues,
  updateStatus: updateIssueStatus,
  async resolveAuditEvent(auditEventId: string): Promise<boolean> {
    if (!isSupabaseConfigured) return false;
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from('audit_events')
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', auditEventId);
    if (error) {
      console.warn('[controlRoomIssues] resolveAuditEvent error:', error.message);
      return false;
    }
    return true;
  },
};

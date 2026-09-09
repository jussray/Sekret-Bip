/**
 * src/services/issueNormalizer.ts
 *
 * Issue normalization pipeline for the Se'kret Bip Founder Control Room.
 *
 * Responsibility:
 *   Convert raw audit_events rows into grouped, actionable control_room_issues.
 *   Many repeated events with the same event_type + screen produce ONE issue
 *   with occurrence_count, affected_users, first_seen_at, last_seen_at.
 *
 * This service runs:
 *   - On demand when the founder opens the Control Room (via normalizeRecentEvents)
 *   - From the ingest Edge Function when a new event is written (via ingestEvent)
 *
 * It never reads private journal content, raw audio, or full transcripts.
 */
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import type { AuditEvent } from '@/services/founderAudit';

// ── Types ────────────────────────────────────────────────────────────────────

export type IssueSource =
  | 'runtime'
  | 'structural_scan'
  | 'rls_scan'
  | 'voice_metrics'
  | 'companion_eval'
  | 'behavior_signal'
  | 'build_pipeline'
  | 'supabase_advisor'
  | 'cloudflare_log'
  | 'founder_idea'
  | 'manual'
  | 'user_report';

export type IssueStatus =
  | 'open'
  | 'reported'
  | 'investigating'
  | 'planned'
  | 'building'
  | 'testing'
  | 'resolved'
  | 'ignored';

export type IssueSeverity = 'critical' | 'error' | 'warning' | 'info';

export type IssueCategory =
  | 'runtime'
  | 'structure'
  | 'memory'
  | 'voice'
  | 'companion'
  | 'safety'
  | 'behavior'
  | 'rewards'
  | 'product'
  | 'rls'
  | 'infra';

export interface NormalizedIssue {
  id: string;
  fingerprint: string | null;
  source: IssueSource;
  category: IssueCategory;
  severity: IssueSeverity;
  status: IssueStatus;
  title: string;
  summary: string;
  suggested_fix: string | null;
  affected_surface: string | undefined;
  affected_users: number;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  owner: string | null;
  linked_release: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // 'unverified' = user-submitted (report_own_audit_event_issue), never
  // independently confirmed; 'system' = derived from an audit_events row by
  // upsert_control_room_issue; 'confirmed' = a founder has verified it.
  trust_level: 'unverified' | 'system' | 'confirmed';
}

export interface IssueHistoryEntry {
  id: string;
  issue_id: string;
  changed_by: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface IssueFilter {
  severity?: IssueSeverity;
  status?: IssueStatus;
  category?: IssueCategory;
  source?: IssueSource;
  surface?: string;
  limit?: number;
}

// ── Fingerprint engine ────────────────────────────────────────────────────────

/**
 * Builds a stable deduplication key from an audit event.
 *
 * Format: "<source>:<event_type>:<screen|*>"
 *
 * Events without a screen produce a wildcard surface key so they still
 * group correctly even when the screen field is missing.
 *
 * Examples:
 *   runtime:voice_bip_request_failed:VoiceBip
 *   runtime:worker_request_failed:*
 *   runtime:supabase_write_failed:JournalEntry
 */
export function buildFingerprint(
  eventType: string,
  screen: string | null | undefined,
  source: IssueSource = 'runtime',
): string {
  const normalizedScreen = screen?.trim() || '*';
  return `${source}:${eventType.toLowerCase().trim()}:${normalizedScreen}`;
}

/**
 * Derives issue metadata from an audit event using the fingerprint registry.
 * Falls back to sensible defaults when the fingerprint isn't in the registry.
 */
export function deriveIssueFields(event: AuditEvent): {
  fingerprint: string;
  source: IssueSource;
  category: IssueCategory;
  severity: IssueSeverity;
  title: string;
  summary: string;
  suggested_fix: string;
  affected_surface: string | null;
} {
  const fingerprint = buildFingerprint(event.event_type, event.screen, 'runtime');

  // Category inference from event_type prefix
  const category = inferCategory(event.event_type);

  // Title: humanize the event_type snake_case
  const title = event.event_type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const summary =
    event.message ??
    `Runtime event on ${event.screen ?? 'unknown screen'}: ${event.event_type}.`;

  const suggested_fix = defaultSuggestedFix(event.event_type, event.screen);

  return {
    fingerprint,
    source: 'runtime',
    category,
    severity: (event.severity ?? 'error') as IssueSeverity,
    title,
    summary,
    suggested_fix,
    affected_surface: event.screen ?? null,
  };
}

function inferCategory(eventType: string): IssueCategory {
  const t = eventType.toLowerCase();
  if (t.includes('voice')) return 'voice';
  if (t.includes('memory')) return 'memory';
  if (t.includes('companion') || t.includes('openai') || t.includes('ai_')) return 'companion';
  if (t.includes('circle')) return 'runtime';
  if (t.includes('reward') || t.includes('point') || t.includes('shopify')) return 'rewards';
  if (t.includes('parent') || t.includes('bridge')) return 'runtime';
  if (t.includes('rls') || t.includes('policy') || t.includes('auth')) return 'rls';
  if (t.includes('asset') || t.includes('route') || t.includes('navigation')) return 'structure';
  if (t.includes('worker') || t.includes('cloudflare') || t.includes('deploy')) return 'infra';
  if (t.includes('safety') || t.includes('flagged')) return 'safety';
  if (t.includes('behavior') || t.includes('signal') || t.includes('abandon')) return 'behavior';
  return 'runtime';
}

function defaultSuggestedFix(eventType: string, screen: string | null | undefined): string {
  const t = eventType.toLowerCase();
  if (t.includes('voice')) return 'Check Cloudflare Worker logs for the voice route. Verify STT/TTS provider availability and timeout config.';
  if (t.includes('openai')) return 'Check OpenAI API status. Verify the API key is set in Worker secrets and not rate-limited.';
  if (t.includes('worker')) return 'Open Cloudflare dashboard → Workers → Logs. Look for 5xx responses or timeout spikes.';
  if (t.includes('supabase')) return 'Check Supabase logs. Verify RLS policy allows this operation for the current user.';
  if (t.includes('memory')) return 'Inspect the memory write path. Ensure no private content is in the payload before the write is attempted.';
  if (t.includes('reward') || t.includes('redemption')) return 'Check point_transactions for double-spend. Verify Shopify webhook is active and responding.';
  if (t.includes('asset') || t.includes('missing')) return 'Run the asset audit script. Verify all referenced paths exist in assets/ and are included in the Expo bundle.';
  if (t.includes('navigation') || t.includes('route')) return 'Verify the target route exists in app/. Check expo-router logs for the navigation stack at time of failure.';
  if (t.includes('circle')) return 'Check circle_posts and circle_reactions RLS. Look for network timeout patterns on the Worker.';
  if (t.includes('bridge') || t.includes('parent')) return 'Check parent_links for missing or expired tokens. Verify bridge_shares RLS and delivery notification logic.';
  return `Investigate the ${screen ?? 'affected screen'} for error patterns. Check Supabase logs and Worker analytics around the time of first_seen_at.`;
}

// ── Ingest pipeline ───────────────────────────────────────────────────────────

/**
 * Ingest a single audit event into the normalized issues table.
 * Calls the upsert_control_room_issue() Postgres function.
 *
 * This is called:
 *  - From the Edge Function after every audit_events insert (PR 3)
 *  - From the mobile app after a logAuditEvent() call when the founder is active
 */
export async function ingestAuditEvent(event: AuditEvent): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  if (!sb) return null;

  const fields = deriveIssueFields(event);

  const { data, error } = await sb.rpc('upsert_control_room_issue', {
    p_fingerprint:      fields.fingerprint,
    p_source:           fields.source,
    p_category:         fields.category,
    p_severity:         fields.severity,
    p_status:           'open',
    p_title:            fields.title,
    p_summary:          fields.summary,
    p_suggested_fix:    fields.suggested_fix,
    p_affected_surface: fields.affected_surface,
    p_affected_user_id: event.user_id ?? null,
    p_event_id:         event.id,
    p_metadata:         (event.metadata ?? {}) as Record<string, unknown>,
  });

  if (error) {
    console.warn('[issueNormalizer] ingestAuditEvent error:', error.message);
    return null;
  }

  return data as string;
}

/**
 * Pull recent unresolved audit_events and ingest them all.
 * Called when the founder opens the Control Room to catch up on any events
 * that were written before the Edge Function trigger was in place.
 *
 * Safe to call repeatedly — the upsert function is idempotent per fingerprint.
 */
export async function normalizeRecentEvents(limitHours = 72): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> {
  if (!isSupabaseConfigured) return { processed: 0, created: 0, updated: 0, errors: 0 };
  const sb = getSupabase();
  if (!sb) return { processed: 0, created: 0, updated: 0, errors: 0 };

  const since = new Date(Date.now() - limitHours * 60 * 60 * 1000).toISOString();

  const { data: events, error } = await sb
    .from('audit_events')
    .select('id,user_id,event_type,screen,severity,message,metadata,resolved,created_at')
    .eq('resolved', false)
    .gte('created_at', since)
    .order('created_at', { ascending: true })
    .limit(500);

  if (error || !events) {
    console.warn('[issueNormalizer] normalizeRecentEvents fetch error:', error?.message);
    return { processed: 0, created: 0, updated: 0, errors: 1 };
  }

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const event of events as AuditEvent[]) {
    const issueId = await ingestAuditEvent(event);
    if (issueId === null) {
      errors++;
    } else {
      // Detect create vs update by checking if the issue existed before this batch
      // (simplified: we count every successful call)
      updated++;
    }
  }

  return { processed: events.length, created, updated, errors };
}

// ── Issue CRUD ────────────────────────────────────────────────────────────────

/**
 * List normalized issues with optional filters.
 * Used by the Control Room UI.
 */
export async function listNormalizedIssues(
  filter: IssueFilter = {},
): Promise<NormalizedIssue[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb
    .from('control_room_issues')
    .select('*')
    .neq('status', 'ignored')
    .order('last_seen_at', { ascending: false })
    .limit(filter.limit ?? 200);

  if (filter.severity)  query = query.eq('severity', filter.severity);
  if (filter.status)    query = query.eq('status',   filter.status);
  if (filter.category)  query = query.eq('category', filter.category);
  if (filter.source)    query = query.eq('source',   filter.source);
  if (filter.surface)   query = query.eq('affected_surface', filter.surface);

  const { data, error } = await query;

  if (error) {
    console.warn('[issueNormalizer] listNormalizedIssues error:', error.message);
    return [];
  }
  return (data ?? []).map((issue) => ({
    ...(issue as NormalizedIssue),
    affected_surface: (issue as { affected_surface?: string | null }).affected_surface ?? undefined,
  }));
}

/**
 * Update an issue's status and write a history log entry.
 */
export async function updateIssueStatus(
  issueId: string,
  newStatus: IssueStatus,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const sb = getSupabase();
  if (!sb) return false;

  const { data: { user } } = await sb.auth.getUser();

  // Get current status for history
  const { data: current } = await sb
    .from('control_room_issues')
    .select('status')
    .eq('id', issueId)
    .single();

  const oldStatus = (current as { status: string } | null)?.status ?? null;

  const updates: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  if (newStatus === 'resolved') {
    updates.resolved_at = new Date().toISOString();
    updates.resolved_by = user?.id ?? null;
  }

  const { error: updateError } = await sb
    .from('control_room_issues')
    .update(updates)
    .eq('id', issueId);

  if (updateError) {
    console.warn('[issueNormalizer] updateIssueStatus error:', updateError.message);
    return false;
  }

  // Write history entry
  await sb.from('control_room_issue_history').insert({
    issue_id:   issueId,
    changed_by: user?.id ?? null,
    field:      'status',
    old_value:  oldStatus,
    new_value:  newStatus,
  });

  return true;
}

/**
 * Update notes on an issue and log the change.
 */
export async function updateIssueNotes(
  issueId: string,
  notes: string,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const sb = getSupabase();
  if (!sb) return false;

  const { data: { user } } = await sb.auth.getUser();

  const { data: current } = await sb
    .from('control_room_issues')
    .select('notes')
    .eq('id', issueId)
    .single();

  const { error } = await sb
    .from('control_room_issues')
    .update({ notes: notes.trim(), updated_at: new Date().toISOString() })
    .eq('id', issueId);

  if (error) {
    console.warn('[issueNormalizer] updateIssueNotes error:', error.message);
    return false;
  }

  await sb.from('control_room_issue_history').insert({
    issue_id:   issueId,
    changed_by: user?.id ?? null,
    field:      'notes',
    old_value:  (current as { notes: string | null } | null)?.notes ?? null,
    new_value:  notes.trim(),
  });

  return true;
}

/**
 * Assign an issue to a team member.
 */
export async function assignIssue(
  issueId: string,
  assignedTo: string | null,
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const sb = getSupabase();
  if (!sb) return false;

  const { data: { user } } = await sb.auth.getUser();
  const { data: current } = await sb
    .from('control_room_issues')
    .select('assigned_to')
    .eq('id', issueId)
    .single();

  const { error } = await sb
    .from('control_room_issues')
    .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
    .eq('id', issueId);

  if (error) {
    console.warn('[issueNormalizer] assignIssue error:', error.message);
    return false;
  }

  await sb.from('control_room_issue_history').insert({
    issue_id:   issueId,
    changed_by: user?.id ?? null,
    field:      'assigned_to',
    old_value:  (current as { assigned_to: string | null } | null)?.assigned_to ?? null,
    new_value:  assignedTo,
  });

  return true;
}

/**
 * Get the raw audit events linked to an issue.
 */
export async function getLinkedEvents(
  issueId: string,
  limit = 50,
): Promise<AuditEvent[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('control_room_issue_events')
    .select('event_id, audit_events!inner(id,user_id,event_type,screen,severity,message,metadata,resolved,created_at)')
    .eq('issue_id', issueId)
    .order('linked_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.warn('[issueNormalizer] getLinkedEvents error:', error.message);
    return [];
  }

  type LinkedEventRow = { audit_events: AuditEvent | AuditEvent[] | null };
  return ((data ?? []) as unknown as LinkedEventRow[])
    .flatMap((row) => {
      if (Array.isArray(row.audit_events)) return row.audit_events;
      return row.audit_events ? [row.audit_events] : [];
    })
    .filter(Boolean);
}

/**
 * Get the status/notes history for an issue.
 */
export async function getIssueHistory(
  issueId: string,
): Promise<IssueHistoryEntry[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('control_room_issue_history')
    .select('*')
    .eq('issue_id', issueId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.warn('[issueNormalizer] getIssueHistory error:', error.message);
    return [];
  }
  return (data ?? []) as IssueHistoryEntry[];
}

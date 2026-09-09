import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';

export type FounderRole = 'developer' | 'admin' | 'founder';

export interface FounderProfile {
  user_id: string;
  email?: string | null;
  role: string;
  can_view_audits: boolean;
  can_manage_app: boolean;
  exclude_from_analytics: boolean;
}

export type AuditSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AuditEvent {
  id: string;
  user_id?: string | null;
  event_type: string;
  screen?: string | null;
  severity: AuditSeverity;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  resolved: boolean;
  created_at: string;
}

export interface FounderAuditCard {
  id: string;
  category: 'structure' | 'runtime' | 'memory' | 'voice' | 'safety' | 'behavior' | 'rewards' | 'product';
  severity: AuditSeverity;
  title: string;
  summary: string;
  fix: string;
  source: 'static-playbook' | 'live-audit-event';
}

export interface FounderBusinessSnapshot {
  // A trustworthy cross-account total needs an approved founder-only aggregate RPC.
  // Returning null prevents own-row RLS from masquerading as the global user count.
  users: number | null;
  openIssues: number;
  unresolvedAudits: number;
  releases: number;
  latestRelease: {
    release_key: string;
    status: string;
    deployed_at: string;
  } | null;
}

const FOUNDER_ROLES = new Set<string>(['developer', 'admin', 'founder']);

export const founderAuditPlaybook: FounderAuditCard[] = [
  {
    id: 'structure-one-dashboard',
    category: 'structure',
    severity: 'critical',
    title: 'Unify all audits into one founder dashboard',
    summary: 'Structural, memory, voice, safety, product, rewards, and behavior audits should land in one dev profile instead of separate static dashboards.',
    fix: 'Route every audit source into audit_events and render grouped fix cards inside /(dev)/index.tsx.',
    source: 'static-playbook',
  },
  {
    id: 'structure-orchestrator',
    category: 'structure',
    severity: 'critical',
    title: 'Create one companion runtime orchestrator',
    summary: 'Raylene, Rylane, Cloud, Night, Voice Bip, Circle replies, Bridge, and Oracle should not each own separate AI logic.',
    fix: 'Move context building, memory retrieval, safety gating, model call, response shaping, and audit logging into one Worker route.',
    source: 'static-playbook',
  },
  {
    id: 'memory-foundation',
    category: 'memory',
    severity: 'critical',
    title: 'Add durable memory, not transcript dumping',
    summary: 'Bip needs extracted memory records for preferences, trusted context, recurring moods, goals, and companion continuity.',
    fix: 'Add memory_items, conversation_summaries, memory_audit_log, and retrieval scoring before writing full chats into long-term memory.',
    source: 'static-playbook',
  },
  {
    id: 'voice-shared-stack',
    category: 'voice',
    severity: 'error',
    title: 'Build one shared Voice Bip stack',
    summary: 'Voice Bip, Circle voice replies, Bridge rehearsal, and companion speaking should share capture, STT, TTS, playback, and barge-in handling.',
    fix: 'Create a shared voice service and log latency slices into audit_events: capture, STT, orchestration, first token, TTS, playback.',
    source: 'static-playbook',
  },
  {
    id: 'safety-teen-privacy',
    category: 'safety',
    severity: 'critical',
    title: 'Protect teen privacy in audit logs',
    summary: 'Audit events should explain what broke without storing private teen journal text, raw audio, or sensitive parent/teen content.',
    fix: 'Only store event type, screen, severity, safe metadata, and redacted summaries. Use memory write policies for sensitive data.',
    source: 'static-playbook',
  },
  {
    id: 'behavior-signals',
    category: 'behavior',
    severity: 'warning',
    title: 'Turn user behavior into fix suggestions',
    summary: 'The founder dashboard should show where users quit, what buttons fail, which companion gets used, and where the app feels confusing.',
    fix: 'Log safe activity events and aggregate them into cards like “Circle opened but no post created” or “Voice Bip timeout spike.”',
    source: 'static-playbook',
  },
  {
    id: 'rewards-shopify',
    category: 'rewards',
    severity: 'info',
    title: 'Connect rewards/store audit to the same dev profile',
    summary: 'Rewards, points drain, merch redemptions, Shopify sync, inventory, and fulfillment errors belong in the same dashboard.',
    fix: 'Add event types for points_awarded, points_drained, redemption_failed, shopify_sync_failed, and reward_abuse_flagged.',
    source: 'static-playbook',
  },
  {
    id: 'product-companion-quality',
    category: 'product',
    severity: 'warning',
    title: 'Audit companion quality and persona drift',
    summary: 'Raylene, Rylane, Cloud, Night, and Oracle need checks for tone, recall, safety, and whether replies still feel like Se’kret Bip.',
    fix: 'Add eval cards for persona drift, wrong companion name, stale fallback, unsafe advice, low empathy, and memory mismatch.',
    source: 'static-playbook',
  },
];

export function isFounderProfile(profile: FounderProfile | null): boolean {
  return Boolean(profile?.can_view_audits && FOUNDER_ROLES.has(profile.role));
}

export function isFounderBusinessProfile(profile: FounderProfile | null): boolean {
  return Boolean(
    profile?.role === 'founder'
      && profile.can_manage_app
      && profile.can_view_audits,
  );
}

export async function getCurrentFounderProfile(): Promise<FounderProfile | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  if (!sb) return null;

  const { data: authData } = await sb.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;

  const { data, error } = await sb
    .from('app_profiles')
    .select('user_id,email,role,can_view_audits,can_manage_app,exclude_from_analytics')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as FounderProfile;
}

export async function getFounderBusinessSnapshot(): Promise<FounderBusinessSnapshot | null> {
  const profile = await getCurrentFounderProfile();
  if (!isFounderBusinessProfile(profile)) return null;

  const sb = getSupabase();
  if (!sb) return null;

  const [issuesResult, auditsResult, releasesResult, latestReleaseResult] = await Promise.all([
    sb
      .from('control_room_issues')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'resolved')
      .neq('status', 'ignored'),
    sb.from('audit_events').select('id', { count: 'exact', head: true }).eq('resolved', false),
    sb.from('control_room_releases').select('id', { count: 'exact', head: true }),
    sb
      .from('control_room_releases')
      .select('release_key,status,deployed_at')
      .order('deployed_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const firstError = [issuesResult.error, auditsResult.error, releasesResult.error, latestReleaseResult.error]
    .find(Boolean);
  if (firstError) throw firstError;

  return {
    users: null,
    openIssues: issuesResult.count ?? 0,
    unresolvedAudits: auditsResult.count ?? 0,
    releases: releasesResult.count ?? 0,
    latestRelease: latestReleaseResult.data ?? null,
  };
}

export async function listFounderAuditEvents(limit = 40): Promise<AuditEvent[]> {
  if (!isSupabaseConfigured) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from('audit_events')
    .select('id,user_id,event_type,screen,severity,message,metadata,resolved,created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as AuditEvent[];
}

export async function logAuditEvent(input: {
  event_type: string;
  screen?: string;
  severity?: AuditSeverity;
  message?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured) return;
  const sb = getSupabase();
  if (!sb) return;

  const { data: authData } = await sb.auth.getUser();
  const userId = authData.user?.id ?? null;

  await sb.from('audit_events').insert({
    user_id: userId,
    event_type: input.event_type,
    screen: input.screen ?? null,
    severity: input.severity ?? 'info',
    message: input.message ?? null,
    metadata: input.metadata ?? {},
  });
}

export function auditEventToCard(event: AuditEvent): FounderAuditCard {
  const severity = event.severity ?? 'info';
  const screen = event.screen ? ` on ${event.screen}` : '';
  return {
    id: event.id,
    category: 'runtime',
    severity,
    title: event.event_type.replace(/_/g, ' '),
    summary: event.message || `Live app audit event${screen}.`,
    fix: 'Open the related route, reproduce the issue, then patch the feature and mark the audit event resolved from the founder dashboard.',
    source: 'live-audit-event',
  };
}

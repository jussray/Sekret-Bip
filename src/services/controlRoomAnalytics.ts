import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';

export type MetricPoint = { label: string; value: number; secondary?: number };
export type ReleaseHealth = {
  release_key: string;
  commit_sha: string;
  branch: string;
  deployed_at: string;
  status: string;
  issue_count: number;
  error_count: number;
  warning_count: number;
  regression_count: number;
  summary: Record<string, unknown> | null;
};

export type CompanionFallbackAnalytics = {
  total: number;
  safety: number;
  identity: number;
  natural: number;
  founderApprovalState: 'draft_founder_review';
  latestPackVersion: string | null;
  byCompanion: MetricPoint[];
  bySurface: MetricPoint[];
  byPackVersion: MetricPoint[];
};

export type ControlRoomAnalytics = {
  cost: {
    estimatedUsd: number;
    requests: number;
    tokens: number;
    byProvider: MetricPoint[];
  };
  companions: MetricPoint[];
  voice: MetricPoint[];
  signals: MetricPoint[];
  adoption: MetricPoint[];
  crashes: MetricPoint[];
  fallback?: CompanionFallbackAnalytics;
  releases: ReleaseHealth[];
};

type AuditRow = {
  event_type: string;
  severity: string | null;
  screen: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const emptyFallbackAnalytics: CompanionFallbackAnalytics = {
  total: 0,
  safety: 0,
  identity: 0,
  natural: 0,
  founderApprovalState: 'draft_founder_review',
  latestPackVersion: null,
  byCompanion: [],
  bySurface: [],
  byPackVersion: [],
};

const numberValue = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const textValue = (value: unknown): string | null =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

function countBy(rows: AuditRow[], picker: (row: AuditRow) => string | null): MetricPoint[] {
  const counts = new Map<string, number>();
  rows.forEach((row) => {
    const key = picker(row);
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return [...counts.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function isCompanionFallbackRow(row: AuditRow): boolean {
  return row.event_type === 'companion_fallback_used'
    || row.event_type === 'companion_fallback'
    || row.event_type.includes('companion_fallback');
}

function loadFallbackAnalytics(rows: AuditRow[]): CompanionFallbackAnalytics {
  const fallbackRows = rows.filter(isCompanionFallbackRow);
  const safety = fallbackRows.filter((row) => row.metadata?.safety_flag === true || row.metadata?.fallback_kind === 'safety').length;
  const identity = fallbackRows.filter((row) => row.metadata?.identity_disclosure === true || row.metadata?.fallback_kind === 'identity').length;
  const byPackVersion = countBy(
    fallbackRows,
    (row) => textValue(row.metadata?.fallback_pack_version) || textValue(row.metadata?.pack_version),
  );

  return {
    total: fallbackRows.length,
    safety,
    identity,
    natural: Math.max(0, fallbackRows.length - safety - identity),
    founderApprovalState: 'draft_founder_review',
    latestPackVersion: byPackVersion[0]?.label ?? null,
    byCompanion: countBy(
      fallbackRows,
      (row) => textValue(row.metadata?.companion) || textValue(row.metadata?.character_id) || textValue(row.metadata?.characterId),
    ),
    bySurface: countBy(
      fallbackRows,
      (row) => textValue(row.metadata?.surface) || row.screen,
    ),
    byPackVersion,
  };
}

export async function loadControlRoomAnalytics(days = 30): Promise<ControlRoomAnalytics> {
  const empty: ControlRoomAnalytics = {
    cost: { estimatedUsd: 0, requests: 0, tokens: 0, byProvider: [] },
    companions: [],
    voice: [],
    signals: [],
    adoption: [],
    crashes: [],
    fallback: emptyFallbackAnalytics,
    releases: [],
  };
  if (!isSupabaseConfigured) return empty;
  const sb = getSupabase();
  if (!sb) return empty;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const [eventsResult, releasesResult] = await Promise.all([
    sb
      .from('audit_events')
      .select('event_type,severity,screen,metadata,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(2500),
    sb
      .from('control_room_releases')
      .select('release_key,commit_sha,branch,deployed_at,status,issue_count,error_count,warning_count,regression_count,summary')
      .order('deployed_at', { ascending: false })
      .limit(20),
  ]);

  const rows = (eventsResult.data ?? []) as AuditRow[];
  let estimatedUsd = 0;
  let tokens = 0;
  let requests = 0;
  const providerCost = new Map<string, number>();

  rows.forEach((row) => {
    const metadata = row.metadata ?? {};
    const cost = numberValue(metadata.estimated_cost_usd) || numberValue(metadata.cost_usd);
    const tokenCount = numberValue(metadata.total_tokens)
      || numberValue(metadata.input_tokens) + numberValue(metadata.output_tokens);
    const provider = textValue(metadata.provider) || textValue(metadata.voice_source) || 'unknown';
    if (cost || tokenCount || row.event_type.includes('openai') || row.event_type.includes('voice')) requests += 1;
    estimatedUsd += cost;
    tokens += tokenCount;
    if (cost) providerCost.set(provider, (providerCost.get(provider) ?? 0) + cost);
  });

  const companions = countBy(rows, (row) => {
    const metadata = row.metadata ?? {};
    return textValue(metadata.companion) || textValue(metadata.character_id) || textValue(metadata.characterId);
  });

  const voice = countBy(
    rows.filter((row) => /voice|tts|stt|audio/i.test(row.event_type)),
    (row) => textValue(row.metadata?.voice_source) || textValue(row.metadata?.provider) || row.event_type,
  );

  const signals = countBy(
    rows.filter((row) => /abandon|repeat|failed_submission|empty_state|slow|behavior|signal/i.test(row.event_type)),
    (row) => row.event_type,
  );

  const adoption = countBy(
    rows.filter((row) => /opened|started|completed|created|selected|redeemed/i.test(row.event_type)),
    (row) => row.screen || row.event_type.replace(/_(opened|started|completed|created|selected|redeemed).*$/i, ''),
  );

  const crashes = countBy(
    rows.filter((row) => row.severity === 'critical' || /crash|exception|fatal|unhandled/i.test(row.event_type)),
    (row) => row.screen || row.event_type,
  );

  return {
    cost: {
      estimatedUsd,
      requests,
      tokens,
      byProvider: [...providerCost.entries()]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
    },
    companions,
    voice,
    signals,
    adoption,
    crashes,
    fallback: loadFallbackAnalytics(rows),
    releases: (releasesResult.data ?? []) as ReleaseHealth[],
  };
}

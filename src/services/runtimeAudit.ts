// Shared runtime audit logger for sanitized Control Room telemetry.
import { getSupabase, isSupabaseConfigured } from '@/utils/supabase';
import { ingestAuditEvent } from '@/services/issueNormalizer';
import type { AuditEvent, AuditSeverity } from '@/services/founderAudit';

export type RuntimeAuditSource =
  | 'supabase'
  | 'cloudflare_worker'
  | 'openai'
  | 'navigation'
  | 'asset'
  | 'circle'
  | 'parent_window'
  | 'rewards'
  | 'voice_runtime'
  | 'memory'
  | 'companion_fallback'
  | 'manual';

export interface RuntimeAuditInput {
  event_type: string;
  screen?: string | null;
  severity?: AuditSeverity;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface CompanionFallbackTelemetryInput {
  characterId: string;
  surface?: string | null;
  mood?: string | null;
  historyTurnCount?: number;
  reason: string;
  fallback: {
    safetyFlag?: boolean;
    tone?: string;
    suggestedComfortTool?: string | null;
    fallbackPackVersion?: string;
    fallbackVariantId?: string;
  };
}

function sanitizeMetadata(input?: Record<string, unknown> | null): Record<string, unknown> {
  if (!input) return {};

  const blockedKeys = new Set([
    'journalText',
    'journal_text',
    'rawAudio',
    'raw_audio',
    'audioBlob',
    'audio_blob',
    'token',
    'access_token',
    'refresh_token',
    'apiKey',
    'api_key',
    'authorization',
    'conversation',
    'conversationText',
    'conversation_text',
    'transcript',
    'fullTranscript',
    'full_transcript',
    'messageText',
    'message_text',
    'content',
    'payload',
  ]);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (blockedKeys.has(key)) continue;
    if (typeof value === 'string' && value.length > 240) {
      out[key] = `${value.slice(0, 237)}...`;
      continue;
    }
    out[key] = value;
  }
  return out;
}

function sourceToEventPrefix(source: RuntimeAuditSource): string {
  switch (source) {
    case 'supabase': return 'supabase';
    case 'cloudflare_worker': return 'worker';
    case 'openai': return 'openai';
    case 'navigation': return 'navigation';
    case 'asset': return 'asset';
    case 'circle': return 'circle';
    case 'parent_window': return 'parent';
    case 'rewards': return 'reward';
    case 'voice_runtime': return 'voice_bip';
    case 'memory': return 'memory';
    case 'companion_fallback': return 'companion_fallback';
    default: return 'runtime';
  }
}

export async function logRuntimeAuditEvent(
  source: RuntimeAuditSource,
  input: RuntimeAuditInput,
): Promise<AuditEvent | null> {
  if (!isSupabaseConfigured) return null;
  const sb = getSupabase();
  if (!sb) return null;

  const { data: authData } = await sb.auth.getUser();
  const userId = authData.user?.id ?? null;

  const normalizedEventType = input.event_type.startsWith(sourceToEventPrefix(source))
    ? input.event_type
    : `${sourceToEventPrefix(source)}_${input.event_type}`;

  const payload = {
    user_id: userId,
    event_type: normalizedEventType,
    screen: input.screen ?? null,
    severity: input.severity ?? 'error',
    message: input.message ?? null,
    metadata: {
      ...sanitizeMetadata(input.metadata),
      source,
      logged_at: new Date().toISOString(),
    },
  };

  const { data, error } = await sb
    .from('audit_events')
    .insert(payload)
    .select('id,user_id,event_type,screen,severity,message,metadata,resolved,created_at')
    .single();

  if (error || !data) {
    console.warn('[runtimeAudit] insert failed:', error?.message);
    return null;
  }

  const event = data as AuditEvent;
  await ingestAuditEvent(event).catch((e) => {
    console.warn('[runtimeAudit] normalization failed:', e instanceof Error ? e.message : e);
  });

  return event;
}

function fallbackKind(variantId?: string): 'safety' | 'identity' | 'natural' {
  if (!variantId) return 'natural';
  if (variantId.endsWith(':safety')) return 'safety';
  if (variantId.endsWith(':identity')) return 'identity';
  return 'natural';
}

export async function logCompanionFallbackUsage(input: CompanionFallbackTelemetryInput): Promise<void> {
  const fallbackPackVersion = input.fallback.fallbackPackVersion ?? 'unknown';
  const fallbackVariantId = input.fallback.fallbackVariantId ?? `${fallbackPackVersion}:unknown`;
  const kind = fallbackKind(fallbackVariantId);

  await logRuntimeAuditEvent('companion_fallback', {
    event_type: 'used',
    screen: input.surface ? `companion:${input.surface}` : 'companion',
    severity: input.fallback.safetyFlag ? 'warning' : 'info',
    message: null,
    metadata: {
      companion: input.characterId,
      character_id: input.characterId,
      surface: input.surface ?? 'unknown',
      mood_present: Boolean(input.mood),
      history_turn_count: Number.isFinite(input.historyTurnCount) ? input.historyTurnCount : 0,
      reason: input.reason,
      fallback_pack_version: fallbackPackVersion,
      fallback_variant_id: fallbackVariantId,
      fallback_kind: kind,
      identity_disclosure: kind === 'identity',
      safety_flag: Boolean(input.fallback.safetyFlag),
      suggested_comfort_tool: input.fallback.suggestedComfortTool ?? null,
      tone: input.fallback.tone ?? 'fallback',
    },
  });
}

export async function captureRuntimeError(
  source: RuntimeAuditSource,
  error: unknown,
  context: {
    event_type: string;
    screen?: string | null;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown> | null;
  },
): Promise<AuditEvent | null> {
  const message = error instanceof Error ? error.message : String(error);
  // Returns the created audit_events row (or null if logging failed/offline)
  // so callers can offer a "report this" action tied to the exact event —
  // see src/services/userReports.ts::reportOwnAuditEvent.
  return logRuntimeAuditEvent(source, {
    event_type: context.event_type,
    screen: context.screen,
    severity: context.severity ?? 'error',
    message,
    metadata: {
      ...(context.metadata ?? {}),
      error_name: error instanceof Error ? error.name : 'UnknownError',
    },
  });
}

export async function withRuntimeAudit<T>(
  source: RuntimeAuditSource,
  context: {
    event_type: string;
    screen?: string | null;
    severity?: AuditSeverity;
    metadata?: Record<string, unknown> | null;
  },
  task: () => Promise<T>,
): Promise<T> {
  try {
    return await task();
  } catch (error) {
    await captureRuntimeError(source, error, context);
    throw error;
  }
}

export async function logSupabaseFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('supabase', input);
}

export async function logWorkerFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('cloudflare_worker', input);
}

export async function logOpenAIFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('openai', input);
}

export async function logNavigationFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('navigation', input);
}

export async function logAssetFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('asset', input);
}

export async function logCircleFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('circle', input);
}

export async function logParentWindowFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('parent_window', input);
}

export async function logRewardFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('rewards', input);
}

export async function logVoiceRuntimeFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('voice_runtime', input);
}

export async function logMemoryFailure(input: RuntimeAuditInput): Promise<void> {
  await logRuntimeAuditEvent('memory', input);
}

import { getSupabase } from '@/utils/supabase';

export type LogEventFailureReason =
  | 'supabase_unavailable'
  | 'auth_lookup_failed'
  | 'unauthenticated'
  | 'insert_failed'
  | 'unexpected_error';

export type LogEventResult =
  | { ok: true }
  | { ok: false; reason: LogEventFailureReason; retryable: boolean };

/**
 * Privacy-safe event logger → app_events table.
 *
 * Callers receive bounded write truth so analytics failures cannot silently
 * become successful-looking metrics. Provider/auth error bodies are never
 * returned or logged here.
 */
export async function logEvent(
  event_type: string,
  metadata: Record<string, unknown> = {}
): Promise<LogEventResult> {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return { ok: false, reason: 'supabase_unavailable', retryable: false };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError) {
      return { ok: false, reason: 'auth_lookup_failed', retryable: true };
    }
    if (!user) {
      return { ok: false, reason: 'unauthenticated', retryable: false };
    }

    const { error: insertError } = await supabase.from('app_events').insert({
      user_id: user.id,
      event_type,
      metadata,
    });
    if (insertError) {
      return { ok: false, reason: 'insert_failed', retryable: true };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'unexpected_error', retryable: true };
  }
}

import { getSupabase } from '@/utils/supabase';

const WELCOME_EMAIL_TIMEOUT_MS = 4_000;

export type WelcomeEmailStatus =
  | 'sent'
  | 'already_sent'
  | 'not_eligible'
  | 'unconfirmed'
  | 'unavailable'
  | 'failed';

export type WelcomeEmailResult = Readonly<{
  ok: boolean;
  status: WelcomeEmailStatus;
}>;

/**
 * Best-effort post-auth welcome delivery.
 *
 * Delivery authority stays server-side. The client never supplies a recipient,
 * display name, account side, sender, or provider credential.
 */
export async function ensureWelcomeEmail(): Promise<WelcomeEmailResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, status: 'unavailable' };

  try {
    // Expo SDK 56 supplies AbortSignal.timeout on native and web supports
    // this standard signal. Abort the request at the deadline.
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {},
      signal: AbortSignal.timeout(WELCOME_EMAIL_TIMEOUT_MS),
    });

    if (error || !data || typeof data !== 'object') {
      console.warn('WELCOME_EMAIL_FUNCTION_UNAVAILABLE');
      return { ok: false, status: 'failed' };
    }

    const rawStatus = (data as { status?: unknown }).status;
    const status: WelcomeEmailStatus =
      rawStatus === 'sent'
      || rawStatus === 'already_sent'
      || rawStatus === 'not_eligible'
      || rawStatus === 'unconfirmed'
        ? rawStatus
        : 'failed';

    return {
      ok: status !== 'failed',
      status,
    };
  } catch {
    console.warn('WELCOME_EMAIL_DELIVERY_FAILED');
    return { ok: false, status: 'failed' };
  }
}

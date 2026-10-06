import { getSupabase } from '@/utils/supabase';

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
    const { data, error } = await supabase.functions.invoke('send-welcome-email', {
      body: {},
    });

    if (error || !data || typeof data !== 'object') {
      console.warn('[welcome-email] delivery function unavailable');
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
    console.warn('[welcome-email] delivery function failed');
    return { ok: false, status: 'failed' };
  }
}

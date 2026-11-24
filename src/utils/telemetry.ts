// src/utils/telemetry.ts
// Se'kret Bip — Web Gateway Onboarding Funnel Telemetry
//
// Complies with docs/contracts/web-gateway-parent-link.md:
// - Canonical Table: public.analytics_events
// - Events:
//   - signup_attempted: Emitted when visitor submits /login signup form (side: 'teen' | 'parent', age_band).
//   - teen_age_selected: Emitted when visitor selects age band on /welcome ('under-13' | '13-15' | '16-17' | '18+').
// - Privacy Boundaries:
//   - Telemetry payloads must not include raw email, password, or identifying PII.

import { getSupabase } from './supabase';

export type FunnelEventName =
  | 'signup_attempted'
  | 'teen_age_selected'
  | string;

export interface TelemetryPayload {
  side?: 'teen' | 'parent' | string;
  age_band?: string | null;
  source?: string;
  destination?: string;
  char_length?: number;
  [key: string]: unknown;
}

export async function trackAnalyticsEvent(
  eventName: FunnelEventName,
  payload: TelemetryPayload = {},
  userId?: string | null
): Promise<boolean> {
  try {
    const sb = getSupabase();
    if (!sb) return false;

    let resolvedUserId = userId ?? null;
    if (!resolvedUserId) {
      try {
        const { data } = await sb.auth.getUser();
        resolvedUserId = data?.user?.id ?? null;
      } catch {
        resolvedUserId = null;
      }
    }

    const { error } = await sb.from('analytics_events').insert({
      event_name: eventName,
      payload,
      user_id: resolvedUserId,
    });

    // Analytics must be best-effort; never log potentially sensitive payloads,
    // provider responses, event names or exception objects in the client.
    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

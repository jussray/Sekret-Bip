import { getSupabase } from '@/utils/supabase';

export type AccountDeletionStatus = 'pending' | 'processing' | 'cancelled' | 'completed' | 'failed';

export interface AccountDeletionRequest {
  id: string;
  status: AccountDeletionStatus;
  requestedAt: string;
  scheduledFor: string;
  cancelledAt?: string | null;
  completedAt?: string | null;
  failureReason?: string | null;
}

export type AccountDeletionResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function normalizeRequest(data: unknown): AccountDeletionRequest | null {
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  if (
    typeof row.id !== 'string' ||
    typeof row.status !== 'string' ||
    typeof row.requested_at !== 'string' ||
    typeof row.scheduled_for !== 'string'
  ) {
    return null;
  }

  return {
    id: row.id,
    status: row.status as AccountDeletionStatus,
    requestedAt: row.requested_at,
    scheduledFor: row.scheduled_for,
    cancelledAt: typeof row.cancelled_at === 'string' ? row.cancelled_at : null,
    completedAt: typeof row.completed_at === 'string' ? row.completed_at : null,
    failureReason: typeof row.failure_reason === 'string' ? row.failure_reason : null,
  };
}

export async function fetchAccountDeletionRequest(): Promise<AccountDeletionRequest | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('account_deletion_requests')
    .select('id,status,requested_at,scheduled_for,cancelled_at,completed_at,failure_reason')
    .order('requested_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (__DEV__) console.info('[account-deletion] status lookup failed', error.message);
    return null;
  }

  return normalizeRequest(data);
}

export async function requestAccountDeletion(): Promise<AccountDeletionResult<AccountDeletionRequest>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Account deletion is unavailable right now.' };

  const { data, error } = await supabase.functions.invoke('account-deletion-request', {
    body: { confirmed: true },
  });

  if (error) {
    if (__DEV__) console.info('[account-deletion] request failed', error.message);
    return { ok: false, message: 'Could not schedule account deletion. Check your connection and try again.' };
  }

  const request = normalizeRequest((data as { request?: unknown } | null)?.request);
  if (!request) return { ok: false, message: 'The server returned an invalid deletion request.' };

  return { ok: true, value: request };
}

export async function cancelAccountDeletion(): Promise<AccountDeletionResult<AccountDeletionRequest>> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Account deletion is unavailable right now.' };

  const { data, error } = await supabase.functions.invoke('account-request-cancel', {
    body: {},
  });

  if (error) {
    if (__DEV__) console.info('[account-deletion] cancellation failed', error.message);
    return { ok: false, message: 'Could not cancel the deletion request. Check your connection and try again.' };
  }

  const raw = (data as { request?: Record<string, unknown> } | null)?.request;
  if (!raw || typeof raw.id !== 'string' || typeof raw.status !== 'string') {
    return { ok: false, message: 'The server returned an invalid cancellation response.' };
  }

  const current = await fetchAccountDeletionRequest();
  if (current) return { ok: true, value: current };

  return {
    ok: true,
    value: {
      id: raw.id,
      status: raw.status as AccountDeletionStatus,
      requestedAt: '',
      scheduledFor: '',
      cancelledAt: typeof raw.cancelled_at === 'string' ? raw.cancelled_at : null,
    },
  };
}

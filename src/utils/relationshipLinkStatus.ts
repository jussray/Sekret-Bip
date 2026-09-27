import { captureRuntimeError } from '@/services/runtimeAudit';
import { getSupabase } from './supabase';
import { mapParentLinkRpcError } from './parentLinkErrors';
import type { ParentLinkErrorCode, ParentLinkResult } from './parentLink';

export type ParentLinkStatus = 'pending' | 'active' | 'revoked' | 'expired';
export type ParentLinkAccountSide = 'teen' | 'parent';

export interface ParentLinkStatusSnapshot {
  linkId: string;
  status: ParentLinkStatus;
  isActive: boolean;
  updatedAt: string | null;
  expiresAt: string | null;
  canRevoke: boolean;
}

interface ParentLinkStatusRow {
  id?: unknown;
  status?: unknown;
  is_active?: unknown;
  updated_at?: unknown;
  expires_at?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PARENT_LINK_STATUSES = new Set<ParentLinkStatus>(['pending', 'active', 'revoked', 'expired']);

async function auditParentLinkFailure(
  eventType: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await captureRuntimeError('parent_window', error, {
    event_type: eventType,
    screen: 'parentLinkStatus',
    severity: 'warning',
    metadata,
  }).catch(() => {});
}

function rpcFailure(error: { message?: string | null }): { code: ParentLinkErrorCode; message: string } {
  return mapParentLinkRpcError(error.message);
}

async function currentUserIdResult(): Promise<ParentLinkResult<string>> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, code: 'not_configured', message: 'The secure connection service is not configured.' };
  }

  try {
    const { data, error } = await sb.auth.getUser();
    if (error) {
      await auditParentLinkFailure('auth_user_lookup_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return { ok: false, code: 'server_error', message: 'Could not verify your account. Check your connection and try again.' };
    }

    const userId = data?.user?.id;
    if (!userId) {
      return { ok: false, code: 'not_authenticated', message: 'Sign in to manage a parent link.' };
    }

    return { ok: true, value: userId };
  } catch (error) {
    await auditParentLinkFailure('auth_user_lookup_threw', error);
    return { ok: false, code: 'server_error', message: 'Could not verify your account. Check your connection and try again.' };
  }
}

export async function fetchParentLinkStatuses(
  accountSide: ParentLinkAccountSide,
): Promise<ParentLinkResult<ParentLinkStatusSnapshot[]>> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, code: 'not_configured', message: 'The secure connection service is not configured.' };
  }

  const userResult = await currentUserIdResult();
  if (!userResult.ok) return userResult;

  try {
    let query = sb
      .from('parent_links')
      .select('id,status,is_active,updated_at,expires_at')
      .order('updated_at', { ascending: false });

    query = accountSide === 'teen'
      ? query.eq('teen_user_id', userResult.value)
      : query.eq('parent_user_id', userResult.value);

    const { data, error } = await query;
    if (error) {
      await auditParentLinkFailure('link_status_lookup_failed', new Error(error.message), {
        account_side: accountSide,
        error_code: error.code ?? null,
      });
      return { ok: false, code: 'server_error', message: 'Could not load link status. Check your connection and retry.' };
    }

    if (!Array.isArray(data)) {
      await auditParentLinkFailure('link_status_response_invalid', new Error('Expected a link status list'), {
        account_side: accountSide,
        response_type: typeof data,
      });
      return { ok: false, code: 'invalid_response', message: 'The link status could not be verified. Retry before making changes.' };
    }

    const links: ParentLinkStatusSnapshot[] = [];
    for (const value of data) {
      const row = value as ParentLinkStatusRow;
      if (
        typeof row.id !== 'string'
        || !UUID_PATTERN.test(row.id)
        || typeof row.status !== 'string'
        || !PARENT_LINK_STATUSES.has(row.status as ParentLinkStatus)
        || typeof row.is_active !== 'boolean'
        || (row.updated_at != null && typeof row.updated_at !== 'string')
        || (row.expires_at != null && typeof row.expires_at !== 'string')
      ) {
        await auditParentLinkFailure('link_status_row_invalid', new Error('Unverified link status row'), {
          account_side: accountSide,
        });
        return { ok: false, code: 'invalid_response', message: 'The link status could not be verified. Retry before making changes.' };
      }

      const status = row.status as ParentLinkStatus;
      links.push({
        linkId: row.id,
        status,
        isActive: row.is_active,
        updatedAt: row.updated_at ?? null,
        expiresAt: row.expires_at ?? null,
        canRevoke: row.is_active && (status === 'pending' || status === 'active'),
      });
    }

    return { ok: true, value: links };
  } catch (error) {
    await auditParentLinkFailure('link_status_lookup_threw', error, { account_side: accountSide });
    return { ok: false, code: 'server_error', message: 'Could not load link status. Check your connection and retry.' };
  }
}

export async function revokeParentLinkResult(
  linkId?: string,
): Promise<ParentLinkResult<boolean>> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, code: 'not_configured', message: 'The secure connection service is not configured.' };
  }

  if (linkId && !UUID_PATTERN.test(linkId)) {
    return { ok: false, code: 'invalid_response', message: 'The selected link could not be verified. Refresh and try again.' };
  }

  const userResult = await currentUserIdResult();
  if (!userResult.ok) return userResult;

  try {
    const request = linkId
      ? sb.rpc('revoke_parent_link', { p_link_id: linkId })
      : sb.rpc('revoke_parent_link');
    const { data, error } = await request;
    if (error) {
      await auditParentLinkFailure('link_revocation_rpc_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      const failure = rpcFailure(error);
      return { ok: false, ...failure };
    }

    if (typeof data !== 'boolean') {
      await auditParentLinkFailure('link_revocation_response_invalid', new Error('Invalid revocation response shape'));
      return { ok: false, code: 'invalid_response', message: 'The server response could not be verified. Refresh link status before retrying.' };
    }

    return { ok: true, value: data };
  } catch (error) {
    await auditParentLinkFailure('link_revocation_threw', error);
    return { ok: false, code: 'server_error', message: 'Could not unlink right now. Check your connection and try again.' };
  }
}

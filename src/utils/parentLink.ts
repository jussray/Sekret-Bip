// src/utils/parentLink.ts
// Se'kret Bip — Parent ↔ Teen linking helpers

import { captureRuntimeError } from '@/services/runtimeAudit';
import { getSupabase } from './supabase';
import {
  mapParentLinkRpcError,
  type ParentLinkErrorCode,
  type ParentLinkFailure,
} from './parentLinkErrors';

export type { ParentLinkErrorCode } from './parentLinkErrors';

export const PARENT_INVITE_CODE_LENGTH = 8;

export type ParentLinkResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ParentLinkErrorCode; message: string };

export interface RedeemedParentLink {
  linkId: string;
  teenUserId: string;
  parentUserId: string;
  status: 'active';
  activatedAt: string | null;
}

export type ParentInviteEmailStatus = 'not_requested' | 'sent' | 'failed';

export interface ParentInviteEmailDelivery {
  status: ParentInviteEmailStatus;
  errorCode?: string | null;
}

export interface GeneratedParentInvite {
  code: string;
  email: ParentInviteEmailDelivery;
}

export interface CreateParentInviteOptions {
  parentEmail?: string | null;
}

interface ParentLinkCreateResponse {
  ok?: unknown;
  invite?: {
    invite_code?: unknown;
    expires_at?: unknown;
  } | null;
  email?: {
    status?: unknown;
    error_code?: unknown;
  } | null;
  error?: unknown;
}

interface RedeemParentLinkRow {
  link_id?: unknown;
  teen_user_id?: unknown;
  parent_user_id?: unknown;
  status?: unknown;
  activated_at?: unknown;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function auditParentLinkFailure(
  eventType: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await captureRuntimeError('parent_window', error, {
    event_type: eventType,
    screen: 'parentLink',
    severity: 'warning',
    metadata,
  }).catch(() => {});
}

function rpcFailure(error: { message?: string | null; code?: string | null; hint?: string | null }): ParentLinkFailure {
  return mapParentLinkRpcError(error.message);
}

function normalizeOptionalEmail(value?: string | null): string | null {
  const trimmed = value?.trim().toLowerCase() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

function parseEmailDelivery(
  value: ParentLinkCreateResponse['email'],
  requested: boolean,
): ParentInviteEmailDelivery {
  if (!requested) return { status: 'not_requested' };

  if (value?.status === 'sent') return { status: 'sent' };
  if (value?.status === 'failed') {
    return {
      status: 'failed',
      errorCode: typeof value.error_code === 'string' ? value.error_code : null,
    };
  }

  return { status: 'failed', errorCode: 'invalid_email_delivery_response' };
}

export function normalizeParentInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, PARENT_INVITE_CODE_LENGTH);
}

export function validateRedeemedParentLink(
  data: unknown,
  expectedParentId: string,
): RedeemedParentLink | null {
  const row: RedeemParentLinkRow | null = Array.isArray(data)
    ? ((data[0] as RedeemParentLinkRow | undefined) ?? null)
    : data && typeof data === 'object'
      ? (data as RedeemParentLinkRow)
      : null;

  if (!row) return null;
  if (typeof row.link_id !== 'string' || !UUID_PATTERN.test(row.link_id)) return null;
  if (typeof row.teen_user_id !== 'string' || !UUID_PATTERN.test(row.teen_user_id)) return null;
  if (typeof row.parent_user_id !== 'string' || row.parent_user_id !== expectedParentId) return null;
  if (row.status !== 'active') return null;
  if (row.activated_at != null && typeof row.activated_at !== 'string') return null;

  return {
    linkId: row.link_id,
    teenUserId: row.teen_user_id,
    parentUserId: row.parent_user_id,
    status: 'active',
    activatedAt: row.activated_at ?? null,
  };
}

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data, error } = await sb.auth.getUser();
    if (error) {
      await auditParentLinkFailure('auth_user_lookup_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return null;
    }
    return data?.user?.id ?? null;
  } catch (error) {
    await auditParentLinkFailure('auth_user_lookup_threw', error);
    return null;
  }
}

export async function generateInviteCodeWithDeliveryResult(
  options: CreateParentInviteOptions = {},
): Promise<ParentLinkResult<GeneratedParentInvite>> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, code: 'not_configured', message: 'The secure connection service is not configured.' };
  }

  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in to create a parent invite code.' };
  }

  const parentEmail = normalizeOptionalEmail(options.parentEmail);

  try {
    if (parentEmail) {
      const { data, error } = await sb.functions.invoke('parent-link-create', {
        body: { parentEmail },
      });

      if (error) {
        await auditParentLinkFailure('invite_generation_edge_failed', new Error(error.message), {
          error_name: error.name,
        });
        return { ok: false, code: 'server_error', message: 'Could not create or email the invite code. Try again.' };
      }

      const payload = data as ParentLinkCreateResponse | null;
      const rawCode = payload?.invite?.invite_code;
      const code = typeof rawCode === 'string' ? normalizeParentInviteCode(rawCode) : '';
      if (code.length !== PARENT_INVITE_CODE_LENGTH) {
        await auditParentLinkFailure(
          'invite_generation_edge_response_invalid',
          new Error('Invalid parent-link-create response shape'),
          { response_type: Array.isArray(data) ? 'array' : typeof data },
        );
        return { ok: false, code: 'invalid_response', message: 'The server returned an invalid invite code.' };
      }

      return {
        ok: true,
        value: {
          code,
          email: parseEmailDelivery(payload?.email, true),
        },
      };
    }

    const { data, error } = await sb.rpc('create_parent_link_invite');
    if (error) {
      await auditParentLinkFailure('invite_generation_rpc_failed', new Error(error.message), {
        error_code: error.code ?? null,
        error_hint: error.hint ?? null,
      });
      const failure = rpcFailure(error);
      return { ok: false, ...failure };
    }

    const code = typeof data === 'string' ? normalizeParentInviteCode(data) : '';
    if (code.length !== PARENT_INVITE_CODE_LENGTH) {
      await auditParentLinkFailure(
        'invite_generation_response_invalid',
        new Error('Invalid invite-code response shape'),
        { response_type: Array.isArray(data) ? 'array' : typeof data },
      );
      return { ok: false, code: 'invalid_response', message: 'The server returned an invalid invite code.' };
    }

    return {
      ok: true,
      value: {
        code,
        email: { status: 'not_requested' },
      },
    };
  } catch (error) {
    await auditParentLinkFailure('invite_generation_threw', error);
    return { ok: false, code: 'server_error', message: 'Could not create an invite code. Check your connection and try again.' };
  }
}

export async function generateInviteCodeResult(
  options: CreateParentInviteOptions = {},
): Promise<ParentLinkResult<string>> {
  const result = await generateInviteCodeWithDeliveryResult(options);
  return result.ok ? { ok: true, value: result.value.code } : result;
}

export async function generateInviteCode(): Promise<string | null> {
  const result = await generateInviteCodeResult();
  return result.ok ? result.value : null;
}

export async function fetchPendingInviteCode(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const userId = await currentUserId();
  if (!userId) return null;

  try {
    const { data, error } = await sb
      .from('parent_links')
      .select('invite_code,expires_at,status,is_active')
      .eq('teen_user_id', userId)
      .eq('status', 'pending')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      await auditParentLinkFailure('pending_invite_lookup_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return null;
    }
    if (!data?.invite_code) return null;
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) return null;

    const code = normalizeParentInviteCode(String(data.invite_code));
    return code.length === PARENT_INVITE_CODE_LENGTH ? code : null;
  } catch (error) {
    await auditParentLinkFailure('pending_invite_lookup_threw', error);
    return null;
  }
}

export async function redeemInviteCodeResult(
  code: string,
): Promise<ParentLinkResult<RedeemedParentLink>> {
  const sb = getSupabase();
  if (!sb) {
    return { ok: false, code: 'not_configured', message: 'The secure connection service is not configured.' };
  }

  const normalized = normalizeParentInviteCode(code);
  if (normalized.length !== PARENT_INVITE_CODE_LENGTH) {
    return { ok: false, code: 'invalid_code', message: 'Enter the full eight-character code.' };
  }

  const userId = await currentUserId();
  if (!userId) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in as the parent or trusted adult before connecting.' };
  }

  try {
    const { data, error } = await sb.rpc('redeem_parent_link_invite', {
      p_invite_code: normalized,
    });

    if (error) {
      await auditParentLinkFailure('invite_redemption_rpc_failed', new Error(error.message), {
        error_code: error.code ?? null,
        error_hint: error.hint ?? null,
      });
      const failure = rpcFailure(error);
      return { ok: false, ...failure };
    }

    if (Array.isArray(data) && data.length === 0) {
      await auditParentLinkFailure(
        'invite_redemption_expired',
        new Error('Invite redemption returned no active link'),
      );
      return {
        ok: false,
        code: 'expired_or_used',
        message: 'That code has expired or was already used. Ask your teen for a new one.',
      };
    }

    const redeemedLink = validateRedeemedParentLink(data, userId);
    if (!redeemedLink) {
      await auditParentLinkFailure(
        'invite_redemption_response_invalid',
        new Error('Unverified parent-link response'),
        { response_type: Array.isArray(data) ? 'array' : typeof data },
      );
      return {
        ok: false,
        code: 'invalid_response',
        message: 'The connection response could not be verified. Try again before entering Parent Side.',
      };
    }

    return { ok: true, value: redeemedLink };
  } catch (error) {
    await auditParentLinkFailure('invite_redemption_threw', error);
    return { ok: false, code: 'server_error', message: 'Could not connect right now. Check your connection and try again.' };
  }
}

export async function redeemInviteCode(code: string): Promise<string | null> {
  const result = await redeemInviteCodeResult(code);
  return result.ok ? result.value.teenUserId : null;
}

export async function fetchLinkedTeenId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;

  try {
    const { data, error } = await sb
      .from('parent_links')
      .select('teen_user_id')
      .eq('parent_user_id', uid)
      .eq('status', 'active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      await auditParentLinkFailure('linked_teen_lookup_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return null;
    }

    return typeof data?.teen_user_id === 'string' ? data.teen_user_id : null;
  } catch (error) {
    await auditParentLinkFailure('linked_teen_lookup_threw', error);
    return null;
  }
}

export async function fetchLinkedParentId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const uid = await currentUserId();
  if (!uid) return null;

  try {
    const { data, error } = await sb
      .from('parent_links')
      .select('parent_user_id')
      .eq('teen_user_id', uid)
      .eq('status', 'active')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      await auditParentLinkFailure('linked_parent_lookup_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return null;
    }

    return typeof data?.parent_user_id === 'string' ? data.parent_user_id : null;
  } catch (error) {
    await auditParentLinkFailure('linked_parent_lookup_threw', error);
    return null;
  }
}

export async function revokeParentLink(): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;

  try {
    const { data, error } = await sb.rpc('revoke_parent_link');
    if (error) {
      await auditParentLinkFailure('link_revocation_rpc_failed', new Error(error.message), {
        error_code: error.code ?? null,
      });
      return false;
    }

    return data === true;
  } catch (error) {
    await auditParentLinkFailure('link_revocation_threw', error);
    return false;
  }
}

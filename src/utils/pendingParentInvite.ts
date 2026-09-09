import { captureRuntimeError } from '@/services/runtimeAudit';
import { getSupabase } from '@/utils/supabase';
import {
  normalizeParentInviteCode,
  PARENT_INVITE_CODE_LENGTH,
  type ParentLinkResult,
} from '@/utils/parentLink';

export async function fetchPendingInviteCodeResult(): Promise<ParentLinkResult<string | null>> {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      ok: false,
      code: 'not_configured',
      message: 'The secure connection service is not configured.',
    };
  }

  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) {
      if (userError) {
        await captureRuntimeError('parent_window', new Error(userError.message), {
          event_type: 'pending_invite_auth_lookup_failed',
          screen: 'parentLink',
          severity: 'warning',
          metadata: { error_code: userError.code ?? null },
        }).catch(() => {});
      }
      return {
        ok: false,
        code: 'not_authenticated',
        message: 'Sign in to view your parent invite code.',
      };
    }

    const { data, error } = await supabase
      .from('parent_links')
      .select('invite_code,expires_at,status,is_active')
      .eq('teen_user_id', userData.user.id)
      .eq('status', 'pending')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      await captureRuntimeError('parent_window', new Error(error.message), {
        event_type: 'pending_invite_lookup_failed',
        screen: 'parentLink',
        severity: 'warning',
        metadata: { error_code: error.code ?? null },
      }).catch(() => {});
      return {
        ok: false,
        code: 'server_error',
        message: 'Could not check your existing invite code. Try again without creating a new code.',
      };
    }

    if (!data?.invite_code) return { ok: true, value: null };
    if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
      return { ok: true, value: null };
    }

    const code = normalizeParentInviteCode(String(data.invite_code));
    if (code.length !== PARENT_INVITE_CODE_LENGTH) {
      return {
        ok: false,
        code: 'invalid_response',
        message: 'The saved invite code could not be verified. Try again before creating a new code.',
      };
    }

    return { ok: true, value: code };
  } catch (error) {
    await captureRuntimeError('parent_window', error, {
      event_type: 'pending_invite_lookup_threw',
      screen: 'parentLink',
      severity: 'warning',
    }).catch(() => {});
    return {
      ok: false,
      code: 'server_error',
      message: 'Could not check your existing invite code. Check your connection and try again.',
    };
  }
}

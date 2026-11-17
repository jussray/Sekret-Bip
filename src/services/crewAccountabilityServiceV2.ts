import { isRelationshipFeatureAvailable } from '@/constants/relationshipFeatureFlags';
import type { CrewCheckinEmoji, RelationshipResult } from '@/types/relationshipLayer';
import { getSupabase } from '@/utils/supabase';

export interface CrewCheckInInput {
  localDate: string;
  emoji: CrewCheckinEmoji;
  note?: string;
  shareWithUserIds: string[];
}

export interface CrewCheckInItem {
  id: string;
  ownerUserId: string;
  localDate: string;
  emoji: CrewCheckinEmoji;
  note: string | null;
  status: 'active' | 'deleted';
  createdAt: string;
  shares: Array<{ sharedWith: string; status: 'active' | 'revoked' }>;
}

export interface CrewFeedItem {
  checkInId: string;
  shareId: string;
  ownerUserId: string;
  localDate: string;
  emoji: CrewCheckinEmoji;
  note: string | null;
  createdAt: string;
  encouragementCount: number;
  myEncouragementKey: string | null;
}

export interface EncouragementInput {
  checkInId: string;
  recipientUserId: string;
  presetKey: string;
  localDate: string;
}

type Audience = 'founder' | 'internal' | 'beta' | 'public';
const MAX_NOTE_LENGTH = 280;

function unavailable<T>(): RelationshipResult<T> {
  return { ok: false, code: 'not_configured', message: 'Crew Accountability is not available yet.' };
}

function sanitizeNote(raw?: string): string | null {
  const value = raw?.trim().slice(0, MAX_NOTE_LENGTH) ?? '';
  return value || null;
}

async function permanentUser() {
  const supabase = getSupabase();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  const user = data.user && !data.user.is_anonymous ? data.user : null;
  return { supabase, user };
}

export async function createCheckIn(
  input: CrewCheckInInput,
  audience: Audience = 'public',
): Promise<RelationshipResult<{ checkInId: string }>> {
  if (!isRelationshipFeatureAvailable('crewAccountability', audience)) return unavailable();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    return { ok: false, code: 'invalid_input', message: 'localDate must be YYYY-MM-DD.' };
  }

  const { supabase, user } = await permanentUser();
  if (!supabase || !user) {
    return { ok: false, code: 'not_authenticated', message: 'Create a permanent Bip account before using Crew.' };
  }

  const recipients = [...new Set(
    input.shareWithUserIds.map(value => value.trim()).filter(value => value && value !== user.id),
  )];
  if (recipients.length === 0) {
    return { ok: false, code: 'invalid_input', message: 'Choose at least one accepted Crew member.' };
  }

  const { data, error } = await supabase.rpc('create_crew_check_in', {
    p_local_date: input.localDate,
    p_emoji: input.emoji,
    p_note: sanitizeNote(input.note),
    p_share_with: recipients,
  });

  if (error || !data) {
    return {
      ok: false,
      code: error?.code === '42501' ? 'not_authorized' : 'server_error',
      message: error?.message ?? 'Could not create the Crew check-in.',
      retryable: error?.code !== '42501',
    };
  }

  return { ok: true, value: { checkInId: String(data) } };
}

export async function revokeCheckInShare(
  checkInId: string,
  sharedWithUserId: string,
  audience: Audience = 'public',
): Promise<RelationshipResult<{ revoked: boolean }>> {
  if (!isRelationshipFeatureAvailable('crewAccountability', audience)) return unavailable();
  const { supabase, user } = await permanentUser();
  if (!supabase || !user) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in to revoke a share.' };
  }

  const { data, error } = await supabase.rpc('revoke_crew_check_in_share', {
    p_check_in_id: checkInId,
    p_shared_with: sharedWithUserId,
  });

  if (error) {
    return {
      ok: false,
      code: error.code === '42501' ? 'not_authorized' : 'server_error',
      message: error.message || 'Could not revoke the Crew share.',
      retryable: error.code !== '42501',
    };
  }
  if (typeof data !== 'string' || !data) {
    return {
      ok: false,
      code: 'not_authorized',
      message: 'No active Crew share matched this check-in and member.',
    };
  }
  return { ok: true, value: { revoked: true } };
}

export async function fetchMyCheckIns(
  audience: Audience = 'public',
): Promise<RelationshipResult<CrewCheckInItem[]>> {
  if (!isRelationshipFeatureAvailable('crewAccountability', audience)) return unavailable();
  const { supabase, user } = await permanentUser();
  if (!supabase || !user) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in to view your check-ins.' };
  }

  const { data, error } = await supabase
    .from('crew_check_ins')
    .select('id,owner_user_id,local_date,emoji,note,status,created_at,crew_check_in_shares(shared_with,status)')
    .eq('owner_user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return { ok: false, code: 'server_error', message: error.message };

  return {
    ok: true,
    value: (data ?? []).map((row: any) => ({
      id: row.id,
      ownerUserId: row.owner_user_id,
      localDate: row.local_date,
      emoji: row.emoji as CrewCheckinEmoji,
      note: row.note,
      status: row.status,
      createdAt: row.created_at,
      shares: (row.crew_check_in_shares ?? []).map((share: any) => ({
        sharedWith: share.shared_with,
        status: share.status,
      })),
    })),
  };
}

export async function fetchCrewFeed(
  audience: Audience = 'public',
): Promise<RelationshipResult<CrewFeedItem[]>> {
  if (!isRelationshipFeatureAvailable('crewAccountability', audience)) return unavailable();
  const { supabase, user } = await permanentUser();
  if (!supabase || !user) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in to view your Crew feed.' };
  }

  const { data: shares, error: shareError } = await supabase
    .from('crew_check_in_shares')
    .select('id,check_in_id,owner_user_id,status')
    .eq('shared_with', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(50);
  if (shareError) return { ok: false, code: 'server_error', message: shareError.message };
  if (!shares?.length) return { ok: true, value: [] };

  const checkInIds = shares.map((share: any) => share.check_in_id);
  const [{ data: checkIns, error: checkInError }, { data: encouragements, error: encouragementError }] = await Promise.all([
    supabase.from('crew_check_ins').select('id,owner_user_id,local_date,emoji,note,created_at').in('id', checkInIds).eq('status', 'active'),
    supabase.from('crew_encouragements').select('check_in_id,sender_user_id,preset_key').in('check_in_id', checkInIds).eq('status', 'active'),
  ]);
  if (checkInError) return { ok: false, code: 'server_error', message: checkInError.message };
  if (encouragementError) return { ok: false, code: 'server_error', message: encouragementError.message };

  const checkInMap = new Map((checkIns ?? []).map((item: any) => [item.id, item]));
  const counts = new Map<string, number>();
  const mine = new Map<string, string>();
  for (const item of encouragements ?? []) {
    counts.set(item.check_in_id, (counts.get(item.check_in_id) ?? 0) + 1);
    if (item.sender_user_id === user.id) mine.set(item.check_in_id, item.preset_key);
  }

  const value: CrewFeedItem[] = [];
  for (const share of shares) {
    const checkIn: any = checkInMap.get(share.check_in_id);
    if (!checkIn) continue;
    value.push({
      checkInId: checkIn.id,
      shareId: share.id,
      ownerUserId: checkIn.owner_user_id,
      localDate: checkIn.local_date,
      emoji: checkIn.emoji,
      note: checkIn.note,
      createdAt: checkIn.created_at,
      encouragementCount: counts.get(checkIn.id) ?? 0,
      myEncouragementKey: mine.get(checkIn.id) ?? null,
    });
  }
  return { ok: true, value };
}

export async function sendEncouragement(
  input: EncouragementInput,
  audience: Audience = 'public',
): Promise<RelationshipResult<{ encouragementId: string }>> {
  if (!isRelationshipFeatureAvailable('crewAccountability', audience)) return unavailable();
  if (!input.presetKey.trim()) {
    return { ok: false, code: 'invalid_input', message: 'Choose a preset encouragement.' };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.localDate)) {
    return { ok: false, code: 'invalid_input', message: 'localDate must be YYYY-MM-DD.' };
  }

  const { supabase, user } = await permanentUser();
  if (!supabase || !user) {
    return { ok: false, code: 'not_authenticated', message: 'Sign in to send encouragement.' };
  }

  const { data, error } = await supabase
    .from('crew_encouragements')
    .insert({
      check_in_id: input.checkInId,
      sender_user_id: user.id,
      recipient_user_id: input.recipientUserId,
      preset_key: input.presetKey.trim(),
      local_date: input.localDate,
    })
    .select('id')
    .single();

  if (error || !data) {
    return { ok: false, code: 'server_error', message: error?.message ?? 'Could not send encouragement.', retryable: true };
  }
  return { ok: true, value: { encouragementId: data.id } };
}

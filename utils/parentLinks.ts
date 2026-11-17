import { getSupabase, TABLES } from './supabase';

export type ParentTeenLinkStatus = 'pending' | 'approved' | 'blocked' | 'removed';
export type ParentShareKind = 'mood_summary' | 'journal_entry' | 'voice_summary' | 'safety_alert' | 'streaks_rewards';

export interface ParentTeenLink {
  id: string;
  teen_id: string;
  guardian_id: string;
  invite_code: string;
  status: ParentTeenLinkStatus;
  permissions: ParentShareKind[];
  created_at?: string;
  updated_at?: string;
}

export interface TeenSharedContent {
  id: string | number;
  teen_id: string;
  link_id: string;
  share_kind: ParentShareKind;
  source_id?: string | number | null;
  summary: string;
  created_at?: string;
}

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTeenGuardianInviteCode(seed = ''): string {
  const cleanSeed = seed.replace(/[^a-z0-9]/gi, '').toUpperCase();
  let suffix = cleanSeed.slice(0, 6);
  while (suffix.length < 6) suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return `BIP-FAM-${suffix}`;
}

export function isApprovedGuardianLink(link: Pick<ParentTeenLink, 'status'> | null | undefined): boolean {
  return link?.status === 'approved';
}

export function canGuardianAccessSharedContent(
  link: Pick<ParentTeenLink, 'status' | 'permissions'> | null | undefined,
  shareKind: ParentShareKind,
): boolean {
  return link?.status === 'approved' && Array.isArray(link.permissions) && link.permissions.includes(shareKind);
}

async function currentUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user?.id ?? null;
}

export async function createTeenGuardianInvite(): Promise<string | null> {
  const sb = getSupabase();
  const teenId = await currentUserId();
  if (!sb || !teenId) return null;
  const inviteCode = generateTeenGuardianInviteCode(teenId);
  const { error } = await sb.from(TABLES.parentTeenInvites).upsert({
    teen_id: teenId,
    invite_code: inviteCode,
    status: 'pending',
  }, { onConflict: 'teen_id,invite_code' });
  if (error) throw error;
  return inviteCode;
}

export async function requestGuardianLinkByCode(inviteCode: string): Promise<void> {
  const sb = getSupabase();
  const guardianId = await currentUserId();
  if (!sb || !guardianId) return;
  const code = inviteCode.trim().toUpperCase();
  if (!code) return;

  const { data: invite, error: inviteError } = await sb
    .from(TABLES.parentTeenInvites)
    .select('teen_id, invite_code, status')
    .eq('invite_code', code)
    .eq('status', 'pending')
    .maybeSingle();
  if (inviteError) throw inviteError;
  if (!invite) throw new Error('Invite not found or no longer pending.');

  const { error } = await sb.from(TABLES.parentTeenLinks).upsert({
    teen_id: invite.teen_id,
    guardian_id: guardianId,
    invite_code: code,
    status: 'pending',
    permissions: [],
  }, { onConflict: 'teen_id,guardian_id' });
  if (error) throw error;
}

export async function updateGuardianLinkStatus(
  linkId: string,
  status: ParentTeenLinkStatus,
  permissions: ParentShareKind[] = [],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const allowedPermissions = status === 'approved' ? permissions : [];
  const { error } = await sb
    .from(TABLES.parentTeenLinks)
    .update({ status, permissions: allowedPermissions, updated_at: new Date().toISOString() })
    .eq('id', linkId);
  if (error) throw error;
}

export async function shareTeenContentWithGuardian(
  link: ParentTeenLink,
  shareKind: ParentShareKind,
  summary: string,
  sourceId?: string | number,
): Promise<void> {
  if (!canGuardianAccessSharedContent(link, shareKind)) return;
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from(TABLES.teenGuardianShares).insert({
    teen_id: link.teen_id,
    link_id: link.id,
    share_kind: shareKind,
    source_id: sourceId == null ? null : String(sourceId),
    summary,
  });
  if (error) throw error;
}

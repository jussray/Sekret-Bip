import { getSupabase } from '@/utils/supabase';

export type CrewConnectionStatus = 'pending' | 'accepted' | 'blocked' | 'removed';

export interface CrewRelationship {
  id: string | number;
  memberUserId: string | null;
  displayName: string;
  avatarEmoji: string;
  commitment: string;
  cadence: 'daily' | 'weekly' | 'whenever';
  inviteCode: string;
  connectionStatus: CrewConnectionStatus;
  acceptedAt: string | null;
  identityVisibility: 'anonymous' | 'accepted_crew';
}

type CrewRow = {
  id: string | number;
  member_user_id: string | null;
  emoji: string;
  commitment: string;
  cadence: 'daily' | 'weekly' | 'whenever';
  invite_code: string;
  connection_status: CrewConnectionStatus;
  accepted_at: string | null;
};

type CrewProfileRow = {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
};

async function permanentSession() {
  const supabase = getSupabase();
  if (!supabase) return { supabase: null, user: null };
  const { data } = await supabase.auth.getUser();
  const user = data.user && !data.user.is_anonymous ? data.user : null;
  return { supabase, user };
}

export async function loadOwnedCrewRelationships(): Promise<CrewRelationship[]> {
  const { supabase, user } = await permanentSession();
  if (!supabase || !user) return [];

  const { data, error } = await supabase
    .from('crew_members')
    .select('id,member_user_id,emoji,commitment,cadence,invite_code,connection_status,accepted_at')
    .eq('user_id', user.id)
    .neq('connection_status', 'removed')
    .order('added_at', { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as CrewRow[];
  const acceptedIds = [...new Set(
    rows
      .filter(row => row.connection_status === 'accepted' && row.member_user_id)
      .map(row => row.member_user_id as string),
  )];

  let profiles = new Map<string, CrewProfileRow>();
  if (acceptedIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase.rpc(
      'get_crew_connection_profiles',
      { p_user_ids: acceptedIds },
    );
    if (profileError) throw profileError;
    profiles = new Map(
      ((profileRows ?? []) as CrewProfileRow[]).map(profile => [profile.user_id, profile]),
    );
  }

  return rows.map(row => {
    const profile = row.member_user_id ? profiles.get(row.member_user_id) : null;
    const accepted = row.connection_status === 'accepted' && Boolean(profile);
    return {
      id: row.id,
      memberUserId: row.member_user_id,
      displayName: accepted ? profile!.display_name : 'Anonymous account',
      avatarEmoji: accepted ? profile!.avatar_emoji : row.emoji || '🌙',
      commitment: row.commitment,
      cadence: row.cadence,
      inviteCode: row.invite_code,
      connectionStatus: row.connection_status,
      acceptedAt: row.accepted_at,
      identityVisibility: accepted ? 'accepted_crew' : 'anonymous',
    };
  });
}

/** Owner-side action for pending or accepted rows they created. */
export async function setOwnedCrewRelationshipStatus(
  id: string | number,
  status: 'blocked' | 'removed',
): Promise<boolean> {
  const { supabase, user } = await permanentSession();
  if (!supabase || !user) return false;

  const { error } = await supabase
    .from('crew_members')
    .update({ connection_status: status })
    .eq('user_id', user.id)
    .eq('id', id);
  return !error;
}

/** Either participant can block or leave an accepted relationship. */
export async function setAcceptedCrewConnectionStatus(
  otherUserId: string,
  status: 'blocked' | 'removed',
): Promise<boolean> {
  const { supabase, user } = await permanentSession();
  if (!supabase || !user || !otherUserId || otherUserId === user.id) return false;

  const { data, error } = await supabase.rpc('set_crew_connection_status', {
    p_other_user_id: otherUserId,
    p_status: status,
  });
  return !error && data === true;
}

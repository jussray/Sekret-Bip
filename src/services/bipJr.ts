import { getSupabase } from '@/utils/supabase';

export type BipJrAgeBand = '5-7' | '8-10' | '11-12';

export interface BipJrChildProfile {
  id: string;
  guardian_user_id?: string;
  display_alias: string;
  age_band: BipJrAgeBand;
  status: 'active' | 'archived';
  created_at: string;
  updated_at?: string;
  archived_at?: string | null;
}

function db() {
  const client = getSupabase();
  if (!client) throw new Error('Bip Jr account service is unavailable.');
  return client;
}

export async function listOwnBipJrProfiles(): Promise<BipJrChildProfile[]> {
  const { data, error } = await db()
    .from('jr_child_profiles')
    .select('id,display_alias,age_band,status,created_at,updated_at,archived_at')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as BipJrChildProfile[];
}

export async function createOwnBipJrProfile(
  displayAlias: string,
  ageBand: BipJrAgeBand,
): Promise<BipJrChildProfile> {
  const { data, error } = await db().rpc('create_own_jr_child_profile', {
    p_display_alias: displayAlias.trim(),
    p_age_band: ageBand,
  });

  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.id) throw new Error('Bip Jr profile was not created.');
  return row as BipJrChildProfile;
}

export async function archiveOwnBipJrProfile(childProfileId: string): Promise<boolean> {
  const { data, error } = await db().rpc('archive_own_jr_child_profile', {
    p_child_profile_id: childProfileId,
  });

  if (error) throw new Error(error.message);
  return data === true;
}

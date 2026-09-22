import { getSupabase } from '@/utils/supabase';

export type TeenAgeAssuranceMethod = 'guardian_confirmation' | 'self_declared_age_bucket';

export interface TeenAgeAssuranceResult {
  teen_user_id: string;
  age_bucket: '13-15' | '16-17' | '18-19';
  verification_state: 'VERIFIED_TEEN';
  assurance_method: TeenAgeAssuranceMethod;
  confirmed_at: string;
}

function db() {
  const client = getSupabase();
  if (!client) throw new Error('Teen verification service is unavailable.');
  return client;
}

function firstRow(data: unknown): TeenAgeAssuranceResult {
  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object' || !('teen_user_id' in row)) {
    throw new Error('Teen verification response could not be verified.');
  }
  return row as TeenAgeAssuranceResult;
}

export async function confirmLinkedTeenAgeAssurance(
  teenUserId: string,
): Promise<TeenAgeAssuranceResult> {
  const { data, error } = await db().rpc('confirm_linked_teen_age_assurance', {
    p_teen_user_id: teenUserId,
  });
  if (error) throw new Error(error.message);
  return firstRow(data);
}

export async function confirmOwnAdultTeenAgeAssurance(): Promise<TeenAgeAssuranceResult> {
  const { data, error } = await db().rpc('confirm_own_self_declared_adult_teen_age_assurance');
  if (error) throw new Error(error.message);
  return firstRow(data);
}

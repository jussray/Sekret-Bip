import { getSupabase, TABLES } from './supabase';
import { clearPrivateLocalState } from './storage';

export type AccountSide = 'teen' | 'guardian';
export type IdentityContext = 'private_self' | 'trusted_friend' | 'guardian' | 'public_circle' | 'friends_circle' | 'fallback';

export interface PrivateAccountProfile {
  id: string;
  email: string;
  first_name: string;
  side: AccountSide;
  age_gate_status: 'teen' | 'guardian';
  anonymous_handle: string;
  avatar_key: string;
  bip_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface AccountProfileInput {
  email: string;
  firstName: string;
  side: AccountSide;
  ageGateStatus: 'teen' | 'guardian';
  anonymousHandle: string;
  avatarKey: string;
}

export function generateBipId(handle: string, seed = ''): string {
  const base = normalizeAnonymousHandle(handle, seed || 'bip').replace(/^@/, '');
  const suffix = (seed || Math.random().toString(36).slice(2))
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 4)
    .toUpperCase();
  return base.length >= 4 ? `@${base}` : `BIP-${suffix || '8Q4L2M'}`;
}

export function normalizeAnonymousHandle(value: string, fallbackSeed = 'bip'): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  return cleaned || `secret_${fallbackSeed.slice(0, 8).toLowerCase()}`;
}

export function profileIdentity(
  profile: Pick<PrivateAccountProfile, 'first_name' | 'anonymous_handle' | 'avatar_key'> | null | undefined,
  context: IdentityContext,
  allowed = false,
) {
  const anonymousHandle = profile?.anonymous_handle || 'secret_bip';
  const firstName = profile?.first_name || anonymousHandle;
  const avatarKey = profile?.avatar_key || 'soft';

  if (context === 'private_self') {
    return { label: firstName, avatarKey, isRealIdentity: true };
  }

  if ((context === 'trusted_friend' || context === 'guardian' || context === 'friends_circle') && allowed) {
    return { label: firstName, avatarKey, isRealIdentity: true };
  }

  return { label: anonymousHandle, avatarKey, isRealIdentity: false };
}

export async function getCurrentAccountUserId(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: userData, error: userError } = await sb.auth.getUser();
  if (userError || !userData.user) return null;
  return userData.user.id;
}

export async function getAuthenticatedProfile(): Promise<PrivateAccountProfile | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const userId = await getCurrentAccountUserId();
  if (!userId) return null;

  const { data, error } = await sb
    .from(TABLES.accounts)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return data as PrivateAccountProfile;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<PrivateAccountProfile | null> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured yet.');
  const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return getAuthenticatedProfile();
}

export async function signUpWithEmailPassword(password: string, profile: AccountProfileInput): Promise<PrivateAccountProfile> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured yet.');
  const email = profile.email.trim();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('Account created, but no user id was returned yet. Please sign in to finish setup.');
  return upsertPrivateProfile(id, { ...profile, email });
}

export async function sendMagicLink(email: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured yet.');
  const { error } = await sb.auth.signInWithOtp({ email: email.trim() });
  if (error) throw error;
}

export async function upsertPrivateProfile(id: string, profile: AccountProfileInput): Promise<PrivateAccountProfile> {
  const sb = getSupabase();
  if (!sb) throw new Error('Supabase is not configured yet.');
  const now = new Date().toISOString();
  const row = {
    id,
    email: profile.email.trim(),
    first_name: profile.firstName.trim(),
    side: profile.side,
    age_gate_status: profile.ageGateStatus,
    anonymous_handle: normalizeAnonymousHandle(profile.anonymousHandle, id),
    avatar_key: profile.avatarKey,
    bip_id: generateBipId(profile.anonymousHandle, id),
    updated_at: now,
  };

  const { data, error } = await sb
    .from(TABLES.accounts)
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data as PrivateAccountProfile;
}

export async function signOutAndClearLocalState(): Promise<void> {
  const sb = getSupabase();
  await clearPrivateLocalState();
  if (sb) {
    const { error } = await sb.auth.signOut();
    if (error) throw error;
  }
  await clearPrivateLocalState();
}

export const signOutAccount = signOutAndClearLocalState;

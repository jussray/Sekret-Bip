/**
 * Canonical onboarding-state service.
 *
 * `public.user_onboarding_state` is the server-authoritative progress record.
 * The client may report forward progress, but database triggers enforce owner
 * scope, monotonic stages, immutable identity metadata, and activation rules.
 *
 * Local AsyncStorage is only a mirror of confirmed server state. A failed
 * Supabase write must never be recorded locally as successful progress.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

const STAGE_KEY = 'bip_onboarding_stage';
const STAGES_LOG_KEY = 'bip_onboarding_stages_log';
const MAX_LOCAL_LOG_ENTRIES = 100;
const MAX_WRITE_ATTEMPTS = 3;

export const ONBOARDING_STAGES = [
  'pre_signup',
  'signed_up',
  'consent_complete',
  'age_verified',
  'role_selected',
  'name_set',
  'identity_set',
  'reflection_complete',
  'parent_link_sent',
  'parent_linked',
  'parent_link_skipped',
  'parent_setup_complete',
  'activated',
  'steady_state',
] as const;

export type OnboardingStage = (typeof ONBOARDING_STAGES)[number];
export type UserRole = 'teen' | 'parent' | 'unknown';

export interface OnboardingState {
  id: string;
  user_id: string;
  stage: OnboardingStage;
  role: UserRole;
  activated_at: string | null;
  activation_action: string | null;
  age_bucket: string | null;
  referral_source: string | null;
  device_platform: string | null;
  parent_link_code: string | null;
  parent_linked_at: string | null;
  linked_parent_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  signup_to_consent_secs: number | null;
  consent_to_age_secs: number | null;
  age_to_role_secs: number | null;
  role_to_name_secs: number | null;
  name_to_identity_secs: number | null;
  identity_to_activated_secs: number | null;
}

export interface StageAdvancePayload {
  stage: OnboardingStage;
  role?: UserRole;
  age_bucket?: string;
  referral_source?: string;
  device_platform?: string;
  activation_action?: string;
  [key: string]: unknown;
}

type StageAdvanceExtras = Omit<StageAdvancePayload, 'stage'>;

const STAGE_RANK: Record<OnboardingStage, number> = {
  pre_signup: 0,
  signed_up: 1,
  consent_complete: 2,
  age_verified: 3,
  role_selected: 4,
  name_set: 5,
  identity_set: 6,
  reflection_complete: 7,
  parent_link_sent: 8,
  parent_linked: 9,
  parent_link_skipped: 9,
  parent_setup_complete: 10,
  activated: 11,
  steady_state: 12,
};

function db() {
  const client = getSupabase();
  if (!client) {
    throw new Error('[Onboarding] Supabase client is unavailable.');
  }
  return client;
}

function normalizeAdvancePayload(
  payloadOrStage: StageAdvancePayload | OnboardingStage,
  extras: StageAdvanceExtras = {},
): StageAdvancePayload {
  return typeof payloadOrStage === 'string'
    ? { stage: payloadOrStage, ...extras }
    : payloadOrStage;
}

function inferredRole(payload: StageAdvancePayload): UserRole | undefined {
  if (payload.role) return payload.role;
  if (
    payload.stage === 'parent_linked'
    || payload.stage === 'parent_link_skipped'
    || payload.stage === 'parent_setup_complete'
  ) {
    return 'parent';
  }
  if (payload.stage === 'parent_link_sent') return 'teen';
  return undefined;
}

function validateActivationAction(value: string): void {
  if (value.length > 64 || !/^[a-z0-9_]+$/.test(value)) {
    throw new Error('[Onboarding] Invalid activation action.');
  }
}

async function mirrorConfirmedStage(
  state: OnboardingState,
  payload?: Record<string, unknown>,
): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STAGES_LOG_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const log = Array.isArray(parsed) ? parsed : [];
    log.push({ stage: state.stage, ts: Date.now(), payload });
    const bounded = log.slice(-MAX_LOCAL_LOG_ENTRIES);

    await AsyncStorage.multiSet([
      [STAGE_KEY, state.stage],
      [STAGES_LOG_KEY, JSON.stringify(bounded)],
    ]);
  } catch (cause) {
    console.warn(
      '[Onboarding] Confirmed server state could not be mirrored locally:',
      cause instanceof Error ? cause.message : 'unknown error',
    );
  }
}

export async function getOnboardingState(
  userId: string,
): Promise<OnboardingState | null> {
  const { data, error } = await db()
    .from('user_onboarding_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`[Onboarding] Fetch failed: ${error.message}`);
  }
  return data as OnboardingState | null;
}

export async function initOnboardingState(
  userId: string,
  platform: string = 'unknown',
  referralSource?: string,
): Promise<OnboardingState> {
  const existing = await getOnboardingState(userId);
  if (existing) {
    await mirrorConfirmedStage(existing);
    return existing;
  }

  const { data, error } = await db()
    .from('user_onboarding_state')
    .insert({
      user_id: userId,
      stage: 'signed_up',
      role: 'unknown',
      device_platform: platform,
      referral_source: referralSource ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505' || error.message.toLowerCase().includes('duplicate')) {
      const raced = await getOnboardingState(userId);
      if (raced) {
        await mirrorConfirmedStage(raced);
        return raced;
      }
    }
    throw new Error(`[Onboarding] Init failed: ${error.message}`);
  }

  const state = data as OnboardingState;
  await mirrorConfirmedStage(state, { platform, referral_source: referralSource ?? null });
  return state;
}

function assertCompatibleValue(
  label: 'role' | 'age_bucket',
  currentValue: string | null,
  requestedValue: string | undefined,
): void {
  if (!requestedValue || currentValue === null || currentValue === 'unknown') return;
  if (currentValue !== requestedValue) {
    throw new Error(
      `[Onboarding] ${label} conflict: current=${currentValue}, requested=${requestedValue}`,
    );
  }
}

function buildMetadataRepair(
  current: OnboardingState,
  payload: StageAdvancePayload,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const role = inferredRole(payload);

  assertCompatibleValue('role', current.role, role);
  assertCompatibleValue('age_bucket', current.age_bucket, payload.age_bucket);

  if (current.role === 'unknown' && role && role !== 'unknown') {
    patch.role = role;
  }
  if (!current.age_bucket && payload.age_bucket) {
    patch.age_bucket = payload.age_bucket;
  }
  if (!current.referral_source && payload.referral_source) {
    patch.referral_source = payload.referral_source;
  }
  if (!current.device_platform && payload.device_platform) {
    patch.device_platform = payload.device_platform;
  }

  return patch;
}

async function repairPassedStageMetadata(
  userId: string,
  current: OnboardingState,
  payload: StageAdvancePayload,
  attempt: number,
): Promise<OnboardingState> {
  const patch = buildMetadataRepair(current, payload);
  if (Object.keys(patch).length === 0) {
    await mirrorConfirmedStage(current, payload);
    return current;
  }

  let request = db()
    .from('user_onboarding_state')
    .update(patch)
    .eq('user_id', userId)
    .eq('stage', current.stage)
    .eq('role', current.role);

  request = current.age_bucket === null
    ? request.is('age_bucket', null)
    : request.eq('age_bucket', current.age_bucket);

  const { data, error } = await request.select().maybeSingle();
  if (error) {
    throw new Error(`[Onboarding] Metadata repair failed: ${error.message}`);
  }

  if (data) {
    const updated = data as OnboardingState;
    await mirrorConfirmedStage(updated, payload);
    return updated;
  }

  if (attempt >= MAX_WRITE_ATTEMPTS - 1) {
    throw new Error('[Onboarding] Metadata repair conflicted after bounded retries.');
  }

  const refreshed = await getOnboardingState(userId);
  if (!refreshed) {
    throw new Error('[Onboarding] Metadata repair conflict: onboarding row disappeared.');
  }
  return repairPassedStageMetadata(userId, refreshed, payload, attempt + 1);
}

function timingPatch(
  current: OnboardingState,
  payload: StageAdvancePayload,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const elapsedFromCreated = () => Math.max(
    0,
    Math.round((Date.now() - new Date(current.created_at).getTime()) / 1000),
  );
  const elapsedFromUpdated = () => Math.max(
    0,
    Math.round((Date.now() - new Date(current.updated_at).getTime()) / 1000),
  );

  if (payload.stage === 'consent_complete' && current.stage === 'signed_up') {
    patch.signup_to_consent_secs = elapsedFromCreated();
  }
  if (payload.stage === 'age_verified' && current.stage === 'consent_complete') {
    patch.consent_to_age_secs = elapsedFromUpdated();
  }
  if (payload.stage === 'role_selected' && current.stage === 'age_verified') {
    patch.age_to_role_secs = elapsedFromUpdated();
  }
  if (payload.stage === 'name_set' && current.stage === 'role_selected') {
    patch.role_to_name_secs = elapsedFromUpdated();
  }
  if (payload.stage === 'identity_set' && current.stage === 'name_set') {
    patch.name_to_identity_secs = elapsedFromUpdated();
  }
  if (payload.stage === 'activated') {
    patch.identity_to_activated_secs = elapsedFromCreated();
  }

  return patch;
}

async function advanceStageInternal(
  userId: string,
  payload: StageAdvancePayload,
  attempt: number,
): Promise<OnboardingState> {
  const current = await getOnboardingState(userId);
  if (!current) {
    await initOnboardingState(userId, payload.device_platform ?? 'unknown', payload.referral_source);
    return advanceStageInternal(userId, payload, attempt);
  }

  const requestedRank = STAGE_RANK[payload.stage];
  const currentRank = STAGE_RANK[current.stage];

  if (requestedRank <= currentRank) {
    return repairPassedStageMetadata(userId, current, payload, attempt);
  }

  const role = inferredRole(payload) ?? current.role;
  assertCompatibleValue('role', current.role, role);
  assertCompatibleValue('age_bucket', current.age_bucket, payload.age_bucket);

  const patch: Record<string, unknown> = {
    stage: payload.stage,
    role,
    age_bucket: payload.age_bucket ?? current.age_bucket,
    referral_source: payload.referral_source ?? current.referral_source,
    device_platform: payload.device_platform ?? current.device_platform,
    ...timingPatch(current, payload),
  };

  if (payload.stage === 'activated') {
    const activationAction = payload.activation_action ?? 'unknown';
    validateActivationAction(activationAction);
    patch.activated_at = new Date().toISOString();
    patch.activation_action = activationAction;
  }

  if (payload.stage === 'steady_state') {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await db()
    .from('user_onboarding_state')
    .update(patch)
    .eq('user_id', userId)
    .eq('stage', current.stage)
    .select()
    .maybeSingle();

  if (error) {
    throw new Error(`[Onboarding] Stage advance failed: ${error.message}`);
  }

  if (data) {
    const updated = data as OnboardingState;
    await mirrorConfirmedStage(updated, payload);
    return updated;
  }

  const refreshed = await getOnboardingState(userId);
  if (!refreshed) {
    throw new Error('[Onboarding] Stage write conflict: onboarding row disappeared.');
  }

  if (STAGE_RANK[refreshed.stage] >= requestedRank) {
    return repairPassedStageMetadata(userId, refreshed, payload, attempt);
  }

  if (attempt >= MAX_WRITE_ATTEMPTS - 1) {
    throw new Error('[Onboarding] Stage write conflicted after bounded retries.');
  }

  return advanceStageInternal(userId, payload, attempt + 1);
}

export async function advanceStage(
  userId: string,
  payload: StageAdvancePayload,
): Promise<OnboardingState>;
export async function advanceStage(
  userId: string,
  stage: OnboardingStage,
  extras?: StageAdvanceExtras,
): Promise<OnboardingState>;
export async function advanceStage(
  userId: string,
  payloadOrStage: StageAdvancePayload | OnboardingStage,
  extras: StageAdvanceExtras = {},
): Promise<OnboardingState> {
  return advanceStageInternal(
    userId,
    normalizeAdvancePayload(payloadOrStage, extras),
    0,
  );
}

export async function markActivated(
  userId: string,
  activationAction: string,
): Promise<OnboardingState> {
  return advanceStage(userId, {
    stage: 'activated',
    activation_action: activationAction,
  });
}

export async function setParentLinkCode(
  userId: string,
  code: string,
): Promise<void> {
  const { error } = await db()
    .from('user_onboarding_state')
    .update({ parent_link_code: code })
    .eq('user_id', userId);

  if (error) {
    throw new Error(`[Onboarding] Parent link code failed: ${error.message}`);
  }
  await advanceStage(userId, 'parent_link_sent');
}

export async function completeParentLink(
  teenUserId: string,
  parentUserId: string,
): Promise<void> {
  const { error } = await db()
    .from('user_onboarding_state')
    .update({
      linked_parent_id: parentUserId,
      parent_linked_at: new Date().toISOString(),
    })
    .eq('user_id', teenUserId);

  if (error) {
    throw new Error(`[Onboarding] Complete parent link failed: ${error.message}`);
  }
}

export function isOnboardingComplete(state: OnboardingState | null): boolean {
  return Boolean(state && STAGE_RANK[state.stage] >= STAGE_RANK.activated);
}

export function nextScreenForStage(
  stage: OnboardingStage,
  role: UserRole,
): string {
  const map: Partial<Record<OnboardingStage, string>> = {
    signed_up: '/(onboarding)/welcome',
    consent_complete: '/(onboarding)/age',
    age_verified: '/(onboarding)/identity',
    role_selected: role === 'parent'
      ? '/(onboarding)/parent-welcome'
      : '/(onboarding)/name',
    name_set: '/(onboarding)/reflection',
    identity_set: '/(onboarding)/reflection',
    reflection_complete: '/(onboarding)/parent-link',
    parent_link_sent: role === 'teen'
      ? '/(teen)'
      : '/(onboarding)/parent-link',
    parent_linked: '/(parent)',
    parent_link_skipped: '/(auth)/guardian-verification',
    parent_setup_complete: role === 'parent'
      ? '/(parent)'
      : '/(auth)/guardian-verification',
    activated: role === 'parent' ? '/(parent)' : '/(teen)',
    steady_state: role === 'parent' ? '/(parent)' : '/(teen)',
  };
  return map[stage] ?? '/(onboarding)/welcome';
}

export async function getCurrentStage(): Promise<OnboardingStage | null> {
  try {
    const value = await AsyncStorage.getItem(STAGE_KEY);
    return ONBOARDING_STAGES.includes(value as OnboardingStage)
      ? value as OnboardingStage
      : null;
  } catch {
    return null;
  }
}

export async function clearOnboardingState(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([STAGE_KEY, STAGES_LOG_KEY]);
  } catch (cause) {
    console.warn(
      '[Onboarding] Local onboarding cache could not be cleared:',
      cause instanceof Error ? cause.message : 'unknown error',
    );
  }
}

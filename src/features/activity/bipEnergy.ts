import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

export const BIP_ENERGY_ADJUSTMENT_KEY = 'sekretbip_bip_energy_adjustment_v1';
export const BIP_ENERGY_ADJUSTMENT_SEEN_KEY = 'sekretbip_bip_energy_adjustment_seen_v1';

export interface BipEnergyAdjustment {
  adjusted: number;
  daysAway: number;
  reason: string;
  messageKey: string;
  checkedAt: string;
}

type RpcRow = {
  adjusted?: number;
  days_away?: number;
  reason?: string;
  message_key?: string;
};

let inFlightCheck: Promise<BipEnergyAdjustment | null> | null = null;
let cachedUserId: string | null = null;
let cachedResult: BipEnergyAdjustment | null = null;

async function runBipEnergyFade(): Promise<BipEnergyAdjustment | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData.user;
    if (!user || user.is_anonymous) return null;

    if (cachedUserId === user.id) return cachedResult;

    const { data, error } = await supabase.rpc('apply_inactivity_point_adjustment');
    if (error || !data || typeof data !== 'object') return null;

    const row = data as RpcRow;
    const result: BipEnergyAdjustment = {
      adjusted: Math.max(0, Number(row.adjusted ?? 0)),
      daysAway: Math.max(0, Number(row.days_away ?? 0)),
      reason: String(row.reason ?? 'unknown'),
      messageKey: String(row.message_key ?? 'bip_energy_unknown'),
      checkedAt: new Date().toISOString(),
    };

    cachedUserId = user.id;
    cachedResult = result;

    if (result.adjusted > 0) {
      await AsyncStorage.setItem(BIP_ENERGY_ADJUSTMENT_KEY, JSON.stringify(result));
    }

    return result;
  } catch (error) {
    if (__DEV__) console.warn('[bip-energy] inactivity adjustment failed', error);
    return null;
  }
}

/**
 * Runs at most one RPC per signed-in user for the current JS session.
 * App startup and the Room may ask at nearly the same time; both callers share
 * the same promise and result so the welcome-back receipt cannot lose a race.
 */
export function applyBipEnergyFade(): Promise<BipEnergyAdjustment | null> {
  if (inFlightCheck) return inFlightCheck;
  inFlightCheck = runBipEnergyFade().finally(() => {
    inFlightCheck = null;
  });
  return inFlightCheck;
}

export async function loadUnseenBipEnergyAdjustment(): Promise<BipEnergyAdjustment | null> {
  try {
    const [raw, seenAt] = await Promise.all([
      AsyncStorage.getItem(BIP_ENERGY_ADJUSTMENT_KEY),
      AsyncStorage.getItem(BIP_ENERGY_ADJUSTMENT_SEEN_KEY),
    ]);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as BipEnergyAdjustment;
    if (!parsed.checkedAt || parsed.checkedAt === seenAt || parsed.adjusted <= 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function markBipEnergyAdjustmentSeen(checkedAt: string): Promise<void> {
  try {
    await AsyncStorage.setItem(BIP_ENERGY_ADJUSTMENT_SEEN_KEY, checkedAt);
  } catch {
    // The return experience must keep working if the local receipt cannot save.
  }
}

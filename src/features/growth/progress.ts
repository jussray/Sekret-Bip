/** Account-scoped Growth completion state. No unowned legacy data is imported. */
export const GROWTH_TRACK_KEYS = [
  'focus', 'confidence', 'mindset', 'money', 'school', 'social', 'habits',
] as const;
export type GrowthTrackKey = (typeof GROWTH_TRACK_KEYS)[number];

export interface GrowthStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface GrowthCloud {
  list(ownerId: string): Promise<GrowthTrackKey[]>;
  write(ownerId: string, keys: GrowthTrackKey[]): Promise<void>;
}

export function isGrowthTrackKey(key: unknown): key is GrowthTrackKey {
  return typeof key === 'string' && (GROWTH_TRACK_KEYS as readonly string[]).includes(key);
}

export function mergeGrowthKeys(...sets: readonly unknown[][]): GrowthTrackKey[] {
  return [...new Set(sets.flat().filter(isGrowthTrackKey))];
}

export function parseGrowthKeys(raw: string | null): GrowthTrackKey[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? mergeGrowthKeys(parsed) : [];
  } catch {
    return [];
  }
}

export function growthStorageKey(ownerId: string | null): string | null {
  return ownerId ? `bip_growth_completed_v2:user:${ownerId}` : null;
}

/** Local data is authoritative for offline attempts; server data is merged, never substituted. */
export async function loadGrowthProgress(
  ownerId: string | null,
  storage: GrowthStorage,
  cloud: GrowthCloud,
): Promise<GrowthTrackKey[]> {
  const key = growthStorageKey(ownerId);
  if (!key || !ownerId) return []; // Guests only have in-memory progress.
  let local: GrowthTrackKey[] = [];
  try { local = parseGrowthKeys(await storage.getItem(key)); } catch { /* storage unavailable */ }

  let remote: GrowthTrackKey[] = [];
  try { remote = await cloud.list(ownerId); } catch { /* offline or migration pending */ }

  const merged = mergeGrowthKeys(local, remote);
  try { await storage.setItem(key, JSON.stringify(merged)); } catch { /* cloud may still work */ }
  if (local.length > 0) {
    try { await cloud.write(ownerId, local); } catch { /* next visit retries saved data */ }
  }
  return merged;
}

/** Persist locally first, then best-effort cloud write. Reopening retries local keys. */
export async function persistGrowthProgress(
  ownerId: string | null,
  completed: readonly GrowthTrackKey[],
  storage: GrowthStorage,
  cloud: GrowthCloud,
): Promise<void> {
  const key = growthStorageKey(ownerId);
  if (!key || !ownerId) return;
  let prior: GrowthTrackKey[] = [];
  try { prior = parseGrowthKeys(await storage.getItem(key)); } catch { /* storage unavailable */ }
  const merged = mergeGrowthKeys(prior, [...completed]);
  try { await storage.setItem(key, JSON.stringify(merged)); } catch { /* try cloud anyway */ }
  try { await cloud.write(ownerId, merged); } catch { /* retain local keys for retry */ }
}

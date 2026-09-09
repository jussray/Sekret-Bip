/**
 * consentService
 *
 * Persists privacy/terms consent for a user using the existing
 * `user_consents` table (created by 20260714_trust_consent_tables.sql).
 *
 * Schema reference:
 *   user_consents(user_id uuid, category text, granted boolean,
 *                 timestamp timestamptz, version text)
 *   PK: (user_id, category)
 *   RLS: users manage their own rows
 *
 * Exports a singleton `consentService` with:
 *   load(userId)                → populate in-memory cache from Supabase/AsyncStorage
 *   grant(userId, key)          → upsert granted=true, update cache
 *   has(key)                    → sync check from cache
 *   hasCompletedOnboarding()    → true when both required consents are granted
 *   reset()                     → clear cache on sign-out
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from '@/utils/supabase';

const STORAGE_PREFIX = 'bip_consent_';
const CONSENT_VERSION = '1.0.0';

export type ConsentKey = 'privacyPolicy' | 'termsOfService';

/** The exact category strings stored in user_consents.category */
const CATEGORY_MAP: Record<ConsentKey, string> = {
  privacyPolicy: 'privacyPolicy',
  termsOfService: 'termsOfService',
};

const REQUIRED_CONSENTS: ConsentKey[] = ['privacyPolicy', 'termsOfService'];

class ConsentService {
  private granted: Set<ConsentKey> = new Set();

  // ── Load ──────────────────────────────────────────────────────────────────

  async load(userId: string): Promise<void> {
    // 1. Try Supabase first.
    try {
      const sb = getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from('user_consents')
          .select('category, granted')
          .eq('user_id', userId)
          .in('category', Object.values(CATEGORY_MAP));

        if (!error && data) {
          this.granted = new Set(
            data
              .filter(r => r.granted === true)
              .map(r => {
                const key = Object.entries(CATEGORY_MAP).find(
                  ([, v]) => v === r.category,
                )?.[0] as ConsentKey | undefined;
                return key;
              })
              .filter((k): k is ConsentKey => k !== undefined),
          );
          // Sync local cache.
          await Promise.all(
            [...this.granted].map(k =>
              AsyncStorage.setItem(`${STORAGE_PREFIX}${userId}_${k}`, '1'),
            ),
          );
          return;
        }
      }
    } catch {
      // fall through to AsyncStorage
    }

    // 2. AsyncStorage fallback.
    const pairs = await AsyncStorage.multiGet(
      REQUIRED_CONSENTS.map(k => `${STORAGE_PREFIX}${userId}_${k}`),
    );
    this.granted = new Set(
      pairs
        .filter(([, v]) => v === '1')
        .map(([key]) => key.replace(`${STORAGE_PREFIX}${userId}_`, '') as ConsentKey),
    );
  }

  // ── Grant ─────────────────────────────────────────────────────────────────

  async grant(userId: string, key: ConsentKey): Promise<void> {
    let supabaseOk = false;

    try {
      const sb = getSupabase();
      if (sb) {
        const { error } = await sb.from('user_consents').upsert(
          {
            user_id: userId,
            category: CATEGORY_MAP[key],
            granted: true,
            timestamp: new Date().toISOString(),
            version: CONSENT_VERSION,
          },
          { onConflict: 'user_id,category' },
        );
        if (!error) supabaseOk = true;
      }
    } catch {
      // fall through to AsyncStorage
    }

    await AsyncStorage.setItem(`${STORAGE_PREFIX}${userId}_${key}`, '1');
    this.granted.add(key);

    if (!supabaseOk) {
      console.warn(`[consentService] Supabase write failed for key=${key}; cached locally.`);
    }
  }

  // ── Query ─────────────────────────────────────────────────────────────────

  has(key: ConsentKey): boolean {
    return this.granted.has(key);
  }

  hasCompletedOnboarding(): boolean {
    return REQUIRED_CONSENTS.every(k => this.granted.has(k));
  }

  reset(): void {
    this.granted.clear();
  }
}

export const consentService = new ConsentService();

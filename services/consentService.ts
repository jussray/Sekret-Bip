import { getSupabase } from '@/utils/supabase';

export type ConsentCategory =
  | 'notifications'
  | 'moodTracking'
  | 'journaling'
  | 'aiChat'
  | 'analytics'
  | 'privacyPolicy'
  | 'termsOfService';

export interface ConsentRecord {
  category: ConsentCategory;
  granted: boolean;
  timestamp: string;
  version: string;
}

export interface ConsentAuditEntry extends ConsentRecord {
  userId: string;
  action: 'grant' | 'revoke';
}

export const CONSENT_VERSION = '1.0.0';

export const REQUIRED_ONBOARDING_CONSENTS: ConsentCategory[] = [
  'privacyPolicy',
  'termsOfService',
];

export const OPTIONAL_ONBOARDING_CONSENTS: ConsentCategory[] = [
  'notifications',
  'moodTracking',
  'journaling',
  'aiChat',
  'analytics',
];

const cache = new Map<ConsentCategory, ConsentRecord>();

function client() {
  return getSupabase();
}

function normalizePersistedRecord(
  value: unknown,
  fallbackCategory: ConsentCategory,
  fallbackGranted: boolean,
): ConsentRecord {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object') {
    throw new Error('consent_persistence_returned_no_record');
  }

  const candidate = row as Partial<ConsentRecord>;
  return {
    category: (candidate.category ?? fallbackCategory) as ConsentCategory,
    granted: typeof candidate.granted === 'boolean' ? candidate.granted : fallbackGranted,
    timestamp: String(candidate.timestamp ?? ''),
    version: String(candidate.version ?? CONSENT_VERSION),
  };
}

async function persistConsent(
  userId: string,
  category: ConsentCategory,
  granted: boolean,
): Promise<ConsentRecord> {
  const supabase = client();
  if (!supabase) {
    throw new Error('consent_persistence_unavailable');
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('consent_authentication_required');
  }

  if (user.id !== userId) {
    throw new Error('consent_user_mismatch');
  }

  const { data, error } = await supabase.rpc('record_user_consent', {
    p_category: category,
    p_granted: granted,
    p_version: CONSENT_VERSION,
  });

  if (error) {
    throw new Error(`consent_persistence_failed:${error.message}`);
  }

  const record = normalizePersistedRecord(data, category, granted);
  if (!record.timestamp) {
    throw new Error('consent_persistence_missing_timestamp');
  }

  return record;
}

export const consentService = {
  async load(userId: string): Promise<void> {
    const supabase = client();
    if (!supabase) {
      cache.clear();
      return;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      cache.clear();
      return;
    }

    const { data, error } = await supabase
      .from('user_consents')
      .select('category, granted, timestamp, version')
      .eq('user_id', userId);

    if (error) {
      console.warn('[consentService] Failed to load consents:', error.message);
      return;
    }

    cache.clear();
    for (const row of data ?? []) {
      cache.set(row.category as ConsentCategory, {
        category: row.category as ConsentCategory,
        granted: Boolean(row.granted),
        timestamp: String(row.timestamp),
        version: String(row.version),
      });
    }
  },

  has(category: ConsentCategory): boolean {
    return cache.get(category)?.granted === true;
  },

  async grant(userId: string, category: ConsentCategory): Promise<void> {
    const record = await persistConsent(userId, category, true);
    cache.set(category, record);
  },

  async revoke(userId: string, category: ConsentCategory): Promise<void> {
    const record = await persistConsent(userId, category, false);
    cache.set(category, record);
  },

  all(): ConsentRecord[] {
    return Array.from(cache.values());
  },

  hasCompletedOnboarding(): boolean {
    return REQUIRED_ONBOARDING_CONSENTS.every(category => this.has(category));
  },

  clear(): void {
    cache.clear();
  },
};

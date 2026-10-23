/**
 * src/utils/compliance.ts
 *
 * Single source of truth for consent version strings and gate logic.
 *
 * Bump TOS_VERSION or PRIVACY_VERSION when those documents change —
 * that's the only thing needed to re-prompt every existing user at next launch.
 *
 * AsyncStorage keys written here must match what consent.tsx stores.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOS_VERSION     = 'tos-v1.0';
export const PRIVACY_VERSION = 'pp-v1.0';

export type ComplianceStatus =
  | { status: 'ok' }
  | { status: 'needs_age_gate' }
  | { status: 'needs_consent'; dob: string; accountType: string; reConsent: boolean };

/**
 * Check whether the current device has satisfied the compliance gate.
 * Call once on launch (after isLoading === false).
 *
 * Returns:
 *   'ok'             — fully compliant, proceed to normal app flow
 *   'needs_age_gate' — first launch; route to /(auth)/age-gate
 *   'needs_consent'  — ToS/Privacy was updated; route to /(auth)/consent
 *                      with the stored dob/accountType so user skips age gate
 */
export async function checkCompliance(): Promise<ComplianceStatus> {
  const done = await AsyncStorage.getItem('compliance_v1_done');
  if (done !== 'true') return { status: 'needs_age_gate' };

  const [storedTos, storedPrivacy, dob, accountType] = await AsyncStorage.multiGet([
    'compliance_tos_version',
    'compliance_privacy_version',
    'compliance_dob',
    'compliance_account_type',
  ]).then(pairs => pairs.map(([, v]) => v ?? ''));

  if (storedTos !== TOS_VERSION || storedPrivacy !== PRIVACY_VERSION) {
    return {
      status:      'needs_consent',
      dob:         dob,
      accountType: accountType || 'teen',
      reConsent:   true,
    };
  }

  return { status: 'ok' };
}

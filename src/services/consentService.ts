// Compatibility surface for legacy @/services/consentService imports.
// The canonical implementation lives at /services/consentService.ts so every
// caller shares the same server-backed, fail-closed consent state and reset.

export {
  CONSENT_VERSION,
  OPTIONAL_ONBOARDING_CONSENTS,
  REQUIRED_ONBOARDING_CONSENTS,
  consentService,
  type ConsentAuditEntry,
  type ConsentCategory,
  type ConsentRecord,
} from '../../services/consentService';

export type { ConsentCategory as ConsentKey } from '../../services/consentService';

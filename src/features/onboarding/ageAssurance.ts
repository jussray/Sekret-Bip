export type AgeBucket = 'under-13' | '13-15' | '16-17' | '18-19';

export type AgeVerificationStatus =
  | 'not_started'
  | 'self_declared'
  | 'guardian_required'
  | 'third_party_required'
  | 'verified'
  | 'blocked';

export type AgeVerificationMethod =
  | 'none'
  | 'self_declared_age_bucket'
  | 'guardian_confirmation'
  | 'third_party_age_assurance';

export interface AgeOption {
  id: AgeBucket;
  label: string;
  helper: string;
}

export interface AgeAssuranceDecision {
  ageBucket: AgeBucket;
  allowed: boolean;
  status: AgeVerificationStatus;
  method: AgeVerificationMethod;
  guardianRequired: boolean;
  nextSide: 'teen' | 'parent';
  nextRoute: '/(auth)/signup?side=teen' | '/(onboarding)/parental-consent' | '/(onboarding)/parent-splash';
  actionLabel: string;
  message: string;
}

export const AGE_OPTIONS: AgeOption[] = [
  {
    id: 'under-13',
    label: 'Under 13',
    helper: 'Bip needs a parent or guardian first.',
  },
  {
    id: '13-15',
    label: '13 – 15',
    helper: 'Teen mode starts with extra guardian protection.',
  },
  {
    id: '16-17',
    label: '16 – 17',
    helper: 'Teen mode keeps safety and guardian checks available.',
  },
  {
    id: '18-19',
    label: '18 – 19',
    helper: 'Teen mode can continue with a self-declared age bucket.',
  },
];

export const AGE_ASSURANCE_STORAGE_KEYS = {
  bucket: 'bip_onboarding_age',
  status: 'bip_age_verification_status',
  method: 'bip_age_verification_method',
  guardianRequired: 'bip_age_guardian_required',
  rawEvidenceStored: 'bip_age_raw_evidence_stored',
} as const;

export function decideAgeAssurance(ageBucket: AgeBucket): AgeAssuranceDecision {
  if (ageBucket === 'under-13') {
    return {
      ageBucket,
      allowed: false,
      status: 'blocked',
      method: 'none',
      guardianRequired: true,
      nextSide: 'parent',
      nextRoute: '/(onboarding)/parental-consent',
      actionLabel: 'Ask a parent or guardian →',
      message: 'Bip needs a parent or guardian before any child account can be created. We will not collect account details on this path.',
    };
  }

  if (ageBucket === '13-15' || ageBucket === '16-17') {
    return {
      ageBucket,
      allowed: true,
      status: 'guardian_required',
      method: 'self_declared_age_bucket',
      guardianRequired: true,
      nextSide: 'teen',
      nextRoute: '/(auth)/signup?side=teen',
      actionLabel: 'Continue with teen setup →',
      message: 'We will save only your age bucket and continue with teen protections. Stronger checks can happen later if needed.',
    };
  }

  return {
    ageBucket,
    allowed: true,
    status: 'self_declared',
    method: 'self_declared_age_bucket',
    guardianRequired: false,
    nextSide: 'teen',
    nextRoute: '/(auth)/signup?side=teen',
    actionLabel: 'Continue with teen setup →',
    message: 'We will save only your age bucket. No ID image, selfie, or raw proof is stored in this step.',
  };
}

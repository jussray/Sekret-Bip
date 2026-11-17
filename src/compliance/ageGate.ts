export const MINIMUM_ACCOUNT_AGE = 13;

export type AgeGateReason = 'eligible' | 'below_minimum_age' | 'invalid_date' | 'future_date';

export type AgeGateDecision = {
  allowed: boolean;
  age: number | null;
  reason: AgeGateReason;
};

function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year) return null;
  if (parsed.getUTCMonth() !== month - 1) return null;
  if (parsed.getUTCDate() !== day) return null;
  return parsed;
}

export function calculateAge(birthdate: string, now = new Date()): number | null {
  const parsed = parseIsoDate(birthdate);
  if (!parsed) return null;

  const age = now.getUTCFullYear() - parsed.getUTCFullYear();
  const hasHadBirthdayThisYear =
    now.getUTCMonth() > parsed.getUTCMonth() ||
    (now.getUTCMonth() === parsed.getUTCMonth() && now.getUTCDate() >= parsed.getUTCDate());

  return hasHadBirthdayThisYear ? age : age - 1;
}

export function evaluateAgeGate(birthdate: string, now = new Date()): AgeGateDecision {
  const parsed = parseIsoDate(birthdate);
  if (!parsed) return { allowed: false, age: null, reason: 'invalid_date' };
  if (parsed.getTime() > now.getTime()) return { allowed: false, age: null, reason: 'future_date' };

  const age = calculateAge(birthdate, now);
  if (age === null) return { allowed: false, age: null, reason: 'invalid_date' };
  if (age < MINIMUM_ACCOUNT_AGE) return { allowed: false, age, reason: 'below_minimum_age' };

  return { allowed: true, age, reason: 'eligible' };
}

export function requireAgeEligibility(birthdate: string, now = new Date()): AgeGateDecision {
  const decision = evaluateAgeGate(birthdate, now);
  if (!decision.allowed) {
    throw new Error(`Minimum age check failed: ${decision.reason}`);
  }
  return decision;
}

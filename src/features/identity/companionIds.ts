export const NAMED_COMPANION_IDS = ['suhana', 'sy', 'cloud', 'night'] as const;

export type NamedCompanionId = (typeof NAMED_COMPANION_IDS)[number];

export const COMPANION_DISPLAY_NAMES: Record<NamedCompanionId, string> = {
  suhana: 'Suhana',
  sy: 'Sy',
  cloud: 'Cloud',
  night: 'Night',
};

export function isNamedCompanionId(value: unknown): value is NamedCompanionId {
  return typeof value === 'string' && NAMED_COMPANION_IDS.includes(value as NamedCompanionId);
}

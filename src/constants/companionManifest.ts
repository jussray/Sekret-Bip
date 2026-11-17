import {
  TEEN_COMPANION_POSES,
  type CompanionAssetStatus,
  type TeenCompanion,
  type TeenCompanionAssetEntry,
  type TeenCompanionPose,
} from '@/types/companions';

const assetPath = <C extends TeenCompanion>(
  companion: C,
  pose: TeenCompanionPose<C>,
): string => `assets/images/companions/teen/${companion}/${pose}.png`;

const buildEntries = <C extends TeenCompanion>(
  companion: C,
  overrides: Partial<Record<TeenCompanionPose<C>, CompanionAssetStatus>> = {},
): TeenCompanionAssetEntry<C>[] =>
  TEEN_COMPANION_POSES[companion].map((pose) => ({
    companion,
    pose,
    status: overrides[pose] ?? 'missing',
    relativePath: assetPath(companion, pose),
  }));

export const TEEN_COMPANION_MANIFEST = {
  // Batch 0 — Identity Lock: neutral references are live (sourced from Canva canon).
  raylene: buildEntries('raylene', { neutral: 'production' }),
  rylane: buildEntries('rylane', { neutral: 'production' }),
  night: buildEntries('night', { neutral: 'production' }),
} as const;

export const getTeenCompanionAssetStatus = <C extends TeenCompanion>(
  companion: C,
  pose: TeenCompanionPose<C>,
): CompanionAssetStatus => {
  const entry = TEEN_COMPANION_MANIFEST[companion].find(
    (item) => item.pose === pose,
  );

  return entry?.status ?? 'missing';
};

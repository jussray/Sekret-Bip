import type { ImageSourcePropType } from 'react-native';
import { TEEN_COMPANION_IMAGES } from '@/constants/companionImages';
import type { TeenCompanion, TeenCompanionPose } from '@/types/companions';

/**
 * Returns the requested teen companion pose when available.
 * Falls back to that companion's neutral pose, then returns null safely.
 */
export const getTeenCompanionAsset = <C extends TeenCompanion>(
  companion: C,
  pose: TeenCompanionPose<C>,
): ImageSourcePropType | null => {
  const images = TEEN_COMPANION_IMAGES[companion] as Partial<
    Record<string, ImageSourcePropType>
  >;
  return images[String(pose)] ?? images.neutral ?? null;
};

export const hasTeenCompanionAsset = <C extends TeenCompanion>(
  companion: C,
  pose: TeenCompanionPose<C>,
): boolean => {
  const images = TEEN_COMPANION_IMAGES[companion] as Partial<
    Record<string, ImageSourcePropType>
  >;
  return Boolean(images[String(pose)]);
};

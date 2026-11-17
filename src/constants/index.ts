/**
 * src/constants/index.ts
 *
 * Canonical constants barrel.
 * Import via: import { THEME_PACKS, MOODS, IMAGES } from '@/constants';
 */
export {
  THEME_PACKS,
  SEKRET_PROFILES,
  MOODS,
  COMFORT_MESSAGES,
  HOME_MESSAGES,
  HEAVY_WORDS,
  IMAGES,
  AVATARS,
  ROOM_BACKGROUNDS,
  getRoomBg,
  normalizeVibeKey,
} from './theme';

export { TEEN_COMPANION_IMAGES } from './companionImages';
export {
  TEEN_COMPANION_MANIFEST,
  getTeenCompanionAssetStatus,
} from './companionManifest';

export type { VibeKey } from './theme';

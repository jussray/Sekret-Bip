// constants/theme.ts
// Public theme entrypoint. The preserved implementation remains in theme.base.ts;
// canonical app-entry assets override only legacy/fallback aliases here.
import { IMAGES as BASE_IMAGES } from './theme.base';

export * from './theme.base';

const sekretSplashTeen = require('../assets/images/splash-teen.jpeg');
const sekretSplashParent = require('../assets/images/splash-parent.png');

export const IMAGES = {
  ...BASE_IMAGES,
  sekretSplash: sekretSplashTeen,
  sekretSplashTeen,
  sekretSplashParent,
} as const;

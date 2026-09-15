// constants/theme.ts
// Public theme entrypoint. The preserved implementation remains in theme.base.ts;
// canonical product identity and app-entry assets override legacy compatibility aliases here.
import {
  AVATARS as BASE_AVATARS,
  IMAGES as BASE_IMAGES,
  SEKRET_PROFILES as BASE_SEKRET_PROFILES,
  THEME_PACKS as BASE_THEME_PACKS,
} from './theme.base';

export * from './theme.base';

const sekretSplashTeen = require('../assets/images/splash-teen.jpeg');
const sekretSplashParent = require('../assets/images/splash-parent.png');

// Room sprites use the existing teen companion production pipeline. These PNGs
// are isolated character renders; cinematic identity masters remain runtime
// identity/fallback assets and must not be pasted over the furnished Room.
const suhanaRoomSprite = require('../assets/images/companions/teen/raylene/neutral.png');
const syRoomSprite = require('../assets/images/companions/teen/rylane/neutral.png');
const nightRoomSprite = require('../assets/images/companions/teen/night/neutral.png');

export const IMAGES = {
  ...BASE_IMAGES,
  rayleneFullbody: suhanaRoomSprite,
  rylaneFullbody: syRoomSprite,
  nightFullbody: nightRoomSprite,
  sekretSplash: sekretSplashTeen,
  sekretSplashTeen,
  sekretSplashParent,
} as const;

export const AVATARS = {
  ...BASE_AVATARS,
  raylene: {
    ...BASE_AVATARS.raylene,
    fullbody: suhanaRoomSprite,
  },
  rylane: {
    ...BASE_AVATARS.rylane,
    fullbody: syRoomSprite,
  },
  night: {
    ...BASE_AVATARS.night,
    fullbody: nightRoomSprite,
  },
} as typeof BASE_AVATARS;

export const THEME_PACKS = {
  ...BASE_THEME_PACKS,
  raylene: {
    ...BASE_THEME_PACKS.raylene,
    name: "Suhana's Room",
  },
  rylane: {
    ...BASE_THEME_PACKS.rylane,
    name: 'Sy After Dark',
  },
} as typeof BASE_THEME_PACKS;

export const SEKRET_PROFILES = {
  ...BASE_SEKRET_PROFILES,
  soft: {
    ...BASE_SEKRET_PROFILES.soft,
    name: 'Suhana',
  },
  rylane: {
    ...BASE_SEKRET_PROFILES.rylane,
    name: 'Sy',
  },
} as typeof BASE_SEKRET_PROFILES;

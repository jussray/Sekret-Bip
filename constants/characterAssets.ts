// constants/characterAssets.ts
// Se'kret Bip — Character Asset Registry v2 + Sticker Expression Reference Library
// ─────────────────────────────────────────────────────────────────────────────
// SOURCE OF TRUTH for all character artwork metadata.
//
// Each entry describes one piece of character art: its character, the exact key
// it maps to in the IMAGES map (constants/theme.ts), its filename on disk, and a
// rich set of tags (mood / state / pose / feature) used by the sticker expression
// engine and design/reference tooling.
//
// referenceOnly: true  → art reference / disk-only / UUID file — never render in prod UI
// referenceOnly: false → finished, safe to render
// renderable:    true  → a real require() exists for this assetKey in IMAGES
// renderable:    false → disk-only, UUID, or fallback-shared key — do NOT rely on it rendering
//
// To render: import { IMAGES } from './theme'; then use IMAGES[asset.assetKey]
// (Helpers below operate on the registry only and never import IMAGES, to avoid
//  circular deps. Callers resolve the actual image source via IMAGES[asset.assetKey].)
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export type CharacterKey = 'raylene' | 'rylane' | 'cloud' | 'night';

export type MoodTag =
  | 'neutral' | 'happy' | 'calm' | 'focused' | 'reflective'
  | 'sad' | 'stormy' | 'sleepy' | 'energetic' | 'loving'
  | 'curious' | 'proud' | 'grounded';

export type StateTag =
  | 'idle' | 'writing' | 'thinking' | 'voice-active' | 'voice-night'
  | 'voice-day' | 'window-day' | 'window-night' | 'window-rainy'
  | 'fullbody' | 'sticker' | 'splash';

export type PoseTag =
  | 'portrait' | 'fullbody' | 'window' | 'sitting' | 'standing'
  | 'floating' | 'closeup';

export type FeatureTag =
  | 'v1' | 'v2' | 'v3' | 'headphones' | 'writing-pose'
  | 'rainy' | 'daytime' | 'nighttime' | 'uuid-reference';

export interface CharacterAsset {
  character: CharacterKey;
  assetKey: string;                // exact key in IMAGES map, or 'uuid_XXXXXXXX' for UUID files
  filename: string;                // exact filename in assets/images/
  type: 'character' | 'mascot' | 'uuid-reference';
  moodTags: MoodTag[];
  stateTags: StateTag[];
  poseTags: PoseTag[];
  featureTags: FeatureTag[];
  referenceOnly: boolean;          // true = do NOT render in prod UI; false = safe to render
  renderable: boolean;             // true = real require() exists in IMAGES; false = disk only or UUID
}

// ── Registry ──────────────────────────────────────────────────────────────────
// To render: import { IMAGES } from './theme'; then use IMAGES[asset.assetKey]

export const CHARACTER_ASSETS: CharacterAsset[] = [

  // ── Raylene ─────────────────────────────────────────────────────────────────
  {
    character: 'raylene',
    assetKey: 'rayleneNeutral',
    filename: 'raylene-neutral.png',
    type: 'character',
    moodTags: ['neutral', 'calm', 'grounded'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneNeutralV3',
    filename: 'raylene-neutral-v3.png',
    type: 'character',
    moodTags: ['neutral', 'calm'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v3'],
    referenceOnly: false,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneHappy',
    filename: 'raylene-happy.png',
    type: 'character',
    moodTags: ['happy', 'energetic', 'loving'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneHappyV3',
    filename: 'raylene-happy-v3.png',
    type: 'character',
    moodTags: ['happy', 'energetic'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v3'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneWriting',
    filename: 'raylene-writing.png',
    type: 'character',
    moodTags: ['focused', 'reflective'],
    stateTags: ['writing'],
    poseTags: ['sitting'],
    featureTags: ['writing-pose'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneWindow',
    filename: 'raylene-window.png',
    type: 'character',
    moodTags: ['reflective', 'calm'],
    stateTags: ['window-night'],
    poseTags: ['window'],
    featureTags: ['nighttime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneWindowRainy',
    filename: 'raylene-window-rainy.png',
    type: 'character',
    moodTags: ['sad', 'reflective', 'calm'],
    stateTags: ['window-rainy'],
    poseTags: ['window'],
    featureTags: ['rainy'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneFullbody',
    filename: 'raylene-fullbody.png',
    type: 'character',
    moodTags: ['neutral', 'grounded'],
    stateTags: ['fullbody'],
    poseTags: ['fullbody', 'standing'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneVoiceDay',
    filename: 'raylene-voice-day.png',
    type: 'character',
    moodTags: ['energetic', 'happy'],
    stateTags: ['voice-active', 'voice-day'],
    poseTags: ['portrait'],
    featureTags: ['daytime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneVoiceNight',
    filename: 'raylene-voice-night.png',
    type: 'character',
    moodTags: ['calm', 'reflective'],
    stateTags: ['voice-active', 'voice-night'],
    poseTags: ['portrait'],
    featureTags: ['nighttime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'raylene',
    assetKey: 'raylene_Bippin2Day',
    filename: 'raylene-bippin2-day.png',
    type: 'character',
    moodTags: ['happy', 'energetic'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['daytime', 'v1'],
    referenceOnly: false,
    renderable: true,
  },

  // ── Raylene — missing from disk (referenceOnly, share IMAGES keys as fallback) ─
  {
    character: 'raylene',
    assetKey: 'rayleneThinking',
    filename: 'raylene-thinking.png',
    type: 'character',
    moodTags: ['curious', 'reflective'],
    stateTags: ['thinking'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'rayleneThinking',
    filename: 'raylene-period-calendar-day.png',
    type: 'character',
    moodTags: ['calm', 'grounded'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['daytime'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'raylene_Bippin2Day',
    filename: 'raylene-bippin2-night.png',
    type: 'character',
    moodTags: ['calm', 'reflective'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['nighttime'],
    referenceOnly: true,
    renderable: false,
  },

  // ── Rylane ──────────────────────────────────────────────────────────────────
  {
    character: 'rylane',
    assetKey: 'rylaneNeutral',
    filename: 'rylane-neutral.png',
    type: 'character',
    moodTags: ['neutral', 'grounded'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneNeutralV2',
    filename: 'rylane-neutral-v2.png',
    type: 'character',
    moodTags: ['neutral'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v2'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneHappy',
    filename: 'rylane-happy.png',
    type: 'character',
    moodTags: ['happy', 'energetic'],
    stateTags: ['idle'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneThinking',
    filename: 'rylane-thinking.png',
    type: 'character',
    moodTags: ['curious', 'reflective'],
    stateTags: ['thinking'],
    poseTags: ['portrait'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneWriting',
    filename: 'rylane-writing.png',
    type: 'character',
    moodTags: ['focused', 'reflective'],
    stateTags: ['writing'],
    poseTags: ['sitting'],
    featureTags: ['writing-pose'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneWindow',
    filename: 'rylane-window.png',
    type: 'character',
    moodTags: ['reflective', 'calm'],
    stateTags: ['window-night'],
    poseTags: ['window'],
    featureTags: ['nighttime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneWindowDay',
    filename: 'rylane-window-day.png',
    type: 'character',
    moodTags: ['calm', 'reflective'],
    stateTags: ['window-day'],
    poseTags: ['window'],
    featureTags: ['daytime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneFullbody',
    filename: 'rylane-fullbody.png',
    type: 'character',
    moodTags: ['neutral', 'grounded'],
    stateTags: ['fullbody'],
    poseTags: ['fullbody', 'standing'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneVoiceDay',
    filename: 'rylane-voice-day.png',
    type: 'character',
    moodTags: ['energetic', 'happy'],
    stateTags: ['voice-active', 'voice-day'],
    poseTags: ['portrait'],
    featureTags: ['daytime'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'rylane',
    assetKey: 'rylaneVoiceNight',
    filename: 'rylane-voice-night.png',
    type: 'character',
    moodTags: ['calm', 'reflective'],
    stateTags: ['voice-active', 'voice-night'],
    poseTags: ['portrait'],
    featureTags: ['nighttime'],
    referenceOnly: false,
    renderable: true,
  },

  // ── Cloud (mascot) ────────────────────────────────────────────────────────────
  {
    character: 'cloud',
    assetKey: 'cloud',
    filename: 'cloud.png',
    type: 'mascot',
    moodTags: ['neutral', 'calm'],
    stateTags: ['idle'],
    poseTags: ['floating'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'cloud',
    assetKey: 'cloudHappy',
    filename: 'cloud-happy.png',
    type: 'mascot',
    moodTags: ['happy', 'energetic', 'loving'],
    stateTags: ['idle'],
    poseTags: ['floating'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'cloud',
    assetKey: 'cloudHeadphones',
    filename: 'cloud-headphones.png',
    type: 'mascot',
    moodTags: ['calm', 'focused'],
    stateTags: ['voice-active'],
    poseTags: ['floating'],
    featureTags: ['headphones', 'v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'cloud',
    assetKey: 'cloudHeadphonesV2',
    filename: 'cloud-headphones-v2.png',
    type: 'mascot',
    moodTags: ['calm', 'focused', 'energetic'],
    stateTags: ['voice-active'],
    poseTags: ['floating'],
    featureTags: ['headphones', 'v2'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'cloud',
    assetKey: 'cloudSleepy',
    filename: 'cloud-sleepy.png',
    type: 'mascot',
    moodTags: ['sleepy', 'calm'],
    stateTags: ['idle'],
    poseTags: ['floating'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },
  {
    character: 'cloud',
    assetKey: 'cloudStormy',
    filename: 'cloud-stormy.png',
    type: 'mascot',
    moodTags: ['stormy', 'sad'],
    stateTags: ['idle'],
    poseTags: ['floating'],
    featureTags: ['v1'],
    referenceOnly: false,
    renderable: true,
  },

  // ── Night (fallbacks → raylene; no dedicated night art on disk) ────────────────
  {
    character: 'night',
    assetKey: 'nightAvatarDay',
    filename: '(fallback → raylene-neutral.png)',
    type: 'character',
    moodTags: [],
    stateTags: ['idle'],
    poseTags: [],
    featureTags: ['daytime'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'night',
    assetKey: 'nightAvatarNight',
    filename: '(fallback → raylene-voice-night.png)',
    type: 'character',
    moodTags: [],
    stateTags: ['idle'],
    poseTags: [],
    featureTags: ['nighttime'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'night',
    assetKey: 'nightAvatarRainy',
    filename: '(fallback → raylene-window-rainy.png)',
    type: 'character',
    moodTags: [],
    stateTags: ['window-rainy'],
    poseTags: [],
    featureTags: ['rainy'],
    referenceOnly: true,
    renderable: false,
  },

  // ── UUID reference files (unidentified art references — never render) ──────────
  {
    character: 'raylene',
    assetKey: 'uuid_0E3D4BD6',
    filename: '0E3D4BD6-E079-435A-9557-B02E7024656E.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_284231DD',
    filename: '284231DD-7319-4872-AB67-0811F42132F4.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_2A27D30A',
    filename: '2A27D30A-F5F2-4853-BFB5-100BAC56A34C.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_4BB4A7DF',
    filename: '4BB4A7DF-3B8C-4170-91B4-62FB2F404F68.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_5397B783',
    filename: '5397B783-61B8-47A4-8A46-98C418B0AEF1.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_5886DDCD',
    filename: '5886DDCD-4B72-4B62-BE54-E06E521E77AD.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_68238EB5',
    filename: '68238EB5-14B3-4B30-B45F-0F7006410B43.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_6AEA1FF8',
    filename: '6AEA1FF8-29D1-4BFF-8AD6-ADB0D1A4F256.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_6F71DD53',
    filename: '6F71DD53-E869-4C34-B485-97792510119F.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_7814EE18',
    filename: '7814EE18-ECA9-4C7E-8F6A-959085A0BD20.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_ACC1D780',
    filename: 'ACC1D780-D22F-4CED-8CC1-3B0868C3F4E1.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_AD015F7B',
    filename: 'AD015F7B-2956-430D-8CBA-97382DAE39CB.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_AFA90A45',
    filename: 'AFA90A45-003E-4AF4-825A-D8C1C02CC275.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_B8350F20',
    filename: 'B8350F20-D4AB-4256-B4F0-EDA698B28130.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_E250BCEA',
    filename: 'E250BCEA-A80A-4D90-A382-1FDE4C714702.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_E88CD2C7',
    filename: 'E88CD2C7-C930-4632-9B33-27463A71DDB9.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_EFF1CA3D',
    filename: 'EFF1CA3D-E615-48E0-8D70-4A0A68AAFB8A.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
  {
    character: 'raylene',
    assetKey: 'uuid_F952C378',
    filename: 'F952C378-5A26-4287-8CDE-60C5059FA7E9.png',
    type: 'uuid-reference',
    moodTags: [],
    stateTags: [],
    poseTags: [],
    featureTags: ['uuid-reference'],
    referenceOnly: true,
    renderable: false,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
// These operate on CHARACTER_ASSETS only and return CharacterAsset objects.
// To get the actual image source, the caller uses IMAGES[asset.assetKey].

/**
 * getCharacterSticker(character, mood, state)
 * Returns the best matching renderable CharacterAsset for a given character + mood + state.
 * Prefers assets where renderable=true. Falls back to first renderable asset for character.
 */
export function getCharacterSticker(
  character: CharacterKey,
  mood: MoodTag,
  state?: StateTag,
): CharacterAsset | undefined {
  const renderable = CHARACTER_ASSETS.filter(
    a => a.character === character && a.renderable,
  );

  // 1. mood + state match
  if (state) {
    const moodState = renderable.find(
      a => a.moodTags.includes(mood) && a.stateTags.includes(state),
    );
    if (moodState) return moodState;
  }

  // 2. mood-only match
  const moodOnly = renderable.find(a => a.moodTags.includes(mood));
  if (moodOnly) return moodOnly;

  // 3. first renderable asset for character
  return renderable[0];
}

/**
 * getVoicePresenceImage(character, timeOfDay, mood)
 * Returns the best voice-active image for a character based on time of day.
 * timeOfDay: 'day' | 'night'
 */
export function getVoicePresenceImage(
  character: CharacterKey,
  timeOfDay: 'day' | 'night',
  mood?: MoodTag,
): CharacterAsset | undefined {
  const targetState: StateTag = timeOfDay === 'day' ? 'voice-day' : 'voice-night';

  const candidates = CHARACTER_ASSETS.filter(
    a =>
      a.character === character &&
      a.renderable &&
      a.stateTags.includes(targetState),
  );

  if (mood) {
    const moodMatch = candidates.find(a => a.moodTags.includes(mood));
    if (moodMatch) return moodMatch;
  }

  if (candidates[0]) return candidates[0];

  // Fall back to any renderable voice-active asset for the character
  return CHARACTER_ASSETS.find(
    a =>
      a.character === character &&
      a.renderable &&
      a.stateTags.includes('voice-active'),
  );
}

/**
 * getReferenceAssets(character)
 * Returns all assets for a character, including referenceOnly ones.
 * Use for design/reference tooling — NOT for rendering in prod.
 */
export function getReferenceAssets(character: CharacterKey): CharacterAsset[] {
  return CHARACTER_ASSETS.filter(a => a.character === character);
}

/**
 * getStickerReferences(character, state)
 * Returns all assets for a character matching a state tag.
 * Filters to referenceOnly=true assets — these are art references for sticker generation.
 */
export function getStickerReferences(
  character: CharacterKey,
  state: StateTag,
): CharacterAsset[] {
  return CHARACTER_ASSETS.filter(
    a =>
      a.character === character &&
      a.referenceOnly &&
      a.stateTags.includes(state),
  );
}

/**
 * getRenderableCharacterAssets(character)
 * Returns only assets safe to render in the production UI.
 * Filters: renderable=true AND referenceOnly=false.
 */
export function getRenderableCharacterAssets(character: CharacterKey): CharacterAsset[] {
  return CHARACTER_ASSETS.filter(
    a => a.character === character && a.renderable && !a.referenceOnly,
  );
}

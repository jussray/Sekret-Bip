// CHARACTER AVATARS — full-size avatar art ONLY.
// Not stickers, not backgrounds. The companion/mascot presence images.
//
// Suhana, Sy, and Night are identity-locked to the approved canonical
// masters. Until new matching poses are approved, all human companion states
// intentionally resolve through their canonical alias file.

export type CharacterKey = 'raylene' | 'rylane' | 'cloud' | 'night';
export type AvatarLayer = 'tolan' | 'mascot';

export type AvatarMood =
  | 'neutral' | 'happy' | 'calm' | 'focused' | 'reflective'
  | 'sad' | 'stormy' | 'sleepy' | 'energetic' | 'loving' | 'curious';

export type AvatarState =
  | 'idle' | 'writing' | 'thinking' | 'voice-listening' | 'voice-thinking'
  | 'voice-responding' | 'voice-comforting' | 'window-day' | 'window-night'
  | 'window-rainy' | 'fullbody' | 'presence';

export type AvatarPose =
  | 'portrait' | 'fullbody' | 'window' | 'sitting' | 'standing' | 'floating' | 'closeup';

export type TimeOfDay = 'day' | 'night' | 'any';

export interface CharacterAvatar {
  character: CharacterKey;
  layer: AvatarLayer;
  assetKey: string;
  filename: string;
  mood: AvatarMood[];
  state: AvatarState[];
  pose: AvatarPose[];
  timeOfDay: TimeOfDay;
  roomUse: boolean;
  voiceUse: boolean;
  companionUse: boolean;
  renderable: boolean;
  referenceOnly: boolean;
}

const HUMAN_MOODS: AvatarMood[] = [
  'neutral', 'happy', 'calm', 'focused', 'reflective',
  'sad', 'energetic', 'loving', 'curious',
];

const HUMAN_STATES: AvatarState[] = [
  'idle', 'writing', 'thinking', 'voice-listening', 'voice-thinking',
  'voice-responding', 'voice-comforting', 'window-day', 'window-night',
  'window-rainy', 'fullbody', 'presence',
];

const HUMAN_POSES: AvatarPose[] = ['portrait', 'fullbody', 'standing'];

export const AVATAR_REGISTRY: CharacterAvatar[] = [
  {
    character: 'raylene',
    layer: 'tolan',
    assetKey: 'rayleneNeutral',
    filename: 'raylene-neutral.png',
    mood: HUMAN_MOODS,
    state: HUMAN_STATES,
    pose: HUMAN_POSES,
    timeOfDay: 'any',
    roomUse: true,
    voiceUse: true,
    companionUse: true,
    renderable: true,
    referenceOnly: false,
  },
  {
    character: 'rylane',
    layer: 'tolan',
    assetKey: 'rylaneNeutral',
    filename: 'rylane-neutral.png',
    mood: HUMAN_MOODS,
    state: HUMAN_STATES,
    pose: HUMAN_POSES,
    timeOfDay: 'any',
    roomUse: true,
    voiceUse: true,
    companionUse: true,
    renderable: true,
    referenceOnly: false,
  },
  {
    character: 'night',
    layer: 'tolan',
    assetKey: 'nightNeutral',
    filename: 'night-neutral.png',
    mood: HUMAN_MOODS,
    state: HUMAN_STATES,
    pose: HUMAN_POSES,
    timeOfDay: 'any',
    roomUse: true,
    voiceUse: true,
    companionUse: true,
    renderable: true,
    referenceOnly: false,
  },

  // Cloud remains the mascot and keeps its existing state-specific art.
  { character: 'cloud', layer: 'mascot', assetKey: 'cloud',             filename: 'cloud.png',              mood: ['neutral','calm'],             state: ['idle','presence'],       pose: ['floating'], timeOfDay: 'any',   roomUse: true,  voiceUse: false, companionUse: true,  renderable: true, referenceOnly: false },
  { character: 'cloud', layer: 'mascot', assetKey: 'cloudHappy',        filename: 'cloud-happy.png',        mood: ['happy','energetic','loving'], state: ['idle'],                  pose: ['floating'], timeOfDay: 'any',   roomUse: true,  voiceUse: false, companionUse: true,  renderable: true, referenceOnly: false },
  { character: 'cloud', layer: 'mascot', assetKey: 'cloudHeadphones',   filename: 'cloud-headphones.png',   mood: ['calm','focused'],             state: ['voice-listening'],       pose: ['floating'], timeOfDay: 'any',   roomUse: false, voiceUse: true,  companionUse: false, renderable: true, referenceOnly: false },
  { character: 'cloud', layer: 'mascot', assetKey: 'cloudHeadphonesV2', filename: 'cloud-headphones-v2.png', mood: ['calm','focused','energetic'], state: ['voice-listening'],       pose: ['floating'], timeOfDay: 'any',   roomUse: false, voiceUse: true,  companionUse: false, renderable: true, referenceOnly: false },
  { character: 'cloud', layer: 'mascot', assetKey: 'cloudSleepy',       filename: 'cloud-sleepy.png',       mood: ['sleepy','calm'],              state: ['idle'],                  pose: ['floating'], timeOfDay: 'night', roomUse: true,  voiceUse: false, companionUse: true,  renderable: true, referenceOnly: false },
  { character: 'cloud', layer: 'mascot', assetKey: 'cloudStormy',       filename: 'cloud-stormy.png',       mood: ['stormy','sad'],               state: ['idle'],                  pose: ['floating'], timeOfDay: 'any',   roomUse: false, voiceUse: false, companionUse: false, renderable: true, referenceOnly: false },
];

function matchesTime(avatar: CharacterAvatar, timeOfDay?: TimeOfDay): boolean {
  if (!timeOfDay || timeOfDay === 'any') return true;
  return avatar.timeOfDay === timeOfDay || avatar.timeOfDay === 'any';
}

export function getAvatarForState(
  character: CharacterKey,
  state: AvatarState,
  timeOfDay?: TimeOfDay,
): CharacterAvatar | undefined {
  const candidates = AVATAR_REGISTRY.filter(
    avatar => avatar.character === character && avatar.state.includes(state) && avatar.renderable,
  );
  return candidates.find(avatar => matchesTime(avatar, timeOfDay)) ?? candidates[0];
}

export function getRoomAvatar(
  character: CharacterKey,
  timeOfDay?: TimeOfDay,
): CharacterAvatar | undefined {
  const candidates = AVATAR_REGISTRY.filter(
    avatar => avatar.character === character && avatar.roomUse && avatar.renderable,
  );
  return candidates.find(avatar => matchesTime(avatar, timeOfDay)) ?? candidates[0];
}

export function getVoiceAvatar(
  character: CharacterKey,
  timeOfDay?: TimeOfDay,
): CharacterAvatar | undefined {
  const candidates = AVATAR_REGISTRY.filter(
    avatar => avatar.character === character && avatar.voiceUse && avatar.renderable,
  );
  return candidates.find(avatar => matchesTime(avatar, timeOfDay)) ?? candidates[0];
}

export function getRenderableAvatars(character: CharacterKey): CharacterAvatar[] {
  return AVATAR_REGISTRY.filter(avatar => avatar.character === character && avatar.renderable);
}

export function getTolanlayerAvatars(character: CharacterKey): CharacterAvatar[] {
  return AVATAR_REGISTRY.filter(
    avatar => avatar.character === character && avatar.layer === 'tolan',
  );
}

export function getMascotLayerAvatars(): CharacterAvatar[] {
  return AVATAR_REGISTRY.filter(avatar => avatar.layer === 'mascot');
}

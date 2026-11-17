type StaticAsset = ReturnType<typeof require>;

export type NightPose =
  | 'neutral'
  | 'thinking'
  | 'writing'
  | 'window'
  | 'listening'
  | 'headphones'
  | 'microphone'
  | 'moonChair'
  | 'resting';

type PoseAssetEntry = {
  source: StaticAsset;
  generatedFile: string;
  activeFile: string;
  status: 'generated' | 'fallback';
};

const canonicalNight = require('../../assets/images/companions/teen/night/neutral.png');
const canonicalFile = 'assets/images/companions/teen/night/neutral.png';

function fallback(generatedFile: string): PoseAssetEntry {
  return {
    source: canonicalNight,
    generatedFile,
    activeFile: canonicalFile,
    status: 'fallback',
  };
}

export const NIGHT_ROOM_POSE_ASSETS: Record<NightPose, PoseAssetEntry> = {
  neutral: {
    source: canonicalNight,
    generatedFile: canonicalFile,
    activeFile: canonicalFile,
    status: 'generated',
  },
  thinking: fallback('assets/images/companions/teen/night/thinking.png'),
  writing: fallback('assets/images/companions/teen/night/writing.png'),
  window: fallback('assets/images/companions/teen/night/window.png'),
  listening: fallback('assets/images/companions/teen/night/listening.png'),
  headphones: fallback('assets/images/companions/teen/night/headphones.png'),
  microphone: fallback('assets/images/companions/teen/night/microphone.png'),
  moonChair: fallback('assets/images/companions/teen/night/moon-chair.png'),
  resting: fallback('assets/images/companions/teen/night/resting.png'),
};

export function getNightPoseAsset(pose: NightPose = 'neutral'): PoseAssetEntry {
  return NIGHT_ROOM_POSE_ASSETS[pose] ?? NIGHT_ROOM_POSE_ASSETS.neutral;
}

type PhaseAssetEntry = {
  source: StaticAsset;
  file: string;
};

export const NIGHT_ROOM_PHASE_ASSETS: Record<string, PhaseAssetEntry> = {
  day: { source: require('../../assets/images/resized-bg/bg-night-room-day.jpg'), file: 'assets/images/resized-bg/bg-night-room-day.jpg' },
  midday: { source: require('../../assets/images/resized-bg/bg-night-room-midday.jpg'), file: 'assets/images/resized-bg/bg-night-room-midday.jpg' },
  afternoon: { source: require('../../assets/images/resized-bg/bg-night-room-afternoon.jpg'), file: 'assets/images/resized-bg/bg-night-room-afternoon.jpg' },
  evening: { source: require('../../assets/images/resized-bg/bg-night-room-evening.jpg'), file: 'assets/images/resized-bg/bg-night-room-evening.jpg' },
  rain: { source: require('../../assets/images/resized-bg/bg-night-room-rain.jpg'), file: 'assets/images/resized-bg/bg-night-room-rain.jpg' },
  night: { source: require('../../assets/images/resized-bg/bg-night-room-night.jpg'), file: 'assets/images/resized-bg/bg-night-room-night.jpg' },
  deepNight: { source: require('../../assets/images/resized-bg/bg-night-room-deep-night.jpg'), file: 'assets/images/resized-bg/bg-night-room-deep-night.jpg' },
};

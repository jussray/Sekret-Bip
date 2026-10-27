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

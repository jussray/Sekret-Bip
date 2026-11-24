import type { ImageSourcePropType } from 'react-native';

/**
 * PUBLIC UI image authority only. These are pixel crops of the exact Family poster
 * supplied and selected by the founder, not new faces or AI-generated replacements.
 * Do not treat these media URLs as isolated Higgsfield identity-authority elements,
 * provider consent, or permission to generate paid video.
 */
export const FINAL_FAMILY_POSTER_SHA256 = 'ef5888960600669fa25922bb345cdcd1b5d4cccecb2a9ef578a616a7a8085971';
const BASE = 'https://d2ol7oe51mr4n9.cloudfront.net/user_3IxeW2mjocxEfjgv8ruzYWLYsaB/';
export const CANON_FAMILY_POSTER_IMAGE: ImageSourcePropType = {
  uri: BASE + '1c462922-24b6-4984-89aa-826dc36c62f8.jpg',
};

export type CanonCompanionId = 'sy' | 'night' | 'suhana' | 'ja' | 'cloud';

export interface CanonCompanion {
  id: CanonCompanionId;
  name: string;
  role: string;
  traits: readonly string[];
  symbol: string;
  portrait: ImageSourcePropType;
}

export const CANON_COMPANIONS: Record<CanonCompanionId, CanonCompanion> = {
  sy: {
    id: 'sy', name: 'Sy', role: 'The Builder',
    traits: ['Creative', 'Inventive', 'Tech-Savvy'], symbol: '♕',
    portrait: { uri: BASE + '207db92c-7f3b-45d3-9534-cd9a7cd2b6fe.jpg' },
  },
  night: {
    id: 'night', name: 'Night', role: 'The Watcher',
    traits: ['Observant', 'Protective', 'Insightful'], symbol: '☾',
    portrait: { uri: BASE + 'edebe97f-0bca-48e0-a6e0-b30838a1e7b3.jpg' },
  },
  suhana: {
    id: 'suhana', name: 'Suhana', role: 'The Center',
    traits: ['Compassionate', 'Grounded', 'Brings Balance'], symbol: '♡',
    portrait: { uri: BASE + 'eaf8c0df-00a3-4f9b-83d8-cece750df204.jpg' },
  },
  ja: {
    id: 'ja', name: 'Ja', role: 'The Oracle',
    traits: ['Wise', 'Visionary', 'Guides the Journey'], symbol: '✧',
    portrait: { uri: BASE + '5f444b50-4917-441d-8a13-46ed758373f9.jpg' },
  },
  cloud: {
    id: 'cloud', name: 'Cloud', role: 'The Calm',
    traits: ['Peaceful', 'Supportive', 'Keeps the Family Centered'], symbol: '☁',
    portrait: { uri: BASE + '1409b00c-ef84-4cfd-aa8f-63406509b73d.jpg' },
  },
};

export const CANON_COMPANION_ORDER: CanonCompanion[] = [
  CANON_COMPANIONS.sy, CANON_COMPANIONS.night, CANON_COMPANIONS.suhana,
  CANON_COMPANIONS.ja, CANON_COMPANIONS.cloud,
];

// Existing runtime keys remain intact: no change to auth, chat personalities or points.
export const CANON_COMPANION_IMAGES: Record<'raylene' | 'rylane' | 'night' | 'cloud' | 'ja', ImageSourcePropType> = {
  raylene: CANON_COMPANIONS.suhana.portrait,
  rylane: CANON_COMPANIONS.sy.portrait,
  night: CANON_COMPANIONS.night.portrait,
  cloud: CANON_COMPANIONS.cloud.portrait,
  ja: CANON_COMPANIONS.ja.portrait,
};

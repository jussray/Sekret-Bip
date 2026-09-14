/**
 * src/utils/sekretCompanionReply.ts
 * Surface-level reply engine for Se'kret Companions.
 * Companion state/persistence lives in src/utils/sekretCompanion.ts.
 * Import from here for screen-specific reply strings.
 *
 * @example
 *   import { SEKRET_COMPANIONS, getSekretCompanionReply } from '../utils/sekretCompanionReply';
 *   const reply = getSekretCompanionReply(SEKRET_COMPANIONS.raylene, { surface: 'journal' });
 */

export type CompanionSurface =
  | 'journal'
  | 'voiceBip'
  | 'comfort'
  | 'circle'
  | 'parentBridge';

export type CompanionMemory = {
  moodPatterns?: string[];
  favoriteComfortTools?: string[];
  streaks?: { name: string; count: number }[];
  goals?: string[];
  journalThemes?: string[];
};

export type CompanionContext = {
  surface: CompanionSurface;
  mood?: string;
  userText?: string;
  memory?: CompanionMemory;
  parentSharingEnabled?: boolean;
  teensafe?: boolean;
};

export type SekretCompanion = {
  id: 'raylene' | 'rylane' | 'cloud' | 'night';
  name: string;
  voice: string;
  boundaries: string[];
};

export type CompanionReply = {
  reply: string;
  parentShareSummary?: string;
  safetyFlag?: boolean;
};

// ---------------------------------------------------------------------------
// Companion roster
// ---------------------------------------------------------------------------

export const SEKRET_COMPANIONS: Record<SekretCompanion['id'], SekretCompanion> =
  {
    raylene: {
      id: 'raylene',
      name: 'Suhana',
      voice: 'soft big-sis energy',
      boundaries: ['no shame', 'no pressure', 'teen stays in control'],
    },
    rylane: {
      id: 'rylane',
      name: 'Sy',
      voice: 'protective big-bro energy',
      boundaries: ['kind but direct', 'protective', 'not preachy'],
    },
    cloud: {
      id: 'cloud',
      name: 'Cloud',
      voice: 'quiet sensory calming energy',
      boundaries: ['slow down', 'ground body first', 'soft replies'],
    },
    night: {
      id: 'night',
      name: 'Night',
      voice: 'late-night truth teller',
      boundaries: ['deep but safe', 'protective', 'never scary'],
    },
  };

// ---------------------------------------------------------------------------
// Safety detection — triggers human-forward response
// ---------------------------------------------------------------------------

const SAFETY_PHRASES = [
  'want to disappear',
  'hurt myself',
  'kill myself',
  'end it',
  'not be here',
  'suicide',
] as const;

function hasSafetyConcern(text?: string): boolean {
  if (!text) return false;
  const lower = text.toLowerCase();
  return SAFETY_PHRASES.some((phrase) => lower.includes(phrase));
}

// ---------------------------------------------------------------------------
// Reply engine
// ---------------------------------------------------------------------------

export function getSekretCompanionReply(
  companion: SekretCompanion,
  context: CompanionContext,
): CompanionReply {
  const safetyFlag = hasSafetyConcern(context.userText);

  if (safetyFlag) {
    return {
      safetyFlag: true,
      reply:
        `${companion.name}: I'm really glad you said that out loud. You don't have to handle this by yourself. ` +
        `Let's pause, get near a safe person if you can, and take one tiny step: cold water, sit down, breathe slow. ` +
        `If you feel like you might hurt yourself or disappear for real, tell a trusted adult right now or call emergency help.`,
      parentShareSummary: context.parentSharingEnabled
        ? 'Teen may be feeling overwhelmed and needs gentle support, safety, and no judgment.'
        : undefined,
    };
  }

  if (context.surface === 'journal') {
    return {
      reply: `${companion.name}: Start messy. Three minutes counts. You don't have to explain your whole heart tonight.`,
    };
  }

  if (context.surface === 'voiceBip') {
    return {
      reply: `${companion.name}: Say it how it comes out. No perfect words needed — I'm listening for the feeling, not the grammar.`,
    };
  }

  if (context.surface === 'comfort') {
    return {
      reply: `${companion.name}: Let's make it smaller. Cold water, shoulders down, one breath. That's the whole mission right now.`,
    };
  }

  if (context.surface === 'circle') {
    return {
      reply: `${companion.name}: You're not the only one carrying something quiet. Post soft, protect your details, keep your power.`,
    };
  }

  if (context.surface === 'parentBridge') {
    return {
      reply: `${companion.name}: We can translate the feeling without exposing the whole secret.`,
      parentShareSummary:
        'Teen may need a softer check-in, less pressure, and space to explain when ready.',
    };
  }

  return {
    reply: `${companion.name}: I'm here. Let's take this one tiny Bip at a time.`,
  };
}

import type { NamedCompanionId } from './identityContract';
import {
  getStyleProfile,
  isNamedCompanionId,
  type AdviceMode,
  type Cadence,
  type PresenceStyleId,
  type SentenceLength,
  type StyleRole,
} from './styleProfiles';

export type StyledReplyRequest = {
  styleId: PresenceStyleId;
  role: StyleRole;
  textStyleVersion: string;
  speechStyleVersion: string;
  systemPromptAddendum: string;
  speechInstructions: string;
  constraints: {
    cadence: Cadence;
    sentenceLength: SentenceLength;
    maxQuestions: number;
    slangLevel: number;
    warmthLevel: number;
    humorLevel: number;
    silenceTolerance: number;
    adviceMode: AdviceMode;
    forbiddenPhrases: readonly string[];
  };
};

function buildStyleRequest(styleId: PresenceStyleId): StyledReplyRequest {
  const profile = getStyleProfile(styleId);
  const questionRule =
    profile.questionBudget === 0
      ? 'Ask no direct questions.'
      : `Ask no more than ${profile.questionBudget} direct question${profile.questionBudget === 1 ? '' : 's'}.`;

  return {
    styleId,
    role: profile.role,
    textStyleVersion: profile.textStyleVersion,
    speechStyleVersion: profile.speechStyleVersion,
    systemPromptAddendum: `${profile.systemPromptSnippet} ${questionRule}`,
    speechInstructions: profile.speechInstructions,
    constraints: {
      cadence: profile.cadence,
      sentenceLength: profile.sentenceLength,
      maxQuestions: profile.questionBudget,
      slangLevel: profile.slangLevel,
      warmthLevel: profile.warmthLevel,
      humorLevel: profile.humorLevel,
      silenceTolerance: profile.silenceTolerance,
      adviceMode: profile.adviceMode,
      forbiddenPhrases: profile.forbiddenPhrases,
    },
  };
}

/** Build style instructions for one of the four named companions. */
export function buildCompanionStyleRequest(
  companionId: NamedCompanionId,
): StyledReplyRequest {
  if (!isNamedCompanionId(companionId)) {
    throw new Error(
      `[companionStyleEngine] ${String(companionId)} is not a named companion. ` +
        `Use buildSekretPresenceStyleRequest() for Se'kret continuity.`,
    );
  }

  return buildStyleRequest(companionId);
}

/**
 * Build Se'kret's continuity-presence style without treating Se'kret as a
 * selectable named companion.
 */
export function buildSekretPresenceStyleRequest(): StyledReplyRequest {
  return buildStyleRequest('sekret');
}

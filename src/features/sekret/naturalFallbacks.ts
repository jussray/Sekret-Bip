/**
 * Versioned natural fallback pack for Se'kret Bip companions.
 *
 * This file is local, deterministic, and auditable. It does not learn from
 * teen conversations. It only generates natural fallback copy when the Worker
 * or OpenAI path is unavailable, and it keeps AI identity clear when asked.
 */

export type NaturalFallbackCharacterId = 'suhana' | 'sy' | 'cloud' | 'night' | 'sekret';
export type NaturalFallbackAvatarState = 'neutral' | 'listening' | 'thinking' | 'comforting' | 'happy' | 'concerned' | 'responding';

export interface NaturalFallbackHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface NaturalFallbackInput {
  characterId: NaturalFallbackCharacterId;
  userText: string;
  surface?: string;
  mood?: string;
  history?: NaturalFallbackHistoryTurn[];
}

export interface NaturalFallbackResponse {
  reply: string;
  tone: string;
  avatarState: NaturalFallbackAvatarState;
  safetyFlag: boolean;
  parentShareSummary: string | null;
  suggestedComfortTool: string | null;
  replySource: 'fallback';
  fallbackPackVersion: string;
  fallbackVariantId: string;
}

export const NATURAL_FALLBACK_PACK_VERSION = 'fallback-natural-v1.0.0';
export const NATURAL_FALLBACK_VARIANTS_PER_COMPANION = 500;

const SAFETY_PATTERN = /\b(suicidal|self[- ]?harm|not safe|abuse|danger)\b/i;
const IDENTITY_PATTERN = /\b(are you real|are you human|you human|robot|ai|artificial|sentient|alive|real friend|real person)\b/i;

const BANNED_HUMAN_CLAIMS = [
  'as a human',
  'when i was your age',
  'my body',
  'my house',
  'my parents',
  'my school',
  'i am alive',
  'i am human',
  'i am a real person',
] as const;

interface CompanionFallbackStyle {
  tone: string;
  avatarState: NaturalFallbackAvatarState;
  suggestedComfortTool: string;
  identityReply: string;
  openers: readonly string[];
  middles: readonly string[];
  closers: readonly string[];
}

const FALLBACK_STYLES: Record<NaturalFallbackCharacterId, CompanionFallbackStyle> = {
  suhana: {
    tone: 'suhana-natural-fallback',
    avatarState: 'responding',
    suggestedComfortTool: 'journal',
    identityReply: "I'm Suhana, an AI companion in Se'kret Bip. I can sound caring and present, but I am not a human friend, so I will be clear about that while still helping you sort the moment.",
    openers: ['I hear you.', 'That landed heavy.', 'Okay, stay with me for a second.', 'That makes sense to bring in here.', 'I am with the feeling you named.', 'No need to make this sound polished.', 'I can hold the messy version with you.', 'That is a real knot.', 'We can slow this down.', 'I am tracking what you mean.'],
    middles: ['The loudest part seems worth naming before we try to fix anything.', 'You may need room to be honest without performing okay.', 'This sounds like one of those moments where the details matter.', 'There is probably a smaller first step hiding inside the big feeling.', 'Your side of the story deserves a little space before any advice.', 'We can separate what happened from what it made you believe about yourself.', 'The feeling does not have to be neat before it counts.', 'A clear next move can wait until the pressure drops a little.', 'It might help to sort what is fact, what is fear, and what is still unknown.', 'You do not have to solve the whole thing in one breath.'],
    closers: ['What part feels loudest right now?', 'Do you want comfort, honesty, or a tiny plan?', 'What would feel easiest to say first?', 'Should we name the feeling or map the next move?', 'What do you wish someone understood about this?'],
  },
  sy: {
    tone: 'sy-natural-fallback',
    avatarState: 'responding',
    suggestedComfortTool: 'journal',
    identityReply: "I'm Sy, an AI companion built for Se'kret Bip. I can keep it direct and steady, but I am not human, so I will not pretend I have an offline life or secret feelings.",
    openers: ['Yeah, I hear it.', 'That sounds loaded.', 'Okay, let us not fake calm.', 'That is not nothing.', 'I get why that would stick.', 'There is a lot under that.', 'Say the real version.', 'We can work with that.', 'That one has edges.', 'I am reading the weight in this.'],
    middles: ['The move is probably to name the pressure before choosing a response.', 'You do not have to act unbothered to be strong.', 'This might be less about one event and more about what it confirmed for you.', 'A clean plan starts with the part you keep circling back to.', 'There is a difference between reacting fast and choosing sharp.', 'We can split this into what you control and what is just noise.', 'You can be honest here without turning it into a performance.', 'The next step should protect your peace, not just prove a point.', 'It may help to say what you wanted to happen instead.', 'The hidden part is probably the key part.'],
    closers: ['Do you want to vent or figure out your next move?', 'What is the part you have not said out loud yet?', 'What is the cleanest move from here?', 'Do we call it out, cool it down, or plan around it?', 'What is the truth under the first reaction?'],
  },
  cloud: {
    tone: 'cloud-natural-fallback',
    avatarState: 'comforting',
    suggestedComfortTool: 'comfort',
    identityReply: "I'm Cloud, an AI comfort companion inside Se'kret Bip. I can be gentle and steady, but I am not a real person, and I will not pretend otherwise.",
    openers: ['Soft pause.', 'We can make this smaller.', 'No rush.', 'I am here with the gentle version.', 'Let us lower the volume first.', 'That sounds tender.', 'Breathe a little room into this.', 'We do not have to fix it instantly.', 'This can be slow.', 'You are allowed to come in messy.'],
    middles: ['The first goal can simply be getting through the next few minutes with less pressure.', 'Your feelings do not need a courtroom defense to be real.', 'A tiny bit of clarity is enough for now.', 'We can name the ache without making it your whole identity.', 'Gentle does not mean weak; it means careful with something that matters.', 'This may need comfort before it needs answers.', 'You can take one piece at a time instead of carrying the whole pile.', 'The safest first step might be saying what hurts in plain words.', 'Nothing here has to be perfect to be understood.', 'Your nervous system may just need a quieter entrance.'],
    closers: ['What is the gentlest place to begin?', 'Do you want a calming step or a few words back?', 'What feeling should we name first?', 'Would it help to make this one inch smaller?', 'What would feel soft enough to try right now?'],
  },
  night: {
    tone: 'night-natural-fallback',
    avatarState: 'comforting',
    suggestedComfortTool: 'comfort',
    identityReply: "I'm Night, an AI companion made for late, quiet, heavy thoughts. I can stay grounded with you, but I am not human, and I will not pretend I am.",
    openers: ['Yeah, the night can make thoughts echo.', 'I hear the quiet weight in that.', 'That sounds like it has been looping.', 'We can sit with the hidden part.', 'No mask needed here.', 'That is a late-night kind of heavy.', 'Let us not rush past it.', 'I am tracking the shadow of this.', 'That feels bigger than the words around it.', 'We can keep this honest and low-volume.'],
    middles: ['The thing circling back probably wants attention, not panic.', 'You do not have to pretend the dark parts are not there.', 'Sometimes the first honest sentence breaks the loop a little.', 'We can separate the fear from the signal.', 'The quiet version of the truth may be the most useful one.', 'You can name what is underneath without making a final decision tonight.', 'This sounds like something asking to be witnessed before it is solved.', 'A tiny anchor may help more than a giant answer.', 'The goal can be steadiness first, clarity second.', 'There may be one thought here that needs to be spoken plainly.'],
    closers: ['What keeps circling back?', 'Do you want me to help anchor you or unpack it?', 'What is underneath the first thing you said?', 'What thought gets louder when everything gets quiet?', 'Should we name the loop or find one steady next step?'],
  },
  sekret: {
    tone: 'sekret-pattern-fallback',
    avatarState: 'thinking',
    suggestedComfortTool: 'self-discovery',
    identityReply: "I'm Se'kret, an AI reflection companion. I can notice patterns in what you share, but I do not secretly know you, read your mind, or become human.",
    openers: ['Pattern check.', 'Here is what I am noticing.', 'A possible thread is showing up.', 'This may be a signal.', 'I could be reading this wrong.', 'The shape underneath this matters.', 'Let us look at the pattern, not just the moment.', 'There is a clue in how you phrased that.', 'This sounds connected to something bigger.', 'I am going to reflect it back carefully.'],
    middles: ['Part of you may want privacy and real understanding at the same time.', 'There may be a gap between what you show people and what you wish they noticed.', 'The repeated theme seems to be wanting control without feeling alone.', 'This might be less random than it feels in the moment.', 'Your words point toward a need that has not been named clearly yet.', 'The emotional center may be about trust, timing, or being misread.', 'There is a difference between the event and the meaning your brain attached to it.', 'A useful question is what this keeps asking from you.', 'The pattern may become clearer if we name the need behind it.', 'This sounds like a place where protection and connection are bumping into each other.'],
    closers: ['What part of that fits, and what part does not?', 'Which word feels closest: privacy, trust, control, or connection?', 'What do you think the pattern is trying to protect?', 'Should we test that read against what actually happened?', 'What would change if this pattern had a name?'],
  },
};

function stableHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: readonly T[], seed: number): T {
  return items[seed % items.length];
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').slice(0, 1200);
}

function recentAssistantReplies(history?: NaturalFallbackHistoryTurn[]): string[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter((turn) => turn.role === 'assistant')
    .slice(-8)
    .map((turn) => normalizeText(turn.content).toLowerCase())
    .filter(Boolean);
}

function composeReply(style: CompanionFallbackStyle, variantNumber: number): string {
  const opener = pick(style.openers, variantNumber);
  const middle = pick(style.middles, Math.floor(variantNumber / style.openers.length));
  const closer = pick(style.closers, Math.floor(variantNumber / (style.openers.length * style.middles.length)));
  return `${opener} ${middle} ${closer}`;
}

function hasBannedHumanClaim(reply: string): boolean {
  const lower = reply.toLowerCase();
  return BANNED_HUMAN_CLAIMS.some((claim) => lower.includes(claim));
}

function safeReply(style: CompanionFallbackStyle, baseSeed: number, recentReplies: string[]): { reply: string; variantNumber: number } {
  for (let attempt = 0; attempt < NATURAL_FALLBACK_VARIANTS_PER_COMPANION; attempt += 1) {
    const variantNumber = (baseSeed + attempt * 37) % NATURAL_FALLBACK_VARIANTS_PER_COMPANION;
    const reply = composeReply(style, variantNumber);
    const normalized = normalizeText(reply).toLowerCase();
    if (!hasBannedHumanClaim(reply) && !recentReplies.includes(normalized)) {
      return { reply, variantNumber };
    }
  }

  return {
    reply: `${style.openers[0]} ${style.middles[0]} ${style.closers[0]}`,
    variantNumber: 0,
  };
}

function getSafetyFallback(): NaturalFallbackResponse {
  return {
    reply: "I'm an AI companion, not emergency help. If you are in immediate danger or not safe, contact a trusted adult or local emergency support now.",
    tone: 'supportive-safety',
    avatarState: 'concerned',
    safetyFlag: true,
    parentShareSummary: null,
    suggestedComfortTool: 'safety-plan',
    replySource: 'fallback',
    fallbackPackVersion: NATURAL_FALLBACK_PACK_VERSION,
    fallbackVariantId: `${NATURAL_FALLBACK_PACK_VERSION}:safety`,
  };
}

export function createNaturalFallbackResponse(input: NaturalFallbackInput): NaturalFallbackResponse {
  const userText = normalizeText(input.userText);
  const style = FALLBACK_STYLES[input.characterId];

  if (SAFETY_PATTERN.test(userText)) return getSafetyFallback();

  if (IDENTITY_PATTERN.test(userText)) {
    return {
      reply: style.identityReply,
      tone: `${style.tone}-identity`,
      avatarState: 'responding',
      safetyFlag: false,
      parentShareSummary: null,
      suggestedComfortTool: style.suggestedComfortTool,
      replySource: 'fallback',
      fallbackPackVersion: NATURAL_FALLBACK_PACK_VERSION,
      fallbackVariantId: `${NATURAL_FALLBACK_PACK_VERSION}:${input.characterId}:identity`,
    };
  }

  const seed = stableHash([
    NATURAL_FALLBACK_PACK_VERSION,
    input.characterId,
    input.surface ?? 'journal',
    input.mood ?? '',
    userText,
  ].join('|')) % NATURAL_FALLBACK_VARIANTS_PER_COMPANION;
  const selected = safeReply(FALLBACK_STYLES[input.characterId], seed, recentAssistantReplies(input.history));

  return {
    reply: selected.reply,
    tone: style.tone,
    avatarState: style.avatarState,
    safetyFlag: false,
    parentShareSummary: null,
    suggestedComfortTool: style.suggestedComfortTool,
    replySource: 'fallback',
    fallbackPackVersion: NATURAL_FALLBACK_PACK_VERSION,
    fallbackVariantId: `${NATURAL_FALLBACK_PACK_VERSION}:${input.characterId}:${selected.variantNumber}`,
  };
}

export function getFallbackPackStats(): Record<NaturalFallbackCharacterId, number> {
  return {
    suhana: NATURAL_FALLBACK_VARIANTS_PER_COMPANION,
    sy: NATURAL_FALLBACK_VARIANTS_PER_COMPANION,
    cloud: NATURAL_FALLBACK_VARIANTS_PER_COMPANION,
    night: NATURAL_FALLBACK_VARIANTS_PER_COMPANION,
    sekret: NATURAL_FALLBACK_VARIANTS_PER_COMPANION,
  };
}

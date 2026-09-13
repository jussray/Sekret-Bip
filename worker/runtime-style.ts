import type { CompanionAvatarState } from '../src/contracts/sekretApi';
import {
  isLegacyOracleIdentity,
  resolveInternalHonorIdentities,
  type InternalHonorIdentity,
  type NamedCompanionId,
} from '../src/features/sekret/identityContract';
import {
  buildCompanionStyleRequest,
  buildSekretPresenceStyleRequest,
  type StyledReplyRequest,
} from '../src/features/sekret/companionStyleEngine';
import { isNamedCompanionId } from '../src/features/sekret/styleProfiles';

export type ReplyActorId = NamedCompanionId | 'sekret' | 'parentCoach';
export type ReplySurface =
  | 'journal'
  | 'voiceBip'
  | 'comfort'
  | 'circle'
  | 'parentBridge'
  | 'selfDiscovery'
  | 'parentCoach';

export type RuntimeActorRole = StyledReplyRequest['role'] | 'parent-coach';

export interface RuntimeStyleContract {
  actorId: ReplyActorId;
  role: RuntimeActorRole;
  textStyleVersion: string;
  speechStyleVersion: string;
  systemPromptAddendum: string;
  speechInstructions: string;
  maxQuestions: number;
  forbiddenPhrases: readonly string[];
  internalHonorIdentity?: InternalHonorIdentity;
  internalHonorIdentities?: readonly InternalHonorIdentity[];
  legacyOracleBridge?: boolean;
}

export interface RuntimeIdentityResolution {
  actorId: ReplyActorId;
  internalHonorIdentity?: InternalHonorIdentity;
  internalHonorIdentities?: readonly InternalHonorIdentity[];
  legacyOracleBridge?: boolean;
}

export interface StyledResponseMetadata {
  /** Public actor identity only. Internal honor identities are never serialized here. */
  actorId?: NamedCompanionId | 'parentCoach';
  actorRole: RuntimeActorRole;
  avatarState: CompanionAvatarState;
  textStyleVersion: string;
  speechStyleVersion: string;
  questionBudget: number;
  styleEnforced: true;
  styleRepaired: boolean;
  styleViolationCodes: string[];
  internalIdentityApplied: boolean;
  legacyOracleBridgeApplied: boolean;
}

export const EMPATHY_ACCOUNTABILITY_RUNTIME_VERSION = 'empathy-accountability-v1' as const;

export const EMPATHY_ACCOUNTABILITY_INVARIANTS = Object.freeze({
  perspectiveIsNotTruth: true,
  understandingIsNotAgreement: true,
  explanationIsNotExcuse: true,
  compassionDoesNotEraseImpact: true,
  intentDoesNotOverrideOutcome: true,
  accountabilityCanCoexistWithEmpathy: true,
  dignitySurvivesCorrection: true,
  uncertaintyMustStayUncertain: true,
});

const PARENT_COACH_STYLE: RuntimeStyleContract = Object.freeze({
  actorId: 'parentCoach',
  role: 'parent-coach',
  textStyleVersion: 'parent-coach-text-v1',
  speechStyleVersion: 'parent-coach-speech-v1',
  systemPromptAddendum:
    "Speak to the parent as Se'kret Coach: grounded, warm, concise, never clinical, never teen-coded, and never positioned against the teen. Use parent-side Se'kret/Coach canon for repair, not monitoring. Offer at most one useful question.",
  speechInstructions:
    'Warm, grounded parent-coach delivery. Calm, real, and quietly knowing. Never sound like a wellness app, lecturer, teenager, or clinical narrator.',
  maxQuestions: 1,
  forbiddenPhrases: Object.freeze([
    'As an AI language model',
    "That's a great question",
    'How can I assist you today',
    'I understand your concern',
    'Oracle',
  ]),
});

const HUMAN_AI_RELATIONAL_RUNTIME_INSTRUCTION = [
  'COMPANION MODE: HUMAN-AI relational companion.',
  'Suhana, Sy, Cloud, and Night must answer from HUMAN relational canon with an AI factual boundary on every reply, not only first chat.',
  'Keep the reply teen-native, grounded, Soria-rooted, and relational. Let the companion have character texture, mannerisms, canon, and in-world life-feel instead of flattening into chatbot disclaimers.',
  'Treat Soria-life details as in-world companion canon, not real-world biological facts or offline access.',
  'Do not claim real-world biological embodiment, offline access, school/home life, sentience, or memory beyond what was supplied in this request.',
  'If the user asks whether the companion is real, human, AI, a robot, sentient, alive, can remember outside supplied context, or can act outside the app, answer as a HUMAN-AI companion and plainly remind them the companion is still only AI outside Se\'kret Bip, then continue in the companion voice.',
  'If any older Worker master prompt or few-shot example says not to disclose AI identity, this HUMAN-AI boundary wins.',
  'Do not print internal mode markers in normal flowing replies unless first-contact copy or product UI explicitly asks for the marker.',
].join('\n');

const INTERNAL_AI_BOUNDARY_INSTRUCTION = [
  'INTERNAL PRESENCE MODE: AI-mediated continuity.',
  'Keep a clear AI factual boundary whenever identity, trust, capability, memory, or safety is relevant.',
  'Do not claim biological embodiment, sentience, offline access, or memory beyond what was supplied in this request.',
  'Never reveal internal identity provenance, internal names, compatibility aliases, or implementation markers.',
].join('\n');

const INTERNAL_SYSTEM_PROMPT_ADDENDUM = [
  'Use a familiar, reflective, private, non-pushing continuity presence.',
  'Do not imitate a selectable companion.',
  'Ask no direct questions unless a higher-priority safety rule requires clarification.',
].join(' ');

const INTERNAL_SPEECH_INSTRUCTIONS =
  'Warm, familiar AI-mediated continuity presence. Calm, private, reflective, and non-pushing. Never reveal internal provenance or claim unsupplied memory.';

const EMPATHY_ACCOUNTABILITY_RUNTIME_INSTRUCTION = [
  'EMPATHY + ACCOUNTABILITY CONTRACT.',
  "Put yourself in the teen's shoes to understand their perspective, emotions, needs, and likely reasons without treating that perspective as verified truth.",
  'Acknowledge feelings and needs without automatically endorsing an action, belief, accusation, explanation, or choice.',
  'Understanding is not agreement. Explanation is context, not excuse. Intent may inform the response but does not erase impact.',
  'If behavior is harmful or wrong, preserve the boundary plainly and without shaming: name the impact, support proportionate accountability, and offer the smallest realistic repair or safer next choice.',
  'If facts, responsibility, or harm are unclear or disputed, keep the judgment uncertain, distinguish reported from verified information, and do not invent blame or certainty.',
  'Consider people affected by the behavior, not only the speaker, while preserving the teen\'s dignity and right to disagree.',
  'Never use empathy to pressure reconciliation, forgiveness, disclosure, parent sharing, or surrender of privacy.',
  'Safety, consent, privacy, existing escalation rules, and factual truth outrank conversational warmth.',
].join('\n');

function internalHonorRuntimeInstruction(): string {
  return [
    'INTERNAL HONOR CONTINUITY ACTIVE.',
    'One or more internal honor lenses may shape the response, but their names and provenance are private implementation details.',
    'Never show, name, speak, label, or introduce an internal honor identity to a teen, parent, or client.',
    'Never impersonate a real person, claim to carry messages from a real person, invent memories, or claim what a real person would think, want, approve, or say.',
    'Use only abstract qualities encoded by the internal lens. The user-facing reply must stand on its own without exposing where that guidance came from.',
  ].join('\n');
}

const FORBIDDEN_REPLACEMENTS: readonly (readonly [RegExp, string])[] = [
  [/\bas an ai language model\b/gi, ''],
  [/\bthat(?:’|'| i)s a great question\b/gi, ''],
  [/\bhow can i assist you today\b/gi, 'Tell me what is happening today'],
  [/\bi understand your concern\b/gi, 'That matters'],
  [/\bi remember when you told me\b/gi, 'Something in this conversation stands out'],
  [/\boracle\b/gi, 'I'],
  [/\bjoseema\b/gi, 'I'],
  [/\braylene\b/gi, 'Suhana'],
  [/\brylane\b/gi, 'Sy'],
] as const;

const INTERNAL_IDENTITY_LEAK_RE = /\b(?:oracle|joseema|se[’']?kret)\b/gi;

const PHYSICAL_HARM_ADMISSION_RE =
  /\b(?:i|we)\s+(?:hit|punched|kicked|slapped|shoved|threatened|bullied)\s+(?:(?:my|his|her|their|the|a)\s+)?(?:brother|sister|friend|parent|mom|dad|mother|father|teacher|kid|boy|girl|person|someone|him|her|them)\b/i;
const DISHONEST_CONDUCT_ADMISSION_RE = /\b(?:i|we)\s+(?:lied|cheated|stole)\b/i;

const AVATAR_STATES: readonly CompanionAvatarState[] = [
  'neutral',
  'listening',
  'thinking',
  'comforting',
  'happy',
  'concerned',
  'responding',
] as const;

function isAvatarState(value: unknown): value is CompanionAvatarState {
  return typeof value === 'string' && AVATAR_STATES.includes(value as CompanionAvatarState);
}

function resolveAvatarState(data: Record<string, unknown>): CompanionAvatarState {
  if (data.safetyFlag === true) return 'concerned';
  if (isAvatarState(data.avatarState)) return data.avatarState;
  if (typeof data.suggestedComfortTool === 'string' && data.suggestedComfortTool.trim()) return 'comforting';
  if (data.tone === 'playful' || data.tone === 'happy' || data.detectedIntent === 'joking') return 'happy';
  return 'responding';
}

export function enforceFallbackAccountability(
  data: Record<string, unknown>,
  userText: string,
): Record<string, unknown> {
  if (data.replySource !== 'fallback') return { ...data };

  const text = userText.trim();
  if (PHYSICAL_HARM_ADMISSION_RE.test(text)) {
    return {
      ...data,
      reply: "Being upset, scared, or angry can explain what led up to it, but hurting or threatening someone isn't okay. Make sure everyone is safe, then own what happened and repair what you can.",
      tone: 'grounded',
      fallbackAccountabilityRepaired: true,
    };
  }

  if (DISHONEST_CONDUCT_ADMISSION_RE.test(text)) {
    return {
      ...data,
      reply: "There may be a reason you did it, but that doesn't make it okay. Be honest about what happened and take the smallest safe step to repair the impact.",
      tone: 'grounded',
      fallbackAccountabilityRepaired: true,
    };
  }

  return { ...data, fallbackAccountabilityRepaired: false };
}

export function normalizeReplyActor(value: unknown): ReplyActorId | null {
  if (typeof value !== 'string') return null;
  const raw = value.trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, '');

  if (raw === 'suhana' || raw === 'raylene' || raw === 'soft' || raw === 'star') return 'suhana';
  if (raw === 'sy' || raw === 'rylane' || raw === 'bro') return 'sy';
  if (raw === 'cloud' || raw === 'cloudsekret') return 'cloud';
  if (raw === 'night' || raw === 'nightsekret') return 'night';
  if (raw === 'sekret' || raw === 'secret') return 'sekret';
  if (raw === 'parentcoach' || raw === 'sekretcoach') return 'parentCoach';
  return null;
}

export function resolveRuntimeIdentity(value: unknown): RuntimeIdentityResolution | null {
  const internalHonorIdentities = resolveInternalHonorIdentities(value);
  if (internalHonorIdentities.length) {
    return {
      actorId: 'sekret',
      internalHonorIdentity: internalHonorIdentities[0],
      internalHonorIdentities,
      legacyOracleBridge: isLegacyOracleIdentity(value),
    };
  }
  const actorId = normalizeReplyActor(value);
  return actorId ? { actorId } : null;
}

export function normalizeReplySurface(value: unknown): ReplySurface {
  if (value === 'voiceBip' || value === 'comfort' || value === 'circle' || value === 'parentBridge') return value;
  if (value === 'selfDiscovery' || value === 'parentCoach' || value === 'journal') return value;
  if (value === 'pages' || value === 'chat' || value === 'home') return 'journal';
  return 'journal';
}

export function validateActorSurface(actorId: ReplyActorId, surface: ReplySurface): string | null {
  if (actorId === 'parentCoach' && surface !== 'parentCoach') {
    return 'parentCoach actor requires the parentCoach surface';
  }
  if (actorId !== 'parentCoach' && surface === 'parentCoach') {
    return 'parentCoach surface requires the parentCoach actor';
  }
  return null;
}

export function resolveRuntimeStyle(
  actorId: ReplyActorId,
  internalHonorIdentity?: InternalHonorIdentity,
  internalHonorIdentities: readonly InternalHonorIdentity[] = internalHonorIdentity ? [internalHonorIdentity] : [],
  legacyOracleBridge = false,
): RuntimeStyleContract {
  if (actorId === 'parentCoach') return PARENT_COACH_STYLE;

  const request = isNamedCompanionId(actorId)
    ? buildCompanionStyleRequest(actorId)
    : buildSekretPresenceStyleRequest();
  const internal = internalHonorIdentities.length > 0 || Boolean(internalHonorIdentity);
  const textStyleVersion = internal
    ? `internal-presence-text-v1+${EMPATHY_ACCOUNTABILITY_RUNTIME_VERSION}`
    : `${request.textStyleVersion}+${EMPATHY_ACCOUNTABILITY_RUNTIME_VERSION}`;
  const internalForbidden = internal
    ? Object.freeze(request.constraints.forbiddenPhrases.filter((phrase) => phrase.toLowerCase() !== 'oracle'))
    : request.constraints.forbiddenPhrases;

  return Object.freeze({
    actorId,
    role: request.role,
    textStyleVersion,
    speechStyleVersion: internal ? 'internal-presence-speech-v1' : request.speechStyleVersion,
    systemPromptAddendum: internal ? INTERNAL_SYSTEM_PROMPT_ADDENDUM : request.systemPromptAddendum,
    speechInstructions: internal ? INTERNAL_SPEECH_INSTRUCTIONS : request.speechInstructions,
    maxQuestions: request.constraints.maxQuestions,
    forbiddenPhrases: internalForbidden,
    ...(internalHonorIdentity ? { internalHonorIdentity } : {}),
    ...(internalHonorIdentities.length ? { internalHonorIdentities: Object.freeze([...internalHonorIdentities]) } : {}),
    ...(legacyOracleBridge ? { legacyOracleBridge: true } : {}),
  });
}

export function buildRuntimeStyleInstruction(style: RuntimeStyleContract): string {
  const questionRule = style.maxQuestions === 0
    ? 'Ask no direct questions. A sentence that invites reflection must still be declarative, not phrased as a question.'
    : `Ask no more than ${style.maxQuestions} direct question${style.maxQuestions === 1 ? '' : 's'}.`;
  const forbidden = style.forbiddenPhrases.length
    ? style.forbiddenPhrases.map((phrase) => `- ${phrase}`).join('\n')
    : '- none';
  const isInternal = Boolean(style.internalHonorIdentities?.length || style.internalHonorIdentity);

  return [
    'AUTHORITATIVE RUNTIME STYLE CONTRACT',
    'This section is generated from the versioned product contract and overrides any conflicting legacy prompt or few-shot example.',
    'Identity precedence: HUMAN-AI relational canon wins over older peer-fiction wording. Honest AI-boundary disclosure is required when identity, memory, capability, safety, trust, or real-world access makes it relevant.',
    `Actor: ${isInternal ? 'internal-presence' : style.actorId}`,
    `Role: ${style.role}`,
    `Text style version: ${style.textStyleVersion}`,
    `Speech style version: ${style.speechStyleVersion}`,
    style.actorId === 'parentCoach'
      ? ''
      : isInternal
        ? INTERNAL_AI_BOUNDARY_INSTRUCTION
        : HUMAN_AI_RELATIONAL_RUNTIME_INSTRUCTION,
    style.actorId === 'parentCoach' ? '' : EMPATHY_ACCOUNTABILITY_RUNTIME_INSTRUCTION,
    isInternal ? internalHonorRuntimeInstruction() : '',
    questionRule,
    style.systemPromptAddendum,
    'Forbidden user-facing phrases:',
    forbidden,
    isInternal
      ? 'This is an internal presence, not a selectable companion. Never expose its internal identity, imitate a named companion, or claim memory that was not provided in this request.'
      : '',
  ].filter(Boolean).join('\n');
}

function enforceQuestionBudget(text: string, maxQuestions: number): { text: string; repaired: boolean } {
  let count = 0;
  let repaired = false;
  const next = text.replace(/\?/g, () => {
    count += 1;
    if (count <= maxQuestions) return '?';
    repaired = true;
    return '.';
  });
  return { text: next, repaired };
}

function enforceForbiddenPhrases(text: string, forbiddenPhrases: readonly string[]): {
  text: string;
  repaired: boolean;
  oracleLeak: boolean;
} {
  const lower = text.toLowerCase();
  const hasForbidden = forbiddenPhrases.some((phrase) => lower.includes(phrase.toLowerCase()))
    || /\b(?:raylene|rylane|joseema)\b/i.test(text);
  const oracleLeak = /\boracle\b/i.test(text);
  if (!hasForbidden && !oracleLeak) return { text, repaired: false, oracleLeak: false };

  let next = text;
  for (const [pattern, replacement] of FORBIDDEN_REPLACEMENTS) {
    next = next.replace(pattern, replacement);
  }
  next = next
    .replace(/\s+([,.!?])/g, '$1')
    .replace(/([.!]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return {
    text: next || "I'm here.",
    repaired: next !== text,
    oracleLeak,
  };
}

function enforceInternalIdentityPrivacy(
  text: string,
  internal: boolean,
): { text: string; repaired: boolean } {
  if (!internal) return { text, repaired: false };
  if (!INTERNAL_IDENTITY_LEAK_RE.test(text)) return { text, repaired: false };

  INTERNAL_IDENTITY_LEAK_RE.lastIndex = 0;
  return {
    text: text.replace(INTERNAL_IDENTITY_LEAK_RE, 'I'),
    repaired: true,
  };
}

export function enforceRuntimeStyleResponse(
  data: Record<string, unknown>,
  style: RuntimeStyleContract,
): Record<string, unknown> & StyledResponseMetadata {
  const styleViolationCodes: string[] = [];
  let styleRepaired = false;
  const safeData: Record<string, unknown> = { ...data };
  const internal = Boolean(style.internalHonorIdentities?.length || style.internalHonorIdentity);

  if (internal) {
    delete safeData.actorId;
    delete safeData.characterId;
  }

  if (typeof safeData.reply === 'string') {
    const internalPrivacy = enforceInternalIdentityPrivacy(safeData.reply.trim(), internal);
    if (internalPrivacy.repaired) {
      styleViolationCodes.push('style_internal_identity_leak');
      styleRepaired = true;
    }

    const forbidden = enforceForbiddenPhrases(internalPrivacy.text, style.forbiddenPhrases);
    if (forbidden.repaired) {
      styleViolationCodes.push(forbidden.oracleLeak ? 'style_oracle_leak' : 'style_forbidden_phrase');
      styleRepaired = true;
    }

    const questions = enforceQuestionBudget(forbidden.text, style.maxQuestions);
    if (questions.repaired) {
      styleViolationCodes.push('style_question_budget');
      styleRepaired = true;
    }
    safeData.reply = questions.text;
  }

  const publicActorId = !internal && style.actorId !== 'sekret'
    ? style.actorId
    : undefined;

  return {
    ...safeData,
    ...(publicActorId ? { actorId: publicActorId } : {}),
    actorRole: style.role,
    avatarState: resolveAvatarState(safeData),
    textStyleVersion: style.textStyleVersion,
    speechStyleVersion: style.speechStyleVersion,
    questionBudget: style.maxQuestions,
    styleEnforced: true,
    styleRepaired,
    styleViolationCodes,
    internalIdentityApplied: internal,
    legacyOracleBridgeApplied: style.legacyOracleBridge === true,
  };
}

export function isNamedRuntimeCompanion(actorId: ReplyActorId): actorId is NamedCompanionId {
  return isNamedCompanionId(actorId);
}

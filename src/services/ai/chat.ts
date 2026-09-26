/**
 * Core chat message function.
 * Sends a message to the Cloudflare Worker with companion and Oracle context.
 */
import type { CompanionReplyRequest } from '@/contracts/sekretApi';
import { sekretClient, WORKER_BASE_URL } from '@/services/backend/sekretClient';
import { logRuntimeAuditEvent } from '@/services/runtimeAudit';
import type { PersonalityId } from '@/types';
import {
  learnTeenRelationshipStyle,
  loadTeenRelationshipProfile,
  relationshipProfileToOracleNote,
  saveTeenRelationshipProfile,
  type TeenRelationshipProfile,
} from '../../../services/oracleRelationship';
import {
  getConversationPhase,
  isArrivalMessage,
  keepSekretReply,
  getSekretFallback,
  buildConversationPhaseInstruction,
  type ConversationPhase,
} from '../../../services/sekretVoice';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface SendMessageOptions {
  mood?: string;
  history?: ChatMessage[];
  userName?: string;
  displayName?: string;
  profileName?: string;
  surface?: 'journal' | 'voiceBip' | 'comfort' | 'circle' | 'parentBridge' | 'selfDiscovery' | 'parentCoach';
  parentSharingEnabled?: boolean;
  oracleContext?: string[];
}

export interface WorkerReplyMeta {
  detectedIntent?: string;
  usedGreetingVariant?: boolean;
  replySource?: 'openai' | 'fallback';
  tone?: string;
  safetyFlag?: boolean;
  suggestedComfortTool?: string | null;
  parentShareSummary?: string | null;
}

/**
 * The structured result returned by sendMessage.
 * All callers that previously received a bare string can access `.reply`.
 */
export interface SendMessageResult {
  reply: string;
  /** Where the reply actually came from. */
  replySource: 'worker' | 'local-fallback' | 'safety';
  /** True when either the Worker or the client had to use fallback behavior. */
  fallbackUsed: boolean;
  /** Human-readable reason a fallback was used, or null when Worker succeeded. */
  fallbackReason: string | null;
}

function mayMirrorProfanity(profile: TeenRelationshipProfile): boolean {
  return profile.profanityPreference === 'light-mirroring';
}

/**
 * Local fallback reply — used ONLY when the Worker is unreachable or returns
 * a non-OK status. Greeting messages still travel to the Worker so the Worker
 * can shape the opening tone with full phaseInstruction context.
 */
function localFallback(
  personalityId: PersonalityId,
  text: string,
  relationship: TeenRelationshipProfile,
): string {
  const lower = text.toLowerCase();
  const isShortContinuation = /^(idk|nothing|lol|lmao|ok|okay|yeah|nah|sure|random|fine|k+)\s*[!?.]*$/i.test(lower);
  const sad = /\b(sad|cry|lonely|alone|hurt|heavy|depressed|overwhelmed)\b/.test(lower);
  const angry = /\b(angry|mad|pissed|annoyed|frustrated)\b/.test(lower);
  const planning = /\b(plan|goal|idea|business|project|school|future|dream|create|music|art|write)\b/.test(lower);
  const reset = /\b(failed|fell off|gave up|stopped|missed|behind|procrastinat)\w*\b/.test(lower);
  const mirror = mayMirrorProfanity(relationship);

  if (personalityId === 'parentCoach') {
    if (angry) return "Let's slow this down before anyone reacts. What happened right before things escalated?";
    if (sad) return "That sounds hard for both of you. What happened, and what have you already tried?";
    return 'Start with what happened at home and what you want to handle differently.';
  }

  if (isShortContinuation) {
    if (personalityId === 'rylane') return "Aight, I'm here. Talk.";
    if (personalityId === 'cloud') return "Hey. No pressure — whatever you want to say, or nothing at all.";
    if (personalityId === 'night') return 'Still here. No rush.';
    return 'Hey! Random or did something actually happen?';
  }

  if (personalityId === 'rylane') {
    if (angry) return mirror
      ? 'Yeah, that shit would set anybody off. Before you move on it, what line got crossed?'
      : 'Yeah, that would set anybody off. Before you move on it, what line got crossed?';
    if (sad) return 'That sounds heavy for real. You do not have to dress it up — what part is hitting hardest?';
    return relationship.nicknameComfort === 'dislikes'
      ? 'Say the real version. What is going on?'
      : 'Aight, say the real version. What is going on?';
  }

  if (personalityId === 'cloud') {
    if (sad) return 'We can make this smaller first. One breath, then one sentence — or no sentence yet.';
    return 'No rush. Start with the smallest piece that feels safe to say.';
  }

  if (personalityId === 'night') {
    if (planning) return 'Hold up — that idea has something. What is the goal, and what is one step you can set up tonight?';
    if (reset) return 'One off day is not your identity. What made the plan fall apart, and what changes this time?';
    if (sad) return 'We can sit with it for a minute. Then we decide whether tonight needs rest, reflection, or one small move forward.';
    return 'Are we trying to understand this, plan it, create something, or finish one small part?';
  }

  if (personalityId === 'oracle') {
    return 'What does this keep revealing about who you are, what you value, or what you are trying to become?';
  }

  if (angry) return mirror
    ? 'Okay, that shit really got under your skin. What happened right before it shifted?'
    : 'Okay, that really got under your skin. What happened right before it shifted?';
  if (sad) return 'Tell me the part you keep trying to make sound smaller.';
  return relationship.nicknameComfort === 'dislikes'
    ? 'Okay. What really happened?'
    : 'Girl, okay. What really happened?';
}

// ── Overload signatures (keep public API backward-compatible) ─────────────

export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string,
  options: SendMessageOptions,
): Promise<SendMessageResult>;
export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string,
  mood?: string,
  history?: ChatMessage[],
): Promise<SendMessageResult>;

// ── Implementation ────────────────────────────────────────────────────────

export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string = 'chat',
  moodOrOptions?: string | SendMessageOptions,
  legacyHistory?: ChatMessage[],
): Promise<SendMessageResult> {
  const options: SendMessageOptions = typeof moodOrOptions === 'object' && moodOrOptions !== null
    ? moodOrOptions
    : { mood: moodOrOptions as string | undefined, history: legacyHistory };

  const { mood, history = [], userName, displayName, profileName, surface, parentSharingEnabled, oracleContext } = options;
  const historyLength = history.length;

  const currentRelationship = await loadTeenRelationshipProfile();
  const learnedRelationship = learnTeenRelationshipStyle(text, currentRelationship);
  await saveTeenRelationshipProfile(learnedRelationship);

  const phase: ConversationPhase = getConversationPhase(historyLength);
  const phaseInstruction = buildConversationPhaseInstruction(phase, historyLength, personalityId);
  const isArrival = isArrivalMessage(text, historyLength);

  const normalizedSurface: SendMessageOptions['surface'] =
    surface ??
    (context === 'pages' ? 'journal'
      : context === 'voiceBip' ? 'voiceBip'
        : context === 'comfort' ? 'comfort'
          : context === 'circle' ? 'circle'
            : context === 'parentBridge' ? 'parentBridge'
              : context === 'selfDiscovery' ? 'selfDiscovery'
                : context === 'parentCoach' ? 'parentCoach'
                  : 'journal');

  if (!WORKER_BASE_URL) {
    const fallbackText = localFallback(personalityId, text, learnedRelationship);
    if (__DEV__) {
      console.warn(
        '[sendMessage] No EXPO_PUBLIC_BACKEND_URL set — using local fallback.',
        { companion: personalityId, surface: normalizedSurface, userText: text },
      );
    }
    return {
      reply: fallbackText,
      replySource: 'local-fallback',
      fallbackUsed: true,
      fallbackReason: 'EXPO_PUBLIC_BACKEND_URL is not configured',
    };
  }

  const workerHistory = history.map((message) => ({
    role: message.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: message.text,
  }));

  const payload: CompanionReplyRequest = {
    userText: text,
    characterId: personalityId === 'oracle' ? 'sekret' : personalityId,
    surface: normalizedSurface ?? 'journal',
    mood,
    history: workerHistory,
    parentSharingEnabled: parentSharingEnabled ?? false,
    userName,
    displayName,
    profileName,
    conversationPhase: phase,
    phaseInstruction,
    isArrival,
    memory: {
      relationshipStyle: relationshipProfileToOracleNote(learnedRelationship),
      ...(oracleContext && oracleContext.length > 0 ? { oracleContext } : {}),
    },
  };

  if (__DEV__) {
    console.log('[sendMessage] → Worker', {
      companion: payload.characterId,
      surface: payload.surface,
      url: `${WORKER_BASE_URL}/api/sekret/reply`,
      isArrival,
      phase,
      payloadBytes: JSON.stringify(payload).length,
      historyLength,
      hasMood: Boolean(mood),
      hasOracleContext: Boolean(oracleContext?.length),
    });
  }

  const result = await sekretClient.sendReply(payload);
  if (!result.ok) {
    const reason = `${result.error.code}${result.error.status ? ` (${result.error.status})` : ''}`;
    console.error('[sendMessage] Worker request failed:', reason, result.error.traceId ?? 'no-trace');
    const fallbackText = localFallback(personalityId, text, learnedRelationship);
    return {
      reply: fallbackText,
      replySource: 'local-fallback',
      fallbackUsed: true,
      fallbackReason: reason,
    };
  }

  const data = result.data;
  const rawReply = data.reply ?? '';
  if (!rawReply) {
    const fallbackText = localFallback(personalityId, text, learnedRelationship);
    return {
      reply: fallbackText,
      replySource: 'local-fallback',
      fallbackUsed: true,
      fallbackReason: 'Worker returned empty reply',
    };
  }

  const isParentCoach = personalityId === 'parentCoach';
  const sekretFallback = isParentCoach
    ? localFallback(personalityId, text, learnedRelationship)
    : getSekretFallback(personalityId, text);

  // Teen-companion voices reject em/en dashes as an AI tell. Parent Coach may
  // use those marks naturally, so remove dash separators only for evaluation.
  // Collapsing them to whitespace keeps blocked word sequences contiguous;
  // inserting a hyphen here could let a phrase such as “I'm here to support
  // you” evade the shared guard.
  const guardInput = isParentCoach
    ? rawReply.replace(/\s*(?:—|–|--)\s*/g, ' ').replace(/\s+/g, ' ').trim()
    : rawReply;
  const guardedCandidate = keepSekretReply(guardInput, sekretFallback);
  const guardBlocked = guardedCandidate !== guardInput.trim();
  const guardedReply = isParentCoach && !guardBlocked
    ? rawReply.trim()
    : guardedCandidate;

  if (__DEV__ && guardBlocked) {
    console.warn('[sendMessage] keepSekretReply blocked Worker reply — substituted character fallback.', {
      companion: personalityId,
      blocked: rawReply.slice(0, 80),
      substituted: guardedReply.slice(0, 80),
      traceId: data.traceId ?? result.meta.traceId,
    });
  }

  logRuntimeAuditEvent('manual', {
    event_type: 'companion_chat_sent',
    screen: normalizedSurface ?? 'chat',
    severity: 'info',
    metadata: {
      companion: personalityId,
      surface: normalizedSurface,
      reply_source: data.replySource ?? 'worker',
      history_length: historyLength,
      fallback_used: result.meta.fallbackUsed,
      trace_id: data.traceId ?? result.meta.traceId ?? null,
      avatar_state: data.avatarState ?? null,
    },
  }).catch(() => {/* silent — never block the reply */});

  return {
    reply: guardedReply,
    replySource: data.safetyFlag ? 'safety' : 'worker',
    fallbackUsed: result.meta.fallbackUsed,
    fallbackReason: result.meta.fallbackUsed ? 'Worker served fallback response' : null,
  };
}

function makeMessageId(role: ChatMessage['role']): string {
  return `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeUserMessage(text: string): ChatMessage {
  return { id: makeMessageId('user'), role: 'user', text, timestamp: Date.now() };
}

export function makeAssistantMessage(text: string): ChatMessage {
  return { id: makeMessageId('assistant'), role: 'assistant', text, timestamp: Date.now() };
}

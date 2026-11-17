/**
 * Core chat message function.
 * Sends a message to the Cloudflare Worker with companion and Oracle context.
 */
import type { PersonalityId } from '@/types';
import {
  learnTeenRelationshipStyle,
  loadTeenRelationshipProfile,
  relationshipProfileToOracleNote,
  saveTeenRelationshipProfile,
  type TeenRelationshipProfile,
} from '../../../services/oracleRelationship';
import {
  getArrivalReply,
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

const BASE_URL = ((process.env as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

function mayMirrorProfanity(profile: TeenRelationshipProfile): boolean {
  return profile.profanityPreference === 'light-mirroring';
}

function localFallback(
  personalityId: PersonalityId,
  text: string,
  relationship: TeenRelationshipProfile,
  historyLength = 0,
): string {
  if (personalityId !== 'parentCoach' && isArrivalMessage(text, historyLength)) {
    return getArrivalReply(personalityId);
  }

  const lower = text.toLowerCase();
  const isShortContinuation = /^(idk|nothing|lol|lmao|ok|okay|yeah|nah|sure|random|fine|k+)\s*[!?.]*$/i.test(lower);
  const sad = /\b(sad|cry|lonely|alone|hurt|heavy|depressed|overwhelmed)\b/.test(lower);
  const angry = /\b(angry|mad|pissed|annoyed|frustrated)\b/.test(lower);
  const planning = /\b(plan|goal|idea|business|project|school|future|dream|create|music|art|write)\b/.test(lower);
  const reset = /\b(failed|fell off|gave up|stopped|missed|behind|procrastinat)\w*\b/.test(lower);
  const mirror = mayMirrorProfanity(relationship);

  if (isShortContinuation) {
    if (personalityId === 'rylane') return "Aight, I'm here. Talk.";
    if (personalityId === 'cloud') return "Hey. No pressure — whatever you want to say, or nothing at all.";
    if (personalityId === 'night') return "Still here. No rush.";
    return "Hey! Random or did something actually happen?";
  }

  if (personalityId === 'rylane') {
    if (angry) return mirror
      ? "Yeah, that shit would set anybody off. Before you move on it, what line got crossed?"
      : "Yeah, that would set anybody off. Before you move on it, what line got crossed?";
    if (sad) return "That sounds heavy for real. You do not have to dress it up — what part is hitting hardest?";
    return relationship.nicknameComfort === 'dislikes'
      ? "Say the real version. What is going on?"
      : "Aight, say the real version. What is going on?";
  }

  if (personalityId === 'cloud') {
    if (sad) return "We can make this smaller first. One breath, then one sentence — or no sentence yet.";
    return "No rush. Start with the smallest piece that feels safe to say.";
  }

  if (personalityId === 'night') {
    if (planning) return "Hold up — that idea has something. What is the goal, and what is one step you can set up tonight?";
    if (reset) return "One off day is not your identity. What made the plan fall apart, and what changes this time?";
    if (sad) return "We can sit with it for a minute. Then we decide whether tonight needs rest, reflection, or one small move forward.";
    return "Are we trying to understand this, plan it, create something, or finish one small part?";
  }

  if (personalityId === 'ja') {
    return "What does this keep revealing about who you are, what you value, or what you are trying to become?";
  }

  if (angry) return mirror
    ? "Okay, that shit really got under your skin. What happened right before it shifted?"
    : "Okay, that really got under your skin. What happened right before it shifted?";
  if (sad) return "Tell me the part you keep trying to make sound smaller.";
  return relationship.nicknameComfort === 'dislikes'
    ? "Okay. What really happened?"
    : "Girl, okay. What really happened?";
}

export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string,
  options: SendMessageOptions,
): Promise<string>;
export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string,
  mood?: string,
  history?: ChatMessage[],
): Promise<string>;
export async function sendMessage(
  personalityId: PersonalityId,
  text: string,
  context: string = 'chat',
  moodOrOptions?: string | SendMessageOptions,
  legacyHistory?: ChatMessage[],
): Promise<string> {
  const options: SendMessageOptions = typeof moodOrOptions === 'object' && moodOrOptions !== null
    ? moodOrOptions
    : { mood: moodOrOptions as string | undefined, history: legacyHistory };

  const { mood, history = [], userName, displayName, profileName, surface, parentSharingEnabled, oracleContext } = options;
  const historyLength = history.length;

  const currentRelationship = await loadTeenRelationshipProfile();
  const learnedRelationship = learnTeenRelationshipStyle(text, currentRelationship);
  await saveTeenRelationshipProfile(learnedRelationship);

  // Pure greeting on first touch: return immediately with no Worker latency.
  if (personalityId !== 'parentCoach' && isArrivalMessage(text, historyLength)) {
    return getArrivalReply(personalityId);
  }

  if (!BASE_URL && personalityId !== 'parentCoach') {
    return localFallback(personalityId, text, learnedRelationship, historyLength);
  }

  if (!BASE_URL) {
    return "Hey. Glad you're here. What's going on at home?";
  }

  const phase: ConversationPhase = getConversationPhase(historyLength);
  const phaseInstruction = buildConversationPhaseInstruction(phase, historyLength, personalityId);

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

  const workerHistory = history.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' as const : 'user' as const,
    content: m.text,
  }));

  try {
    const res = await fetch(`${BASE_URL}/api/sekret/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userText: text,
        characterId: personalityId,
        surface: normalizedSurface,
        mood,
        history: workerHistory,
        parentSharingEnabled: parentSharingEnabled ?? false,
        userName,
        displayName,
        profileName,
        conversationPhase: phase,
        phaseInstruction,
        memory: {
          relationshipStyle: relationshipProfileToOracleNote(learnedRelationship),
          ...(oracleContext && oracleContext.length > 0 ? { oracleContext } : {}),
        },
      }),
    });

    if (!res.ok) {
      console.error(`[sendMessage] Worker responded ${res.status}`);
      return localFallback(personalityId, text, learnedRelationship, historyLength);
    }

    const data = await res.json() as { reply?: string; replySource?: string; detectedIntent?: string };
    const rawReply = data.reply ?? '';

    if (!rawReply) {
      console.error('[sendMessage] Worker returned empty reply, using fallback');
      return localFallback(personalityId, text, learnedRelationship, historyLength);
    }

    const fallback = getSekretFallback(personalityId, text);
    return keepSekretReply(rawReply, fallback);
  } catch (err) {
    console.error('[sendMessage] Worker fetch failed:', err);
    return localFallback(personalityId, text, learnedRelationship, historyLength);
  }
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

/**
 * src/features/sekret/companionEngine.ts
 *
 * Companion Engine — Phase 2C
 *
 * Single entry point for all companion interactions across every surface.
 */

import {
  fetchSekretBrainReply,
  normalizeSekretCharacter,
  type SekretCharacterId,
  type SekretAvatarState,
  type SekretHistoryTurn,
} from '@/utils/api';
import { buildSekretPresence } from '../../../services/sekretPresence';
import { buildReplyRequest } from '@/services/ai/buildReplyRequest';
import { emitEvent } from '@/features/activity/events';
import { COMPANION_CURRICULUM } from '@/config/companionCurriculum';
import type { CompanionReplySource } from '@/contracts/sekretApi';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CompanionId = SekretCharacterId; // 'suhana' | 'sy' | 'cloud' | 'night' | 'sekret'
export type { SekretAvatarState };

export type CompanionSurface =
  | 'chat'
  | 'journal'
  | 'voiceBip'
  | 'comfort'
  | 'circle'
  | 'parentBridge'
  | 'selfDiscovery'
  | 'pages';

export interface CompanionReplyInput {
  companionId: CompanionId;
  surface: CompanionSurface;
  text: string;
  mood?: string;
  history?: SekretHistoryTurn[];
  parentSharingEnabled?: boolean;
  teenGender?: 'girl' | 'boy' | 'other' | null;
  oracleContext?: string[];
  userName?: string;
  displayName?: string;
  profileName?: string;
  /** True only when this is the user's first ever chat with this companion. */
  isFirstCompanionChat?: boolean;
}

export interface CompanionReplyResult {
  reply: string;
  safetyFlag: boolean;
  avatarState: SekretAvatarState;
  tone: string;
  parentShareSummary: string | null;
  suggestedComfortTool: string | null;
  replySource: CompanionReplySource;
  questionBudget?: number;
}

export interface CompanionProfile {
  id: CompanionId;
  name: string;
  emoji: string;
  title: string;
  vibe: string;
  /** First-chat-only /human-ai intro. */
  firstChatIntro: string;
  /** Normal greeting after the first introduction has already happened. */
  greeting: string;
  accentColor: string;
}

// ── Companion profiles ─────────────────────────────────────────────────────────
// Unified display config across all surfaces.
// Greetings and first-chat intros come from companionCurriculum.

export const COMPANION_PROFILES: Record<CompanionId, CompanionProfile> = {
  suhana: {
    id:          'suhana',
    name:        'Suhana',
    emoji:       '🌸',
    title:       'Sorian Twin / Porchlight',
    vibe:        'Warm, expressive, protective, funny, and emotionally sharp.',
    firstChatIntro: COMPANION_CURRICULUM.suhana.firstChatIntro,
    greeting:    COMPANION_CURRICULUM.suhana.greeting,
    accentColor: '#FF4FA3',
  },
  sy: {
    id:          'sy',
    name:        'Sy',
    emoji:       '⚡',
    title:       'Sorian Twin / Quiet Seat',
    vibe:        'Quiet loyalty. Practical truth. Keeps it real without crowding.',
    firstChatIntro: COMPANION_CURRICULUM.sy.firstChatIntro,
    greeting:    COMPANION_CURRICULUM.sy.greeting,
    accentColor: '#7C83FF',
  },
  cloud: {
    id:          'cloud',
    name:        'Cloud',
    emoji:       '☁️',
    title:       'Sorian Birth-Cloud',
    vibe:        'Majestic, soft, low-pressure, and present without pushing.',
    firstChatIntro: COMPANION_CURRICULUM.cloud.firstChatIntro,
    greeting:    COMPANION_CURRICULUM.cloud.greeting,
    accentColor: '#7dd3fc',
  },
  night: {
    id:          'night',
    name:        'Night',
    emoji:       '🌙',
    title:       'The Light Left On',
    vibe:        'Late-night builder. Future-focused. Honest.',
    firstChatIntro: COMPANION_CURRICULUM.night.firstChatIntro,
    greeting:    COMPANION_CURRICULUM.night.greeting,
    accentColor: '#c4b5fd',
  },
  sekret: {
    id:          'sekret',
    name:        "Se'kret",
    emoji:       '✨',
    title:       'Inner Oracle',
    vibe:        'Reflects your patterns back to you without exposing private memory.',
    firstChatIntro: "I'm Se'kret, your human-shaped AI continuity guide. I notice patterns without making you feel watched. Start anywhere.",
    greeting:    "I've been listening. There's a pattern here. Want to look at it together?",
    accentColor: '#fbbf24',
  },
};

// ── Companion ID normalizer ────────────────────────────────────────────────────
// Handles old keys: 'soft'/'raylene' → 'suhana', 'rylane'/'bro' → 'sy', 'oracle' → 'sekret'.

export function toCompanionId(value: string): CompanionId {
  return normalizeSekretCharacter(value);
}

// ── Safety detection ───────────────────────────────────────────────────────────

const CRISIS_PATTERN =
  /\b(suicidal|self[- ]?harm|not safe|abuse|danger)\b/i;

export function isSafetyTrigger(text: string): boolean {
  return CRISIS_PATTERN.test(text);
}

// ── Surface mapping ────────────────────────────────────────────────────────────

type BackendSurface = 'journal' | 'voiceBip' | 'comfort' | 'circle' | 'parentBridge' | 'selfDiscovery';

function toBackendSurface(surface: CompanionSurface): BackendSurface {
  if (surface === 'voiceBip')      return 'voiceBip';
  if (surface === 'comfort')       return 'comfort';
  if (surface === 'circle')        return 'circle';
  if (surface === 'parentBridge')  return 'parentBridge';
  if (surface === 'selfDiscovery') return 'selfDiscovery';
  return 'journal';
}

// ── Core: sendCompanionMessage ─────────────────────────────────────────────────

export async function sendCompanionMessage(
  input: CompanionReplyInput,
): Promise<CompanionReplyResult> {
  const companionId = normalizeSekretCharacter(input.companionId);
  emitEvent('companion_message', { personalityId: companionId });

  const { request } = await buildReplyRequest({
    characterId:          companionId,
    surface:              toBackendSurface(input.surface),
    text:                 input.text,
    mood:                 input.mood,
    history:              input.history,
    parentSharingEnabled: input.parentSharingEnabled,
    oracleContext:        input.oracleContext,
    userName:             input.userName,
    displayName:          input.displayName,
    profileName:          input.profileName,
    isFirstCompanionChat: input.isFirstCompanionChat ?? !input.history?.length,
    extraMemory:          input.teenGender ? { teenGender: input.teenGender } : undefined,
  });

  const result = await fetchSekretBrainReply(request);

  return {
    reply:                result.reply,
    safetyFlag:           result.safetyFlag,
    avatarState:          result.avatarState,
    tone:                 result.tone,
    parentShareSummary:   result.parentShareSummary,
    suggestedComfortTool: result.suggestedComfortTool,
    replySource:          (result.replySource ?? 'openai') as CompanionReplySource,
    questionBudget:       typeof result.questionBudget === 'number' ? result.questionBudget : undefined,
  };
}

// ── Greeting ───────────────────────────────────────────────────────────────────

export function getCompanionGreeting(id: CompanionId, options: { firstChat?: boolean } = {}): string {
  const companionId = normalizeSekretCharacter(id);
  const profile = COMPANION_PROFILES[companionId] ?? COMPANION_PROFILES.suhana;
  return options.firstChat ? profile.firstChatIntro : profile.greeting;
}

// ── Presence message ───────────────────────────────────────────────────────────

export function getPresenceMessage(
  id: CompanionId,
  context: { mood?: string; screen?: string; isLateNight?: boolean } = {},
): string {
  const companionId = normalizeSekretCharacter(id);
  if (companionId === 'sekret') {
    return context.isLateNight
      ? 'quiet hours. good time to listen to yourself.'
      : 'ready when you are.';
  }
  return buildSekretPresence(undefined, companionId, context.screen);
}

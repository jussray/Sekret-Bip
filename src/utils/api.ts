/*
 * src/utils/api.ts
 *
 * Backward-compatible Se'kret API helpers. Network transport now flows through
 * the shared typed Worker client so every surface receives the same auth,
 * timeout, status-code, and trace behavior.
 *
 * Launch voice policy:
 * - Text companion replies may use the Worker/OpenAI path.
 * - STT and server TTS are OFF by default to keep launch cost near zero.
 * - Companion speech uses the device/browser speech engine by default.
 * - Paid/server audio can be explicitly re-enabled with Expo public flags.
 */
import type {
  CharacterAlignment,
  CompanionAvatarState,
  CompanionHistoryTurn,
  CompanionReplyRequest,
  CompanionReplySource,
  VoiceProvider,
  VoiceSynthesisRequest,
} from '@/contracts/sekretApi';
import {
  createNaturalFallbackResponse,
  type NaturalFallbackResponse,
} from '@/features/sekret/naturalFallbacks';
import { sekretClient, WORKER_BASE_URL } from '@/services/backend/sekretClient';
import { logCompanionFallbackUsage } from '@/services/runtimeAudit';
import { speakDeviceReply } from '../../utils/deviceSpeech';

export type VisibleSekretCharacterId = 'suhana' | 'sy' | 'cloud' | 'night';
export type LegacySekretCharacterId = 'raylene' | 'rylane';
export type SekretCharacterId = VisibleSekretCharacterId | 'sekret';
export type SekretSurface = 'journal' | 'voiceBip' | 'comfort' | 'circle' | 'parentBridge' | 'selfDiscovery';
export type SekretAvatarState = CompanionAvatarState;
export type SekretReplySource = CompanionReplySource;
export type SekretHistoryTurn = CompanionHistoryTurn;
export type SekretVoiceRequest = Omit<VoiceSynthesisRequest, 'characterId'> & {
  characterId: SekretCharacterId;
};

export interface SekretBrainResponse {
  reply: string;
  tone: string;
  avatarState: SekretAvatarState;
  safetyFlag: boolean;
  parentShareSummary: string | null;
  suggestedComfortTool: string | null;
  replySource: SekretReplySource;
  traceId?: string;
  questionBudget?: number;
}

export interface SekretVoiceResponse {
  audioBase64: string;
  contentType: string;
  characterId: SekretCharacterId;
  voiceProvider?: VoiceProvider;
  primaryVoiceProvider?: VoiceProvider;
  model?: string;
  voiceId?: string;
  usedFallback: boolean;
  timing?: CharacterAlignment;
  traceId?: string;
}

const VISIBLE_NAMES: Record<SekretCharacterId, string> = {
  suhana: 'Suhana',
  sy: 'Sy',
  cloud: 'Cloud',
  night: 'Night',
  sekret: "Se'kret",
};

const PAID_STT_ENABLED = process.env.EXPO_PUBLIC_VOICE_STT_ENABLED === 'true';
const PAID_TTS_ENABLED = process.env.EXPO_PUBLIC_VOICE_TTS_ENABLED === 'true';

function localVoiceAck(avatarKey?: string): string {
  const character = normalizeSekretCharacter(avatarKey);
  if (character === 'sy') return "Bet. You got it out. You don't gotta run it back right now.";
  if (character === 'cloud') return 'Okay. You can let that one stay here for a minute.';
  if (character === 'night') return 'Got it. You can leave that here for tonight.';
  if (character === 'sekret') return 'Got it. You can leave that here for now.';
  return 'Got you. You got it out. You can leave it right here.';
}

export function normalizeSekretCharacter(value?: string, fallback: SekretCharacterId = 'suhana'): SekretCharacterId {
  const raw = (value ?? '').trim().toLowerCase().replace(/[’']/g, '').replace(/[\s_-]+/g, '');
  if (raw === 'suhana' || raw === 'raylene' || raw.includes('suhana') || raw.includes('raylene') || raw === 'soft' || raw === 'star') return 'suhana';
  if (raw === 'sy' || raw === 'rylane' || raw.includes('rylane') || raw === 'bro') return 'sy';
  if (raw === 'cloud' || raw.includes('cloud')) return 'cloud';
  if (raw === 'night' || raw.includes('night')) return 'night';
  if (raw === 'sekret' || raw === 'secret' || raw === 'oracle' || raw.includes('sekret')) return 'sekret';
  return fallback;
}

export function getVisibleSekretName(characterId: SekretCharacterId): string {
  return VISIBLE_NAMES[characterId] ?? VISIBLE_NAMES.suhana;
}

function normalizeAvatarState(value?: unknown): SekretAvatarState {
  if (
    value === 'listening' || value === 'thinking' || value === 'comforting' ||
    value === 'happy' || value === 'concerned' || value === 'responding'
  ) return value;
  return 'neutral';
}

function normalizeReplySource(value?: unknown): SekretReplySource {
  return value === 'openai' ? 'openai' : 'fallback';
}

function normalizeHistory(value?: unknown[]): SekretHistoryTurn[] {
  if (!Array.isArray(value)) return [];
  const turns: SekretHistoryTurn[] = [];
  for (const item of value.slice(-12)) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const rawRole = record.role;
    const role: SekretHistoryTurn['role'] | null = rawRole === 'assistant' || rawRole === 'sekret'
      ? 'assistant'
      : rawRole === 'user' || rawRole === 'teen'
        ? 'user'
        : null;
    const rawContent = typeof record.content === 'string'
      ? record.content
      : typeof record.text === 'string'
        ? record.text
        : typeof record.reply === 'string'
          ? record.reply
          : '';
    const content = rawContent.trim().slice(0, 1200);
    if (role && content) turns.push({ role, content });
  }
  return turns.slice(-10);
}

function fallbackReply(
  characterId: SekretCharacterId,
  text: string,
  options: {
    surface?: SekretSurface;
    mood?: string;
    history?: SekretHistoryTurn[];
  } = {},
): NaturalFallbackResponse {
  return createNaturalFallbackResponse({
    characterId,
    userText: text,
    surface: options.surface,
    mood: options.mood,
    history: options.history,
  });
}

function reportFallbackUsage(input: {
  fallback: NaturalFallbackResponse;
  characterId: SekretCharacterId;
  surface: SekretSurface;
  mood?: string;
  history?: SekretHistoryTurn[];
  reason: string;
}): void {
  void logCompanionFallbackUsage({
    characterId: input.characterId,
    surface: input.surface,
    mood: input.mood,
    historyTurnCount: input.history?.length ?? 0,
    reason: input.reason,
    fallback: input.fallback,
  }).catch((error) => {
    console.warn('[sekretApi] fallback telemetry failed:', error instanceof Error ? error.message : error);
  });
}

export async function fetchSekretBrainReply(input: {
  characterId: SekretCharacterId;
  surface: SekretSurface;
  userText: string;
  mood?: string;
  memory?: Record<string, unknown>;
  parentSharingEnabled?: boolean;
  history?: SekretHistoryTurn[];
  userName?: string;
  displayName?: string;
  profileName?: string;
  conversationPhase?: string;
  phaseInstruction?: string;
  isArrival?: boolean;
  isFirstCompanionChat?: boolean;
}): Promise<SekretBrainResponse> {
  const fallbackOptions = {
    surface: input.surface,
    mood: input.mood,
    history: input.history,
  };

  if (!WORKER_BASE_URL) {
    const fallback = fallbackReply(input.characterId, input.userText, fallbackOptions);
    reportFallbackUsage({
      fallback,
      characterId: input.characterId,
      surface: input.surface,
      mood: input.mood,
      history: input.history,
      reason: 'worker_base_url_missing',
    });
    return fallback;
  }

  const request: CompanionReplyRequest = input;
  const result = await sekretClient.sendReply(request);
  if (!result.ok) {
    const fallback = fallbackReply(input.characterId, input.userText, fallbackOptions);
    reportFallbackUsage({
      fallback,
      characterId: input.characterId,
      surface: input.surface,
      mood: input.mood,
      history: input.history,
      reason: result.error.code || 'worker_reply_failed',
    });
    return fallback;
  }

  const data = result.data;
  const fallback = fallbackReply(input.characterId, input.userText, fallbackOptions);
  if (!data.reply?.trim()) {
    reportFallbackUsage({
      fallback,
      characterId: input.characterId,
      surface: input.surface,
      mood: input.mood,
      history: input.history,
      reason: 'worker_reply_empty',
    });
  }

  return {
    reply: data.reply || fallback.reply,
    tone: data.tone || input.characterId,
    avatarState: normalizeAvatarState(data.avatarState),
    safetyFlag: Boolean(data.safetyFlag),
    parentShareSummary: typeof data.parentShareSummary === 'string' ? data.parentShareSummary : null,
    suggestedComfortTool: typeof data.suggestedComfortTool === 'string' ? data.suggestedComfortTool : null,
    replySource: normalizeReplySource(data.replySource),
    traceId: data.traceId ?? result.meta.traceId,
  };
}

export async function fetchSekretVoice(input: SekretVoiceRequest): Promise<SekretVoiceResponse | null> {
  if (!input.reply.trim()) return null;

  if (!PAID_TTS_ENABLED) {
    await speakDeviceReply(input.reply, input.characterId);
    return null;
  }

  if (!WORKER_BASE_URL) return null;
  const result = await sekretClient.synthesizeVoice(input);
  if (!result.ok || !result.data.audioBase64 || !result.data.contentType) return null;
  return {
    audioBase64: result.data.audioBase64,
    contentType: result.data.contentType,
    characterId: normalizeSekretCharacter(result.data.characterId, input.characterId),
    voiceProvider: result.data.voiceProvider,
    primaryVoiceProvider: result.data.primaryVoiceProvider,
    model: result.data.model,
    voiceId: result.data.voiceId,
    usedFallback: result.data.usedFallback ?? result.meta.fallbackUsed,
    timing: result.data.timing,
    traceId: result.data.traceId ?? result.meta.traceId,
  };
}

export async function fetchSekretTranscribe(input: {
  audioBase64: string;
  contentType: string;
}): Promise<string | null> {
  if (!PAID_STT_ENABLED) return null;
  if (!WORKER_BASE_URL || !input.audioBase64) return null;
  const result = await sekretClient.transcribeAudio(input);
  if (!result.ok) return null;
  const transcript = typeof result.data.transcript === 'string'
    ? result.data.transcript.trim()
    : typeof result.data.text === 'string'
      ? result.data.text.trim()
      : '';
  return transcript || null;
}

export async function fetchSekretReply(
  text: string,
  context: SekretSurface | string = 'journal',
  mood?: string,
  avatarKey?: string,
  _extra1?: unknown,
  privateProfile?: unknown,
  profileSide?: string,
  history?: unknown[],
): Promise<string> {
  const surface: SekretSurface = context === 'voiceBip' || context === 'comfort' || context === 'circle' || context === 'parentBridge' || context === 'selfDiscovery' ? context : 'journal';

  const isUntranscribedVoiceBip =
    !PAID_STT_ENABLED &&
    surface === 'voiceBip' &&
    text.trim() === 'I needed to get some feelings out.';

  if (isUntranscribedVoiceBip) {
    return localVoiceAck(avatarKey);
  }

  const memory = privateProfile && typeof privateProfile === 'object' ? privateProfile as Record<string, unknown> : undefined;
  const response = await fetchSekretBrainReply({
    characterId: normalizeSekretCharacter(avatarKey),
    surface,
    mood,
    userText: text,
    memory,
    parentSharingEnabled: profileSide === 'parent',
    history: normalizeHistory(history),
    isFirstCompanionChat: !history || history.length === 0,
  });
  return response.reply;
}

/**
 * src/utils/api.ts
 *
 * Canonical backend API helpers. OpenAI is called only by the secure backend;
 * the Expo app sends teen-safe request context and never receives or stores an
 * OPENAI_API_KEY.
 */
const BASE_URL = ((process.env as Record<string, string | undefined>).EXPO_PUBLIC_BACKEND_URL ?? '').replace(/\/$/, '');

export type VisibleSekretCharacterId = 'raylene' | 'rylane' | 'cloud' | 'night';
export type SekretCharacterId = VisibleSekretCharacterId | 'sekret';
export type SekretSurface = 'journal' | 'voiceBip' | 'comfort' | 'circle' | 'parentBridge' | 'selfDiscovery';
export type SekretAvatarState = 'neutral' | 'listening' | 'thinking' | 'comforting' | 'happy' | 'concerned' | 'responding';
export type SekretReplySource = 'openai' | 'fallback';

export interface SekretHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface SekretBrainResponse {
  reply: string;
  tone: string;
  avatarState: SekretAvatarState;
  safetyFlag: boolean;
  parentShareSummary: string | null;
  suggestedComfortTool: string | null;
  replySource: SekretReplySource;
}

export interface SekretVoiceResponse {
  audioBase64: string;
  contentType: string;
  characterId: SekretCharacterId;
}

export function normalizeSekretCharacter(value?: string, fallback: SekretCharacterId = 'raylene'): SekretCharacterId {
  const raw = (value ?? '').trim().toLowerCase().replace(/[’']/g, '');
  if (raw === 'raylene' || raw.includes('raylene')) return 'raylene';
  if (raw === 'rylane' || raw.includes('rylane')) return 'rylane';
  if (raw === 'cloud' || raw.includes('cloud')) return 'cloud';
  if (raw === 'night' || raw.includes('night')) return 'night';
  if (raw === 'sekret' || raw === 'secret' || raw === 'oracle' || raw === 'ja' || raw.includes('sekret')) return 'sekret';
  return fallback;
}

export function getVisibleSekretName(characterId: SekretCharacterId): string {
  if (characterId === 'sekret') return "Se'kret";
  return characterId.charAt(0).toUpperCase() + characterId.slice(1);
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

function fallbackReply(characterId: SekretCharacterId, text: string): SekretBrainResponse {
  const crisis = /\b(kill myself|end my life|want to die|suicidal|self[- ]?harm|not safe|abuse|danger)\b/i.test(text);
  if (crisis) {
    return {
      reply: "I'm an AI companion, not emergency help. If you're in danger or might hurt yourself, tell a trusted adult now, call 911, call/text 988, or text HOME to 741741.",
      tone: 'supportive-safety',
      avatarState: 'concerned',
      safetyFlag: true,
      parentShareSummary: null,
      suggestedComfortTool: 'safety-plan',
      replySource: 'fallback',
    };
  }
  const replies: Record<SekretCharacterId, string[]> = {
    raylene: [
      'Okay, I hear you. Which part feels the loudest right now?',
      'You do not have to make it sound neat. Tell me the messy version.',
      'That is a lot to sit with. Do you need comfort, honesty, or a plan?',
    ],
    rylane: [
      'Yeah, that is real. What is the part you have not said out loud yet?',
      'I hear you. Do you want to vent or figure out your next move?',
      'You do not have to act unbothered in here. Give me the honest version.',
    ],
    cloud: [
      'We can make this smaller. Tell me the gentlest place to begin.',
      'No rush. You do not have to solve the whole feeling right now.',
      'We do not have to fix it. We can just name what hurts first.',
    ],
    night: [
      'Yeah… nights make everything talk louder. What keeps circling back?',
      'You do not have to pretend you are fine in here. Tell me the hidden version.',
      'Let us not rush past it. What is underneath the first thing you said?',
    ],
    sekret: [
      "I’m noticing a pattern in what you shared: part of you wants to be understood without having to explain every detail. I could be reading that wrong, but does that feel close?",
      "Here’s what I’m hearing underneath it: you may be carrying more than you let people see. I’m not treating that like a fact—what part fits, and what part doesn’t?",
      "Your answers seem to point toward wanting both privacy and real connection. That can exist together. Which side feels harder to ask for right now?",
    ],
  };
  const options = replies[characterId];
  const index = Math.abs([...text].reduce((sum, char) => ((sum * 31) + char.charCodeAt(0)) | 0, 0)) % options.length;
  return {
    reply: options[index],
    tone: characterId,
    avatarState: characterId === 'cloud' || characterId === 'night' || characterId === 'sekret' ? 'comforting' : 'responding',
    safetyFlag: false,
    parentShareSummary: null,
    suggestedComfortTool: characterId === 'sekret' ? 'self-discovery' : 'journal',
    replySource: 'fallback',
  };
}

export async function fetchSekretBrainReply(input: {
  characterId: SekretCharacterId;
  surface: SekretSurface;
  userText: string;
  mood?: string;
  memory?: Record<string, unknown>;
  parentSharingEnabled?: boolean;
  history?: SekretHistoryTurn[];
}): Promise<SekretBrainResponse> {
  if (!BASE_URL) return fallbackReply(input.characterId, input.userText);
  try {
    const res = await fetch(`${BASE_URL}/api/sekret/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`api error ${res.status}`);
    const data = await res.json() as Partial<SekretBrainResponse>;
    const fallback = fallbackReply(input.characterId, input.userText);
    return {
      reply: data.reply || fallback.reply,
      tone: data.tone || input.characterId,
      avatarState: normalizeAvatarState(data.avatarState),
      safetyFlag: Boolean(data.safetyFlag),
      parentShareSummary: typeof data.parentShareSummary === 'string' ? data.parentShareSummary : null,
      suggestedComfortTool: typeof data.suggestedComfortTool === 'string' ? data.suggestedComfortTool : null,
      replySource: normalizeReplySource(data.replySource),
    };
  } catch {
    return fallbackReply(input.characterId, input.userText);
  }
}

export async function fetchSekretVoice(input: {
  reply: string;
  characterId: SekretCharacterId;
}): Promise<SekretVoiceResponse | null> {
  if (!BASE_URL || !input.reply.trim()) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/sekret/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) throw new Error(`voice api error ${res.status}`);
    const data = await res.json() as Partial<SekretVoiceResponse>;
    if (!data.audioBase64 || !data.contentType) return null;
    return { audioBase64: data.audioBase64, contentType: data.contentType, characterId: normalizeSekretCharacter(data.characterId, input.characterId) };
  } catch {
    return null;
  }
}

export async function fetchSekretTranscribe(input: {
  audioBase64: string;
  contentType: string;
}): Promise<string | null> {
  if (!BASE_URL || !input.audioBase64) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/sekret/transcribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const data = await res.json() as { transcript?: string };
    const transcript = typeof data.transcript === 'string' ? data.transcript.trim() : '';
    return transcript || null;
  } catch {
    return null;
  }
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
  const memory = privateProfile && typeof privateProfile === 'object' ? privateProfile as Record<string, unknown> : undefined;
  const response = await fetchSekretBrainReply({
    characterId: normalizeSekretCharacter(avatarKey),
    surface,
    mood,
    userText: text,
    memory,
    parentSharingEnabled: profileSide === 'parent',
    history: normalizeHistory(history),
  });
  return response.reply;
}

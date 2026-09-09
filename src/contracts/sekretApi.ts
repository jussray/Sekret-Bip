export type CompanionId =
  | 'suhana'
  | 'sy'
  | 'cloud'
  | 'night'
  | 'sekret'
  | 'parentCoach';

export type LegacyCompanionId = 'raylene' | 'rylane';

export type CompanionSurface =
  | 'journal'
  | 'voiceBip'
  | 'comfort'
  | 'circle'
  | 'parentBridge'
  | 'selfDiscovery'
  | 'parentCoach';

export type CompanionAvatarState =
  | 'neutral'
  | 'listening'
  | 'thinking'
  | 'comforting'
  | 'happy'
  | 'concerned'
  | 'responding';

export type CompanionReplySource = 'openai' | 'fallback';

export interface CompanionHistoryTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompanionReplyRequest {
  characterId: CompanionId | LegacyCompanionId;
  surface: CompanionSurface;
  userText: string;
  history?: CompanionHistoryTurn[];
  mood?: string;
  memory?: Record<string, unknown> | string;
  parentSharingEnabled?: boolean;
  userName?: string;
  displayName?: string;
  profileName?: string;
  conversationPhase?: string;
  phaseInstruction?: string;
  isArrival?: boolean;
  /** True only for a user's first introduction to this companion. */
  isFirstCompanionChat?: boolean;
}

export interface CompanionReplyData {
  reply: string;
  characterId?: CompanionId | LegacyCompanionId;
  tone: string;
  avatarState?: CompanionAvatarState;
  safetyFlag: boolean;
  parentShareSummary: string | null;
  suggestedComfortTool: string | null;
  replySource: CompanionReplySource;
  traceId?: string;
}

export type VoiceProvider =
  | 'cloudflare-aura-1'
  | 'cloudflare-aura-2'
  | 'elevenlabs-flash';

export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

export interface VoiceSynthesisRequest {
  reply: string;
  characterId: CompanionId | LegacyCompanionId;
  format?: 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';
  requiresPreciseLipSync?: boolean;
  includeTiming?: boolean;
  lipSync?: 'standard' | 'precise';
}

export interface VoiceSynthesisData {
  audioBase64: string;
  contentType?: string;
  characterId?: CompanionId | LegacyCompanionId;
  voiceSource?: string;
  voiceProvider?: VoiceProvider;
  primaryVoiceProvider?: VoiceProvider;
  model?: string;
  voiceId?: string;
  usedFallback?: boolean;
  timing?: CharacterAlignment;
  traceId?: string;
}

export interface TranscriptionRequest {
  audioBase64: string;
  contentType?: string;
}

export interface TranscriptionData {
  transcript?: string;
  text?: string;
  traceId?: string;
}

export type WorkerErrorCode =
  | 'AUTH_REQUIRED'
  | 'ACCESS_DENIED'
  | 'INVALID_REQUEST'
  | 'RATE_LIMITED'
  | 'BACKEND_UNAVAILABLE'
  | 'VOICE_UNAVAILABLE'
  | 'TIMEOUT'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export interface WorkerFailure {
  ok: false;
  error: {
    code: WorkerErrorCode;
    status: number;
    message: string;
    retryable: boolean;
    traceId?: string;
  };
}

export interface WorkerSuccess<T> {
  ok: true;
  data: T;
  meta: {
    status: number;
    traceId?: string;
    fallbackUsed: boolean;
  };
}

export type WorkerResult<T> = WorkerSuccess<T> | WorkerFailure;

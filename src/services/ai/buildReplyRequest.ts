/**
 * Single source of truth for assembling the rich `/api/sekret/reply` payload.
 * Every companion surface routes through this builder so continuity behavior is
 * shared rather than reimplemented inside individual screens.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  loadTeenRelationshipProfile,
  learnTeenRelationshipStyle,
  saveTeenRelationshipProfile,
  relationshipProfileToOracleNote,
  type TeenRelationshipProfile,
} from '../../../services/oracleRelationship';
import {
  buildOracleContext,
  normalizeOracleProfile,
} from '../../../services/oracleDiscovery';
import {
  getConversationPhase,
  buildConversationPhaseInstruction,
  isArrivalMessage,
  type ConversationPhase,
} from '../../../services/sekretVoice';
import type { SekretCharacterId, SekretSurface, SekretHistoryTurn } from '@/utils/api';

export interface ReplyRequestContext {
  characterId: SekretCharacterId;
  surface: SekretSurface;
  text: string;
  history?: SekretHistoryTurn[];
  mood?: string;
  parentSharingEnabled?: boolean;
  userName?: string;
  displayName?: string;
  profileName?: string;
  /** Explicit structured Oracle context. When omitted, the bounded teen profile is loaded locally. */
  oracleContext?: string[];
  /** Surface-specific memory keys folded into the memory bundle (e.g. teenGender). */
  extraMemory?: Record<string, unknown>;
  /** True only for the user's first introduction to this companion. */
  isFirstCompanionChat?: boolean;
}

export interface SekretReplyRequest {
  characterId: SekretCharacterId;
  surface: SekretSurface;
  userText: string;
  mood?: string;
  history: SekretHistoryTurn[];
  parentSharingEnabled: boolean;
  userName?: string;
  displayName?: string;
  profileName?: string;
  conversationPhase: ConversationPhase;
  phaseInstruction: string;
  isArrival: boolean;
  isFirstCompanionChat: boolean;
  memory: Record<string, unknown>;
}

export interface BuiltReplyRequest {
  request: SekretReplyRequest;
  /** The learned relationship profile — callers reuse it for local fallbacks. */
  relationship: TeenRelationshipProfile;
}

async function resolveOracleContext(explicit?: string[]): Promise<string[]> {
  if (explicit?.length) return explicit.filter(value => typeof value === 'string').slice(0, 8);

  try {
    const raw = await AsyncStorage.getItem('oracleProfile');
    if (!raw) return [];
    const profile = normalizeOracleProfile(JSON.parse(raw), 'teen');
    return buildOracleContext(profile, 'teen').slice(0, 8);
  } catch {
    return [];
  }
}

/**
 * Load + advance the teen relationship profile, compute conversation phase,
 * recover bounded structured Oracle context, and assemble the reply request.
 */
export async function buildReplyRequest(ctx: ReplyRequestContext): Promise<BuiltReplyRequest> {
  const history = ctx.history ?? [];
  const historyLength = history.length;

  const [currentRelationship, oracleContext] = await Promise.all([
    loadTeenRelationshipProfile(),
    resolveOracleContext(ctx.oracleContext),
  ]);
  const relationship = learnTeenRelationshipStyle(ctx.text, currentRelationship);
  await saveTeenRelationshipProfile(relationship);

  const conversationPhase = getConversationPhase(historyLength);
  const isFirstCompanionChat = ctx.isFirstCompanionChat ?? historyLength === 0;
  const phaseInstruction = buildConversationPhaseInstruction(
    conversationPhase,
    historyLength,
    ctx.characterId,
    isFirstCompanionChat,
  );
  const isArrival = isArrivalMessage(ctx.text, historyLength);

  const memory: Record<string, unknown> = {
    relationshipStyle: relationshipProfileToOracleNote(relationship),
    ...(oracleContext.length > 0 ? { oracleContext } : {}),
    ...(ctx.extraMemory ?? {}),
  };

  return {
    request: {
      characterId: ctx.characterId,
      surface: ctx.surface,
      userText: ctx.text,
      mood: ctx.mood,
      history,
      parentSharingEnabled: ctx.parentSharingEnabled ?? false,
      userName: ctx.userName,
      displayName: ctx.displayName,
      profileName: ctx.profileName,
      conversationPhase,
      phaseInstruction,
      isArrival,
      isFirstCompanionChat,
      memory,
    },
    relationship,
  };
}

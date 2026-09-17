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
  buildWellbeingContext,
  loadWellbeingState,
} from '../../../services/wellbeingState';
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
    // Oracle context is optional enrichment, not reply authority. Continue
    // without it, but make the degraded path visible without logging stored
    // profile content or parser/provider details.
    console.warn('Oracle context unavailable; continuing without optional context.');
    return [];
  }
}

/**
 * Load + advance the teen relationship profile, compute conversation phase,
 * recover bounded structured Oracle and wellbeing context, and assemble the
 * reply request. Wellbeing context is a projection of existing user activity,
 * not a diagnosis or a second clinical record.
 */
export async function buildReplyRequest(ctx: ReplyRequestContext): Promise<BuiltReplyRequest> {
  const history = ctx.history ?? [];
  const historyLength = history.length;

  const [currentRelationship, oracleContext, wellbeingState] = await Promise.all([
    loadTeenRelationshipProfile(),
    resolveOracleContext(ctx.oracleContext),
    loadWellbeingState(),
  ]);
  const wellbeingContext = buildWellbeingContext(wellbeingState);
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

  // Surface-specific memory is allowed to add context, but it cannot override
  // the canonical relationship/Oracle/wellbeing provenance fields below.
  const memory: Record<string, unknown> = {
    ...(ctx.extraMemory ?? {}),
    relationshipStyle: relationshipProfileToOracleNote(relationship),
    ...(oracleContext.length > 0 ? { oracleContext } : {}),
    ...(wellbeingContext.length > 0 ? {
      wellbeingContext: {
        policy: 'Tentative, user-controlled observations only. Never diagnose, label, score, or treat these as clinical facts.',
        observations: wellbeingContext,
      },
    } : {}),
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

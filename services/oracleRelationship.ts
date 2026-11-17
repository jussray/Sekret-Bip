import AsyncStorage from '@react-native-async-storage/async-storage';

export type RelationshipEnergy =
  | 'neutral'
  | 'cousin'
  | 'sibling'
  | 'homegirl-homeboy'
  | 'teammate'
  | 'quiet-companion'
  | 'straightforward-guide';

export type ReplyLengthPreference = 'short' | 'balanced' | 'deep';
export type SupportOrder = 'comfort-first' | 'plan-first' | 'ask-first';
export type ProfanityPreference = 'avoid' | 'accept' | 'light-mirroring';

export interface TeenRelationshipProfile {
  relationshipEnergy: RelationshipEnergy;
  nicknameComfort: 'unknown' | 'likes' | 'dislikes';
  slangLevel: 'low' | 'medium' | 'high';
  profanityPreference: ProfanityPreference;
  humorLevel: 'low' | 'medium' | 'high';
  directness: 'gentle' | 'balanced' | 'direct';
  replyLength: ReplyLengthPreference;
  supportOrder: SupportOrder;
  questionTolerance: 'low' | 'medium' | 'high';
  confidence: number;
  observations: number;
  lastUpdated: string;
}

const STORAGE_KEY = 'oracle_relationship_profile_teen';

export const DEFAULT_TEEN_RELATIONSHIP_PROFILE: TeenRelationshipProfile = {
  relationshipEnergy: 'neutral',
  nicknameComfort: 'unknown',
  slangLevel: 'medium',
  profanityPreference: 'accept',
  humorLevel: 'medium',
  directness: 'balanced',
  replyLength: 'balanced',
  supportOrder: 'ask-first',
  questionTolerance: 'medium',
  confidence: 0,
  observations: 0,
  lastUpdated: '',
};

export async function loadTeenRelationshipProfile(): Promise<TeenRelationshipProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_TEEN_RELATIONSHIP_PROFILE;
    return { ...DEFAULT_TEEN_RELATIONSHIP_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_TEEN_RELATIONSHIP_PROFILE;
  }
}

export async function saveTeenRelationshipProfile(profile: TeenRelationshipProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function learnTeenRelationshipStyle(
  text: string,
  previous: TeenRelationshipProfile,
): TeenRelationshipProfile {
  const lower = text.toLowerCase();
  const next = { ...previous };

  if (/don't call me|do not call me|stop calling me|not your sis|not your bro|not your cousin/.test(lower)) {
    next.nicknameComfort = 'dislikes';
    next.relationshipEnergy = 'neutral';
  } else if (/sis|bro|cuz|cousin|bestie|gang/.test(lower)) {
    next.nicknameComfort = 'likes';
  }

  if (/\b(fuck|shit|damn|hell|bitch|ass)\b/.test(lower)) {
    next.profanityPreference = 'light-mirroring';
    next.slangLevel = 'high';
  }

  if (/just tell me|be real|keep it real|don't sugarcoat|do not sugarcoat/.test(lower)) {
    next.directness = 'direct';
  }

  if (/don't ask|too many questions|stop asking|just listen/.test(lower)) {
    next.questionTolerance = 'low';
    next.supportOrder = 'comfort-first';
  }

  if (/help me plan|what should i do|give me steps|make a plan/.test(lower)) {
    next.supportOrder = 'plan-first';
    next.directness = 'direct';
  }

  if (/keep it short|short answer|don't write a lot/.test(lower)) next.replyLength = 'short';
  if (/go deeper|tell me more|explain more/.test(lower)) next.replyLength = 'deep';

  next.observations += 1;
  next.confidence = Math.min(1, next.observations / 12);
  next.lastUpdated = new Date().toISOString();
  return next;
}

export function relationshipProfileToOracleNote(profile: TeenRelationshipProfile): string {
  return [
    `relationship energy: ${profile.relationshipEnergy}`,
    `nickname comfort: ${profile.nicknameComfort}`,
    `slang: ${profile.slangLevel}`,
    `profanity: ${profile.profanityPreference}`,
    `humor: ${profile.humorLevel}`,
    `directness: ${profile.directness}`,
    `reply length: ${profile.replyLength}`,
    `support order: ${profile.supportOrder}`,
    `question tolerance: ${profile.questionTolerance}`,
  ].join('; ');
}

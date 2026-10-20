import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import type { RelationshipFeature, RelationshipFeatureState } from '@/types/relationshipLayer';

export type RelationshipFeatureFlagMap = Record<RelationshipFeature, RelationshipFeatureState>;

export const RELATIONSHIP_FEATURE_FLAGS: Readonly<RelationshipFeatureFlagMap> = Object.freeze({
  // Public behavior remains fail-closed. Founder Preview may open only the
  // implemented features below inside Expo Go/development.
  bridgeLearning: 'internal',

  // Controlled-alpha surfaces are available only to founder, internal, and beta
  // audiences. Public production builds remain closed until a separate founder
  // decision promotes them after authorization, deletion, and journey evidence.
  bridgeSummaries: 'beta',
  crewAccountability: 'beta',

  // Emotional Scrapbook remains a founder/internal visual prototype until its
  // durable schema, deletion path, denial tests, and two-account journey exist.
  emotionalScrapbook: 'internal',

  // Durable companion memory (L4) is not implemented and must not be presented
  // as active merely to make the launch surface look complete.
  companionMemory: 'disabled',
});

const FOUNDER_PREVIEWABLE_FEATURES = new Set<RelationshipFeature>([
  'bridgeSummaries',
  'bridgeLearning',
  'crewAccountability',
  'emotionalScrapbook',
]);

export function isRelationshipFeatureAvailable(
  feature: RelationshipFeature,
  audience: 'founder' | 'internal' | 'beta' | 'public' = 'public',
  flags: Readonly<RelationshipFeatureFlagMap> = RELATIONSHIP_FEATURE_FLAGS,
): boolean {
  // Development-only override. This does not claim unimplemented companion
  // memory is ready and it does not bypass database or Worker authorization.
  if (isFounderPreviewEnabled() && FOUNDER_PREVIEWABLE_FEATURES.has(feature)) {
    return true;
  }

  const state = flags[feature];
  if (state === 'enabled') return true;
  if (state === 'beta') return audience === 'founder' || audience === 'internal' || audience === 'beta';
  if (state === 'internal') return audience === 'founder' || audience === 'internal';
  return false;
}

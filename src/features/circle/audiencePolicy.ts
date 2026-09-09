export type CircleAudienceKey =
  | 'open_bip'
  | 'community'
  | 'friends'
  | 'friend_group'
  | 'crew'
  | 'private';

export type CircleFacePolicy =
  | 'reject_visible_faces'
  | 'hide_faces_by_default'
  | 'allow_with_active_trust'
  | 'allow_private';

export interface CircleAudiencePolicy {
  key: CircleAudienceKey;
  label: string;
  emoji: string;
  facePolicy: CircleFacePolicy;
  requiresActiveTrust: boolean;
  description: string;
}

/**
 * Canonical Circle model:
 * Se'kret Bip -> Circle -> audience layer -> post.
 *
 * Circle is the larger social world. Open Bip, Community, Friends, private
 * friend groups, Crew, and Just Me are audience layers in that world.
 * Bridge remains a separate private teen-to-parent product boundary and must
 * not be modeled as a Circle audience.
 */
export const CIRCLE_AUDIENCES: Record<CircleAudienceKey, CircleAudiencePolicy> = {
  open_bip: {
    key: 'open_bip',
    label: 'Open Bip',
    emoji: '🌎',
    facePolicy: 'reject_visible_faces',
    requiresActiveTrust: false,
    description: 'Public Circle and public niches. Visible faces are not allowed.',
  },
  community: {
    key: 'community',
    label: 'Community',
    emoji: '🏫',
    facePolicy: 'hide_faces_by_default',
    requiresActiveTrust: false,
    description: 'Broader interest spaces keep faces hidden, cropped, blurred, or covered by default.',
  },
  friends: {
    key: 'friends',
    label: 'Friends',
    emoji: '💜',
    facePolicy: 'allow_with_active_trust',
    requiresActiveTrust: true,
    description: 'Visible faces are allowed after both accounts are mutually accepted friends.',
  },
  friend_group: {
    key: 'friend_group',
    label: 'Private Friend Group',
    emoji: '👥',
    facePolicy: 'allow_with_active_trust',
    requiresActiveTrust: true,
    description: 'Visible faces are allowed only while private group membership is active.',
  },
  crew: {
    key: 'crew',
    label: 'Crew',
    emoji: '🤝',
    facePolicy: 'allow_with_active_trust',
    requiresActiveTrust: true,
    description: 'Visible faces are allowed for explicitly selected accepted Crew members.',
  },
  private: {
    key: 'private',
    label: 'Just Me / Scrapbook',
    emoji: '🔒',
    facePolicy: 'allow_private',
    requiresActiveTrust: false,
    description: 'Private media follows owner-only storage and access rules.',
  },
};

export interface CircleTrustContext {
  mutualFriendAccepted?: boolean;
  activeGroupMembership?: boolean;
  acceptedCrewSelected?: boolean;
  isOwnerOnly?: boolean;
}

/**
 * Client-side capability check for presentation and composer guidance.
 * Server-side authorization remains authoritative for every trusted audience.
 */
export function canShowVisibleFace(
  audience: CircleAudienceKey,
  trust: CircleTrustContext = {},
): boolean {
  switch (audience) {
    case 'open_bip':
    case 'community':
      return false;
    case 'friends':
      return trust.mutualFriendAccepted === true;
    case 'friend_group':
      return trust.activeGroupMembership === true;
    case 'crew':
      return trust.acceptedCrewSelected === true;
    case 'private':
      return trust.isOwnerOnly === true;
  }
}

export function audienceLabel(audience: CircleAudienceKey): string {
  const policy = CIRCLE_AUDIENCES[audience];
  return `${policy.emoji} ${policy.label}`;
}

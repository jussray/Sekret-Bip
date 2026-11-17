export type RelationshipFeature =
  | 'bridgeSummaries'
  | 'bridgeLearning'
  | 'crewAccountability'
  | 'emotionalScrapbook'
  | 'companionMemory';

export type RelationshipFeatureState = 'disabled' | 'internal' | 'beta' | 'enabled';

export type RelationshipActorRole = 'teen' | 'parent' | 'crew_member' | 'service';

export type RelationshipRecordStatus =
  | 'draft'
  | 'pending'
  | 'processing'
  | 'ready'
  | 'viewed'
  | 'revoked'
  | 'expired'
  | 'failed'
  | 'deleted';

export type RelationshipFailureCode =
  | 'not_configured'
  | 'not_authenticated'
  | 'not_authorized'
  | 'not_linked'
  | 'consent_required'
  | 'revoked'
  | 'expired'
  | 'rate_limited'
  | 'invalid_input'
  | 'ai_unavailable'
  | 'storage_unavailable'
  | 'server_error';

export type RelationshipResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: RelationshipFailureCode; message: string; retryable?: boolean };

export interface RelationshipAuditFields {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  status: RelationshipRecordStatus;
  revokedAt?: string | null;
  deletedAt?: string | null;
}

export type BridgeSourceKind = 'journal' | 'mood' | 'goal' | 'scrapbook';

export interface BridgeShareSourceRef {
  kind: BridgeSourceKind;
  sourceId: string;
}

export interface BridgeSummaryContent {
  themes: string[];
  conversationStarters: string[];
  limitations: string;
}

export interface BridgeSummaryRecord extends RelationshipAuditFields {
  teenUserId: string;
  parentUserId: string;
  sourceRefs: BridgeShareSourceRef[];
  summary?: BridgeSummaryContent | null;
  promptVersion?: string | null;
  model?: string | null;
  viewedAt?: string | null;
  expiresAt?: string | null;
  usedFallback: boolean;
}

export type CrewCheckinEmoji = 'great' | 'okay' | 'low' | 'need_support' | 'resting';

export interface CrewCheckinRecord extends RelationshipAuditFields {
  ownerUserId: string;
  crewMemberUserId: string;
  localDate: string;
  emoji: CrewCheckinEmoji;
  note?: string | null;
}

export interface CrewEncouragementRecord extends RelationshipAuditFields {
  senderUserId: string;
  recipientUserId: string;
  presetKey: string;
  localDate: string;
}

export type ScrapbookMediaKind = 'image' | 'voice' | 'text';
export type ScrapbookVisibility = 'private' | 'crew' | 'circle' | 'parent_window';

export interface ScrapbookMemoryRecord extends RelationshipAuditFields {
  ownerUserId: string;
  title?: string | null;
  body?: string | null;
  mood?: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  mediaKinds: ScrapbookMediaKind[];
  storagePaths: string[];
  stickerKeys: string[];
  frameKey?: string | null;
  accentKey?: string | null;
  visibility: ScrapbookVisibility;
  archivedAt?: string | null;
}

export type CompanionMemoryCategory =
  | 'preference'
  | 'goal'
  | 'routine'
  | 'coping_tool'
  | 'important_person'
  | 'milestone';

export type CompanionMemoryDecision = 'proposed' | 'approved' | 'edited' | 'rejected' | 'deleted';

export interface CompanionMemoryRecord extends RelationshipAuditFields {
  ownerUserId: string;
  companionKey: string;
  category: CompanionMemoryCategory;
  value: string;
  decision: CompanionMemoryDecision;
  provenanceType: 'user_authored' | 'chat_candidate' | 'recap_candidate';
  provenanceId?: string | null;
  confidence?: number | null;
  lastUsedAt?: string | null;
}

export interface CompanionRecapRecord extends RelationshipAuditFields {
  ownerUserId: string;
  companionKey: string;
  periodStart: string;
  periodEnd: string;
  observedChanges: string[];
  aiInterpretation: string[];
  savedByTeen: boolean;
  sharedWithParent: boolean;
}

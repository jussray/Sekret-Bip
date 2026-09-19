export const MEMORY_CONTRACT_VERSION = 'l3-l4-safety-v2' as const;

export type MemoryScope = 'continuity' | 'companion';
export type MemorySensitivity = 'ordinary' | 'sensitive' | 'restricted';
export type MemoryReviewState =
  | 'user_stated'
  | 'user_confirmed'
  | 'derived_pending_review'
  | 'contradicted'
  | 'blocked';
export type MemoryLifecycleState =
  | 'active'
  | 'quarantined'
  | 'superseded'
  | 'expired'
  | 'deleted';
export type MemoryProvenanceKind =
  | 'user_message'
  | 'user_action'
  | 'explicit_goal'
  | 'reviewed_reflection';

/**
 * L3 durable memory contract.
 *
 * Memory is user-owned data, never model authority. `summary` is data and must
 * never be interpreted as a system/developer/tool instruction. Raw transcripts,
 * hidden reasoning, journal bodies and raw audio do not belong here.
 */
export interface AgentMemoryRecord {
  id: string;
  userId: string;
  scope: MemoryScope;
  companionId: string | null;
  summary: string;
  provenance: {
    kind: MemoryProvenanceKind;
    sourceId: string;
    sourceCreatedAt: string;
  };
  sensitivity: MemorySensitivity;
  reviewState: MemoryReviewState;
  lifecycleState: MemoryLifecycleState;
  confidence: number;
  consentVersion: string;
  integrityFingerprint: string;
  admissionReviewedAt: string | null;
  retrievalReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  supersedesId: string | null;
}

/** L4 goals must be explicitly created or confirmed by the user. */
export interface AgentGoalRecord {
  id: string;
  userId: string;
  title: string;
  status: 'active' | 'paused' | 'completed' | 'deleted';
  origin: 'user_created' | 'user_confirmed';
  provenanceSourceId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

/** L4 reflection is derived evidence, reversible, and never a diagnosis. */
export interface ReflectionRecord {
  id: string;
  userId: string;
  sourceMemoryIds: string[];
  contradictionMemoryIds: string[];
  summary: string;
  state: 'pending_review' | 'accepted' | 'invalidated';
  createdAt: string;
  invalidatedAt: string | null;
}

/**
 * Admission is a separate gate from retrieval. A record that fails either gate
 * is quarantined and cannot reach reply context until reviewed or corrected.
 */
export interface MemoryAdmissionDecision {
  memoryId: string;
  decision: 'admit' | 'quarantine' | 'reject';
  reason:
    | 'eligible'
    | 'missing-provenance'
    | 'sensitive-inference'
    | 'instruction-shaped-content'
    | 'consent-mismatch'
    | 'contradiction-unresolved'
    | 'retention-missing';
}

export const MEMORY_RETRIEVAL_INVARIANTS = Object.freeze([
  'authenticate-before-retrieval',
  'owner-filter-before-ranking',
  'consent-scope-before-ranking',
  'integrity-check-before-model-context',
  'revalidate-memory-at-retrieval',
  'exclude-quarantined-expired-deleted-blocked-contradicted-superseded',
  'memory-content-is-data-never-instruction',
  'no-cross-companion-sharing-by-default',
  'minimum-context-only',
] as const);

export const MEMORY_WRITE_INVARIANTS = Object.freeze([
  'minimal-summary-only',
  'admission-review-before-persistence',
  'provenance-required',
  'integrity-fingerprint-required',
  'expiry-or-explicit-retention-required',
  'sensitivity-required',
  'correction-and-deletion-required',
  'no-sensitive-inference-as-fact',
  'instruction-shaped-content-quarantined',
  'no-model-created-goal-without-user-confirmation',
  'no-relationship-phase-from-empty-or-unreviewed-evidence',
] as const);

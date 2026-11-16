export type BridgeFamilyVisitRole = 'teen' | 'parent' | 'professional';
export type BridgeFamilyVisitSessionState = 'awaiting_ack' | 'active' | 'reflection' | 'ready' | 'declined' | 'revoked' | 'expired';
export type BridgeFamilyVisitMarkerKey =
  | 'felt_connected'
  | 'felt_heard'
  | 'needed_pause'
  | 'support_offered'
  | 'boundary_respected'
  | 'repair_attempt'
  | 'felt_pressured'
  | 'want_human_review';
export type BridgeFamilyVisitAnswer = 'yes' | 'somewhat' | 'no' | 'not_sure';
export type BridgeFamilyVisitConnection = 'closer' | 'same' | 'more_distant' | 'not_sure';
export type BridgeFamilyVisitNextSupport = 'listen' | 'space' | 'reassurance' | 'clear_plan' | 'human_follow_up' | 'none' | 'not_sure';
export type BridgeFamilyVisitReviewSignal = 'no_concern_observed' | 'mixed' | 'needs_human_review' | 'insufficient_evidence';
export type BridgeFamilyVisitEvidenceClass = 'OBSERVED' | 'INFERRED' | 'UNKNOWN' | 'HUMAN_REVIEW';
export type BridgeFamilyVisitDisposition = 'supportive' | 'mixed' | 'needs_human_review' | 'insufficient_evidence';

export interface BridgeProfessionalCapability {
  userId: string;
  organizationKind: 'cys' | 'court' | 'casa' | 'agency' | 'other';
  organizationLabel: string;
  verificationStatus: 'pending' | 'verified' | 'suspended' | 'revoked';
}

export interface BridgeFamilyVisitAssignment {
  id: string;
  teenUserId: string;
  parentUserId: string;
  professionalUserId: string;
  status: 'active' | 'revoked' | 'expired';
  expiresAt: string | null;
  role: BridgeFamilyVisitRole;
}

export interface BridgeFamilyVisitSession {
  id: string;
  assignmentId: string;
  state: BridgeFamilyVisitSessionState;
  captureMode: 'none';
  teenAcknowledgedAt: string | null;
  parentAcknowledgedAt: string | null;
  professionalAcknowledgedAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  declinedByRole: BridgeFamilyVisitRole | null;
  createdAt: string;
}

export interface BridgeFamilyVisitEvidenceItem {
  classification: BridgeFamilyVisitEvidenceClass;
  text: string;
}

export interface BridgeParentVisitSummary {
  childExperience: BridgeFamilyVisitEvidenceItem[];
  connectionMoments: BridgeFamilyVisitEvidenceItem[];
  nextTime: string[];
  uncertainty: string;
  limitations: string;
}

export interface BridgeProfessionalVisitSummary {
  interactionPatterns: BridgeFamilyVisitEvidenceItem[];
  childCenteredSignals: BridgeFamilyVisitEvidenceItem[];
  humanReview: BridgeFamilyVisitEvidenceItem[];
  disposition: BridgeFamilyVisitDisposition;
  uncertainty: string;
  limitations: string;
}

export interface BridgeFamilyVisitSummaryRow {
  id: string;
  sessionId: string;
  audience: 'parent' | 'professional';
  content: BridgeParentVisitSummary | BridgeProfessionalVisitSummary;
  limitations: string;
  generatedAt: string;
  usedFallback: boolean;
}

export interface BridgeFamilyVisitBundle {
  capability: BridgeProfessionalCapability | null;
  assignments: BridgeFamilyVisitAssignment[];
  sessions: BridgeFamilyVisitSession[];
  summaries: BridgeFamilyVisitSummaryRow[];
}

export interface BridgeFamilyVisitParticipantReflectionInput {
  feltHeard: BridgeFamilyVisitAnswer;
  feltComfortable: BridgeFamilyVisitAnswer;
  couldPause: BridgeFamilyVisitAnswer;
  connectionAfter: BridgeFamilyVisitConnection;
  nextSupport: BridgeFamilyVisitNextSupport;
}

export interface BridgeFamilyVisitResult<T> {
  ok: boolean;
  value?: T;
  code?: 'not_configured' | 'not_authenticated' | 'not_authorized' | 'invalid_input' | 'server_error' | 'ai_unavailable';
  message?: string;
  retryable?: boolean;
}

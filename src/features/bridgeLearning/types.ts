export type BridgeLearningActor = 'teen' | 'parent' | 'sekret' | 'oracle_service';

export type BridgeLearningState =
  | 'invited'
  | 'working_together'
  | 'teen_stumped'
  | 'parent_stumped'
  | 'both_stumped'
  | 'sekret_teaching'
  | 'trying_again'
  | 'teach_back'
  | 'completed'
  | 'needs_outside_help'
  | 'declined'
  | 'revoked'
  | 'expired';

export type BridgeLearningVisibility = 'shared_pair';

export type BridgeLearningPingReason =
  | 'join_me'
  | 'im_stuck'
  | 'show_me_how_you_learned_it'
  | 'check_this_step'
  | 'lets_ask_sekret';

export type BridgeLearningPingStatus =
  | 'suggested'
  | 'sent'
  | 'opened'
  | 'accepted'
  | 'dismissed'
  | 'expired';

/**
 * Internal explanation strategy. These values are never user-facing labels and
 * must never be rendered as age, intelligence, grade, or ability judgments.
 */
export type ExplanationDepth = 'concrete' | 'plain' | 'guided' | 'academic';

export type PreferredExampleStyle =
  | 'visual'
  | 'story'
  | 'real_life'
  | 'numbers'
  | 'step_by_step';

export interface BridgeLearningSession {
  id: string;
  parentLinkId: string;
  teenUserId: string;
  parentUserId: string;
  subject: string;
  topic: string;
  state: BridgeLearningState;
  visibility: BridgeLearningVisibility;
  initiatedBy: Exclude<BridgeLearningActor, 'sekret' | 'oracle_service'>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  completedAt: string | null;
  revokedAt: string | null;
}

export interface BridgeLearningPing {
  id: string;
  sessionId: string;
  senderRole: 'teen' | 'parent';
  recipientRole: 'teen' | 'parent';
  reason: BridgeLearningPingReason;
  sharedStepId: string | null;
  sharedTopic: string;
  status: BridgeLearningPingStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface TeachingStep {
  id: string;
  kind: 'explanation' | 'worked_example' | 'teen_turn' | 'parent_turn' | 'together_turn' | 'teach_back';
  prompt: string;
  expectedConcept?: string | null;
}

export interface GroundedSource {
  title: string;
  sourceType: 'user_source' | 'approved_curriculum' | 'reference';
  citationLabel: string;
  locator?: string | null;
}

export interface OracleTeachingPacket {
  subject: string;
  topic: string;
  learningGoal: string;
  likelyMisconception: string | null;
  explanationDepth: ExplanationDepth;
  plainExplanation: string;
  alternateExplanation: string;
  analogy: string | null;
  steps: TeachingStep[];
  expectedAnswer: string;
  alternateValidAnswers: string[];
  correctionStrategy: string;
  confidence: number;
  sources: GroundedSource[];
  needsOutsideHelp: boolean;
}

export interface BridgeLearningTeachingState {
  explanationDepth: ExplanationDepth;
  conceptUnderstood: boolean;
  missingConcept: string | null;
  preferredExampleStyle: PreferredExampleStyle;
  explanationAttempts: number;
  lastStrategyKey: string | null;
}

export interface BridgeLearningShareBoundary {
  sessionId: string;
  parentLinkId: string;
  mayReadPrivateStudyHistory: false;
  mayReadPrivateJournal: false;
  mayReadUnsharedSources: false;
  mayReadSharedSessionContent: true;
}

export type FounderOperatorMode = 'ultrathink' | 'billgates-artifacts' | 'elonmusk-execution';

export type FounderOperatorLaneId =
  | 'founder'
  | 'codex'
  | 'chatgpt'
  | 'claude'
  | 'deepseek'
  | 'figma'
  | 'canva'
  | 'supabase'
  | 'cloudflare'
  | 'github'
  | 'playwright'
  | 'gmail'
  | 'local-agent';

export type FounderOperatorArtifactKind =
  | 'mission-brief'
  | 'decision'
  | 'architecture'
  | 'code'
  | 'design'
  | 'data'
  | 'verification'
  | 'release'
  | 'communication'
  | 'ledger';

export type FounderOperatorArtifactStatus =
  | 'planned'
  | 'building'
  | 'verification-required'
  | 'human-required'
  | 'verified';

export type FounderOperatorPhaseStatus = 'planned' | 'active' | 'blocked' | 'human-required' | 'verified';

export type FounderOperatorLane = {
  id: FounderOperatorLaneId;
  label: string;
  purpose: string;
  authority: 'decision' | 'execution' | 'advisory' | 'evidence';
};

export type FounderOperatorArtifact = {
  id: string;
  title: string;
  kind: FounderOperatorArtifactKind;
  ownerLane: FounderOperatorLaneId;
  supportLanes: FounderOperatorLaneId[];
  pathHint: string;
  evidenceRequired: string[];
  approvalGate?: string;
  status: FounderOperatorArtifactStatus;
  approvalRecordedAt?: string;
};

export type FounderOperatorPhase = {
  id: string;
  title: string;
  objective: string;
  operatingQuestion: string;
  ownerLane: FounderOperatorLaneId;
  supportLanes: FounderOperatorLaneId[];
  artifactIds: string[];
  safeMissionId?: 'continue-yesterday' | 'verify-local' | 'verify-frontend' | 'recover-system';
  exitGate: string;
  status: FounderOperatorPhaseStatus;
};

export type FounderOperatorPlan = {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  mission: string;
  constraints: string;
  modes: FounderOperatorMode[];
  lanes: FounderOperatorLane[];
  phases: FounderOperatorPhase[];
  artifacts: FounderOperatorArtifact[];
  approvalGates: string[];
  nonClaims: string[];
  evidenceLevel: 'plan-only' | 'local-evidence' | 'exact-head' | 'deployed-observation';
};

export type FounderOperatorProgress = {
  artifactCount: number;
  verifiedCount: number;
  humanRequiredCount: number;
  percent: number;
  currentPhase: FounderOperatorPhase | null;
};
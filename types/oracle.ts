export type OracleMode = 'teen' | 'parent';
export type SoftState = 'emerging' | 'growing' | 'strong' | 'needsAttention';

export type TeenProfileDimension =
  | 'identity' | 'emotional' | 'relational' | 'resilience' | 'selfTalk'
  | 'drive' | 'boundaries' | 'expression' | 'belonging' | 'future';

export type ParentProfileDimension =
  | 'presence' | 'emotional' | 'communication' | 'repair' | 'boundaries'
  | 'expectations' | 'connection' | 'selfCare' | 'values' | 'reactivity'
  | 'flexibility' | 'identity' | 'purpose';

export type StrategyAxis =
  | 'planning' | 'conflict' | 'processing' | 'risk'
  | 'expression' | 'work' | 'response' | 'vision';

export type ProfileDimension = TeenProfileDimension | ParentProfileDimension;

export interface OracleDimensionEntry {
  dimension?: ProfileDimension;
  signals: string[];
  state?: SoftState;
  softState?: SoftState | string;
  lastUpdated: string;
}

export interface StrategyAxisEntry {
  axis?: StrategyAxis;
  leanA: number;
  leanB: number;
  confidence?: number;
  observations?: number;
  lastUpdated?: string;
}

export interface OracleTurn {
  questionId: string;
  question: string;
  answer: string;
  dimension: ProfileDimension;
  axis?: StrategyAxis;
  timestamp: string;
}

export interface OracleQuestion {
  id: string;
  mode: OracleMode;
  dimension: ProfileDimension;
  axis?: StrategyAxis;
  text: string;
  followUp?: string;
}

export interface OracleRecord {
  mode: OracleMode;
  profile: Partial<Record<ProfileDimension, OracleDimensionEntry>>;
  strategy: Partial<Record<StrategyAxis, StrategyAxisEntry>>;
  sessionCount: number;
  totalTurns: number;
  lastSession: string;
  history: OracleTurn[];
  signals: OracleSignals;
}

export interface OracleSignals {
  strategyLead?: StrategyAxis;
  strategyPole?: 'A' | 'B';
  dominantDimension?: ProfileDimension;
  dimensionState?: SoftState;
  personalityNote?: string;
  growthEdge?: string;
}

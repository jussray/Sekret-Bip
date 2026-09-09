/**
 * Read-only preview models for the Founder Control Room workspace.
 *
 * This folder is intentionally unregistered and contains no runtime authority.
 * Issue #512 and its child gates remain the decision source of truth.
 */

export type WorkspaceThreadStatus =
  | 'draft'
  | 'planned'
  | 'running'
  | 'review'
  | 'blocked'
  | 'failed'
  | 'rolled_back';

export type WorkspaceBlockReason =
  | 'runner_startup_failure'
  | 'workflow_no_jobs'
  | 'workflow_step_failure'
  | 'founder_gate_pending'
  | 'dependency_not_merged'
  | 'ci_evidence_incomplete'
  | 'supabase_split_brain'
  | 'manual_hold';

export type WorkspaceThreadDomain =
  | 'engineering'
  | 'growth'
  | 'ops'
  | 'support'
  | 'finance'
  | 'admin'
  | 'infra';

export type WorkspaceArtifactKind =
  | 'pull_request'
  | 'sql_migration'
  | 'deploy_evidence'
  | 'email_draft'
  | 'spec'
  | 'report'
  | 'ci_log';

export interface WorkspaceArtifact {
  id: string;
  kind: WorkspaceArtifactKind;
  label: string;
  url?: string;
  previewText?: string;
  createdAt: string;
}

export interface WorkspaceDependency {
  prNumber: number;
  title: string;
  status: 'open' | 'merged' | 'closed' | 'draft';
  url: string;
}

export interface WorkspaceDecisionEvidence {
  id: string;
  actorLabel: string;
  decision: 'approved' | 'rejected' | 'held';
  note?: string;
  recordedAt: string;
  source: string;
}

export interface WorkspaceThread {
  id: string;
  title: string;
  brief: string;
  domain: WorkspaceThreadDomain;
  status: WorkspaceThreadStatus;
  blockReason?: WorkspaceBlockReason;
  blockDetail?: string;
  artifacts: WorkspaceArtifact[];
  dependencies: WorkspaceDependency[];
  decisionEvidence: WorkspaceDecisionEvidence[];
  createdAt: string;
  updatedAt: string;
  riskLevel: 'low' | 'medium' | 'high';
  blastRadius?: string;
  rollbackNote?: string;
}

export const WORKSPACE_PREVIEW_DISCLAIMER =
  'Read-only preview fixture. It cannot approve, merge, deploy, mutate Supabase, or replace Founder Control Room issue #512.';

export const WORKSPACE_COLUMNS: {
  status: WorkspaceThreadStatus;
  label: string;
  emoji: string;
}[] = [
  { status: 'draft', label: 'Draft', emoji: '📝' },
  { status: 'planned', label: 'Planned', emoji: '🗺️' },
  { status: 'running', label: 'Running', emoji: '⚡' },
  { status: 'review', label: 'Review', emoji: '🔍' },
  { status: 'blocked', label: 'Blocked', emoji: '🚧' },
  { status: 'failed', label: 'Failed', emoji: '⛔' },
  { status: 'rolled_back', label: 'Rolled back', emoji: '↩️' },
];

export const WORKSPACE_PREVIEW_DEPENDENCIES: WorkspaceDependency[] = [
  {
    prNumber: 481,
    title: 'Living-room production engine',
    status: 'draft',
    url: 'https://github.com/jussray/Sekret-Bip/pull/481',
  },
  {
    prNumber: 482,
    title: 'Executable Founder Control Room mission core',
    status: 'draft',
    url: 'https://github.com/jussray/Sekret-Bip/pull/482',
  },
  {
    prNumber: 490,
    title: 'Founder Operator artifact engine',
    status: 'draft',
    url: 'https://github.com/jussray/Sekret-Bip/pull/490',
  },
  {
    prNumber: 480,
    title: 'CI failure routing',
    status: 'draft',
    url: 'https://github.com/jussray/Sekret-Bip/pull/480',
  },
];

export const WORKSPACE_PREVIEW_THREADS: WorkspaceThread[] = [
  {
    id: 'preview-ci-runner',
    title: 'CI runner startup failure',
    brief: 'Hosted jobs completed without receiving steps or logs.',
    domain: 'infra',
    status: 'blocked',
    blockReason: 'runner_startup_failure',
    blockDetail:
      'Preview fixture only. Re-check exact-head Actions evidence before making any current-state claim.',
    artifacts: [],
    dependencies: [],
    decisionEvidence: [],
    createdAt: '2026-07-18T00:00:00Z',
    updatedAt: '2026-07-18T00:00:00Z',
    riskLevel: 'high',
    blastRadius: 'All CI-gated pull requests remain unverified.',
    rollbackNote: 'No mutation exists in this preview fixture.',
  },
  {
    id: 'preview-control-room-stack',
    title: 'Founder Control Room dependency stack',
    brief: 'Read-only view of the preserved #481 → #482 → #490 → #480 order.',
    domain: 'engineering',
    status: 'planned',
    artifacts: [],
    dependencies: WORKSPACE_PREVIEW_DEPENDENCIES,
    decisionEvidence: [],
    createdAt: '2026-07-18T00:00:00Z',
    updatedAt: '2026-07-18T00:00:00Z',
    riskLevel: 'medium',
    blastRadius: 'Display only. No branch, merge, database, or deployment action.',
    rollbackNote: 'Remove the unregistered preview files.',
  },
];

import type {
  FounderOperatorArtifact,
  FounderOperatorArtifactKind,
  FounderOperatorArtifactStatus,
  FounderOperatorLane,
  FounderOperatorLaneId,
  FounderOperatorPhase,
  FounderOperatorPlan,
  FounderOperatorProgress,
} from '@/types/controlRoomFounderOperator';

export const FOUNDER_OPERATOR_HISTORY_KEY = 'control-room:founder-operator:plans:v1';

export const FOUNDER_OPERATOR_MODES = [
  'ultrathink',
  'billgates-artifacts',
  'elonmusk-execution',
] as const;

export const FOUNDER_OPERATOR_APPROVAL_GATES = [
  'merge or close a pull request',
  'deploy or change production routing',
  'apply, rollback, or mutate a database migration',
  'spend money or change a paid plan',
  'publish, schedule, or send external communications',
  'create or connect an external account',
  'use, rotate, or expose credentials or secrets',
  'delete, overwrite, or irreversibly transform user or repository data',
] as const;

export const FOUNDER_OPERATOR_LANES: FounderOperatorLane[] = [
  { id: 'founder', label: 'Founder', purpose: 'Own the mission, approvals, tradeoffs, and final truth.', authority: 'decision' },
  { id: 'codex', label: 'Codex', purpose: 'Own repository integration, narrow code changes, tests, and pull-request evidence.', authority: 'execution' },
  { id: 'chatgpt', label: 'ChatGPT', purpose: 'Own mission synthesis, planning, debugging, and founder-readable decisions.', authority: 'execution' },
  { id: 'claude', label: 'Claude', purpose: 'Review long-context architecture and implementation boundaries.', authority: 'advisory' },
  { id: 'deepseek', label: 'DeepSeek', purpose: 'Provide a bounded adversarial second opinion without becoming a second writer.', authority: 'advisory' },
  { id: 'figma', label: 'Figma', purpose: 'Own editable product design and implementation mapping when connected.', authority: 'execution' },
  { id: 'canva', label: 'Canva', purpose: 'Own founder-reviewable visual communication artifacts when connected.', authority: 'execution' },
  { id: 'supabase', label: 'Supabase', purpose: 'Own approved database, authentication, and server-side data operations.', authority: 'execution' },
  { id: 'cloudflare', label: 'Cloudflare', purpose: 'Own approved preview and deployment operations.', authority: 'execution' },
  { id: 'github', label: 'GitHub', purpose: 'Remain repository memory, review surface, and exact-head evidence source.', authority: 'evidence' },
  { id: 'playwright', label: 'Playwright', purpose: 'Provide browser behavior evidence, screenshots, traces, and guardrail proof.', authority: 'evidence' },
  { id: 'gmail', label: 'Gmail', purpose: 'Carry founder-approved external communication and reports.', authority: 'execution' },
  { id: 'local-agent', label: 'Local Agent', purpose: 'Run only allowlisted local verification and recovery missions.', authority: 'execution' },
];

const PRIVATE_INPUT_KEYS = [
  'teen transcript',
  'parent transcript',
  'private message',
  'journal entry',
  'raw teen content',
  'raw parent content',
];

function normalized(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function slug(value: string): string {
  const result = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 42);
  return result || 'founder-mission';
}

function hasAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function artifact(
  id: string,
  title: string,
  kind: FounderOperatorArtifactKind,
  ownerLane: FounderOperatorLaneId,
  supportLanes: FounderOperatorLaneId[],
  pathHint: string,
  evidenceRequired: string[],
  approvalGate?: string,
): FounderOperatorArtifact {
  return {
    id,
    title,
    kind,
    ownerLane,
    supportLanes,
    pathHint,
    evidenceRequired,
    approvalGate,
    status: 'planned',
  };
}

export function buildFounderOperatorPlan(input: {
  mission: string;
  constraints?: string;
  createdAt?: string;
}): FounderOperatorPlan {
  const mission = normalized(input.mission, 2_000);
  const constraints = normalized(input.constraints || '', 2_000);
  if (mission.length < 8) throw new Error('mission_too_short');

  const lower = `${mission} ${constraints}`.toLowerCase();
  if (PRIVATE_INPUT_KEYS.some((key) => lower.includes(key))) throw new Error('private_content_not_allowed');

  const createdAt = input.createdAt || new Date().toISOString();
  const planId = `${createdAt.replace(/[-:.TZ]/g, '').slice(0, 17)}-${slug(mission)}`;
  const artifacts: FounderOperatorArtifact[] = [
    artifact(
      'mission-brief',
      'Founder mission brief',
      'mission-brief',
      'chatgpt',
      ['founder', 'github'],
      `reports/control-room/founder-operator/${planId}/mission-brief.md`,
      ['5W1H scope', 'preserved constraints', 'explicit exclusions', 'decision owner'],
    ),
    artifact(
      'system-map',
      'System and dependency map',
      'architecture',
      'claude',
      ['chatgpt', 'codex', 'deepseek'],
      `reports/control-room/founder-operator/${planId}/system-map.md`,
      ['authoritative repositories and services', 'dependency order', 'privacy and release boundaries'],
    ),
    artifact(
      'red-team-register',
      'Red-team risk register',
      'decision',
      'deepseek',
      ['claude', 'chatgpt', 'founder'],
      `reports/control-room/founder-operator/${planId}/red-team-register.md`,
      ['failure modes', 'abuse and privacy risks', 'rollback triggers', 'non-claims'],
    ),
    artifact(
      'artifact-ledger',
      'Bill Gates artifact ledger',
      'ledger',
      'chatgpt',
      ['codex', 'github', 'founder'],
      `reports/control-room/founder-operator/${planId}/artifact-ledger.json`,
      ['one owner per artifact', 'acceptance criteria', 'evidence path', 'status and approval gate'],
    ),
    artifact(
      'bottleneck-map',
      'First-principles bottleneck map',
      'decision',
      'chatgpt',
      ['codex', 'claude', 'founder'],
      `reports/control-room/founder-operator/${planId}/bottleneck-map.md`,
      ['highest-leverage constraint', 'smallest reversible slice', 'next executable action'],
    ),
    artifact(
      'verification-report',
      'Verification and evidence report',
      'verification',
      'playwright',
      ['local-agent', 'codex', 'github'],
      `reports/control-room/founder-operator/${planId}/verification-report.json`,
      ['executed checks', 'exact head when available', 'browser proof or explicit fallback', 'remaining blocker'],
    ),
    artifact(
      'founder-decision-pack',
      'Founder decision and release pack',
      'release',
      'founder',
      ['chatgpt', 'github', 'playwright'],
      `reports/control-room/founder-operator/${planId}/founder-decision-pack.md`,
      ['completed phase summaries', 'open risks', 'approval checklist', 'rollback plan'],
      'Founder approval is required before merge, deployment, migration, spending, publishing, or other external mutation.',
    ),
  ];

  const wantsCode = hasAny(lower, ['code', 'github', 'repo', 'repository', 'bug', 'feature', 'app', 'worker', 'api']);
  const wantsDesign = hasAny(lower, ['design', 'figma', 'canva', 'screen', 'ui', 'ux', 'visual']);
  const wantsData = hasAny(lower, ['supabase', 'database', 'schema', 'migration', 'rls', 'auth']);
  const wantsRelease = hasAny(lower, ['deploy', 'release', 'cloudflare', 'production', 'ship', 'launch']);
  const wantsCommunication = hasAny(lower, ['gmail', 'email', 'outreach', 'social', 'publish', 'post', 'city hall']);

  if (wantsCode) {
    artifacts.splice(-2, 0, artifact(
      'repository-change-set',
      'Repository change set and PR evidence',
      'code',
      'codex',
      ['github', 'chatgpt', 'playwright'],
      `reports/control-room/founder-operator/${planId}/repository-change-set.md`,
      ['current-base branch', 'narrow diff', 'review findings addressed', 'test evidence'],
      'Founder approval is required before merging or closing a pull request.',
    ));
  }

  if (wantsDesign) {
    artifacts.splice(-2, 0, artifact(
      'design-handoff',
      'Design system and implementation handoff',
      'design',
      'figma',
      ['canva', 'codex', 'playwright'],
      `reports/control-room/founder-operator/${planId}/design-handoff.md`,
      ['editable source', 'component and route mapping', 'accessibility notes', 'implementation comparison'],
      'Founder approval is required before publishing a design library or externally sharing the artifact.',
    ));
  }

  if (wantsData) {
    artifacts.splice(-2, 0, artifact(
      'data-change-contract',
      'Database and authorization change contract',
      'data',
      'supabase',
      ['codex', 'deepseek', 'founder'],
      `reports/control-room/founder-operator/${planId}/data-change-contract.md`,
      ['migration and rollback', 'RLS and grants', 'controlled probes', 'advisor evidence'],
      'Founder approval is required before applying or rolling back any migration or data mutation.',
    ));
  }

  if (wantsRelease) {
    artifacts.splice(-2, 0, artifact(
      'release-candidate',
      'Exact-head release candidate record',
      'release',
      'cloudflare',
      ['github', 'playwright', 'codex'],
      `reports/control-room/founder-operator/${planId}/release-candidate.md`,
      ['exact head', 'executed checks', 'preview result', 'production observation and rollback'],
      'Founder approval is required before deployment or production routing changes.',
    ));
  }

  if (wantsCommunication) {
    artifacts.splice(-2, 0, artifact(
      'external-communication-draft',
      'Founder-approved communication draft',
      'communication',
      'gmail',
      ['chatgpt', 'founder'],
      `reports/control-room/founder-operator/${planId}/external-communication-draft.md`,
      ['recipient and purpose', 'evidence-backed claims', 'privacy review', 'founder approval state'],
      'Founder approval is required before sending, scheduling, posting, or creating an external account.',
    ));
  }

  const executeArtifactIds = artifacts
    .filter((item) => ['code', 'design', 'data', 'communication'].includes(item.kind))
    .map((item) => item.id);

  const phases: FounderOperatorPhase[] = [
    {
      id: 'observe',
      title: 'Observe and lock the mission',
      objective: 'Establish repository, runtime, evidence, owner, and constraints before activity begins.',
      operatingQuestion: 'What is true right now, and what must not be lost?',
      ownerLane: 'chatgpt',
      supportLanes: ['founder', 'github', 'local-agent'],
      artifactIds: ['mission-brief'],
      safeMissionId: 'continue-yesterday',
      exitGate: 'The mission, owner, evidence baseline, exclusions, and current repository state are explicit.',
      status: 'planned',
    },
    {
      id: 'orient',
      title: 'ULTRATHINK system orientation',
      objective: 'Map dependencies, red-team the plan, and identify the highest-leverage bottleneck.',
      operatingQuestion: 'Which hidden dependency or failure mode can invalidate the obvious answer?',
      ownerLane: 'claude',
      supportLanes: ['chatgpt', 'deepseek', 'codex'],
      artifactIds: ['system-map', 'red-team-register', 'bottleneck-map'],
      exitGate: 'Risks, sequencing, rollback, and the smallest reversible slice are reviewed.',
      status: 'planned',
    },
    {
      id: 'artifact-plan',
      title: 'Bill Gates artifact plan',
      objective: 'Turn the mission into durable contracts, owners, evidence paths, and compounding reusable assets.',
      operatingQuestion: 'What artifacts make this system understandable and maintainable ten years later?',
      ownerLane: 'chatgpt',
      supportLanes: ['founder', 'codex', 'github'],
      artifactIds: ['artifact-ledger'],
      exitGate: 'Every artifact has one owner, acceptance criteria, proof, rollback, and an approval boundary.',
      status: 'planned',
    },
    {
      id: 'execute',
      title: 'Elon Musk execution slice',
      objective: 'Remove the highest-leverage bottleneck with the smallest safe, reviewable implementation.',
      operatingQuestion: 'What can be built and verified now without borrowing authority from the founder?',
      ownerLane: 'codex',
      supportLanes: ['chatgpt', 'github', 'local-agent'],
      artifactIds: executeArtifactIds,
      exitGate: executeArtifactIds.length
        ? 'The narrow implementation exists, remains reversible, and has not crossed a human-only gate.'
        : 'The mission is intentionally planning-only; no unsupported implementation is claimed.',
      status: 'planned',
    },
    {
      id: 'verify',
      title: 'Truth-mode verification',
      objective: 'Execute local and browser evidence, separate infrastructure outages from code defects, and retain artifacts.',
      operatingQuestion: 'What actually ran, on which exact state, and what remains unproven?',
      ownerLane: 'playwright',
      supportLanes: ['local-agent', 'codex', 'github'],
      artifactIds: ['verification-report'],
      safeMissionId: wantsDesign || wantsCode ? 'verify-frontend' : 'verify-local',
      exitGate: 'Executed evidence is retained and every fallback or outage is truth-labeled.',
      status: 'planned',
    },
    {
      id: 'decide',
      title: 'Founder decision gate',
      objective: 'Summarize completed phases, remaining risks, approvals, rollback, and next action.',
      operatingQuestion: 'Does the evidence justify the next irreversible action?',
      ownerLane: 'founder',
      supportLanes: ['chatgpt', 'github', 'playwright'],
      artifactIds: ['founder-decision-pack', ...(wantsRelease ? ['release-candidate'] : [])],
      exitGate: 'The founder explicitly approves, rejects, narrows, or defers each human-only action.',
      status: 'human-required',
    },
  ];

  return {
    schemaVersion: 1,
    id: planId,
    createdAt,
    mission,
    constraints,
    modes: [...FOUNDER_OPERATOR_MODES],
    lanes: FOUNDER_OPERATOR_LANES,
    phases,
    artifacts,
    approvalGates: [...FOUNDER_OPERATOR_APPROVAL_GATES],
    nonClaims: [
      'A generated plan is not implementation evidence.',
      'A connector or provider lane is not a deployed adapter.',
      'A local green check is not GitHub Actions or production proof.',
      'A preview deployment is not production observation.',
      'No plan may silently merge, deploy, spend, publish, create accounts, use secrets, apply migrations, or delete data.',
    ],
    evidenceLevel: 'plan-only',
  };
}

export function nextFounderArtifactStatus(artifact: FounderOperatorArtifact): FounderOperatorArtifactStatus {
  if (artifact.status === 'planned') return 'building';
  if (artifact.status === 'building') return 'verification-required';
  if (artifact.status === 'verification-required') return artifact.approvalGate ? 'human-required' : 'verified';
  return artifact.status;
}

export function updateFounderArtifactStatus(
  plan: FounderOperatorPlan,
  artifactId: string,
  status: FounderOperatorArtifactStatus,
): FounderOperatorPlan {
  const artifacts = plan.artifacts.map((item) => item.id === artifactId ? { ...item, status } : item);
  const phases = plan.phases.map((phase) => {
    const phaseArtifacts = artifacts.filter((item) => phase.artifactIds.includes(item.id));
    if (phase.status === 'human-required') return phase;
    if (phaseArtifacts.length === 0) return { ...phase, status: 'verified' as const };
    if (phaseArtifacts.some((item) => item.status === 'human-required')) return { ...phase, status: 'human-required' as const };
    if (phaseArtifacts.every((item) => item.status === 'verified')) return { ...phase, status: 'verified' as const };
    if (phaseArtifacts.some((item) => item.status !== 'planned')) return { ...phase, status: 'active' as const };
    return { ...phase, status: 'planned' as const };
  });
  const evidenceLevel = artifacts.some((item) => item.kind === 'verification' && item.status === 'verified')
    ? 'local-evidence'
    : plan.evidenceLevel;
  return { ...plan, artifacts, phases, evidenceLevel };
}

export function getFounderOperatorProgress(plan: FounderOperatorPlan): FounderOperatorProgress {
  const verifiedCount = plan.artifacts.filter((item) => item.status === 'verified').length;
  const humanRequiredCount = plan.artifacts.filter((item) => item.status === 'human-required').length;
  const currentPhase = plan.phases.find((phase) => phase.status !== 'verified') || null;
  return {
    artifactCount: plan.artifacts.length,
    verifiedCount,
    humanRequiredCount,
    percent: plan.artifacts.length ? Math.round((verifiedCount / plan.artifacts.length) * 100) : 0,
    currentPhase,
  };
}

export function validateFounderOperatorPlan(plan: FounderOperatorPlan): string[] {
  const errors: string[] = [];
  if (plan.schemaVersion !== 1) errors.push('schemaVersion');
  if (!plan.id || !/^[a-z0-9-]+$/.test(plan.id)) errors.push('id');
  if (plan.mission.length < 8 || plan.mission.length > 2_000) errors.push('mission');
  if (plan.modes.join('|') !== FOUNDER_OPERATOR_MODES.join('|')) errors.push('modes');
  if (!plan.phases.length || !plan.artifacts.length) errors.push('plan-empty');
  const artifactIds = new Set(plan.artifacts.map((item) => item.id));
  if (artifactIds.size !== plan.artifacts.length) errors.push('duplicate-artifact-id');
  for (const phase of plan.phases) {
    if (phase.artifactIds.some((id) => !artifactIds.has(id))) errors.push(`phase-artifact:${phase.id}`);
    if (phase.safeMissionId && !['continue-yesterday', 'verify-local', 'verify-frontend', 'recover-system'].includes(phase.safeMissionId)) {
      errors.push(`unsafe-mission:${phase.id}`);
    }
  }
  if (plan.approvalGates.length !== FOUNDER_OPERATOR_APPROVAL_GATES.length) errors.push('approval-gates');
  return errors;
}
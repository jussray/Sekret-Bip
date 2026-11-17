import type { FounderOperatorPlan } from '@/types/controlRoomFounderOperator';

export type LocalAgentStatus = 'checking' | 'online' | 'offline';

export type LocalMissionRun = {
  missionId: string;
  status: 'passed' | 'failed' | 'timed_out';
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal?: string | null;
  stdout: string;
  stderr: string;
  error?: string;
};

export type LocalAgentHealth = {
  ok: true;
  mode: 'loopback-only';
  activeMission: string | null;
  allowedMissions: string[];
  latestRun: LocalMissionRun | null;
};

export type FounderOperatorPersistence = {
  ok: true;
  planId: string;
  reportPath: string;
  latestPath: string;
  evidenceLevel: 'plan-only' | 'local-evidence';
  localMissionEvidence: Pick<LocalMissionRun, 'missionId' | 'status' | 'startedAt' | 'finishedAt' | 'durationMs' | 'exitCode'> | null;
};

const baseUrl = (process.env.EXPO_PUBLIC_CONTROL_ROOM_LOCAL_AGENT_URL || 'http://127.0.0.1:4317').replace(/\/$/, '');
const token = process.env.EXPO_PUBLIC_CONTROL_ROOM_LOCAL_TOKEN || '';

function canUseLocalAgent(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ && token.length >= 32;
}

async function request<T>(path: string, init?: RequestInit, timeoutMs = 12_000, acceptMissionFailure = false): Promise<T> {
  if (!canUseLocalAgent()) throw new Error('local_agent_not_started');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        ...init?.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    const body = await response.json() as T & { error?: string };
    if (!response.ok && !acceptMissionFailure) throw new Error(body.error || `local_agent_http_${response.status}`);
    return body;
  } finally {
    clearTimeout(timer);
  }
}

export async function getLocalControlRoomAgentHealth(): Promise<LocalAgentHealth> {
  return request<LocalAgentHealth>('/health');
}

export async function runLocalControlRoomMission(missionId: string): Promise<LocalMissionRun> {
  if (!/^[a-z0-9-]+$/.test(missionId)) throw new Error('invalid_mission_id');
  const run = await request<LocalMissionRun & { error?: string }>(
    `/missions/${encodeURIComponent(missionId)}`,
    { method: 'POST', body: '{}' },
    11 * 60 * 1000,
    true,
  );
  if (!run.missionId || !['passed', 'failed', 'timed_out'].includes(run.status)) throw new Error(run.error || 'invalid_local_agent_response');
  return run;
}

export async function persistFounderOperatorPlan(plan: FounderOperatorPlan): Promise<FounderOperatorPersistence> {
  if (plan.schemaVersion !== 1 || !/^[a-z0-9-]+$/.test(plan.id)) throw new Error('invalid_founder_operator_plan');
  if (!['plan-only', 'local-evidence'].includes(plan.evidenceLevel)) throw new Error('unsupported_founder_operator_evidence_level');
  return request<FounderOperatorPersistence>(
    '/founder-operator/plans',
    { method: 'POST', body: JSON.stringify(plan) },
    15_000,
  );
}
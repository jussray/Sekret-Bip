#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const host = '127.0.0.1';
const port = Number(process.env.CONTROL_ROOM_LOCAL_PORT || 4317);
const token = String(process.env.CONTROL_ROOM_LOCAL_TOKEN || '');
const timeoutMs = Number(process.env.CONTROL_ROOM_MISSION_TIMEOUT_MS || 10 * 60 * 1000);
const terminationGraceMs = Number(process.env.CONTROL_ROOM_TERMINATION_GRACE_MS || 3_000);
const allowedMissions = new Set(['continue-yesterday', 'verify-local', 'verify-frontend', 'recover-system']);
const founderOperatorReportDir = path.join(root, 'reports', 'control-room', 'founder-operator');
const founderOperatorModes = ['ultrathink', 'billgates-artifacts', 'elonmusk-execution'];
const founderOperatorLaneIds = new Set(['founder', 'codex', 'chatgpt', 'claude', 'deepseek', 'figma', 'canva', 'supabase', 'cloudflare', 'github', 'playwright', 'gmail', 'local-agent']);
const founderOperatorArtifactKinds = new Set(['mission-brief', 'decision', 'architecture', 'code', 'design', 'data', 'verification', 'release', 'communication', 'ledger']);
const founderOperatorArtifactStatuses = new Set(['planned', 'building', 'verification-required', 'human-required', 'verified']);
const founderOperatorPhaseStatuses = new Set(['planned', 'active', 'blocked', 'human-required', 'verified']);
const planKeys = new Set(['schemaVersion', 'id', 'createdAt', 'mission', 'constraints', 'modes', 'lanes', 'phases', 'artifacts', 'approvalGates', 'nonClaims', 'evidenceLevel']);
const laneKeys = new Set(['id', 'label', 'purpose', 'authority']);
const artifactKeys = new Set(['id', 'title', 'kind', 'ownerLane', 'supportLanes', 'pathHint', 'evidenceRequired', 'approvalGate', 'status', 'approvalRecordedAt']);
const phaseKeys = new Set(['id', 'title', 'objective', 'operatingQuestion', 'ownerLane', 'supportLanes', 'artifactIds', 'safeMissionId', 'exitGate', 'status']);
const blockedPlanKeys = new Set(['transcript', 'journalentry', 'privatemessage', 'rawteencontent', 'rawparentcontent', 'password', 'passphrase', 'token', 'accesstoken', 'refreshtoken', 'idtoken', 'apikey', 'secret', 'clientsecret', 'servicerole', 'authorization', 'cookie', 'session', 'otp', 'onetimecode', 'verificationcode']);
let activeMission = null;
let activeChild = null;
let latestRun = null;

if (token.length < 32) throw new Error('CONTROL_ROOM_LOCAL_TOKEN must be an ephemeral token of at least 32 characters.');
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('CONTROL_ROOM_LOCAL_PORT must be a valid non-privileged port.');
if (!Number.isInteger(timeoutMs) || timeoutMs < 100) throw new Error('CONTROL_ROOM_MISSION_TIMEOUT_MS must be at least 100 milliseconds.');
if (!Number.isInteger(terminationGraceMs) || terminationGraceMs < 100 || terminationGraceMs > 60_000) {
  throw new Error('CONTROL_ROOM_TERMINATION_GRACE_MS must be between 100 and 60000 milliseconds.');
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(header) {
  const value = String(header || '');
  const prefix = 'Bearer ';
  return value.startsWith(prefix) ? value.slice(prefix.length) : '';
}

function isLocalOrigin(origin) {
  if (!origin) return true;
  try {
    const value = new URL(origin);
    return value.protocol === 'http:' && (value.hostname === '127.0.0.1' || value.hostname === 'localhost');
  } catch {
    return false;
  }
}

function writeJson(res, status, body, origin = '') {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers.Vary = 'Origin';
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function authorize(req) {
  return safeEqual(bearerToken(req.headers.authorization), token);
}

function appendTail(current, chunk) {
  return (current + chunk.toString('utf8')).slice(-64_000);
}

function terminateProcessTree(child, signal) {
  if (!child?.pid) return false;
  if (process.platform === 'win32') {
    const args = ['/PID', String(child.pid), '/T'];
    if (signal === 'SIGKILL') args.push('/F');
    return spawnSync('taskkill', args, { stdio: 'ignore', windowsHide: true }).status === 0;
  }
  try {
    process.kill(-child.pid, signal);
    return true;
  } catch (error) {
    if (error?.code === 'ESRCH') return true;
    try {
      return child.kill(signal);
    } catch {
      return false;
    }
  }
}

function processTreeAlive(pid) {
  if (!pid) return false;
  if (process.platform === 'win32') return Boolean(activeChild && activeChild.exitCode == null);
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

function executeMission(missionId, res, origin) {
  if (!allowedMissions.has(missionId)) return writeJson(res, 403, { error: 'mission_not_allowed', missionId }, origin);
  if (activeMission) return writeJson(res, 409, { error: 'mission_already_running', missionId: activeMission }, origin);

  activeMission = missionId;
  const startedAt = Date.now();
  const child = spawn(process.execPath, ['scripts/control-room-agent.mjs', missionId], {
    cwd: root,
    env: { ...process.env, CI: process.env.CI || 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
  });
  activeChild = child;
  const processGroupId = child.pid;
  let stdout = '';
  let stderr = '';
  let settled = false;
  let timedOut = false;
  let closePayload = { exitCode: null, signal: null };
  let timeoutTimer = null;
  let forceKillTimer = null;
  let treePollTimer = null;

  child.stdout.on('data', chunk => { stdout = appendTail(stdout, chunk); });
  child.stderr.on('data', chunk => { stderr = appendTail(stderr, chunk); });

  const finish = (status, payload) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutTimer);
    clearTimeout(forceKillTimer);
    clearTimeout(treePollTimer);
    activeMission = null;
    activeChild = null;
    latestRun = {
      missionId,
      status,
      startedAt: new Date(startedAt).toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      stdout,
      stderr,
      ...payload,
    };
    if (!res.writableEnded) writeJson(res, status === 'passed' ? 200 : 500, latestRun, origin);
  };

  const finishWhenTreeStops = () => {
    if (settled) return;
    if (!processTreeAlive(processGroupId)) {
      finish('timed_out', { ...closePayload, error: 'mission_timeout', termination: 'process_tree' });
      return;
    }
    treePollTimer = setTimeout(finishWhenTreeStops, 40);
  };

  timeoutTimer = setTimeout(() => {
    timedOut = true;
    stderr = appendTail(stderr, `\nMission exceeded ${timeoutMs}ms; terminating the full process tree.\n`);
    terminateProcessTree(child, 'SIGTERM');
    finishWhenTreeStops();
    forceKillTimer = setTimeout(() => {
      if (settled || !processTreeAlive(processGroupId)) return;
      stderr = appendTail(stderr, `\nMission process tree did not exit within ${terminationGraceMs}ms; escalating to forced termination.\n`);
      terminateProcessTree(child, 'SIGKILL');
    }, terminationGraceMs);
  }, timeoutMs);

  child.on('error', error => {
    if (!timedOut) finish('failed', { exitCode: null, signal: null, error: error.message });
    else closePayload = { exitCode: null, signal: null };
  });
  child.on('close', (code, signal) => {
    closePayload = { exitCode: code, signal };
    if (!timedOut) finish(code === 0 ? 'passed' : 'failed', closePayload);
    else finishWhenTreeStops();
  });
}

function readJsonBody(req, maxBytes = 96_000) {
  return new Promise((resolve, reject) => {
    let body = '';
    let settled = false;
    const fail = error => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    req.setEncoding('utf8');
    req.on('data', chunk => {
      if (settled) return;
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > maxBytes) fail(new Error('request_body_too_large'));
    });
    req.on('end', () => {
      if (settled) return;
      try {
        settled = true;
        resolve(JSON.parse(body || '{}'));
      } catch {
        fail(new Error('invalid_json'));
      }
    });
    req.on('error', fail);
  });
}

function isPlainRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function requireExactKeys(value, allowed, code) {
  if (!isPlainRecord(value) || Object.keys(value).some(key => !allowed.has(key))) throw new Error(code);
}

function requireString(value, min, max, code) {
  if (typeof value !== 'string' || value.length < min || value.length > max) throw new Error(code);
}

function requireStringArray(value, min, max, itemMax, code) {
  if (!Array.isArray(value) || value.length < min || value.length > max) throw new Error(code);
  for (const item of value) requireString(item, 1, itemMax, code);
}

function containsBlockedPlanKey(value) {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(containsBlockedPlanKey);
  return Object.entries(value).some(([key, nested]) => {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    return blockedPlanKeys.has(normalized) || containsBlockedPlanKey(nested);
  });
}

function containsCredentialShapedContent(value) {
  const serialized = JSON.stringify(value);
  return serialized.includes('ghp_')
    || serialized.includes('github_pat_')
    || serialized.includes('SUPABASE_SERVICE_ROLE_KEY')
    || serialized.includes('AKIA')
    || /\bsk-[A-Za-z0-9_-]{16,}/.test(serialized)
    || /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/.test(serialized)
    || /xox[baprs]-[A-Za-z0-9-]{10,}/i.test(serialized);
}

function certifiedLocalRunFor(plan) {
  if (plan.evidenceLevel !== 'local-evidence') return null;
  if (!latestRun || latestRun.status !== 'passed') throw new Error('unexecuted_local_evidence');
  if (!['verify-local', 'verify-frontend'].includes(latestRun.missionId)) throw new Error('unexecuted_local_evidence');
  if (Date.parse(latestRun.finishedAt) < Date.parse(plan.createdAt)) throw new Error('stale_local_evidence');
  const verificationArtifact = plan.artifacts.find(item => item.kind === 'verification');
  if (!verificationArtifact || verificationArtifact.status !== 'verified') throw new Error('verification_artifact_not_verified');
  return {
    missionId: latestRun.missionId,
    status: latestRun.status,
    startedAt: latestRun.startedAt,
    finishedAt: latestRun.finishedAt,
    durationMs: latestRun.durationMs,
    exitCode: latestRun.exitCode,
  };
}

function validateFounderOperatorPlan(plan) {
  requireExactKeys(plan, planKeys, 'invalid_plan_schema');
  if (plan.schemaVersion !== 1) throw new Error('invalid_plan_schema');
  if (typeof plan.id !== 'string' || !/^[a-z0-9-]{8,120}$/.test(plan.id)) throw new Error('invalid_plan_id');
  requireString(plan.createdAt, 20, 40, 'invalid_plan_created_at');
  if (Number.isNaN(Date.parse(plan.createdAt))) throw new Error('invalid_plan_created_at');
  requireString(plan.mission, 8, 2_000, 'invalid_plan_mission');
  requireString(plan.constraints, 0, 2_000, 'invalid_plan_constraints');
  if (!Array.isArray(plan.modes) || plan.modes.length !== founderOperatorModes.length || plan.modes.some((mode, index) => mode !== founderOperatorModes[index])) throw new Error('invalid_plan_modes');
  if (!['plan-only', 'local-evidence'].includes(plan.evidenceLevel)) throw new Error('unsupported_evidence_level');
  if (containsBlockedPlanKey(plan)) throw new Error('private_or_secret_plan_field');
  if (containsCredentialShapedContent(plan)) throw new Error('credential_shaped_content_rejected');

  if (!Array.isArray(plan.lanes) || plan.lanes.length < 1 || plan.lanes.length > founderOperatorLaneIds.size) throw new Error('invalid_plan_lanes');
  const declaredLanes = new Set();
  for (const lane of plan.lanes) {
    requireExactKeys(lane, laneKeys, 'invalid_plan_lane');
    if (!founderOperatorLaneIds.has(lane.id) || declaredLanes.has(lane.id)) throw new Error('invalid_plan_lane');
    requireString(lane.label, 1, 80, 'invalid_plan_lane');
    requireString(lane.purpose, 8, 500, 'invalid_plan_lane');
    if (!['decision', 'execution', 'advisory', 'evidence'].includes(lane.authority)) throw new Error('invalid_plan_lane');
    declaredLanes.add(lane.id);
  }

  if (!Array.isArray(plan.artifacts) || plan.artifacts.length < 4 || plan.artifacts.length > 40) throw new Error('invalid_plan_artifacts');
  const artifactIds = new Set();
  const requiredPathPrefix = `reports/control-room/founder-operator/${plan.id}/`;
  for (const artifact of plan.artifacts) {
    requireExactKeys(artifact, artifactKeys, 'invalid_plan_artifact');
    if (typeof artifact.id !== 'string' || !/^[a-z0-9-]{2,80}$/.test(artifact.id) || artifactIds.has(artifact.id)) throw new Error('invalid_plan_artifact');
    artifactIds.add(artifact.id);
    requireString(artifact.title, 2, 160, 'invalid_plan_artifact');
    if (!founderOperatorArtifactKinds.has(artifact.kind)) throw new Error('invalid_plan_artifact');
    if (!declaredLanes.has(artifact.ownerLane)) throw new Error('invalid_plan_artifact_lane');
    requireStringArray(artifact.supportLanes, 0, 12, 40, 'invalid_plan_artifact_lane');
    if (artifact.supportLanes.some(id => !declaredLanes.has(id))) throw new Error('invalid_plan_artifact_lane');
    requireString(artifact.pathHint, requiredPathPrefix.length + 1, 300, 'invalid_plan_artifact_path');
    if (!artifact.pathHint.startsWith(requiredPathPrefix) || artifact.pathHint.includes('..') || artifact.pathHint.includes('\\')) throw new Error('invalid_plan_artifact_path');
    requireStringArray(artifact.evidenceRequired, 1, 12, 240, 'invalid_plan_artifact_evidence');
    if (artifact.approvalGate !== undefined) requireString(artifact.approvalGate, 8, 500, 'invalid_plan_approval_gate');
    if (!founderOperatorArtifactStatuses.has(artifact.status)) throw new Error('invalid_plan_artifact_status');
    if (artifact.approvalGate && artifact.status === 'verified') {
      if (artifact.approvalRecordedAt) throw new Error('external_action_evidence_required');
      throw new Error('approval_gated_artifact_cannot_be_verified');
    }
    if (artifact.approvalRecordedAt !== undefined) {
      if (!artifact.approvalGate || artifact.status !== 'human-required' || Number.isNaN(Date.parse(artifact.approvalRecordedAt))) throw new Error('invalid_plan_approval_record');
    }
  }

  if (plan.evidenceLevel === 'plan-only' && plan.artifacts.some(artifact => artifact.status === 'verified')) {
    throw new Error('unverified_evidence_level');
  }

  if (!Array.isArray(plan.phases) || plan.phases.length < 4 || plan.phases.length > 12) throw new Error('invalid_plan_phases');
  const phaseIds = new Set();
  for (const phase of plan.phases) {
    requireExactKeys(phase, phaseKeys, 'invalid_plan_phase');
    if (typeof phase.id !== 'string' || !/^[a-z0-9-]{2,80}$/.test(phase.id) || phaseIds.has(phase.id)) throw new Error('invalid_plan_phase');
    phaseIds.add(phase.id);
    requireString(phase.title, 2, 160, 'invalid_plan_phase');
    requireString(phase.objective, 8, 700, 'invalid_plan_phase');
    requireString(phase.operatingQuestion, 8, 500, 'invalid_plan_phase');
    if (!declaredLanes.has(phase.ownerLane)) throw new Error('invalid_plan_phase_lane');
    requireStringArray(phase.supportLanes, 0, 12, 40, 'invalid_plan_phase_lane');
    if (phase.supportLanes.some(id => !declaredLanes.has(id))) throw new Error('invalid_plan_phase_lane');
    requireStringArray(phase.artifactIds, 0, 40, 80, 'invalid_plan_phase_artifacts');
    if (phase.artifactIds.some(id => !artifactIds.has(id))) throw new Error('invalid_plan_phase_artifacts');
    if (phase.safeMissionId !== undefined && !allowedMissions.has(phase.safeMissionId)) throw new Error('unsafe_plan_mission');
    requireString(phase.exitGate, 8, 700, 'invalid_plan_phase');
    if (!founderOperatorPhaseStatuses.has(phase.status)) throw new Error('invalid_plan_phase_status');
  }
  requireStringArray(plan.approvalGates, 1, 20, 500, 'invalid_plan_approval_gates');
  requireStringArray(plan.nonClaims, 1, 20, 500, 'invalid_plan_non_claims');
  return certifiedLocalRunFor(plan);
}

function ensureSafeFounderOperatorReportDir() {
  let current = root;
  for (const segment of ['reports', 'control-room', 'founder-operator']) {
    current = path.join(current, segment);
    if (!fs.existsSync(current)) fs.mkdirSync(current);
    const stats = fs.lstatSync(current);
    if (stats.isSymbolicLink() || !stats.isDirectory()) throw new Error('unsafe_report_directory');
  }
  if (path.resolve(current) !== path.resolve(founderOperatorReportDir)) throw new Error('unsafe_report_directory');
  return current;
}

function requireRegularFileOrMissing(filePath, code) {
  if (!fs.existsSync(filePath)) return;
  const stats = fs.lstatSync(filePath);
  if (stats.isSymbolicLink() || !stats.isFile()) throw new Error(code);
}

function persistFounderOperatorPlan(plan) {
  const localMissionEvidence = validateFounderOperatorPlan(plan);
  const reportDir = ensureSafeFounderOperatorReportDir();
  const latestPath = path.join(reportDir, 'latest.json');
  requireRegularFileOrMissing(latestPath, 'unsafe_latest_report_target');

  const record = {
    schemaVersion: 1,
    persistedAt: new Date().toISOString(),
    plan,
    localMissionEvidence,
  };
  const content = `${JSON.stringify(record, null, 2)}\n`;
  let reportPath = null;
  for (let version = 1; version <= 10_000; version += 1) {
    const candidate = path.join(reportDir, version === 1 ? `${plan.id}.json` : `${plan.id}-v${version}.json`);
    try {
      fs.writeFileSync(candidate, content, { flag: 'wx' });
      reportPath = candidate;
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      requireRegularFileOrMissing(candidate, 'unsafe_versioned_report_target');
    }
  }
  if (!reportPath) throw new Error('report_version_limit_reached');

  const latestTempPath = path.join(reportDir, `.latest-${process.pid}-${Date.now()}.tmp`);
  try {
    fs.writeFileSync(latestTempPath, content, { flag: 'wx' });
    fs.renameSync(latestTempPath, latestPath);
  } finally {
    if (fs.existsSync(latestTempPath)) fs.unlinkSync(latestTempPath);
  }

  return {
    ok: true,
    planId: plan.id,
    reportPath: path.relative(root, reportPath),
    latestPath: path.relative(root, latestPath),
    evidenceLevel: plan.evidenceLevel,
    localMissionEvidence,
  };
}

const server = createServer(async (req, res) => {
  const origin = String(req.headers.origin || '');
  if (!isLocalOrigin(origin)) return writeJson(res, 403, { error: 'origin_not_allowed' });

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Max-Age': '300',
      Vary: 'Origin',
    });
    return res.end();
  }

  if (!authorize(req)) return writeJson(res, 401, { error: 'unauthorized' }, origin);
  const url = new URL(req.url || '/', `http://${host}:${port}`);

  if (req.method === 'GET' && url.pathname === '/health') {
    return writeJson(res, 200, {
      ok: true,
      mode: 'loopback-only',
      activeMission,
      allowedMissions: [...allowedMissions],
      latestRun,
    }, origin);
  }
  if (req.method === 'GET' && url.pathname === '/runs/latest') return writeJson(res, 200, { latestRun }, origin);
  if (req.method === 'POST' && url.pathname === '/founder-operator/plans') {
    try {
      const plan = await readJsonBody(req);
      return writeJson(res, 201, persistFounderOperatorPlan(plan), origin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'founder_operator_plan_rejected';
      const status = message === 'request_body_too_large' ? 413 : 400;
      return writeJson(res, status, { error: message }, origin);
    }
  }

  const match = /^\/missions\/([a-z0-9-]+)$/.exec(url.pathname);
  if (req.method === 'POST' && match) return executeMission(match[1], res, origin);
  return writeJson(res, 404, { error: 'not_found' }, origin);
});

server.listen(port, host, () => {
  console.log(`Control Room local agent ready at http://${host}:${port}`);
  console.log('Loopback-only. Only fixed missions and fixed-path Founder Operator evidence persistence are available.');
});

function shutdown() {
  if (activeChild) terminateProcessTree(activeChild, 'SIGTERM');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const screen = fs.readFileSync('src/screens/DevControlRoomScreen.tsx', 'utf8');
const panel = fs.readFileSync('src/features/control-room/FounderOperatorPanel.tsx', 'utf8');
const engine = fs.readFileSync('src/services/controlRoomFounderOperator.ts', 'utf8');
const client = fs.readFileSync('src/services/controlRoomLocalAgent.ts', 'utf8');
const server = fs.readFileSync('scripts/control-room-server.mjs', 'utf8');
const skill = fs.readFileSync('.agents/skills/bip-control-room/SKILL.md', 'utf8');
const docs = fs.readFileSync('docs/CONTROL_ROOM_FOUNDER_OPERATOR.md', 'utf8');


test('Founder Operator is a first-class founder-only Control Room surface', () => {
  assert.match(screen, /FounderOperatorPanel/);
  assert.match(screen, /'founder-operator'/);
  assert.match(screen, /useState<ControlRoomSurface>\('founder-operator'\)/);
  assert.match(screen, /getCurrentFounderProfile/);
  assert.match(screen, /isFounderProfile\(profile\)/);
  assert.match(screen, /Developer tools locked/);
  assert.match(panel, /FOUNDER CONTROL ROOM/);
  assert.match(panel, /Founder Operator/);
});


test('the planning engine binds ULTRATHINK, durable artifacts, and first-principles execution', () => {
  for (const mode of ['ultrathink', 'billgates-artifacts', 'elonmusk-execution']) {
    assert.match(engine, new RegExp(`'${mode}'`));
  }
  for (const artifactId of ['mission-brief', 'system-map', 'red-team-register', 'artifact-ledger', 'bottleneck-map', 'verification-report', 'founder-decision-pack']) {
    assert.match(engine, new RegExp(`'${artifactId}'`));
  }
  assert.match(engine, /ten years later/);
  assert.match(engine, /smallest reversible slice/);
});


test('human-only actions remain explicit approval gates', () => {
  for (const phrase of ['merge or close a pull request', 'deploy or change production routing', 'database migration', 'spend money', 'external communications', 'external account', 'credentials or secrets', 'delete, overwrite']) {
    assert.match(engine, new RegExp(phrase));
  }
  assert.match(panel, /Founder records approval/);
  assert.match(panel, /external action still pending/);
  assert.match(panel, /approvalRecordedAt/);
  assert.match(panel, /cannot silently merge/);
});


test('history and reports preserve evidence without exposing a delete path', () => {
  assert.match(engine, /control-room:founder-operator:plans:v1/);
  assert.match(panel, /History is append-only/);
  assert.doesNotMatch(panel, /AsyncStorage\.removeItem/);
  assert.doesNotMatch(panel, />Delete</);
  assert.match(server, /founderOperatorReportDir/);
  assert.match(server, /founder-operator\/plans/);
  assert.match(server, /for \(let version = 1; version <= 10_000; version \+= 1\)/);
  assert.match(server, /fs\.writeFileSync\(candidate, content, \{ flag: 'wx' \}\)/);
  assert.match(server, /-v\$\{version\}/);
  assert.match(server, /const reportDir = ensureSafeFounderOperatorReportDir\(\)/);
  assert.match(server, /const latestPath = path\.join\(reportDir, 'latest\.json'\)/);
  assert.match(server, /fs\.renameSync\(latestTempPath, latestPath\)/);
  assert.match(server, /isSymbolicLink\(\)/);
});


test('free-form founder input cannot become arbitrary shell or secret-bearing evidence', () => {
  assert.match(server, /blockedPlanKeys/);
  assert.match(server, /key\.toLowerCase\(\)\.replace/);
  assert.match(server, /credential_shaped_content_rejected/);
  assert.match(server, /external_action_evidence_required/);
  assert.match(server, /unverified_evidence_level/);
  assert.match(server, /invalid_plan_id/);
  assert.match(server, /request_body_too_large/);
  assert.match(client, /persistFounderOperatorPlan/);
  assert.match(client, /\/founder-operator\/plans/);
  assert.doesNotMatch(server, /spawn\([^\n]*plan/i);
  for (const mission of ['continue-yesterday', 'verify-local', 'verify-frontend', 'recover-system']) {
    assert.match(engine, new RegExp(`'${mission}'`));
  }
});


test('skill and docs preserve the provider and evidence truth boundaries', () => {
  assert.match(skill, /A provider lane in the plan is not proof/);
  assert.match(skill, /Free-form founder text must never become a shell command/);
  assert.match(docs, /A lane appearing in a plan does not prove/);
  assert.match(docs, /plan-only/);
  assert.match(docs, /local-evidence/);
  assert.match(docs, /exact-head/);
  assert.match(docs, /deployed-observation/);
});
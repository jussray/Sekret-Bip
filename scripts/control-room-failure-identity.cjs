const { createHash } = require('node:crypto');

const INCIDENT_CONTRACT = 'juss-v10/test-failure-incident@v1';
const PROOF_CONTRACT = 'juss-v10/test-failure-proof@v1';
const PROOF_COOKIE_PREFIX = 'juss/proof-cookie@v1:';

function sha256(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, stable(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(stable(value));
}

function slug(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

function canonicalFailureKey(value) {
  const raw = String(value || '').trim().toLowerCase();
  const normalized = slug(raw);

  if (
    normalized === 'unit-tests' ||
    normalized === 'unit-test' ||
    normalized === 'run-npm-test' ||
    /(^|-)unit(-|$)/.test(normalized) ||
    /complete-unit-suite/.test(normalized)
  ) return 'unit-tests';

  if (
    normalized === 'type-check' ||
    normalized === 'typecheck' ||
    normalized === 'typescript' ||
    normalized === 'run-npm-run-type-check' ||
    /type-?check/.test(normalized) ||
    /typescript.*zero-error/.test(normalized)
  ) return 'type-check';

  if (normalized === 'lint' || normalized === 'run-npm-run-lint' || /(^|-)lint($|-)/.test(normalized)) return 'lint';
  if (normalized === 'run-npm-run-audit-runtime-assets' || /runtime-assets?/.test(normalized)) return 'runtime-assets';
  if (/control-room.*structure/.test(normalized)) return 'control-room-structure';
  if (/control-room.*rls|supabase.*rls/.test(normalized)) return 'control-room-rls';
  if (/companion.*asset/.test(normalized)) return 'companions';
  if (normalized === 'run-npm-run-test-voice-intelligence' || /voice.*intelligence/.test(normalized)) return 'voice-intelligence';
  if (normalized === 'run-npm-run-test-oracle' || /oracle/.test(normalized)) return 'oracle';
  if (normalized === 'run-npm-run-verify-room-archives' || /room.*archives?/.test(normalized)) return 'room-archives';
  if (/playwright|browser-e2e|e2e-browser/.test(normalized)) return 'playwright-e2e';

  return normalized;
}

function normalizedRepository(repository) {
  const value = String(repository || '').trim();
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) return 'unknown/unknown';
  return value.toLowerCase();
}

function normalizedHeadSha(headSha) {
  const value = String(headSha || '').trim().toLowerCase();
  return /^[0-9a-f]{40}$/.test(value) ? value : 'unknown';
}

function buildFailureIdentity({
  repository,
  headSha,
  failureKey,
  correlatable,
  source,
  evidence = {},
}) {
  const repo = normalizedRepository(repository);
  const head = normalizedHeadSha(headSha);
  const key = canonicalFailureKey(failureKey);
  const canCorrelate = correlatable === true && repo !== 'unknown/unknown' && head !== 'unknown';

  const incidentSubject = canCorrelate
    ? { kind: 'git-head', repository: repo, head_sha: head, failure_key: key }
    : {
        kind: 'source-local',
        repository: repo,
        base_head_sha: head,
        failure_key: key,
        source: slug(source),
        correlatable: false,
      };

  const incidentFingerprint = `test_failure:${sha256(stableJson({
    contract: INCIDENT_CONTRACT,
    subject: incidentSubject,
  }))}`;

  const proofCookie = `${PROOF_COOKIE_PREFIX}${sha256(stableJson({
    contract: PROOF_CONTRACT,
    incident_fingerprint: incidentFingerprint,
    source: slug(source),
    evidence,
  }))}`;

  return {
    incident_contract: INCIDENT_CONTRACT,
    proof_contract: PROOF_CONTRACT,
    incident_fingerprint: incidentFingerprint,
    proof_cookie: proofCookie,
    repository: repo,
    head_sha: head,
    failure_key: key,
    source: slug(source),
    correlatable: canCorrelate,
    authority: false,
    merge_authority: false,
    proof_satisfied: false,
    browser_cookie: false,
    authorizing: false,
  };
}

module.exports = {
  INCIDENT_CONTRACT,
  PROOF_CONTRACT,
  PROOF_COOKIE_PREFIX,
  buildFailureIdentity,
  canonicalFailureKey,
};

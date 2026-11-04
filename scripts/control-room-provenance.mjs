import fs from 'node:fs';
import {createHash} from 'node:crypto';

const SHA256 = /^[0-9a-f]{64}$/i;
const CLAIM_STATES = new Set([
  'unverified',
  'verified_current',
  'superseded_historical',
  'contradicted',
]);

export class ProvenanceError extends Error {
  constructor(code, details = '') {
    super(details ? `${code}: ${details}` : code);
    this.name = 'ProvenanceError';
    this.code = code;
  }
}

function normalizeCanonical(value, path = '$') {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new ProvenanceError('non_finite_number', path);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => normalizeCanonical(item, `${path}[${index}]`));
  }
  if (typeof value === 'object') {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new ProvenanceError('unsupported_object_type', path);
    }
    const normalized = Object.create(null);
    for (const key of Object.keys(value).sort()) {
      if (value[key] === undefined) throw new ProvenanceError('undefined_value', `${path}.${key}`);
      Object.defineProperty(normalized, key, {
        value: normalizeCanonical(value[key], `${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return normalized;
  }
  throw new ProvenanceError('unsupported_value', path);
}

export function canonicalJson(value) {
  return JSON.stringify(normalizeCanonical(value));
}

export function canonicalSha256(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

export function sha256File(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function assertSha256(value, field) {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    throw new ProvenanceError('invalid_sha256', field);
  }
  return value.toLowerCase();
}

function canonicalTimestamp(value, field) {
  const parsed = new Date(value ?? '');
  if (typeof value !== 'string' || Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new ProvenanceError('invalid_timestamp', field);
  }
  return parsed.toISOString();
}

export function deterministicUuidV4(payload) {
  const hex = canonicalSha256(payload).slice(0, 32).split('');
  hex[12] = '4';
  hex[16] = (((Number.parseInt(hex[16], 16) & 0x3) | 0x8)).toString(16);
  const value = hex.join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20, 32)}`;
}

export function createEvidenceBinding({
  sourceId,
  sourceKind,
  observedAt,
  sourceSha256,
  observation,
}) {
  const normalizedSourceId = typeof sourceId === 'string' ? sourceId.trim() : '';
  const normalizedSourceKind = typeof sourceKind === 'string' ? sourceKind.trim() : '';
  if (!normalizedSourceId) throw new ProvenanceError('invalid_source_id');
  if (!normalizedSourceKind) throw new ProvenanceError('invalid_source_kind');

  const evidence = {
    sourceId: normalizedSourceId,
    sourceKind: normalizedSourceKind,
    observedAt: canonicalTimestamp(observedAt, 'observedAt'),
    sourceSha256: assertSha256(sourceSha256, 'sourceSha256'),
    observationSha256: canonicalSha256(observation),
  };

  return Object.freeze(evidence);
}

export function createJsonEvidenceBinding({sourceId, sourceKind, observedAt, source}) {
  return createEvidenceBinding({
    sourceId,
    sourceKind,
    observedAt,
    sourceSha256: canonicalSha256(source),
    observation: source,
  });
}

export function verifyFileBinding(evidence, filePath) {
  const currentSha256 = sha256File(filePath);
  if (currentSha256 !== evidence.sourceSha256) {
    throw new ProvenanceError(
      'source_digest_mismatch',
      `expected ${evidence.sourceSha256}, got ${currentSha256}`,
    );
  }
  return true;
}

function claimPayload(claim) {
  return {
    claimId: claim.claimId,
    statement: claim.statement,
    state: claim.state,
    basedOnSourceId: claim.basedOnSourceId,
    basedOnSourceSha256: claim.basedOnSourceSha256,
    basedOnObservationSha256: claim.basedOnObservationSha256,
    createdAt: claim.createdAt,
  };
}

export function bindClaim({claimId, statement, state, evidence, createdAt}) {
  const normalizedClaimId = typeof claimId === 'string' ? claimId.trim() : '';
  const normalizedStatement = typeof statement === 'string' ? statement.trim() : '';
  if (!normalizedClaimId) throw new ProvenanceError('invalid_claim_id');
  if (!normalizedStatement) throw new ProvenanceError('invalid_claim_statement');
  if (!CLAIM_STATES.has(state)) throw new ProvenanceError('invalid_claim_state', state);

  const claim = {
    claimId: normalizedClaimId,
    statement: normalizedStatement,
    state,
    basedOnSourceId: evidence.sourceId,
    basedOnSourceSha256: evidence.sourceSha256,
    basedOnObservationSha256: evidence.observationSha256,
    createdAt: canonicalTimestamp(createdAt, 'createdAt'),
  };

  return Object.freeze({...claim, claimSha256: canonicalSha256(claim)});
}

export function verifyClaimDigest(claim) {
  const expected = canonicalSha256(claimPayload(claim));
  if (claim.claimSha256 !== expected) {
    throw new ProvenanceError('claim_digest_mismatch', `expected ${expected}, got ${claim.claimSha256 ?? '<missing>'}`);
  }
  return true;
}

export function verifyClaimBinding(claim, evidence) {
  verifyClaimDigest(claim);
  const mismatches = [];
  if (claim.basedOnSourceId !== evidence.sourceId) mismatches.push('source_id');
  if (claim.basedOnSourceSha256 !== evidence.sourceSha256) mismatches.push('source_sha256');
  if (claim.basedOnObservationSha256 !== evidence.observationSha256) mismatches.push('observation_sha256');
  if (mismatches.length > 0) {
    throw new ProvenanceError('claim_binding_mismatch', mismatches.join(','));
  }
  return true;
}

export function supersedeClaim({priorClaim, oldEvidence, newEvidence, strategyMutation}) {
  verifyClaimBinding(priorClaim, oldEvidence);
  if (priorClaim.state !== 'verified_current') {
    throw new ProvenanceError('prior_claim_not_current', priorClaim.state);
  }

  const oldObservedAt = new Date(oldEvidence.observedAt).getTime();
  const newObservedAt = new Date(newEvidence.observedAt).getTime();
  if (newObservedAt <= oldObservedAt) {
    throw new ProvenanceError('non_monotonic_evidence_time');
  }

  const normalizedMutation = typeof strategyMutation === 'string' ? strategyMutation.trim() : '';
  if (!normalizedMutation) throw new ProvenanceError('strategy_mutation_required');

  const payload = {
    priorClaimId: priorClaim.claimId,
    priorClaimSha256: priorClaim.claimSha256,
    oldEvidence,
    newEvidence,
    strategyMutation: normalizedMutation,
  };

  const receipt = {
    schema: 'sekret-control-room-provenance/v1',
    receiptId: deterministicUuidV4(payload),
    priorClaimId: priorClaim.claimId,
    priorClaimSha256: priorClaim.claimSha256,
    priorState: 'superseded_historical',
    currentState: 'verified_current',
    oldEvidence,
    newEvidence,
    strategyMutation: normalizedMutation,
  };

  return Object.freeze({...receipt, receiptSha256: canonicalSha256(receipt)});
}

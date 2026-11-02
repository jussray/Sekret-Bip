/**
 * Prototype of an HMAC-authenticated backend-to-companion handoff.
 *
 * Not connected to Worker routing or deployed runtime. The backend must
 * independently authenticate and rate-limit callers before issuing proofs.
 * A one-time nonce/replay register and live Service Binding readback are
 * required before activation; timestamp validation alone is not enough.
 *
 * This proof never accepts account identity from a client request body.
 */
export type CompanionPrincipal = { kind: 'user'; userId: string };

export type CompanionProof = {
  version: 1;
  method: 'POST';
  pathname: string;
  bodyDigest: string;
  issuedAt: number;
  nonce: string;
  principal: CompanionPrincipal;
  signature: string;
};

export type CompanionRequest = {
  secret: string;
  method: string;
  pathname: string;
  body: string;
};

const allowed = new Set(['/api/sekret/reply', '/api/sekret/voice', '/api/sekret/transcribe']);
const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noncePattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const maxBodyBytes = 12 * 1024 * 1024;
const maxSkewMillis = 30_000;
const encoder = new TextEncoder();

function validPrincipal(value: unknown): value is CompanionPrincipal {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && (value as Record<string, unknown>).kind === 'user'
    && typeof (value as Record<string, unknown>).userId === 'string'
    && userIdPattern.test((value as CompanionPrincipal).userId)
    && Object.keys(value).length === 2;
}

function checkRequest(req: CompanionRequest): boolean {
  return typeof req.secret === 'string'
    && encoder.encode(req.secret).length >= 32
    && req.method === 'POST'
    && allowed.has(req.pathname)
    && typeof req.body === 'string'
    && encoder.encode(req.body).length <= maxBodyBytes;
}

async function keyFor(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function digest(body: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(body)));
  return Array.from(hash, x => x.toString(16).padStart(2, '0')).join('');
}

function signedMessage(proof: Pick<CompanionProof, 'pathname' | 'bodyDigest' | 'issuedAt' | 'nonce' | 'principal'>): Uint8Array {
  return encoder.encode(JSON.stringify([
    1, 'POST', proof.pathname, proof.bodyDigest,
    proof.issuedAt, proof.nonce, proof.principal.userId,
  ]));
}

function encodeSignature(input: Uint8Array): string {
  let raw = '';
  for (const byte of input) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeSignature(input: string): Uint8Array {
  const raw = atob(input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - input.length % 4) % 4));
  return Uint8Array.from(raw, character => character.charCodeAt(0));
}

export async function issueCompanionProof(
  options: CompanionRequest & { principal: CompanionPrincipal; issuedAt?: number; nonce?: string },
): Promise<CompanionProof> {
  if (!checkRequest(options) || !validPrincipal(options.principal)) {
    throw new Error('Companion proof requires a supported protected request and verified user principal.');
  }
  const issuedAt = options.issuedAt ?? Date.now();
  const nonce = options.nonce ?? crypto.randomUUID();
  if (!Number.isSafeInteger(issuedAt) || issuedAt < 1 || !noncePattern.test(nonce)) {
    throw new Error('Invalid companion proof timestamp or nonce.');
  }
  const proof: Omit<CompanionProof, 'signature'> = {
    version: 1,
    method: 'POST',
    pathname: options.pathname,
    bodyDigest: await digest(options.body),
    issuedAt,
    nonce,
    principal: options.principal,
  };
  const hmac = await crypto.subtle.sign('HMAC', await keyFor(options.secret), signedMessage(proof));
  return { ...proof, signature: encodeSignature(new Uint8Array(hmac)) };
}

export async function verifyCompanionProof(
  unknownProof: unknown,
  options: CompanionRequest & { now?: number },
): Promise<CompanionPrincipal | null> {
  if (!checkRequest(options) || !unknownProof || typeof unknownProof !== 'object' || Array.isArray(unknownProof)) return null;
  const p = unknownProof as Record<string, unknown>;
  if (Object.keys(p).length !== 8
    || p.version !== 1 || p.method !== 'POST' || p.pathname !== options.pathname
    || typeof p.bodyDigest !== 'string' || !/^[a-f0-9]{64}$/i.test(p.bodyDigest)
    || !Number.isSafeInteger(p.issuedAt) || typeof p.issuedAt !== 'number' || p.issuedAt < 1
    || typeof p.nonce !== 'string' || !noncePattern.test(p.nonce)
    || !validPrincipal(p.principal) || typeof p.signature !== 'string'
    || !/^[A-Za-z0-9_-]{43}$/.test(p.signature)) return null;
  const now = options.now ?? Date.now();
  if (!Number.isSafeInteger(now) || Math.abs(now - p.issuedAt) > maxSkewMillis) return null;
  try {
    if (p.bodyDigest !== await digest(options.body)) return null;
    const proof = p as CompanionProof;
    const valid = await crypto.subtle.verify(
      'HMAC',
      await keyFor(options.secret),
      decodeSignature(proof.signature),
      signedMessage(proof),
    );
    return valid ? { kind: 'user', userId: proof.principal.userId } : null;
  } catch {
    return null;
  }
}

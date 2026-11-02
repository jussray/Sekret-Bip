import assert from 'node:assert/strict';
import { test } from 'node:test';
import { issueCompanionProof, verifyCompanionProof } from '../worker/companion-internal-proof.ts';

const secret = 'synthetic-internal-auth-key-012345678901234567890123456789';
const principal = { kind: 'user', userId: '12345678-1234-1234-1234-123456789abc' };
const base = { secret, method: 'POST', pathname: '/api/sekret/reply', body: '{"characterId":"sy","userText":"hello"}', principal };
const now = Date.UTC(2026,10,2,19,0,0);

test('signed proof authenticates a fixed API path, body and server-verified principal', async () => {
  const proof = await issueCompanionProof({ ...base, issuedAt: now });
  assert.equal(proof.principal.kind, 'user');
  assert.equal(proof.principal.userId, principal.userId);
  assert.equal(typeof proof.signature, 'string');
  assert.equal(JSON.stringify(proof).includes(secret), false);
  assert.deepEqual(await verifyCompanionProof(proof, { ...base, now }), principal);
});

test('altered input body, route, signature, userId and age all fail closed', async () => {
  const proof = await issueCompanionProof({ ...base, issuedAt: now });
  for (const mutation of [
    { ...base, body: '{"characterId":"sy","userText":"changed"}' },
    { ...base, pathname: '/api/sekret/voice' },
    { ...base, secret: 'different-secret-key-012345678901234567890123456789' },
  ]) assert.equal(await verifyCompanionProof(proof, { ...mutation, now }), null);
  assert.equal(await verifyCompanionProof({ ...proof, principal: { kind: 'user', userId: '00000000-0000-0000-0000-000000000000' } }, { ...base, now }), null);
  assert.equal(await verifyCompanionProof({ ...proof, signature: 'invalid' }, { ...base, now }), null);
  assert.equal(await verifyCompanionProof(proof, { ...base, now: now + 31_000 }), null);
});

test('never issues a proof for guest identity, unsupported method/route, or missing key', async () => {
  await assert.rejects(issueCompanionProof({ ...base, principal: { kind: 'shared-token' } }));
  await assert.rejects(issueCompanionProof({ ...base, method: 'GET' }));
  await assert.rejects(issueCompanionProof({ ...base, pathname: '/api/bridge/summary/generate' }));
  await assert.rejects(issueCompanionProof({ ...base, secret: '' }));
});

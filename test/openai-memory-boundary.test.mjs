/**
 * L99 Goal 4 regression pack: identity must come from verified auth
 * (worker/auth.ts's Principal), never from the request body, and only
 * memory *category names* (never values) may enter telemetry/audit.
 *
 * Also locks in the specific gap the L99 audit flagged: worker/index.ts's
 * final delegation to sekret-reply.ts's fetch() used to drop the
 * authenticated principal entirely.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const preflight = read('worker/audit/preflight.ts');
const indexTs = read('worker/index.ts');
const reply = read('worker/sekret-reply.ts');

// ─── preflight.ts must never read identity or content from a request body ──
test('preflight.ts contains no reference to a request body object', () => {
  // If preflight ever starts reading `body.userId` or similar, that would
  // reintroduce a spoofable-identity bug. It must only take a `principal`
  // that the caller already authenticated.
  assert.doesNotMatch(preflight, /\bbody\./, 'preflight must never read fields off a request body');
  assert.match(preflight, /principal: PreflightPrincipal \| null/, 'principal must be an explicit, typed parameter');
});

test('principalIdFor only trusts the authenticated principal, never a fallback identity string', () => {
  const fnStart = preflight.indexOf('function principalIdFor');
  const fnEnd = preflight.indexOf('\n}', fnStart) + 2;
  const fnBody = preflight.slice(fnStart, fnEnd);
  assert.match(fnBody, /principal\?\.userId/);
  assert.doesNotMatch(fnBody, /userId\s*\?\?\s*['"]/, 'must not silently default to a fabricated userId');
});

// ─── Only category names (object keys), never memory values, get recorded ──
test('memoryCategoriesFrom reads Object.keys only, and never Object.values', () => {
  const fnStart = preflight.indexOf('function memoryCategoriesFrom');
  const fnEnd = preflight.indexOf('\n}', fnStart) + 2;
  const fnBody = preflight.slice(fnStart, fnEnd);
  assert.match(fnBody, /Object\.keys\(/);
  assert.doesNotMatch(fnBody, /Object\.values\(/);
  assert.doesNotMatch(fnBody, /Object\.entries\(/);
});

test('memory category keys are constrained to a safe identifier pattern', () => {
  assert.match(preflight, /SAFE_KEY_RE\s*=\s*\/\^\[a-zA-Z0-9_-\]/);
});

// ─── History is capped ───────────────────────────────────────────────────
test('MAX_HISTORY_TURNS is defined and bounds forwarded history', () => {
  assert.match(preflight, /export const MAX_HISTORY_TURNS = 20/);
  assert.match(preflight, /history\.slice\(-MAX_HISTORY_TURNS\)/);
});

// ─── Behaviorally run runPreflight (pure function, no CF-specific APIs) ────
const preflightStripped = preflight
  .replace(/export (interface|type) [\s\S]*?\n\}\n/g, '')
  .replace(/export type PrincipalKind[^\n]*\n/g, '')
  .replace(/\):\s*[A-Za-z_][\w<>[\]\s,|]*\s*\{/g, ') {')
  .replace(/\s+as\s+Record<string,\s*unknown>/g, '')
  .replace(/:\s*ConversationTurnLike\[\]/g, '')
  .replace(/:\s*PreflightPrincipal \| null/g, '')
  .replace(/:\s*unknown/g, '')
  .replace(/:\s*PreflightResult/g, '')
  .replace(/:\s*string\[\]/g, '')
  .replace(/:\s*PrincipalKind/g, '')
  .replace(/:\s*string(?=[,)])/g, '')
  .replace(/export function/g, 'function')
  .replace(/export const/g, 'const');

const runPreflightFn = new Function(`${preflightStripped}; return runPreflight;`)();

test('runPreflight derives principalKind from the authenticated principal, not from history/memory content', () => {
  const result = runPreflightFn([], {}, { kind: 'user', userId: 'user-123' });
  assert.equal(result.context.principalKind, 'user');
  assert.equal(result.context.principalId, 'user-123');
});

test('runPreflight falls back to anonymous when no principal is supplied', () => {
  const result = runPreflightFn([], {}, null);
  assert.equal(result.context.principalKind, 'anonymous');
  assert.equal(result.context.principalId, 'anonymous');
});

test('runPreflight records memory category names only, never their values', () => {
  const result = runPreflightFn([], { mood: 'anxious about school', journalTags: ['x'] }, null);
  assert.deepEqual(result.context.memoryCategoriesUsed.sort(), ['journalTags', 'mood']);
  assert.ok(!JSON.stringify(result).includes('anxious about school'), 'a memory value must never leak into the preflight context');
});

test('runPreflight truncates history beyond MAX_HISTORY_TURNS and flags it', () => {
  const longHistory = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `turn ${i}` }));
  const result = runPreflightFn(longHistory, {}, null);
  assert.equal(result.sanitizedHistory.length, 20);
  assert.equal(result.context.historyTruncated, true);
  assert.equal(result.sanitizedHistory[result.sanitizedHistory.length - 1].content, 'turn 29', 'must keep the most recent turns');
});

// ─── The exact gap the L99 audit flagged: index.ts must forward principal ──
test('worker/index.ts forwards the authenticated principal to sekret-reply.ts', () => {
  assert.match(indexTs, /worker\.fetch\(request, env as \{ OPENAI_API_KEY: string \}, principal\)/,
    'index.ts previously dropped `principal` on this call — this is the regression guard for that exact bug');
});

test('sekret-reply.ts accepts a principal and threads it into preflight', () => {
  assert.match(reply, /async function handleReply\(request: Request, env: Env, principal: PreflightPrincipal \| null/);
  assert.match(reply, /runPreflight\(rawHistory, body\.memory, principal\)/);
  assert.match(reply, /async fetch\(request: Request, env: Env, principal: PreflightPrincipal \| null[^)]*\): Promise<Response>/);
});

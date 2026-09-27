/**
 * L99 Goal 2 regression pack: the OpenAI model config (worker/config/models.ts)
 * existed before this change but was never actually wired into the real
 * OpenAI calls in sekret-reply.ts — every call hardcoded a model literal
 * directly. This file locks that fix in place: no hardcoded model literal
 * may remain at a live OpenAI call site, and getModels() must resolve the
 * configured production defaults while honoring environment overrides.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const reply = read('worker/sekret-reply.ts');
const modelsSource = read('worker/config/models.ts');
const observed = read('worker/observed-index.ts');
const wrangler = read('wrangler.toml');

// ─── getModels() is a pure function — extract and actually run it ───────────
const fnStart = modelsSource.indexOf('export function getModels');
const fnBodyStart = modelsSource.indexOf('{', fnStart);
const fnEnd = modelsSource.indexOf('\n}', fnBodyStart) + 2;
const rawFn = modelsSource.slice(fnStart, fnEnd)
  .replace('export function getModels(env: WorkerEnv)', 'function getModels(env)')
  .replace(/\}\s*as const;/, '};');
const getModels = new Function(`${rawFn}; return getModels;`)();

test('getModels falls back to the configured production defaults', () => {
  const models = getModels({});
  assert.equal(models.chat, 'gpt-4o');
  assert.equal(models.tts, 'gpt-4o-mini-tts');
  assert.equal(models.stt, 'whisper-1');
});

test('getModels honors env overrides for all three model slots', () => {
  const models = getModels({
    OPENAI_CHAT_MODEL: 'gpt-4o',
    OPENAI_TTS_MODEL: 'tts-1-hd',
    OPENAI_STT_MODEL: 'whisper-2',
  });
  assert.equal(models.chat, 'gpt-4o');
  assert.equal(models.tts, 'tts-1-hd');
  assert.equal(models.stt, 'whisper-2');
});

// ─── sekret-reply.ts must import and actually call getModels(env) ───────────
test('sekret-reply.ts imports getModels from config/models', () => {
  assert.match(reply, /import\s*\{\s*getModels\s*\}\s*from\s*['"]\.\/config\/models['"]/);
});

test('handleReply resolves models via getModels(env) before calling OpenAI', () => {
  const handleReplyStart = reply.indexOf('async function handleReply');
  const handleVoiceStart = reply.indexOf('async function handleVoice');
  const handleReplyBody = reply.slice(handleReplyStart, handleVoiceStart);
  assert.match(handleReplyBody, /const models = getModels\(env\)/, 'handleReply must resolve models once via getModels(env)');
  assert.match(handleReplyBody, /model:\s*models\.chat/, 'the chat completion call must use models.chat');
});

test('handleVoice resolves the TTS model via getModels(env), not a literal', () => {
  const handleVoiceStart = reply.indexOf('async function handleVoice');
  const handleTranscribeStart = reply.indexOf('async function handleTranscribe');
  const handleVoiceBody = reply.slice(handleVoiceStart, handleTranscribeStart);
  assert.match(handleVoiceBody, /model:\s*getModels\(env\)\.tts/);
});

test('handleTranscribe resolves the STT model via getModels(env), not a literal', () => {
  const handleTranscribeStart = reply.indexOf('async function handleTranscribe');
  const exportDefaultStart = reply.indexOf('export default');
  const handleTranscribeBody = reply.slice(handleTranscribeStart, exportDefaultStart);
  assert.match(handleTranscribeBody, /formData\.append\('model',\s*getModels\(env\)\.stt\)/);
});

test('no OpenAI fetch/formData call site hardcodes a model literal anymore', () => {
  const bannedPatterns = [
    /model:\s*'gpt-4o-mini'(?!-tts)/,
    /model:\s*"gpt-4o-mini"(?!-tts)/,
    /model:\s*'gpt-4o-mini-tts'/,
    /model:\s*"gpt-4o-mini-tts"/,
    /'model',\s*'whisper-1'/,
    /"model",\s*"whisper-1"/,
  ];
  for (const pattern of bannedPatterns) {
    assert.doesNotMatch(reply, pattern, `sekret-reply.ts must not hardcode ${pattern}`);
  }
});

test('Env interface declares the optional model override vars', () => {
  const envBlockStart = reply.indexOf('interface Env {');
  const envBlockEnd = reply.indexOf('}', envBlockStart);
  const envBlock = reply.slice(envBlockStart, envBlockEnd);
  assert.match(envBlock, /OPENAI_CHAT_MODEL\?:\s*string/);
  assert.match(envBlock, /OPENAI_TTS_MODEL\?:\s*string/);
  assert.match(envBlock, /OPENAI_STT_MODEL\?:\s*string/);
});

// ─── Runtime deployment and telemetry model contracts ──────────────────────
test('wrangler pins the production chat model to gpt-4o on sekret-backend', () => {
  assert.match(wrangler, /^name = "sekret-backend"$/m);
  assert.match(wrangler, /^OPENAI_CHAT_MODEL = "gpt-4o"$/m);
});

test('observed-index uses response model first and env-backed model fallback second', () => {
  assert.match(
    observed,
    /metadata\.model \|\| modelForOperation\(operation, typedEnv\)/,
    'the response-reported model must win over the env-backed per-operation fallback',
  );
  assert.match(observed, /function modelForOperation\(operation: string, env: WorkerEnv\)/);
  assert.match(observed, /const models = getModels\(env\)/);
  assert.match(observed, /model: modelForOperation\(operation, typedEnv\)/);
});

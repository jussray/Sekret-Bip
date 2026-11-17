import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

const worker = read('worker/sekret-reply.ts');
const chatService = read('src/services/ai/chat.ts');
const oracleDiscovery = read('services/oracleDiscovery.ts');

test('Se\'kret brain keeps Oracle context below safety and privacy rules', () => {
  const safetyIndex = worker.indexOf('safety');
  const oracleIndex = worker.indexOf("WHAT SE'KRET KNOWS ABOUT THIS PERSON");

  assert.notEqual(oracleIndex, -1, 'Oracle context block must exist in the shared brain prompt');
  assert.notEqual(safetyIndex, -1, 'Worker must still contain safety instructions');
  assert.ok(safetyIndex < oracleIndex, 'safety guidance should appear before Oracle personalization');
});

test('Se\'kret brain explicitly prevents quoting hidden Oracle understandings', () => {
  assert.ok(worker.includes('use subtly, never quote directly'));
  assert.match(worker, /WHAT SE'KRET KNOWS ABOUT THIS PERSON/);
});

test('Se\'kret brain preserves private parent-share boundaries while using Oracle context', () => {
  assert.match(worker, /parentShareSummary/);
  assert.match(worker, /Never expose private journal text verbatim/);
  assert.match(worker, /Parent sharing enabled/);
});

test('Oracle context cannot replace generic safety memory serialization', () => {
  assert.match(worker, /function safeMemory/);
  assert.match(worker, /oracleContext:\s*_/);
  assert.match(worker, /JSON\.stringify\(rest\)/);
  assert.match(worker, /Teen-safe memory summary/);
});

test('Oracle context enters the shared brain through memory only, not as user text', () => {
  assert.match(chatService, /memory:\s*\{[\s\S]*oracleContext/);
  assert.doesNotMatch(chatService, /text:\s*oracleContext/);
  assert.doesNotMatch(chatService, /message:\s*oracleContext/);
});

test('Oracle context is bounded before the shared brain sees it', () => {
  assert.match(oracleDiscovery, /\.slice\(0, 8\)/);
  assert.match(worker, /\.slice\(0, 8\)/);
});

test('Se\'kret brain keeps companion identity separate from Oracle knowledge', () => {
  assert.match(worker, /sekretIdentityNote/);
  assert.match(worker, /oracleNote/);
  assert.match(worker, /sections/);
  assert.ok(worker.indexOf('sekretIdentityNote') < worker.indexOf('oracleNote'));
});

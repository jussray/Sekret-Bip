import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

const state = read('services/wellbeingState.ts');
const builder = read('src/services/ai/buildReplyRequest.ts');
const voice = read('hooks/useVoiceBipIntelligence.ts');
const history = read('screens/MeaningfulHistoryScreen.tsx');

test('wellbeing state is a projection over the existing memory authority', () => {
  assert.match(state, /read model over the existing Se'kret memory store/i);
  assert.match(state, /loadSekretMemory/);
  assert.match(state, /summarizeSekretMemory/);
  assert.doesNotMatch(state, /diagnosis\s*:/i);
  assert.doesNotMatch(state, /disorder\s*:/i);
  assert.doesNotMatch(state, /riskScore\s*:/i);
});

test('derived observations retain provenance and bounded confidence', () => {
  assert.match(state, /evidenceCount: number/);
  assert.match(state, /basis: 'explicit-user-records' \| 'interaction-pattern'/);
  assert.match(state, /'emerging' \| 'growing' \| 'strong'/);
  assert.match(state, /MAX_PROVIDER_CONTEXT = 5/);
});

test('dismissal ledger fails closed instead of silently reviving rejected observations', () => {
  assert.match(state, /WELLBEING_DISMISSALS_READ_FAILED/);
  const loadDismissed = state.match(/async function loadDismissed\(\): Promise<DismissedObservation\[]> \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(loadDismissed, /throw new Error\('WELLBEING_DISMISSALS_READ_FAILED'\)/);
  assert.doesNotMatch(loadDismissed, /catch\s*\{[\s\S]*?return \[]/);
});

test('voice transcript contributes only through existing bounded memory', () => {
  assert.match(voice, /result\.transcript\.status === 'available'/);
  assert.match(voice, /updateSekretMemory/);
  assert.match(voice, /journalEntries:/);
  assert.match(voice, /bounded metadata\/patterns/i);
  assert.match(voice, /not the raw transcript/i);
});

test('voice memory persistence cannot silently report success', () => {
  assert.match(voice, /memoryPersistence/);
  assert.match(voice, /loadSekretMemory/);
  assert.match(voice, /VOICE_BIP_MEMORY_PERSIST_VERIFY_FAILED/);
  assert.doesNotMatch(voice, /\.catch\(\(\) => undefined\)/);
});

test('optional Oracle fallback is visible without exposing stored profile content', () => {
  assert.match(builder, /Oracle context unavailable; continuing without optional context\./);
  assert.match(builder, /console\.warn\('Oracle context unavailable; continuing without optional context\.'\)/);
  assert.doesNotMatch(builder, /console\.(?:warn|error)\([^\n]*(?:raw|profile|error|cause)[^\n]*\)/i);
});

test('surface extra memory cannot overwrite canonical reply provenance', () => {
  const memoryBlock = builder.match(/const memory: Record<string, unknown> = \{([\s\S]*?)\n  \};/)?.[1] ?? '';
  const extraIndex = memoryBlock.indexOf('...(ctx.extraMemory ?? {})');
  const relationshipIndex = memoryBlock.indexOf('relationshipStyle:');
  const oracleIndex = memoryBlock.indexOf('{ oracleContext }');
  const wellbeingIndex = memoryBlock.indexOf('wellbeingContext:');

  for (const index of [extraIndex, relationshipIndex, oracleIndex, wellbeingIndex]) {
    assert.notEqual(index, -1);
  }
  assert.equal(extraIndex < relationshipIndex, true);
  assert.equal(extraIndex < oracleIndex, true);
  assert.equal(extraIndex < wellbeingIndex, true);
});

test('companion request receives tentative user-controlled context', () => {
  assert.match(builder, /loadWellbeingState/);
  assert.match(builder, /buildWellbeingContext/);
  assert.match(builder, /Never diagnose, label, score, or treat these as clinical facts/);
});

test('history surface exposes observations, rejection, and truthful load failure', () => {
  assert.match(history, /What Se'kret is noticing/);
  assert.match(history, /These are observations, not diagnoses/);
  assert.match(history, /dismissWellbeingObservation/);
  assert.match(history, />Not me<\/Text>/);
  assert.match(history, /Promise\.allSettled/);
  assert.match(history, /Couldn't load your private observations/);
  assert.match(history, /Couldn't save that correction/);
  assert.match(history, /minHeight: 44/);
});

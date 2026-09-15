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

test('voice transcript contributes only through existing bounded memory', () => {
  assert.match(voice, /result\.transcript\.status === 'available'/);
  assert.match(voice, /updateSekretMemory/);
  assert.match(voice, /journalEntries:/);
  assert.match(voice, /bounded metadata\/patterns/i);
  assert.match(voice, /not the raw transcript/i);
});

test('companion request receives tentative user-controlled context', () => {
  assert.match(builder, /loadWellbeingState/);
  assert.match(builder, /buildWellbeingContext/);
  assert.match(builder, /Never diagnose, label, score, or treat these as clinical facts/);
});

test('history surface exposes observations and a rejection control', () => {
  assert.match(history, /What Se'kret is noticing/);
  assert.match(history, /These are observations, not diagnoses/);
  assert.match(history, /dismissWellbeingObservation/);
  assert.match(history, />Not me<\/Text>/);
});

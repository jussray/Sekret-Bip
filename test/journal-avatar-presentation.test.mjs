import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/(teen)/pages/index.tsx', import.meta.url), 'utf8');

test('Pages exposes only the four companions plus private Me journaling', () => {
  assert.equal(source.includes("{ id: 'raylene', name: 'Suhana'"), true);
  assert.equal(source.includes("{ id: 'rylane',  name: 'Sy'"), true);
  assert.equal(source.includes("{ id: 'cloud',   name: 'Cloud'"), true);
  assert.equal(source.includes("{ id: 'night',   name: 'Night'"), true);
  assert.equal(source.includes("{ id: 'me',      name: 'Me'"), true);
  assert.equal(source.includes("id: 'oracle'"), false);
  assert.equal(source.includes("name: 'Oracle'"), false);
  assert.equal(source.includes('guided discovery'), false);
});

test('Me never falls back to a companion portrait', () => {
  assert.equal(source.includes("companionAvatarId: SekretCharacterId | null"), true);
  assert.equal(source.includes("aiCompanion ? normalizeSekretCharacter(activeTab) : null"), true);
  assert.equal(source.includes('<Text style={s.headerModeIcon}>🪞</Text>'), true);
  assert.equal(source.includes("activeTab === 'me' ? '🪞' : '💜'"), true);
});

test('journal avatar state resets when changing tabs', () => {
  assert.equal(source.includes("setAvatarState(isAiTab(id) ? 'listening' : 'neutral')"), true);
  assert.equal(source.includes("onFocus={() => setAvatarState(aiCompanion ? 'listening' : 'neutral')}"), true);
});

test('protected journal paths remain intact', () => {
  for (const contract of ['sendCompanionMessage', 'fetchSekretVoice', 'checkTextBeforePost', 'patchJournalEntry', 'syncJournal']) {
    assert.equal(source.includes(contract), true);
  }
});

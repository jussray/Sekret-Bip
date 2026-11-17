import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/(teen)/pages/index.tsx', import.meta.url), 'utf8');

test('Me and Oracle never fall back to Suhana portraits', () => {
  assert.equal(source.includes("companionAvatarId: SekretCharacterId | null"), true);
  assert.equal(source.includes("aiCompanion ? normalizeSekretCharacter(activeTab) : null"), true);
  assert.equal(source.includes("activeTab === 'me' ? '🪞' : '🔮'"), true);
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

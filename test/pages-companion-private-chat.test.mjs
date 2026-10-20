import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

// Static regression coverage only. Live auth, Supabase RLS, device behavior,
// and production privacy still require separate runtime evidence.
const pages = readFileSync('app/(teen)/pages/index.tsx', 'utf8');
const chat = readFileSync('app/(teen)/companion-chat.tsx', 'utf8');
const layout = readFileSync('app/(teen)/_layout.tsx', 'utf8');

test('Pages offers the five companion choices with the existing points gate', () => {
  for (const id of ['raylene', 'rylane', 'cloud', 'night', 'oracle']) {
    assert.match(pages, new RegExp("id: '"+id+"'"));
  }
  assert.match(pages, /COMPANIONS\.filter\(c => c\.id !== 'me'\)\.map/);
  assert.match(pages, /c\.id === 'oracle' \? 'Oracle \(Ja\)'/);
  assert.match(pages, /totalPoints >= COMPANION_UNLOCK_PTS\[c\.id\]/);
  assert.match(pages, /disabled=\{!unlocked\}/);
});

test('Pages passes only the selected companion to a separate temporary chat', () => {
  assert.match(pages, /pathname: '\/\(teen\)\/companion-chat'/);
  assert.match(pages, /params: \{ companion: c\.id, surface: 'pages' \}/);
  assert.doesNotMatch(pages, /params: \{[^\n]*(journalText|entries|mediaUri|entryId)/);
  assert.match(pages, /Your page and unsent draft stay here/);
});

test('Pages save no longer copies private entries into implicit long-term companion memory', () => {
  assert.doesNotMatch(pages, /updateSekretMemory\(/);
  assert.match(pages, /syncJournal\(entry\)/);
  assert.match(pages, /sendCompanionMessage\(\{/);
  assert.match(pages, /!aiCompanion\) return;/);
});

test('Pages-initiated chat bypasses automatic history reads and writes', () => {
  assert.match(chat, /const isTemporaryPagesChat = surface === 'pages'/);
  assert.match(chat, /if \(!isTemporaryPagesChat\) await persistHistory\(storageKey, next\)/);
  assert.match(chat, /if \(isTemporaryPagesChat\) \{\s*setMsgs\(\[welcome\]\);\s*return;/);
  assert.match(chat, /await persistConversation\(withUser\)/);
  assert.match(chat, /await persistConversation\(final\)/);
  assert.match(chat, /This Pages chat isn't added to local chat history/);
});

test('Oracle (Ja) routes to canonical Se\'kret engine, not Suhana', () => {
  assert.match(chat, /const companionId = toCompanionId\(companionKey\)/);
  assert.match(chat, /companionId === 'sekret'/);
  assert.match(chat, /name: 'Oracle \(Ja\)'/);
});

test('existing teen route guard continues wrapping both Pages and companion-chat', () => {
  assert.match(layout, /Tabs\.Screen name="pages"/);
  assert.match(layout, /Tabs\.Screen name="companion-chat"/);
  assert.match(layout, /profileComplete/);
  assert.match(layout, /if \(effectiveUserSide !== 'teen'\)/);
});

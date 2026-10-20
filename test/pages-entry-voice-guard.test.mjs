import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../app/(teen)/pages/[id].tsx', import.meta.url), 'utf8');

test('Me and Oracle do not receive companion voice IDs', () => {
  assert.match(source, /me:\s*\{[^\n]*avatarId:\s*null/);
  assert.match(source, /oracle:\s*\{[^\n]*avatarId:\s*null/);
});

test('unknown entry types fall back without a voice ID', () => {
  assert.match(source, /label:\s*'Pages'[^\n]*avatarId:\s*null/);
});

test('voice playback and companion replies require a real companion ID', () => {
  assert.match(source, /if \(!entry\?\.sekretReply \|\| !companion\?\.avatarId \|\| voiceLoading\) return;/);
  assert.match(source, /const avatarId = companion\.avatarId;/);
  assert.match(source, /if \(avatarId && AI_COMPANIONS\.has\(avatarId\)\)/);
  assert.match(source, /\{companion\.avatarId \? \(/);
});

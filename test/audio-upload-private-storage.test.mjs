import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const uploadSource = fs.readFileSync('services/audio/audioUpload.ts', 'utf8');
const storageSql = fs.readFileSync('db/storage.sql', 'utf8');

test('voice uploads stay on the canonical private owner-scoped storage path', () => {
  assert.match(uploadSource, /const VOICE_BUCKET = 'voice-notes';/);
  assert.doesNotMatch(uploadSource, /voice-entries/);
  assert.doesNotMatch(uploadSource, /getPublicUrl\s*\(/);
  assert.doesNotMatch(uploadSource, /publicUrl\s*:/);

  assert.match(
    storageSql,
    /\('voice-notes',\s*'voice-notes',\s*false\)/,
    'voice-notes must remain a private bucket',
  );
  assert.match(
    storageSql,
    /bucket_id = 'voice-notes'[\s\S]*auth\.uid\(\)::text = \(storage\.foldername\(name\)\)\[1\]/,
    'voice-notes policies must remain scoped to the authenticated user folder',
  );
});

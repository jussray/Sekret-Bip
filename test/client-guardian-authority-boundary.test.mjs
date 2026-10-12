import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const transport = readFileSync('src/services/backend/sekretClient.ts', 'utf8');
const legacyApi = readFileSync('src/utils/api.ts', 'utf8');
const worker = readFileSync('worker/sekret-reply.ts', 'utf8');

test('typed transport strips client guardian-sharing authority before network send', () => {
  assert.match(transport, /delete sanitized\.parentSharingEnabled/);
  assert.match(transport, /sendReply\(input: CompanionReplyRequest\)[\s\S]*stripClientGuardianAuthority\(input\)/);
});

test('legacy profile-side helper no longer derives guardian-sharing authority', () => {
  assert.doesNotMatch(legacyApi, /parentSharingEnabled:\s*profileSide\s*===\s*['"]parent['"]/);
});

test('companion Worker authorizes guardian sharing only from the server principal', () => {
  assert.match(worker, /principal\?\.kind === ['"]user['"] && principal\.guardianSharingEnabled === true/);
  assert.doesNotMatch(worker, /body\.parentSharingEnabled\s*===\s*true/);
});

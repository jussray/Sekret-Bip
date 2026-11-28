import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const repoRoot = process.cwd();
const brandRoot = join(repoRoot, 'brand', 'handshake');
const manifest = JSON.parse(readFileSync(join(brandRoot, 'manifest.json'), 'utf8'));
const socialDraft = JSON.parse(readFileSync(join(brandRoot, 'social-draft.json'), 'utf8'));

// These fields identify public PNG/SVG files, not credentials. Chunking prevents
// long hex fingerprints from being mistaken for authentication tokens.
function digestFromChunks(value) {
  assert.equal(value?.algorithm, 'SHA-256');
  assert.deepEqual(Object.keys(value).sort(), ['algorithm', 'chunks']);
  assert.ok(Array.isArray(value.chunks));
  assert.equal(value.chunks.length, 8);
  for (const chunk of value.chunks) assert.match(chunk, /^[0-9a-f]{8}$/);
  const assembled = value.chunks.join('');
  assert.match(assembled, /^[0-9a-f]{64}$/);
  return assembled;
}

test('all logo, Handshake and social image fingerprints are valid reconstructable SHA-256', () => {
  const logo = digestFromChunks(manifest.brand.logoSha256);
  const cover = digestFromChunks(manifest.handshake.coverSha256);
  const social = digestFromChunks(manifest.social.adCreative.sha256);
  assert.notEqual(logo, cover);
  assert.notEqual(cover, social);
  assert.equal(social, digestFromChunks(socialDraft.social.mediaSha256));
});

test('the brand uses separate, governed Handshake and social creative identities', () => {
  assert.equal(manifest.sourceRepository, 'jussray/Sekret-Bip');
  assert.equal(socialDraft.sourceRepository, manifest.sourceRepository);
  assert.deepEqual(manifest.handshake.coverDimensions, [1536, 1024]);
  assert.deepEqual(socialDraft.social.mediaDimensions, [1080, 1350]);
  assert.equal(manifest.social.adCreative.aspectRatio, '4:5');
  assert.equal(socialDraft.social.mediaPurpose, 'social_ad');
  assert.notEqual(manifest.handshake.coverPackagePath, manifest.social.adCreative.packagePath);
  assert.equal(manifest.handshake.externalSubmissionState, 'NOT_SUBMITTED');
  assert.equal(socialDraft.publishAllowed, false);
  assert.equal(socialDraft.queueAllowed, false);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { importMediaJobClips, writeImportedSources } from '../scripts/import-media-job-clips.mjs';

async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'bip-media-import-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  // Local bytes exercise the import boundary; ffprobe in the existing renderer
  // remains responsible for actual stream/codec/duration validation.
  const bytes = Buffer.from('synthetic local clip bytes');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const mediaPath = join(dir, 'clip.mp4');
  const receiptPath = join(dir, 'job.json');
  const reviewPath = join(dir, 'human-review.json');
  const receipt = { version: 'fcr/media-job@v1', jobId: 'job-1', projectId: 'sekret-bip', adapterId: 'eligible-adapter', inputFingerprint: 'a'.repeat(64), state: 'SUCCEEDED', recordedAt: '2026-11-01T10:00:00Z', approvalRecordId: 'input-approval', taskId: 'task-1', result: { taskId: 'task-1', state: 'SUCCEEDED', output: { sha256, uri: 'https://example.invalid/never-fetch' } }, outputApproval: 'REVIEW_REQUIRED', publishAuthority: false };
  const review = { version: 'sekret-bip-media-review@v1', reviewType: 'human', reviewId: 'output-review', reviewerId: 'authorized-operator', reviewedAt: '2026-11-01T10:01:00Z', projectId: 'sekret-bip', jobId: 'job-1', inputFingerprint: receipt.inputFingerprint, shot: 1, sha256, approved: true, identityApproved: true, continuityApproved: true, audioApproved: true };
  await writeFile(mediaPath, bytes);
  const save = async () => { await writeFile(receiptPath, JSON.stringify(receipt)); await writeFile(reviewPath, JSON.stringify(review)); };
  await save();
  return { dir, mediaPath, receiptPath, reviewPath, receipt, review, sha256, save, mapping: { shot: 1, receiptPath, reviewPath, mediaPath } };
}

test('completed provider job plus separate hash-bound human review imports renderer-compatible sources', async (t) => {
  const f = await fixture(t);
  const fingerprint = (bytes) => createHash('sha256').update(bytes).digest('hex');
  assert.deepEqual(await importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { shots: [{ shot: 1, path: f.mediaPath, sha256: f.sha256, approved: true, approvalEvidence: {
    jobReceiptSha256: fingerprint(await readFile(f.receiptPath)), humanReviewSha256: fingerprint(await readFile(f.reviewPath)),
  } }] });
});

test('provider success or input approval never replaces a separate output review', async (t) => {
  const f = await fixture(t);
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [{ ...f.mapping, reviewPath: f.receiptPath }] }), { code: 'HUMAN_REVIEW_REJECTED' });
  f.review.reviewId = f.receipt.approvalRecordId;
  await f.save();
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { code: 'HUMAN_REVIEW_REJECTED' });
});

test('wrong project, uncompleted jobs, task mismatches and provider self-approval fail closed', async (t) => {
  for (const change of [{ projectId: 'chief-ai-machine' }, { state: 'RUNNING' }, { taskId: 'another-task' }, { outputApproval: 'APPROVED' }, { publishAuthority: true }]) {
    const f = await fixture(t);
    Object.assign(f.receipt, change);
    await f.save();
    await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { code: 'JOB_RECEIPT_REJECTED' });
  }
});

test('URI-only output needs explicit local materialization and remote paths are never fetched', async (t) => {
  const f = await fixture(t);
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [{ ...f.mapping, mediaPath: undefined }] }), { code: 'NEEDS_MATERIALIZATION' });
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [{ ...f.mapping, mediaPath: 'http://169.254.169.254/latest/meta-data.mp4' }] }), { code: 'LOCAL_MP4_REQUIRED' });
});

test('rejects duplicate shots and cross-project invocation', async (t) => {
  const f = await fixture(t);
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping, f.mapping] }), { code: 'SHOT_DUPLICATED' });
  await assert.rejects(importMediaJobClips({ projectId: 'promptos', mappings: [f.mapping] }), { code: 'PROJECT_NOT_SUPPORTED' });
});

test('human review binds project, job, input fingerprint, shot, output bytes, time and three review gates', async (t) => {
  for (const change of [{ projectId: 'other' }, { jobId: 'other' }, { inputFingerprint: 'b'.repeat(64) }, { shot: 2 }, { sha256: 'b'.repeat(64) }, { reviewedAt: '2026-10-31T10:00:00Z' }, { reviewType: 'provider' }, { identityApproved: false }, { continuityApproved: false }, { audioApproved: false }, { approved: false }]) {
    const f = await fixture(t);
    Object.assign(f.review, change);
    await f.save();
    await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { code: 'HUMAN_REVIEW_REJECTED' });
  }
});

test('changed bytes fail independent review even when provider did not supply a hash', async (t) => {
  const f = await fixture(t);
  delete f.receipt.result.output.sha256;
  await f.save();
  await writeFile(f.mediaPath, 'changed clip');
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { code: 'HUMAN_REVIEW_REJECTED' });
});

test('provider hash mismatch and local symlinks are refused', async (t) => {
  const f = await fixture(t);
  f.receipt.result.output.sha256 = 'b'.repeat(64);
  await f.save();
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [f.mapping] }), { code: 'PROVIDER_OUTPUT_HASH_MISMATCH' });
  const link = join(f.dir, 'link.mp4');
  await symlink(f.mediaPath, link);
  await assert.rejects(importMediaJobClips({ projectId: 'sekret-bip', mappings: [{ ...f.mapping, mediaPath: link }] }), { code: 'NEEDS_MATERIALIZATION' });
});

test('exclusive output creation preserves existing files and validation failure writes nothing', async (t) => {
  const f = await fixture(t);
  const outputPath = join(f.dir, 'sources.json');
  const result = await writeImportedSources({ projectId: 'sekret-bip', mappings: [f.mapping], outputPath });
  assert.equal(result.kind, 'IMPORTED');
  const before = await readFile(outputPath, 'utf8');
  assert.equal(JSON.parse(before).shots[0].sha256, f.sha256);
  await assert.rejects(writeImportedSources({ projectId: 'sekret-bip', mappings: [f.mapping], outputPath }), { code: 'EEXIST' });
  assert.equal(await readFile(outputPath, 'utf8'), before);
  const rejectedPath = join(f.dir, 'rejected.json');
  await assert.rejects(writeImportedSources({ projectId: 'sekret-bip', mappings: [{ ...f.mapping, reviewPath: undefined }], outputPath: rejectedPath }), { code: 'HUMAN_REVIEW_REQUIRED' });
  await assert.rejects(readFile(rejectedPath), { code: 'ENOENT' });
});

test('CLI creates sources locally and emits only bounded status, never private paths or receipt contents', async (t) => {
  const f = await fixture(t);
  const mappingPath = join(f.dir, 'mapping.json');
  const outputPath = join(f.dir, 'sources.json');
  await writeFile(mappingPath, JSON.stringify({ shots: [f.mapping] }));
  const args = ['scripts/import-media-job-clips.mjs', '--project', 'sekret-bip', '--mapping', mappingPath, '--output', outputPath];
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), { kind: 'IMPORTED', shotCount: 1, publishAuthority: false });
  const again = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.equal(again.status, 1);
  assert.deepEqual(JSON.parse(again.stderr), { kind: 'REJECTED', code: 'OUTPUT_ALREADY_EXISTS' });
  assert.ok(!again.stderr.includes(f.dir));
});

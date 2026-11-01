import { createHash } from 'node:crypto';
import { lstat, readFile, writeFile } from 'node:fs/promises';
import { extname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const HASH = /^[0-9a-f]{64}$/i;
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const timestamp = (value) => text(value) && Number.isFinite(Date.parse(value));

function reject(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

async function readLocal(path, code) {
  if (!text(path) || !isAbsolute(path)) reject(code);
  try {
    const info = await lstat(path);
    if (!info.isFile() || info.isSymbolicLink()) reject(code);
    return await readFile(path);
  } catch {
    reject(code);
  }
}

async function readJsonBound(path, code) {
  const bytes = await readLocal(path, code);
  try { return { value: JSON.parse(bytes.toString('utf8')), sha256: createHash('sha256').update(bytes).digest('hex') }; } catch { reject(code); }
}
async function readJson(path, code) { return (await readJsonBound(path, code)).value; }

/**
 * Import only explicitly materialized and separately human-reviewed clips.
 * Provider success, input approval and remote output URIs never approve media.
 * This importer performs no network access; the renderer probes media separately.
 */
export async function importMediaJobClips({ projectId, mappings }) {
  if (projectId !== 'sekret-bip') reject('PROJECT_NOT_SUPPORTED');
  if (!Array.isArray(mappings) || mappings.length === 0) reject('SHOT_MAPPING_REQUIRED');
  const seen = new Set();
  const shots = [];
  for (const mapping of mappings) {
    const shot = mapping?.shot;
    if (!Number.isSafeInteger(shot) || shot < 1) reject('SHOT_INVALID');
    if (seen.has(shot)) reject('SHOT_DUPLICATED');
    seen.add(shot);
    const receiptDocument = await readJsonBound(mapping.receiptPath, 'JOB_RECEIPT_INVALID');
    const receipt = receiptDocument.value;
    if (receipt?.version !== 'fcr/media-job@v1'
      || receipt.projectId !== projectId
      || !text(receipt.jobId) || !text(receipt.adapterId)
      || !HASH.test(receipt.inputFingerprint ?? '')
      || !timestamp(receipt.recordedAt) || !text(receipt.approvalRecordId)
      || !text(receipt.taskId) || receipt.state !== 'SUCCEEDED'
      || receipt.result?.state !== 'SUCCEEDED'
      || receipt.result.taskId !== receipt.taskId
      || receipt.outputApproval !== 'REVIEW_REQUIRED'
      || receipt.publishAuthority !== false) reject('JOB_RECEIPT_REJECTED');

    if (!text(mapping.mediaPath)) reject('NEEDS_MATERIALIZATION');
    if (!isAbsolute(mapping.mediaPath) || extname(mapping.mediaPath).toLowerCase() !== '.mp4') reject('LOCAL_MP4_REQUIRED');
    const media = await readLocal(mapping.mediaPath, 'NEEDS_MATERIALIZATION');
    if (media.length === 0) reject('LOCAL_MP4_EMPTY');
    const sha256 = createHash('sha256').update(media).digest('hex');
    const outputHash = receipt.result.output?.sha256;
    if (outputHash !== undefined && (!HASH.test(outputHash) || outputHash.toLowerCase() !== sha256)) reject('PROVIDER_OUTPUT_HASH_MISMATCH');

    const reviewDocument = await readJsonBound(mapping.reviewPath, 'HUMAN_REVIEW_REQUIRED');
    const review = reviewDocument.value;
    if (review?.version !== 'sekret-bip-media-review@v1'
      || review.reviewType !== 'human'
      || !text(review.reviewId) || !text(review.reviewerId)
      || !timestamp(review.reviewedAt)
      || Date.parse(review.reviewedAt) < Date.parse(receipt.recordedAt)
      || review.reviewId === receipt.approvalRecordId
      || review.projectId !== projectId || review.jobId !== receipt.jobId
      || review.inputFingerprint !== receipt.inputFingerprint
      || review.shot !== shot || !HASH.test(review.sha256 ?? '')
      || review.sha256.toLowerCase() !== sha256
      || review.approved !== true || review.identityApproved !== true
      || review.continuityApproved !== true || review.audioApproved !== true) reject('HUMAN_REVIEW_REJECTED');
    shots.push({ shot, path: mapping.mediaPath, sha256, approved: true, approvalEvidence: { jobReceiptSha256: receiptDocument.sha256, humanReviewSha256: reviewDocument.sha256 } });
  }
  return { shots };
}

export async function writeImportedSources({ projectId, mappings, outputPath }) {
  if (!text(outputPath) || !isAbsolute(outputPath)) reject('OUTPUT_PATH_REQUIRED');
  const sources = await importMediaJobClips({ projectId, mappings });
  await writeFile(outputPath, `${JSON.stringify(sources, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  return { kind: 'IMPORTED', shotCount: sources.shots.length, publishAuthority: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const arg = (name) => { const index = process.argv.indexOf(name); return index < 0 ? null : process.argv[index + 1]; };
  try {
    const mappingPath = arg('--mapping');
    const mapping = await readJson(mappingPath, 'MAPPING_FILE_REQUIRED');
    const result = await writeImportedSources({ projectId: arg('--project'), mappings: mapping.shots, outputPath: arg('--output') });
    console.log(JSON.stringify(result));
  } catch (error) {
    // Private paths, receipt contents, provider messages and media never enter logs.
    const known = new Set(['PROJECT_NOT_SUPPORTED', 'SHOT_MAPPING_REQUIRED', 'SHOT_INVALID', 'SHOT_DUPLICATED', 'JOB_RECEIPT_INVALID', 'JOB_RECEIPT_REJECTED', 'NEEDS_MATERIALIZATION', 'LOCAL_MP4_REQUIRED', 'LOCAL_MP4_EMPTY', 'PROVIDER_OUTPUT_HASH_MISMATCH', 'HUMAN_REVIEW_REQUIRED', 'HUMAN_REVIEW_REJECTED', 'OUTPUT_PATH_REQUIRED', 'MAPPING_FILE_REQUIRED']);
    console.error(JSON.stringify({ kind: 'REJECTED', code: error?.code === 'EEXIST' ? 'OUTPUT_ALREADY_EXISTS' : known.has(error?.code) ? error.code : 'MEDIA_IMPORT_FAILED' }));
    process.exitCode = 1;
  }
}

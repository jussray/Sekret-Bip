#!/usr/bin/env node
// Evidence validator for an explicitly authorized, exact-preview family journey.
// A Playwright pass or uploaded JSON file alone is not production proof.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const CHECKPOINTS = Object.freeze({
  permanentTeenSignIn: 'passed',
  teenOnboarding: 'passed-real-ui',
  circlePseudonymity: 'passed-distinct-profile-row',
  parentLink: 'passed-real-ui',
  parentLinkDidNotVerifyTeen: 'passed',
  parentPrivatePullDenied: 'passed',
  bridgeSignalWrite: 'passed-real-ui-and-provider-row',
  parentBridgeSignalVisible: 'passed-real-ui',
  teenAgeAssurance: 'passed-explicit-guardian-action',
  bipJrProvisioning: 'passed-real-ui-and-consent-receipt',
  bipJrArchive: 'passed-consent-revoked',
});
const ACCOUNT_CLASSES = Object.freeze([
  'disposable-permanent-teen',
  'controlled-verified-guardian',
  'guardian-managed-bip-jr-profile',
]);
const PRIVACY = Object.freeze({
  screenshotsCaptured: false,
  traceCaptured: false,
  videoCaptured: false,
  credentialsWrittenToReceipt: false,
  authTokensWrittenToReceipt: false,
  userIdsWrittenToReceipt: false,
  privateMessageContentWrittenToReceipt: false,
  syntheticContentOnly: true,
});

function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function exactKeys(value, required, location) {
  if (!record(value)) throw new Error(`FAMILY_PROOF_${location}_INVALID`);
  const actual = Object.keys(value);
  if (actual.some(key => !required.includes(key))) throw new Error('FAMILY_PROOF_UNEXPECTED_FIELD');
  if (required.some(key => !Object.hasOwn(value, key))) throw new Error(`FAMILY_PROOF_${location}_INVALID`);
}

/**
 * Validate the existing e2e/live-family-authority.spec.ts receipt.
 * This verifies receipt completeness, not independently observed Supabase state.
 */
export function verifyLiveFamilyProof(value, { expectedSha, expectedBaseUrl }) {
  if (!/^[0-9a-f]{40}$/.test(expectedSha || '')) throw new Error('EXPECTED_HEAD_SHA_INVALID');
  let preview;
  try { preview = new URL(expectedBaseUrl); } catch { throw new Error('PREVIEW_ORIGIN_REQUIRED'); }
  if (preview.protocol !== 'https:' || !preview.hostname.endsWith('.pages.dev') || preview.username || preview.password) {
    throw new Error('PREVIEW_ORIGIN_REQUIRED');
  }
  const expectedOrigin = preview.origin;
  exactKeys(value, ['schemaVersion', 'exactHeadSha', 'canonicalUrl', 'accountClasses', 'checkpoints', 'privacy', 'observedAt'], 'RECEIPT');
  if (value.schemaVersion !== 1) throw new Error('FAMILY_PROOF_SCHEMA_INVALID');
  if (value.exactHeadSha !== expectedSha) throw new Error('FAMILY_PROOF_SHA_MISMATCH');
  if (value.canonicalUrl !== expectedOrigin) throw new Error('FAMILY_PROOF_ORIGIN_MISMATCH');
  if (!Array.isArray(value.accountClasses) ||
      value.accountClasses.length !== ACCOUNT_CLASSES.length ||
      value.accountClasses.some((kind, i) => kind !== ACCOUNT_CLASSES[i])) {
    throw new Error('FAMILY_PROOF_ACCOUNT_CLASSES_INVALID');
  }
  exactKeys(value.checkpoints, Object.keys(CHECKPOINTS), 'CHECKPOINT');
  for (const [name, expected] of Object.entries(CHECKPOINTS)) {
    if (value.checkpoints[name] !== expected) throw new Error('FAMILY_PROOF_CHECKPOINT_INVALID');
  }
  exactKeys(value.privacy, Object.keys(PRIVACY), 'PRIVACY');
  for (const [name, expected] of Object.entries(PRIVACY)) {
    if (value.privacy[name] !== expected) throw new Error('FAMILY_PROOF_PRIVACY_INVALID');
  }
  if (typeof value.observedAt !== 'string' ||
      !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value.observedAt) ||
      !Number.isFinite(Date.parse(value.observedAt))) {
    throw new Error('FAMILY_PROOF_TIMESTAMP_INVALID');
  }
  return {
    exactHeadSha: expectedSha,
    previewOrigin: expectedOrigin,
    checkpointsVerified: Object.keys(CHECKPOINTS).length,
    privacyVerified: true,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    if (process.env.LIVE_ONBOARDING_PHASE !== 'family') throw new Error('FAMILY_PROOF_PHASE_INVALID');
    const receipt = JSON.parse(fs.readFileSync('artifacts/live-family-authority.json', 'utf8'));
    verifyLiveFamilyProof(receipt, {
      expectedSha: process.env.EXPECTED_HEAD_SHA,
      expectedBaseUrl: process.env.LIVE_ONBOARDING_BASE_URL,
    });
    console.log('FAMILY_PROOF_RECEIPT_VALIDATED');
  } catch (error) {
    // Never echo receipt content, credentials, or identity data to CI logs.
    if (error?.code === 'ENOENT') console.error('FAMILY_PROOF_RECEIPT_MISSING');
    else if (error instanceof SyntaxError) console.error('FAMILY_PROOF_JSON_INVALID');
    else console.error('FAMILY_PROOF_VALIDATION_FAILED');
    process.exitCode = 1;
  }
}

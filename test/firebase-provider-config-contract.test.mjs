import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function plist({ bundleId, appId, projectId = 'sekretbip-7e2b1', projectNumber = '123456789012' }) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<plist version="1.0"><dict>',
    '<key>PROJECT_ID</key><string>' + projectId + '</string>',
    '<key>BUNDLE_ID</key><string>' + bundleId + '</string>',
    '<key>GOOGLE_APP_ID</key><string>' + appId + '</string>',
    '<key>GCM_SENDER_ID</key><string>' + projectNumber + '</string>',
    '<key>API_KEY</key><string>super-secret-test-api-key</string>',
    '</dict></plist>',
  ].join('\\n');
}

function android({ packageName, appId, projectId = 'sekretbip-7e2b1', projectNumber = '123456789012' }) {
  return JSON.stringify({
    project_info: {
      project_number: projectNumber,
      project_id: projectId,
    },
    client: [{
      client_info: {
        mobilesdk_app_id: appId,
        android_client_info: { package_name: packageName },
      },
      api_key: [{ current_key: 'super-secret-test-api-key' }],
    }],
  });
}

function runVerifier({ variant, bundleId, iosAppId, androidAppId, androidPackage = bundleId }) {
  const dir = mkdtempSync(join(tmpdir(), 'bip-firebase-provider-'));
  const ios = join(dir, 'GoogleService-Info.plist');
  const androidPath = join(dir, 'google-services.json');
  writeFileSync(ios, plist({ bundleId, appId: iosAppId }));
  writeFileSync(androidPath, android({ packageName: androidPackage, appId: androidAppId }));

  return spawnSync(process.execPath, [
    'scripts/verify-firebase-provider-config.mjs',
    '--variant', variant,
    '--ios', ios,
    '--android', androidPath,
  ], {
    cwd: process.cwd(),
    encoding: 'utf8',
  });
}

test('Teen provider files verify without printing raw config secrets or App IDs', () => {
  const result = runVerifier({
    variant: 'teen',
    bundleId: 'com.sekretbip.app',
    iosAppId: '1:123456789012:ios:abc123',
    androidAppId: '1:123456789012:android:def456',
  });

  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.status, 'verified');
  assert.equal(receipt.variant, 'teen');
  assert.equal(receipt.projectId, 'sekretbip-7e2b1');
  assert.equal(receipt.bundleId, 'com.sekretbip.app');
  assert.match(receipt.iosConfigSha256, /^[a-f0-9]{64}$/);
  assert.match(receipt.androidConfigSha256, /^[a-f0-9]{64}$/);
  assert.doesNotMatch(result.stdout, /super-secret-test-api-key/);
  assert.doesNotMatch(result.stdout, /1:123456789012:ios:abc123/);
  assert.doesNotMatch(result.stdout, /1:123456789012:android:def456/);
});

test('Parent provider files verify against the distinct parent identity', () => {
  const result = runVerifier({
    variant: 'parent',
    bundleId: 'com.sekretbip.parent',
    iosAppId: '1:123456789012:ios:parentabc',
    androidAppId: '1:123456789012:android:parentdef',
  });

  assert.equal(result.status, 0, result.stderr);
  const receipt = JSON.parse(result.stdout);
  assert.equal(receipt.variant, 'parent');
  assert.equal(receipt.bundleId, 'com.sekretbip.parent');
});

test('Variant mismatch fails closed instead of accepting another Bip app identity', () => {
  const result = runVerifier({
    variant: 'teen',
    bundleId: 'com.sekretbip.app',
    androidPackage: 'com.sekretbip.parent',
    iosAppId: '1:123456789012:ios:abc123',
    androidAppId: '1:123456789012:android:def456',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Android provider file does not contain the requested app package/);
});

test('wrong Firebase project fails closed', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bip-firebase-provider-'));
  const ios = join(dir, 'GoogleService-Info.plist');
  const androidPath = join(dir, 'google-services.json');
  writeFileSync(ios, plist({
    bundleId: 'com.sekretbip.app',
    appId: '1:123456789012:ios:abc123',
    projectId: 'wrong-project',
  }));
  writeFileSync(androidPath, android({
    packageName: 'com.sekretbip.app',
    appId: '1:123456789012:android:def456',
  }));

  const result = spawnSync(process.execPath, [
    'scripts/verify-firebase-provider-config.mjs',
    '--variant', 'teen',
    '--ios', ios,
    '--android', androidPath,
  ], { cwd: process.cwd(), encoding: 'utf8' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /iOS project ID does not match canonical Firebase project/);
});

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import process from 'node:process';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const pkg = readJson('package.json');
const eas = readJson('eas.json');
const errors = [];
const warnings = [];

const EXPECTED = {
  teen: {
    profile: 'production',
    iosBundleIdentifier: 'com.sekretbip.app',
    androidPackage: 'com.sekretbip.app',
    scheme: 'sekretbip',
  },
  parent: {
    profile: 'parent-production',
    iosBundleIdentifier: 'com.sekretbip.parent',
    androidPackage: 'com.sekretbip.parent',
    scheme: 'sekretbipparent',
  },
};

function fail(message) {
  errors.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function expoMajor() {
  const raw = pkg.dependencies?.expo ?? '';
  const match = String(raw).match(/(\d+)/);
  return match ? Number(match[1]) : Number.NaN;
}

function renderExpoConfig(variant) {
  const executable = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const stdout = execFileSync(
    executable,
    ['expo', 'config', '--type', 'public', '--json'],
    {
      env: {
        ...process.env,
        APP_VARIANT: variant,
        EXPO_PUBLIC_APP_VARIANT: variant,
      },
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  );

  const parsed = JSON.parse(stdout);
  return parsed.exp ?? parsed;
}

function assertAsset(path, label) {
  assert(typeof path === 'string' && path.length > 0, `${label} is missing from resolved Expo config.`);
  if (typeof path === 'string' && path.length > 0) {
    assert(existsSync(path), `${label} points to a missing file: ${path}`);
  }
}

assert(Number.isFinite(expoMajor()) && expoMajor() >= 56, 'Expo SDK must be 56 or newer for the current Android API 36 / iOS 26 SDK release lane.');
assert(/^\d+\.\d+\.\d+$/.test(eas.cli?.version ?? ''), 'eas.json cli.version must be an exact x.y.z version, not a floating range.');
assert(eas.cli?.appVersionSource === 'remote', 'eas.json must use remote app version authority so store build numbers stay monotonic.');

for (const [variant, expected] of Object.entries(EXPECTED)) {
  const profile = eas.build?.[expected.profile];
  assert(profile, `Missing EAS build profile: ${expected.profile}`);
  if (profile) {
    assert(profile.autoIncrement === true, `${expected.profile} must autoIncrement native build versions.`);
    assert(profile.distribution === 'store', `${expected.profile} must explicitly use store distribution.`);
    assert(profile.android?.buildType === 'app-bundle', `${expected.profile} Android buildType must be app-bundle.`);
    assert(profile.env?.APP_VARIANT === variant, `${expected.profile} APP_VARIANT must be ${variant}.`);
    assert(profile.env?.EXPO_PUBLIC_APP_VARIANT === variant, `${expected.profile} EXPO_PUBLIC_APP_VARIANT must be ${variant}.`);
    assert(profile.env?.EXPO_PUBLIC_RELEASE_AUDIENCE === 'public', `${expected.profile} release audience must be public.`);
    assert(profile.env?.EXPO_PUBLIC_BACKEND_URL === 'https://api.sekretbip.net', `${expected.profile} must use the canonical production API origin.`);
  }

  let config;
  try {
    config = renderExpoConfig(variant);
  } catch (error) {
    fail(`Could not resolve Expo config for ${variant}: ${error instanceof Error ? error.message : String(error)}`);
    continue;
  }

  assert(config.ios?.bundleIdentifier === expected.iosBundleIdentifier, `${variant} iOS bundle identifier drifted from ${expected.iosBundleIdentifier}.`);
  assert(config.android?.package === expected.androidPackage, `${variant} Android package drifted from ${expected.androidPackage}.`);
  assert(config.scheme === expected.scheme, `${variant} URL scheme drifted from ${expected.scheme}.`);
  assert(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption === false, `${variant} must explicitly declare its current non-exempt-encryption posture.`);
  assert(Array.isArray(config.platforms) && config.platforms.includes('ios') && config.platforms.includes('android'), `${variant} must resolve both ios and android platforms.`);
  assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config.extra?.eas?.projectId ?? ''), `${variant} is missing a valid EAS projectId.`);
  assertAsset(config.icon, `${variant} store icon`);
  assertAsset(config.android?.adaptiveIcon?.foregroundImage, `${variant} Android adaptive icon foreground`);
}

if (pkg.dependencies?.['react-native-worklets'] && expoMajor() === 56) {
  warnings.push('Expo SDK 56 + react-native-worklets is release-review debt. It is not a store-SDK compliance failure, but should be re-evaluated against the current Expo SDK before public rollout.');
}

const receipt = {
  schema: 'sekret-bip/mobile-store-readiness@v1',
  checkedAt: new Date().toISOString(),
  expoSdk: pkg.dependencies?.expo ?? null,
  reactNative: pkg.dependencies?.['react-native'] ?? null,
  easCli: eas.cli?.version ?? null,
  variants: Object.keys(EXPECTED),
  platforms: ['ios', 'android'],
  buildReadiness: errors.length === 0 ? 'PASS' : 'FAIL',
  submissionAuthority: 'SEPARATE_GATE',
  warnings,
  errors,
};

process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);

if (errors.length > 0) {
  process.exitCode = 1;
}

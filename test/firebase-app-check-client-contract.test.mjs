import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function collectSourceFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectSourceFiles(fullPath));
    else if (entry.isFile() && /\.(?:ts|tsx|js|mjs)$/.test(entry.name)) files.push(fullPath);
  }
  return files;
}

test('App Check client dependencies and Expo plugins stay narrowly scoped', () => {
  const pkg = JSON.parse(read('package.json'));
  const appJson = JSON.parse(read('app.json'));
  const pluginNames = appJson.expo.plugins.map((entry) => Array.isArray(entry) ? entry[0] : entry);

  assert.equal(pkg.dependencies['@react-native-firebase/app'], '26.4.0');
  assert.equal(pkg.dependencies['@react-native-firebase/app-check'], '26.4.0');
  assert.ok(pluginNames.includes('@react-native-firebase/app'));
  assert.ok(pluginNames.includes('@react-native-firebase/app-check'));

  for (const prohibited of [
    '@react-native-firebase/auth',
    '@react-native-firebase/firestore',
    '@react-native-firebase/database',
    '@react-native-firebase/storage',
    '@react-native-firebase/functions',
  ]) {
    assert.equal(pkg.dependencies[prohibited], undefined, `${prohibited} must not enter the V1 client dependency boundary`);
  }
});

test('App Check client is opt-in and uses platform attestation without debug-token source material', () => {
  const client = read('src/services/firebase/appCheck.ts');
  const envExample = read('.env.example');

  assert.match(client, /EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED === 'true'/);
  assert.match(client, /provider: __DEV__ \? 'debug' : 'playIntegrity'/);
  assert.match(client, /provider: __DEV__ \? 'debug' : 'appAttestWithDeviceCheckFallback'/);
  assert.match(client, /provider: 'reCaptchaEnterprise'/);
  assert.match(client, /EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY/);
  assert.match(client, /isTokenAutoRefreshEnabled: true/);
  assert.match(client, /getToken\(appCheck\)/);
  assert.match(client, /return \{\};/);

  assert.match(envExample, /EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED=false/);
  assert.doesNotMatch(envExample, /EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN\s*=/);
  assert.doesNotMatch(client, /debugToken\s*:/);
});

test('Supabase identity and Firebase attestation remain independent at one backend header boundary', () => {
  const backendAuth = read('src/utils/backendAuth.ts');
  const client = read('src/services/firebase/appCheck.ts');

  assert.match(backendAuth, /resolveBackendToken\(\)/);
  assert.match(backendAuth, /firebaseAppCheckHeaders\(\)/);
  assert.match(backendAuth, /delete safeExtra\['X-Firebase-AppCheck'\]/);
  assert.match(backendAuth, /\.\.\.appCheckHeaders/);
  assert.doesNotMatch(client, /Authorization/);
  assert.doesNotMatch(client, /userId/);
});

test('public health remains unattested while protected backend posts inherit canonical headers', () => {
  const sekretClient = read('src/services/backend/sekretClient.ts');
  const bridgeSummary = read('src/services/bridgeSummaryService.ts');

  assert.match(sekretClient, /headers: await backendAuthHeaders\(\)/);
  assert.match(bridgeSummary, /const headers = await backendAuthHeaders\(\)/);

  const pingStart = sekretClient.indexOf('async ping()');
  const pingBody = sekretClient.slice(pingStart);
  assert.match(pingBody, /'\/health'/);
  assert.doesNotMatch(pingBody, /backendAuthHeaders\(\)/);
});

test('server enforcement remains off by default and Firebase cannot become a second auth or data backend', () => {
  const wrangler = read('wrangler.toml');
  const roots = ['app', 'src', 'worker'].map((part) => path.join(root, part));
  const source = roots.flatMap(collectSourceFiles).map((file) => fs.readFileSync(file, 'utf8')).join('\n');

  assert.match(wrangler, /FIREBASE_APPCHECK_MODE = "off"/);

  for (const prohibited of [
    '@react-native-firebase/auth',
    '@react-native-firebase/firestore',
    '@react-native-firebase/database',
    '@react-native-firebase/storage',
    '@react-native-firebase/functions',
    'firebase/auth',
    'firebase/firestore',
    'firebase/database',
    'firebase/storage',
    'firebase/functions',
  ]) {
    assert.ok(!source.includes(prohibited), `prohibited Firebase authority surface detected: ${prohibited}`);
  }
});

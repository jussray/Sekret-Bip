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
  const buildProperties = appJson.expo.plugins.find(
    (entry) => Array.isArray(entry) && entry[0] === 'expo-build-properties',
  );

  assert.equal(pkg.dependencies['@react-native-firebase/app'], '26.4.0');
  assert.equal(pkg.dependencies['@react-native-firebase/app-check'], '26.4.0');
  assert.equal(pkg.dependencies['expo-build-properties'], '56.0.19');
  assert.ok(pluginNames.includes('@react-native-firebase/app'));
  assert.ok(pluginNames.includes('@react-native-firebase/app-check'));
  assert.ok(buildProperties);
  assert.equal(buildProperties[1]?.ios?.useFrameworks, 'static');

  for (const prohibited of [
    '@react-native-firebase/auth',
    '@react-native-firebase/firestore',
    '@react-native-firebase/database',
    '@react-native-firebase/storage',
    '@react-native-firebase/functions',
  ]) {
    assert.equal(pkg.dependencies[prohibited], undefined, `${prohibited} must not enter the client authority boundary`);
  }
});

test('runtime installs only the request-scoped App Check provider seam', () => {
  const client = read('src/services/firebase/appCheck.ts');
  const seam = read('src/services/appCheckToken.ts');
  const layout = read('app/_layout.tsx');

  assert.match(client, /registerAppCheckTokenProvider/);
  assert.match(client, /readFreshAppCheckToken/);
  assert.match(client, /EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED === 'true'/);
  assert.match(client, /provider: __DEV__ \? 'debug' : 'playIntegrity'/);
  assert.match(client, /provider: __DEV__ \? 'debug' : 'appAttestWithDeviceCheckFallback'/);
  assert.match(client, /provider: 'reCaptchaEnterprise'/);
  assert.match(client, /isTokenAutoRefreshEnabled: true/);
  assert.match(client, /getToken\(appCheck\)/);
  assert.doesNotMatch(client, /AsyncStorage|SecureStore|document\.cookie|Set-Cookie/);

  assert.match(seam, /getAppCheckToken/);
  assert.match(layout, /installFirebaseAppCheckTokenProvider/);
  assert.match(layout, /useEffect\(\(\) => installFirebaseAppCheckTokenProvider\(\), \[\]\)/);
});

test('disabled default does not load native Firebase at module evaluation', () => {
  const client = read('src/services/firebase/appCheck.ts');
  assert.doesNotMatch(client, /^import .* from ['"]@react-native-firebase\/app['"];?$/m);
  assert.doesNotMatch(client, /^import \{[^}]*getToken[^}]*\} from ['"]@react-native-firebase\/app-check['"];?$/m);
  assert.match(client, /await import\('@react-native-firebase\/app'\)/);
  assert.match(client, /await import\('@react-native-firebase\/app-check'\)/);
});

test('canonical backend headers cannot be caller-spoofed', () => {
  const backendAuth = read('src/utils/backendAuth.ts');

  assert.match(backendAuth, /getAppCheckToken\(\)/);
  assert.match(backendAuth, /key\.toLowerCase\(\)/);
  assert.match(backendAuth, /normalized === 'authorization'/);
  assert.match(backendAuth, /normalized === 'x-firebase-appcheck'/);
  assert.match(backendAuth, /delete safeExtra\[key\]/);
  assert.match(backendAuth, /backendHeaders\(token, safeExtra\)/);
  assert.match(backendAuth, /headers\['X-Firebase-AppCheck'\] = appCheckToken/);
});

test('server enforcement stays off and Firebase cannot become a second backend authority', () => {
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

test('Firebase native provider files enter only through EAS file variables and proof-only profiles', () => {
  const appConfig = read('app.config.ts');
  const eas = JSON.parse(read('eas.json'));
  const gitignore = read('.gitignore');

  assert.match(appConfig, /process\.env\.GOOGLE_SERVICES_JSON/);
  assert.match(appConfig, /process\.env\.GOOGLE_SERVICE_INFO_PLIST/);
  assert.match(appConfig, /googleServicesFile: googleServicesJson/);
  assert.match(appConfig, /googleServicesFile: googleServiceInfoPlist/);

  assert.equal(eas.build['firebase-preview'].extends, 'preview');
  assert.equal(eas.build['firebase-preview'].env.EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED, 'true');
  assert.equal(eas.build['firebase-preview'].env.APP_VARIANT, 'teen');
  assert.equal(eas.build['parent-firebase-preview'].extends, 'parent-preview');
  assert.equal(eas.build['parent-firebase-preview'].env.EXPO_PUBLIC_FIREBASE_APPCHECK_ENABLED, 'true');
  assert.equal(eas.build['parent-firebase-preview'].env.APP_VARIANT, 'parent');

  assert.match(gitignore, /^google-services\.json$/m);
  assert.match(gitignore, /^GoogleService-Info\.plist$/m);
  assert.doesNotMatch(appConfig, /1:\d+:(?:ios|android):[a-f0-9]+/i);
});

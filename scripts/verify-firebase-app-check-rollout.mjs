import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function fail(message) {
  throw new Error(`[verify:firebase-app-check] ${message}`);
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function walk(relativeDir) {
  const absoluteDir = path.join(root, relativeDir);
  if (!fs.existsSync(absoluteDir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(absoluteDir, { withFileTypes: true })) {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(relativePath));
    } else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name)) {
      files.push(relativePath);
    }
  }
  return files;
}

function checkedInMode(wrangler) {
  const match = wrangler.match(/^FIREBASE_APPCHECK_MODE\s*=\s*"([^"]+)"\s*$/m);
  if (!match) fail('wrangler.toml must declare FIREBASE_APPCHECK_MODE explicitly');
  const mode = match[1].trim().toLowerCase();
  if (!['off', 'observe', 'enforce'].includes(mode)) {
    fail(`unsupported checked-in FIREBASE_APPCHECK_MODE=${mode}`);
  }
  return mode;
}

function runtimeProviderRegistrations() {
  const sourceFiles = [...walk('app'), ...walk('src')]
    .filter((file) => file !== path.join('src', 'services', 'appCheckToken.ts'));

  return sourceFiles.filter((file) => {
    const text = read(file);
    return /\bregisterAppCheckTokenProvider\s*\(/.test(text);
  });
}

const wrangler = read('wrangler.toml');
const packageJson = JSON.parse(read('package.json'));
const providerGuide = read('docs/PROVIDERS.md');
const appCheckToken = read('src/services/appCheckToken.ts');
const backendAuth = read('src/utils/backendAuth.ts');

const mode = checkedInMode(wrangler);
const registrationFiles = runtimeProviderRegistrations();
const dependencies = {
  firebase: Boolean(packageJson.dependencies?.firebase),
  reactNativeFirebaseAppCheck: Boolean(packageJson.dependencies?.['@react-native-firebase/app-check']),
};
const providerRegistered = registrationFiles.length > 0;

if (!/getAppCheckToken\(\)/.test(backendAuth) || !/X-Firebase-AppCheck/.test(backendAuth)) {
  fail('canonical backend transport must request and attach App Check tokens through backendAuthHeaders');
}

const persistencePatterns = [
  /from\s+['"]@react-native-async-storage\/async-storage['"]/,
  /from\s+['"]expo-secure-store['"]/,
  /AsyncStorage\.(?:getItem|setItem|removeItem)/,
  /SecureStore\.(?:getItemAsync|setItemAsync|deleteItemAsync)/,
  /document\.cookie\s*=/,
  /Set-Cookie\s*:/i,
];
if (persistencePatterns.some((pattern) => pattern.test(appCheckToken))) {
  fail('App Check tokens must remain request-scoped and nonpersistent');
}

if (!/off\s*\n→ bind authenticated provider identities\s*\n→ acquire real client token\s*\n→ observe/.test(providerGuide)) {
  fail('docs/PROVIDERS.md must preserve the observe-before-enforce rollout ladder');
}

if (mode === 'observe' && !providerRegistered) {
  fail('observe mode requires a real runtime App Check token provider registration');
}

if (mode === 'enforce') {
  fail('checked-in enforce mode is forbidden; enforcement requires separate provider/runtime proof and founder approval');
}

const readiness = providerRegistered ? 'client-seam-wired' : 'foundation-only';

console.log(JSON.stringify({
  ok: true,
  mode,
  readiness,
  providerRegistered,
  registrationFiles,
  dependencies,
  enforcementAuthorized: false,
}, null, 2));

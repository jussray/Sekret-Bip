import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

function fail(message) {
  throw new Error(`[verify:firebase-app-check] ${message}`);
}

function checkedInMode(wrangler) {
  const match = wrangler.match(/^FIREBASE_APPCHECK_MODE\s*=\s*"([^"]+)"\s*$/m);
  if (!match) fail('wrangler.toml must declare FIREBASE_APPCHECK_MODE explicitly');
  const mode = match[1].trim().toLowerCase();
  if (!['off', 'observe', 'enforce'].includes(mode)) {
    fail('wrangler.toml contains an unsupported FIREBASE_APPCHECK_MODE');
  }
  return mode;
}

function parseMatchedFiles(stdout) {
  return new Set(
    stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.split(':', 1)[0])
      .filter(Boolean),
  );
}

function checkedGitGrep(args, description) {
  const result = spawnSync('git', args, { encoding: 'utf8' });
  if (result.status === 1) return new Set();
  if (result.status !== 0) fail(`unable to inspect ${description}`);
  return parseMatchedFiles(result.stdout);
}

const wrangler = fs.readFileSync('wrangler.toml', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const providerGuide = fs.readFileSync('docs/PROVIDERS.md', 'utf8');
const appCheckToken = fs.readFileSync('src/services/appCheckToken.ts', 'utf8');
const backendAuth = fs.readFileSync('src/utils/backendAuth.ts', 'utf8');

const registrationFiles = checkedGitGrep(
  [
    'grep',
    '-l',
    '-E',
    '^[[:space:]]*((void|await|return)[[:space:]]+)?registerAppCheckTokenProvider[[:space:]]*\\(',
    '--',
    'app',
    'src',
  ],
  'runtime App Check provider registrations',
);
registrationFiles.delete('src/services/appCheckToken.ts');

const providerStorageWriteFiles = checkedGitGrep(
  [
    'grep',
    '-l',
    '-E',
    'AsyncStorage\\.(setItem|multiSet)|SecureStore\\.setItemAsync|document\\.cookie[[:space:]]*=|Set-Cookie',
    '--',
    'app',
    'src',
  ],
  'runtime storage writes',
);

const mode = checkedInMode(wrangler);
const providerRegistered = registrationFiles.size > 0;
const dependencies = {
  firebase: Boolean(packageJson.dependencies?.firebase),
  reactNativeFirebaseAppCheck: Boolean(packageJson.dependencies?.['@react-native-firebase/app-check']),
};
const firebaseSdkPresent = dependencies.firebase || dependencies.reactNativeFirebaseAppCheck;

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

for (const file of registrationFiles) {
  if (providerStorageWriteFiles.has(file)) {
    fail('runtime App Check provider registration must be isolated from durable client storage writes');
  }
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

process.stdout.write(`${JSON.stringify({
  ok: true,
  mode,
  readiness,
  providerRegistered,
  firebaseSdkPresent,
  enforcementAuthorized: false,
})}\n`);
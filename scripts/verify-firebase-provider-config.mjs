import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';

const FIREBASE_PROJECT_ID = 'sekretbip-7e2b1';
const VARIANTS = {
  teen: 'com.sekretbip.app',
  parent: 'com.sekretbip.parent',
};

function fail(message) {
  console.error('FIREBASE_PROVIDER_CONFIG_INVALID: ' + message);
  process.exit(1);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith('--')) continue;
    const key = part.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) fail('missing value for --' + key);
    args[key] = value;
    i += 1;
  }
  return args;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function xmlDecode(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
}

function plistString(xml, key) {
  const escaped = escapeRegex(key);
  const pattern = new RegExp('<key>\\s*' + escaped + '\\s*<\\/key>\\s*<string>([\\s\\S]*?)<\\/string>');
  const match = xml.match(pattern);
  return match ? xmlDecode(match[1].trim()) : null;
}

const args = parseArgs(process.argv.slice(2));
const variant = args.variant;
const expectedIdentity = VARIANTS[variant];
if (!expectedIdentity) fail('variant must be teen or parent');

const iosPath = args.ios ?? process.env.GOOGLE_SERVICE_INFO_PLIST;
const androidPath = args.android ?? process.env.GOOGLE_SERVICES_JSON;
if (!iosPath || !androidPath) fail('both iOS and Android provider file paths are required');
if (!existsSync(iosPath)) fail('iOS provider file does not exist');
if (!existsSync(androidPath)) fail('Android provider file does not exist');

const iosRaw = readFileSync(iosPath, 'utf8');
const androidRaw = readFileSync(androidPath, 'utf8');

let android;
try {
  android = JSON.parse(androidRaw);
} catch {
  fail('Android provider file is not valid JSON');
}

const iosProjectId = plistString(iosRaw, 'PROJECT_ID');
const iosBundleId = plistString(iosRaw, 'BUNDLE_ID');
const iosAppId = plistString(iosRaw, 'GOOGLE_APP_ID');
const iosProjectNumber = plistString(iosRaw, 'GCM_SENDER_ID');

if (iosProjectId !== FIREBASE_PROJECT_ID) fail('iOS project ID does not match canonical Firebase project');
if (iosBundleId !== expectedIdentity) fail('iOS bundle identifier does not match requested app variant');
if (!/^1:\\d+:ios:[A-Za-z0-9]+$/.test(iosAppId ?? '')) fail('iOS Firebase App ID is missing or malformed');
if (!/^\\d+$/.test(iosProjectNumber ?? '')) fail('iOS project number is missing or malformed');

if (android?.project_info?.project_id !== FIREBASE_PROJECT_ID) {
  fail('Android project ID does not match canonical Firebase project');
}

const clients = Array.isArray(android?.client) ? android.client : [];
const androidClient = clients.find(
  (client) => client?.client_info?.android_client_info?.package_name === expectedIdentity,
);
if (!androidClient) fail('Android provider file does not contain the requested app package');

const androidAppId = androidClient?.client_info?.mobilesdk_app_id;
const androidProjectNumber = String(android?.project_info?.project_number ?? '');
if (!/^1:\\d+:android:[A-Za-z0-9]+$/.test(androidAppId ?? '')) {
  fail('Android Firebase App ID is missing or malformed');
}
if (!/^\\d+$/.test(androidProjectNumber)) fail('Android project number is missing or malformed');
if (androidProjectNumber !== iosProjectNumber) fail('iOS and Android configs disagree on Firebase project number');

const receipt = {
  schema: 'sekret-bip/firebase-provider-config@v1',
  status: 'verified',
  variant,
  projectId: FIREBASE_PROJECT_ID,
  bundleId: expectedIdentity,
  androidPackage: expectedIdentity,
  projectNumber: androidProjectNumber,
  iosConfigSha256: sha256(iosRaw),
  androidConfigSha256: sha256(androidRaw),
  iosAppIdSha256: sha256(iosAppId),
  androidAppIdSha256: sha256(androidAppId),
};

process.stdout.write(JSON.stringify(receipt, null, 2) + '\\n');

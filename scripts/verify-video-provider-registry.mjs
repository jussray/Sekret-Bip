import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const APPROVED_PERMISSIVE_LICENSES = new Set([
  'apache-2.0',
  'mit',
  'bsd-2-clause',
  'bsd-3-clause'
]);

function fail(message) {
  console.error(`VIDEO_PROVIDER_REGISTRY_INVALID: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const selectCanary = args.includes('--select-canary');
const registryArgIndex = args.indexOf('--registry');
let registryPath = path.join(root, 'production/video-providers/registry.json');

if (registryArgIndex >= 0) {
  const registryArg = args[registryArgIndex + 1];
  if (!registryArg || registryArg.startsWith('--')) {
    fail('--registry requires a path argument');
  }
  registryPath = path.resolve(root, registryArg);
}

if (!fs.existsSync(registryPath)) {
  fail(`missing registry at ${registryPath}`);
}

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (error) {
  fail(`cannot parse JSON: ${error.message}`);
}

if (registry.schemaVersion !== 1) fail('schemaVersion must equal 1');
if (!registry.authority || registry.authority.providerAuthority !== 'animation-only') {
  fail('provider authority must stay animation-only');
}
if (registry.authority.providerMayCreateIdentity !== false) fail('providers may not create canon identity');
if (registry.authority.providerMayOverrideCast !== false) fail('providers may not override cast');
if (registry.authority.providerMayPromoteCanon !== false) fail('providers may not promote canon');
if (!Array.isArray(registry.providers) || registry.providers.length === 0) fail('providers must be a non-empty array');

const ids = new Set();
for (const provider of registry.providers) {
  if (!provider.id || ids.has(provider.id)) fail(`provider id missing or duplicated: ${provider.id ?? '<missing>'}`);
  ids.add(provider.id);

  if (provider.task !== 'image-to-video') fail(`${provider.id}: only image-to-video providers are allowed in this registry`);
  if (provider.requiresApprovedKeyframe !== true) fail(`${provider.id}: approved keyframe gate is required`);
  if (provider.requiresCharacterCanon !== true) fail(`${provider.id}: character canon gate is required`);
  if (provider.textOnlyIdentityAllowed !== false) fail(`${provider.id}: prompt-only identity must stay forbidden`);
  if (provider.requiresIdentityQa !== true) fail(`${provider.id}: post-generation identity QA is required`);
  if (provider.requiresPlaywrightPlayback !== true) fail(`${provider.id}: Playwright playback proof is required`);
  if (provider.requiresCostPreflight !== true) fail(`${provider.id}: cost/allowance preflight is required`);

  if (provider.kind === 'huggingface') {
    if (!provider.modelId || !provider.modelId.includes('/')) fail(`${provider.id}: Hugging Face modelId must be owner/repo`);
    if (!provider.library) fail(`${provider.id}: Hugging Face library metadata is required`);

    const license = String(provider.license ?? '').toLowerCase();
    const eligibilityRequested = provider.canaryEligible === true || provider.productionEligible === true;
    if (eligibilityRequested && !APPROVED_PERMISSIVE_LICENSES.has(license)) {
      fail(`${provider.id}: canary/production eligibility requires an allowlisted permissive license`);
    }

    if (eligibilityRequested && provider.commercialUseStatus !== 'permissive-license') {
      fail(`${provider.id}: Hugging Face eligibility requires an explicitly permissive license status`);
    }

    if (provider.productionEligible === true && provider.identityCanaryPassed !== true) {
      fail(`${provider.id}: Hugging Face production eligibility requires a passed identity canary`);
    }
  }
}

const defaultProvider = registry.providers.find((provider) => provider.id === registry.defaultProductionProvider);
if (!defaultProvider) fail('defaultProductionProvider does not exist');
if (defaultProvider.productionEligible !== true) fail('defaultProductionProvider must be production eligible');

const hfCanaries = registry.providers
  .filter((provider) => provider.kind === 'huggingface' && provider.canaryEligible === true && provider.productionEligible === false)
  .sort((a, b) => Number(a.priority ?? 9999) - Number(b.priority ?? 9999));

if (hfCanaries.length === 0) fail('at least one fail-closed Hugging Face canary candidate is required');

if (selectCanary) {
  const candidate = hfCanaries[0];
  process.stdout.write(`${JSON.stringify({
    id: candidate.id,
    modelId: candidate.modelId,
    task: candidate.task,
    productionEligible: candidate.productionEligible,
    requiresApprovedKeyframe: candidate.requiresApprovedKeyframe,
    requiresIdentityQa: candidate.requiresIdentityQa,
    requiresPlaywrightPlayback: candidate.requiresPlaywrightPlayback
  })}\n`);
} else {
  console.log(`VIDEO_PROVIDER_REGISTRY_OK providers=${registry.providers.length} hfCanaries=${hfCanaries.length} default=${defaultProvider.id}`);
}

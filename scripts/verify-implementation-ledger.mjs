import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_STATUS_ORDER = ['planned', 'contract', 'integrated', 'verified', 'released'];
const VERIFICATION_STATES = new Set(['not-run', 'partial', 'blocked', 'passed']);
const RELEASED_ROLLOUT_STATES = new Set(['controlled', 'enabled', 'released']);
const LEDGER_EXTENSION_DIR = 'implementation-ledger.extensions';

export function isTrackedDesignPath(filePath) {
  const normalized = filePath.replaceAll('\\', '/');
  return (
    /^(AGENTS|CLAUDE|SPRINT)\.md$/i.test(normalized)
    || /^\.agents\/skills\/.+\/SKILL\.md$/i.test(normalized)
    || /^docs\/.*(?:ARCHITECTURE|ROADMAP|DESIGN|VISION|WIRING_STATUS|CURRENT_STATUS|CONTROL_ROOM).*\.md$/i.test(normalized)
  );
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasNonEmptyStringArray(value, minimum = 1) {
  return Array.isArray(value)
    && value.length >= minimum
    && value.every(isNonEmptyString);
}

function validatePathList(errors, feature, field, rootDir, minimum = 1) {
  const values = feature[field];
  if (!hasNonEmptyStringArray(values, minimum)) {
    errors.push(`${feature.id}: ${field} must contain at least ${minimum} repository path${minimum === 1 ? '' : 's'}.`);
    return;
  }

  for (const relativePath of values) {
    const absolutePath = path.resolve(rootDir, relativePath);
    if (!absolutePath.startsWith(path.resolve(rootDir) + path.sep)) {
      errors.push(`${feature.id}: ${field} contains a path outside the repository: ${relativePath}`);
      continue;
    }
    if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
      errors.push(`${feature.id}: ${field} references a missing file: ${relativePath}`);
    }
  }
}

function validateOptionalPathList(errors, feature, field, rootDir) {
  if (feature[field] === undefined) return;
  validatePathList(errors, feature, field, rootDir);
}

export function validateImplementationLedger(ledger, { rootDir = process.cwd() } = {}) {
  const errors = [];

  if (!ledger || typeof ledger !== 'object' || Array.isArray(ledger)) {
    return ['Ledger must be a JSON object.'];
  }

  if (ledger.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1.');
  }

  if (JSON.stringify(ledger.statusOrder) !== JSON.stringify(REQUIRED_STATUS_ORDER)) {
    errors.push(`statusOrder must be exactly: ${REQUIRED_STATUS_ORDER.join(' → ')}.`);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(ledger.updatedAt ?? '')) {
    errors.push('updatedAt must be an ISO date in YYYY-MM-DD format.');
  }

  if (!Array.isArray(ledger.features) || ledger.features.length === 0) {
    errors.push('features must contain at least one feature entry.');
    return errors;
  }

  const ids = new Set();

  for (const feature of ledger.features) {
    if (!feature || typeof feature !== 'object' || Array.isArray(feature)) {
      errors.push('Every feature entry must be an object.');
      continue;
    }

    const id = isNonEmptyString(feature.id) ? feature.id.trim() : '<missing-id>';
    feature.id = id;

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) {
      errors.push(`${id}: id must use lowercase kebab-case.`);
    }
    if (ids.has(id)) errors.push(`${id}: duplicate feature id.`);
    ids.add(id);

    if (!isNonEmptyString(feature.name)) {
      errors.push(`${id}: name is required.`);
    }

    const statusIndex = REQUIRED_STATUS_ORDER.indexOf(feature.status);
    if (statusIndex < 0) {
      errors.push(`${id}: status must be one of ${REQUIRED_STATUS_ORDER.join(', ')}.`);
      continue;
    }

    if (!/^https:\/\/github\.com\/jussray\/Sekret-Bip\/issues\/\d+$/.test(feature.ownerIssue ?? '')) {
      errors.push(`${id}: ownerIssue must point to a numbered jussray/Sekret-Bip GitHub issue.`);
    }

    if (!hasNonEmptyStringArray(feature.acceptanceCriteria, 2)) {
      errors.push(`${id}: acceptanceCriteria must contain at least two measurable statements.`);
    }

    if (!feature.verification || typeof feature.verification !== 'object') {
      errors.push(`${id}: verification object is required.`);
    } else {
      if (!VERIFICATION_STATES.has(feature.verification.state)) {
        errors.push(`${id}: verification.state must be one of ${[...VERIFICATION_STATES].join(', ')}.`);
      }
      if (!isNonEmptyString(feature.verification.evidence)) {
        errors.push(`${id}: verification.evidence is required, even when the state is blocked or not-run.`);
      }
      if (feature.verification.state === 'blocked' && !isNonEmptyString(feature.verification.blocker)) {
        errors.push(`${id}: blocked verification requires a concrete blocker.`);
      }
    }

    validateOptionalPathList(errors, feature, 'contractPaths', rootDir);
    validateOptionalPathList(errors, feature, 'runtimePaths', rootDir);
    validateOptionalPathList(errors, feature, 'testPaths', rootDir);
    validateOptionalPathList(errors, feature, 'telemetryPaths', rootDir);
    validateOptionalPathList(errors, feature, 'e2ePaths', rootDir);

    if (statusIndex >= REQUIRED_STATUS_ORDER.indexOf('contract')) {
      validatePathList(errors, feature, 'contractPaths', rootDir);
      validatePathList(errors, feature, 'testPaths', rootDir);
    }

    if (statusIndex >= REQUIRED_STATUS_ORDER.indexOf('integrated')) {
      validatePathList(errors, feature, 'runtimePaths', rootDir);
      validatePathList(errors, feature, 'telemetryPaths', rootDir);

      if (!feature.rollout || typeof feature.rollout !== 'object') {
        errors.push(`${id}: integrated features require a rollout object.`);
      } else {
        if (!isNonEmptyString(feature.rollout.state)) errors.push(`${id}: rollout.state is required.`);
        if (!isNonEmptyString(feature.rollout.controlPath)) {
          errors.push(`${id}: rollout.controlPath is required.`);
        } else {
          const controlPath = path.resolve(rootDir, feature.rollout.controlPath);
          if (!fs.existsSync(controlPath) || !fs.statSync(controlPath).isFile()) {
            errors.push(`${id}: rollout.controlPath references a missing file: ${feature.rollout.controlPath}`);
          }
        }
        if (!isNonEmptyString(feature.rollout.controlKey)) errors.push(`${id}: rollout.controlKey is required.`);
      }

      if (!isNonEmptyString(feature.rollback)) {
        errors.push(`${id}: integrated features require a concrete rollback statement.`);
      }
    }

    if (statusIndex >= REQUIRED_STATUS_ORDER.indexOf('verified')) {
      validatePathList(errors, feature, 'e2ePaths', rootDir);
      if (feature.verification?.state !== 'passed') {
        errors.push(`${id}: verified features require verification.state = passed.`);
      }
    }

    if (statusIndex >= REQUIRED_STATUS_ORDER.indexOf('released')) {
      if (!isNonEmptyString(feature.releaseEvidence)) {
        errors.push(`${id}: released features require releaseEvidence.`);
      }
      if (!RELEASED_ROLLOUT_STATES.has(feature.rollout?.state)) {
        errors.push(`${id}: released features require rollout.state to be controlled, enabled, or released.`);
      }
    }
  }

  return [...new Set(errors)];
}

function parseExtensionFeatures(extension, filename) {
  if (Array.isArray(extension)) return extension;
  if (extension && typeof extension === 'object' && Array.isArray(extension.features)) {
    return extension.features;
  }
  if (extension && typeof extension === 'object' && isNonEmptyString(extension.id)) {
    return [extension];
  }
  throw new Error(`${filename} must be a feature object, a feature array, or an object with a features array.`);
}

export function loadImplementationLedger({ rootDir = process.cwd() } = {}) {
  const ledgerPath = path.join(rootDir, 'implementation-ledger.json');
  if (!fs.existsSync(ledgerPath)) {
    throw new Error('implementation-ledger.json is missing.');
  }

  const ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
  const extensionDir = path.join(rootDir, LEDGER_EXTENSION_DIR);
  if (!fs.existsSync(extensionDir)) return ledger;

  const extensionFiles = fs.readdirSync(extensionDir)
    .filter(filename => filename.endsWith('.json'))
    .sort();

  const extensionFeatures = [];
  for (const filename of extensionFiles) {
    const extensionPath = path.join(extensionDir, filename);
    const parsed = JSON.parse(fs.readFileSync(extensionPath, 'utf8'));
    extensionFeatures.push(...parseExtensionFeatures(parsed, filename));
  }

  return {
    ...ledger,
    features: [...(ledger.features ?? []), ...extensionFeatures],
  };
}

export function changedFilesSince(ref, { rootDir = process.cwd() } = {}) {
  const output = execFileSync('git', ['diff', '--name-only', `${ref}...HEAD`], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return output.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
}

export function validateChangedDesignFiles(changedFiles) {
  const trackedDesignChanges = changedFiles.filter(isTrackedDesignPath);
  if (trackedDesignChanges.length === 0) return [];

  const hasLedgerEvidence = changedFiles.includes('implementation-ledger.json')
    || changedFiles.some(filePath => /^implementation-ledger\.extensions\/.+\.json$/.test(filePath));
  if (hasLedgerEvidence) return [];

  return [
    'Architecture, roadmap, status, or agent-skill files changed without implementation-ledger evidence.',
    ...trackedDesignChanges.map((filePath) => `  - ${filePath}`),
    'Update implementation-ledger.json or add a validated extension entry, or remove the unsupported implementation claim.',
  ];
}

function parseArgs(argv) {
  const args = { changedSince: null };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--changed-since') {
      args.changedSince = argv[index + 1] ?? null;
      index += 1;
    }
  }
  return args;
}

function main() {
  const rootDir = process.cwd();
  const errors = [];

  try {
    const ledger = loadImplementationLedger({ rootDir });
    errors.push(...validateImplementationLedger(ledger, { rootDir }));
  } catch (error) {
    errors.push(`implementation ledger is invalid: ${error instanceof Error ? error.message : String(error)}`);
  }

  const { changedSince } = parseArgs(process.argv.slice(2));
  if (changedSince) {
    try {
      errors.push(...validateChangedDesignFiles(changedFilesSince(changedSince, { rootDir })));
    } catch (error) {
      errors.push(`Unable to compare changed files against ${changedSince}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (errors.length > 0) {
    console.error('\nIMPLEMENTATION_EVIDENCE_GATE_FAILED');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log('IMPLEMENTATION_EVIDENCE_GATE_PASSED');
}

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) main();

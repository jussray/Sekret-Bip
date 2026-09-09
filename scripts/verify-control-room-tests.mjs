import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const EXPECTED_REPOSITORY = 'jussray/Sekret-Bip';
const ROOT = process.env.CONTROL_ROOM_REPOSITORY_ROOT
  ? path.resolve(process.env.CONTROL_ROOM_REPOSITORY_ROOT)
  : process.cwd();
const MANIFEST_PATH = path.join(ROOT, 'control-room.manifest.json');
const PACKAGE_PATH = path.join(ROOT, 'package.json');
const WORKFLOW_DIR = path.join(ROOT, '.github/workflows');
const ALLOWED_KINDS = new Set([
  'typecheck',
  'lint',
  'unit',
  'integration',
  'e2e',
  'contract',
  'security',
  'build',
  'deployment',
  'other',
]);
const ALLOWED_STATUSES = new Set(['active', 'main-only', 'founder-gated', 'missing', 'retired']);

function matchesPrefix(value, prefixes) {
  return prefixes.some((prefix) => value === prefix || value.startsWith(`${prefix}:`));
}

function workflowName(source) {
  const match = source.match(/^name:\s*["']?(.+?)["']?\s*$/m);
  return match?.[1]?.trim() ?? null;
}

function singleLine(value, max = 300) {
  return typeof value === 'string'
    && value.trim().length > 0
    && value.length <= max
    && !value.includes('\n')
    && !value.includes('\r');
}

function relativeFromRoot(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join('/');
}

const rawManifest = await readFile(MANIFEST_PATH, 'utf8');
const manifest = JSON.parse(rawManifest);
const pkg = JSON.parse(await readFile(PACKAGE_PATH, 'utf8'));
const errors = [];

if (manifest.schemaVersion !== '1.0') errors.push('schemaVersion must be 1.0');
if (manifest.repository !== EXPECTED_REPOSITORY) errors.push(`repository must be ${EXPECTED_REPOSITORY}`);
if (manifest.portfolioHub !== 'jussray/founder-control-room') errors.push('portfolioHub must be Founder Control Room');
if (manifest.controlRoom?.privateContentAllowed !== false) errors.push('private content must be denied');
if (manifest.tests?.rawLogsAllowed !== false) errors.push('raw test logs must be denied');
if (manifest.tests?.catalogIsPassEvidence !== false) errors.push('the catalog must never be pass evidence');
if (manifest.tests?.executionAuthority !== 'exact-head-workflow-results') {
  errors.push('executionAuthority must remain exact-head-workflow-results');
}

const discovery = manifest.tests?.discovery;
const includedPrefixes = Array.isArray(discovery?.includedPrefixes) ? discovery.includedPrefixes : [];
const excludedPrefixes = Array.isArray(discovery?.excludedPrefixes) ? discovery.excludedPrefixes : [];
if (includedPrefixes.length === 0) errors.push('test discovery prefixes must not be empty');

const discoveredScripts = Object.entries(pkg.scripts ?? {})
  .filter(([name]) => matchesPrefix(name, includedPrefixes))
  .filter(([name]) => !matchesPrefix(name, excludedPrefixes))
  .map(([name]) => name)
  .sort((left, right) => left.localeCompare(right));
if (discoveredScripts.length === 0) errors.push('no repo-native test scripts were discovered');

const criticalScripts = Array.isArray(manifest.tests?.criticalScripts) ? manifest.tests.criticalScripts : [];
for (const script of criticalScripts) {
  if (!pkg.scripts?.[script]) errors.push(`critical package script is missing: ${script}`);
  if (!discoveredScripts.includes(script)) {
    errors.push(`critical package script is excluded from discovery: ${script}`);
  }
}

const workflowFiles = (await readdir(WORKFLOW_DIR))
  .filter((file) => file.endsWith('.yml') || file.endsWith('.yaml'))
  .sort();
const workflows = [];
const unnamedWorkflowFiles = [];
for (const file of workflowFiles) {
  const absolutePath = path.join(WORKFLOW_DIR, file);
  const source = await readFile(absolutePath, 'utf8');
  const name = workflowName(source);
  if (!name) {
    unnamedWorkflowFiles.push(relativeFromRoot(absolutePath));
    continue;
  }
  if (!singleLine(name)) errors.push(`workflow name is invalid: ${relativeFromRoot(absolutePath)}`);
  workflows.push({ name, path: relativeFromRoot(absolutePath) });
}
if (workflows.length === 0) errors.push('no named GitHub workflows were discovered');
for (const file of unnamedWorkflowFiles) errors.push(`workflow is missing a name: ${file}`);

const workflowNameCounts = new Map();
for (const workflow of workflows) {
  workflowNameCounts.set(workflow.name, (workflowNameCounts.get(workflow.name) ?? 0) + 1);
}
const duplicateWorkflowNames = [...workflowNameCounts.entries()]
  .filter(([, count]) => count > 1)
  .map(([name]) => name)
  .sort();
for (const name of duplicateWorkflowNames) errors.push(`workflow name is duplicated: ${name}`);

const workflowNames = new Set(workflows.map((item) => item.name));
const catalog = Array.isArray(manifest.tests?.workflowCatalog) ? manifest.tests.workflowCatalog : [];
if (catalog.length === 0) errors.push('workflowCatalog must not be empty');
const ids = new Set();
const catalogNames = new Set();
for (const entry of catalog) {
  if (!singleLine(entry.id, 100)) errors.push('workflow catalog id is invalid');
  if (ids.has(entry.id)) errors.push(`workflow catalog id is duplicated: ${entry.id}`);
  ids.add(entry.id);
  if (!singleLine(entry.name)) errors.push(`workflow catalog name is invalid: ${String(entry.id)}`);
  if (catalogNames.has(entry.name)) errors.push(`workflow catalog name is duplicated: ${entry.name}`);
  catalogNames.add(entry.name);
  if (!ALLOWED_KINDS.has(entry.kind)) errors.push(`workflow catalog kind is unsupported: ${entry.id}`);
  if (!ALLOWED_STATUSES.has(entry.status)) errors.push(`workflow catalog status is unsupported: ${entry.id}`);
  if (entry.required !== true) errors.push(`workflow catalog entry must remain required: ${entry.id}`);
  if (!workflowNames.has(entry.name)) errors.push(`required named workflow is missing: ${entry.name}`);
}

if (/(service[_-]?role|api[_-]?key|secret\s*[:=]|token\s*[:=]|sk-[a-z0-9_-]{10,})/i.test(rawManifest)) {
  errors.push('control-room manifest appears to contain secret material');
}

const uncatalogedWorkflows = workflows
  .filter((workflow) => !catalogNames.has(workflow.name))
  .map((workflow) => workflow.name)
  .sort();

const report = {
  schemaVersion: 1,
  repository: EXPECTED_REPOSITORY,
  status: errors.length === 0 ? 'passed' : 'failed',
  generatedAt: new Date().toISOString(),
  truthBoundary: 'inventory-only-never-a-test-pass',
  discovery: {
    includedPrefixes,
    excludedPrefixes,
    discoveredScriptCount: discoveredScripts.length,
    scripts: discoveredScripts,
  },
  workflows: {
    discoveredCount: workflows.length,
    discovered: workflows,
    requiredCatalogCount: catalog.length,
    requiredCatalog: catalog.map((entry) => ({
      id: entry.id,
      name: entry.name,
      kind: entry.kind,
      status: entry.status,
      required: entry.required,
      path: workflows.find((item) => item.name === entry.name)?.path ?? null,
    })),
    uncataloged: uncatalogedWorkflows,
  },
  summary: {
    criticalScripts: criticalScripts.length,
    missingCriticalScripts: criticalScripts.filter((script) => !pkg.scripts?.[script]),
    missingRequiredWorkflows: catalog.filter((entry) => !workflowNames.has(entry.name)).map((entry) => entry.name),
    unnamedWorkflowFiles,
    duplicateWorkflowNames,
  },
};

const reportPath = process.env.CONTROL_ROOM_TEST_REPORT_PATH;
if (reportPath) {
  const absoluteReportPath = path.resolve(reportPath);
  await mkdir(path.dirname(absoluteReportPath), { recursive: true });
  await writeFile(absoluteReportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

if (errors.length > 0) {
  console.error("Se'kret control-room test catalog failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(JSON.stringify(report));

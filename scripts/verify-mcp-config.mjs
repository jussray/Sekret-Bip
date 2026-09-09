import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const projectServerNames = [
  'cloudflare-builds',
  'cloudflare-docs',
  'cloudflare-observability',
  'context7',
  'figma',
  'github',
  'microsoft-learn',
  'playwright',
  'supabase',
];

const exampleServerNames = [
  'bright-data',
  ...projectServerNames,
].sort();

const ideCloudflareServerNames = [
  'cloudflare',
  'cloudflare-bindings',
  'cloudflare-builds',
  'cloudflare-docs',
  'cloudflare-observability',
].sort();

const routingServerNames = [
  ...exampleServerNames,
  'cloudflare',
  'cloudflare-bindings',
  'product-design',
].sort();

const remoteUrls = {
  github: 'https://api.githubcopilot.com/mcp/',
  'microsoft-learn': 'https://learn.microsoft.com/api/mcp',
  context7: 'https://mcp.context7.com/mcp',
  figma: 'https://mcp.figma.com/mcp',
  'cloudflare-docs': 'https://docs.mcp.cloudflare.com/mcp',
  'cloudflare-builds': 'https://builds.mcp.cloudflare.com/mcp',
  'cloudflare-observability': 'https://observability.mcp.cloudflare.com/mcp',
};

const ideCloudflareUrls = {
  cloudflare: 'https://mcp.cloudflare.com/mcp',
  'cloudflare-docs': 'https://docs.mcp.cloudflare.com/mcp',
  'cloudflare-bindings': 'https://bindings.mcp.cloudflare.com/mcp',
  'cloudflare-builds': 'https://builds.mcp.cloudflare.com/mcp',
  'cloudflare-observability': 'https://observability.mcp.cloudflare.com/mcp',
};

const githubToolsets =
  'repos,issues,pull_requests,actions,code_security,secret_protection';
const pinnedPlaywrightPackage = '@playwright/mcp@0.0.78';
const brightDataPackage = '@brightdata/mcp';

function fail(message) {
  throw new Error(`[verify:mcp] ${message}`);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(relativePath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    fail(`${relativePath} is missing or invalid JSON: ${error.message}`);
  }
}

function sortedKeys(value) {
  return Object.keys(value ?? {}).sort();
}

function validateExactSet(relativePath, servers, expectedNames) {
  assert(
    JSON.stringify(sortedKeys(servers)) === JSON.stringify([...expectedNames].sort()),
    `${relativePath} must contain exactly: ${[...expectedNames].sort().join(', ')}`,
  );
}

function validateRemoteServers(relativePath, servers) {
  for (const [name, url] of Object.entries(remoteUrls)) {
    assert(servers[name]?.type === 'http', `${relativePath}:${name} must use HTTP`);
    assert(servers[name]?.url === url, `${relativePath}:${name} URL drifted`);
  }

  const headers = servers.github?.headers ?? {};
  assert(headers['X-MCP-Toolsets'] === githubToolsets, `${relativePath}:github toolsets drifted`);
  assert(headers['X-MCP-Lockdown'] === 'true', `${relativePath}:github lockdown must remain enabled`);
  assert(headers['X-MCP-Insiders'] === undefined, `${relativePath}:github insiders must remain private opt-in`);
  assert(headers.Authorization === undefined, `${relativePath}:github auth must not be committed`);
}

function validateSupabase(relativePath, server, expectedProjectRef) {
  const url = new URL(server?.url ?? '');
  assert(server?.type === 'http', `${relativePath}:supabase must use HTTP`);
  assert(url.origin === 'https://mcp.supabase.com', `${relativePath}:supabase host drifted`);
  assert(url.pathname === '/mcp', `${relativePath}:supabase path drifted`);
  assert(url.searchParams.get('project_ref') === expectedProjectRef, `${relativePath}:supabase project scope drifted`);
  assert(url.searchParams.get('read_only') === 'true', `${relativePath}:supabase must remain read-only`);
  assert(url.searchParams.get('features') === 'database,docs', `${relativePath}:supabase features must remain database,docs`);
}

function validatePlaywright(relativePath, server) {
  assert(server?.type === 'local', `${relativePath}:playwright must use Copilot local type`);
  assert(server?.command === 'npx', `${relativePath}:playwright command must be npx`);
  assert(Array.isArray(server?.args), `${relativePath}:playwright args are missing`);
  assert(server.args.includes('-y'), `${relativePath}:playwright must use non-interactive npx`);
  assert(server.args.includes(pinnedPlaywrightPackage), `${relativePath}:playwright must stay pinned to ${pinnedPlaywrightPackage}`);
  assert(!server.args.some((arg) => String(arg).includes('@latest')), `${relativePath}:playwright cannot use @latest`);
  assert(server.args.includes('--isolated'), `${relativePath}:playwright must use an isolated profile`);
  const browserIndex = server.args.indexOf('--browser');
  assert(browserIndex >= 0 && server.args[browserIndex + 1] === 'chromium', `${relativePath}:playwright browser must be chromium`);
  assert(Array.isArray(server.tools) && server.tools.includes('*'), `${relativePath}:playwright tools must be exposed to Copilot`);
  assert(!server.env, `${relativePath}:playwright must not commit environment credentials`);
}

function validateBrightData(relativePath, server) {
  assert(server?.command === 'npx', `${relativePath}:bright-data command must be npx`);
  assert(Array.isArray(server?.args), `${relativePath}:bright-data args are missing`);
  assert(server.args.includes('-y'), `${relativePath}:bright-data must use non-interactive npx`);
  assert(server.args.includes(brightDataPackage), `${relativePath}:bright-data must use ${brightDataPackage}`);
  assert(server?.env?.API_TOKEN === '<YOUR_BRIGHT_DATA_API_TOKEN>', `${relativePath}:bright-data token placeholder drifted`);
  assert(server?.env?.GROUPS === 'code', `${relativePath}:bright-data must remain restricted to GROUPS=code`);
  assert(!('PRO_MODE' in (server?.env ?? {})), `${relativePath}:bright-data Pro Mode is forbidden`);
  assert(!('TOOLS' in (server?.env ?? {})), `${relativePath}:bright-data explicit tools are forbidden`);
}

function validateIdeCloudflare(relativePath, servers) {
  validateExactSet(relativePath, servers, ideCloudflareServerNames);
  for (const [name, url] of Object.entries(ideCloudflareUrls)) {
    assert(servers[name]?.url === url, `${relativePath}:${name} URL drifted`);
    assert(!servers[name]?.headers, `${relativePath}:${name} must authenticate through the supported client`);
    assert(!servers[name]?.env, `${relativePath}:${name} must not commit credentials`);
  }
}

function validateRouting(config) {
  assert(config?.schemaVersion === 1, 'config/mcp-skill-routing.json schemaVersion must be 1');
  assert(Array.isArray(config.alwaysLoad), 'MCP routing alwaysLoad must be an array');
  assert(config.alwaysLoad.includes('bip-repo-truth'), 'MCP routing must always load bip-repo-truth');
  validateExactSet('config/mcp-skill-routing.json', config.servers, routingServerNames);

  const referencedSkills = new Set(config.alwaysLoad);
  for (const serverName of routingServerNames) {
    const route = config.servers?.[serverName];
    assert(route && typeof route === 'object', `${serverName} is missing its MCP skill route`);
    assert(Array.isArray(route.skills) && route.skills.length > 0, `${serverName} must map to at least one Bip skill`);
    assert(typeof route.boundary === 'string' && route.boundary.trim().length >= 24, `${serverName} must document a real authority boundary`);
    for (const skill of route.skills) referencedSkills.add(skill);
  }

  for (const skill of referencedSkills) {
    assert(/^[a-z0-9-]+$/.test(skill), `invalid Bip skill name: ${skill}`);
    assert(fs.existsSync(path.join(root, '.agents', 'skills', skill, 'SKILL.md')), `mapped Bip skill does not exist: ${skill}`);
  }

  const requiredMappings = {
    github: ['bip-repo-truth', 'bip-release-gate'],
    supabase: ['bip-supabase-guardian', 'bip-privacy-redteam', 'bip-auth-onboarding'],
    playwright: ['bip-auth-onboarding', 'bip-release-gate'],
    cloudflare: ['bip-worker-guardian', 'bip-privacy-redteam', 'bip-release-gate'],
    'cloudflare-bindings': ['bip-worker-guardian', 'bip-privacy-redteam', 'bip-release-gate'],
    'cloudflare-builds': ['bip-worker-guardian', 'bip-release-gate'],
    'cloudflare-observability': ['bip-worker-guardian', 'bip-privacy-redteam'],
    figma: ['bip-companion-style-engine', 'bip-sekret-identity'],
    'product-design': ['bip-product-design-gate', 'bip-privacy-redteam', 'bip-release-gate'],
  };

  for (const [server, skills] of Object.entries(requiredMappings)) {
    for (const skill of skills) {
      assert(config.servers[server].skills.includes(skill), `${server} must activate ${skill}`);
    }
  }
}

function assertNoCommittedSecrets(relativePath, parsed) {
  const serialized = JSON.stringify(parsed);
  const patterns = [
    /github_pat_/i,
    /ghp_[A-Za-z0-9]{20,}/,
    /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
    /Bearer\s+[A-Za-z0-9._-]{12,}/i,
    /SUPABASE_ACCESS_TOKEN/,
    /SUPABASE_SERVICE_ROLE_KEY/,
    /CLOUDFLARE_API_TOKEN/,
    /NETDATA_CLOUD_API_TOKEN/,
  ];
  for (const pattern of patterns) {
    assert(!pattern.test(serialized), `${relativePath} appears to contain a committed credential`);
  }
}

const projectConfig = readJson('.mcp.json');
const exampleConfig = readJson('.mcp.example.json');
const vscodeConfig = readJson('.vscode/mcp.json');
const cursorConfig = readJson('.cursor/mcp.json');
const routingConfig = readJson('config/mcp-skill-routing.json');

const projectServers = projectConfig.mcpServers;
const exampleServers = exampleConfig.mcpServers;

validateExactSet('.mcp.json', projectServers, projectServerNames);
validateExactSet('.mcp.example.json', exampleServers, exampleServerNames);
validateRemoteServers('.mcp.json', projectServers);
validateRemoteServers('.mcp.example.json', exampleServers);
validateSupabase('.mcp.json', projectServers.supabase, 'tbsevonvegdnlyjgplmm');
validateSupabase('.mcp.example.json', exampleServers.supabase, 'YOUR_PROJECT_REF');
validatePlaywright('.mcp.json', projectServers.playwright);
validatePlaywright('.mcp.example.json', exampleServers.playwright);
validateBrightData('.mcp.example.json', exampleServers['bright-data']);
validateIdeCloudflare('.vscode/mcp.json', vscodeConfig.servers);
validateIdeCloudflare('.cursor/mcp.json', cursorConfig.mcpServers);
validateRouting(routingConfig);

assert(!projectServers['bright-data'], '.mcp.json must remain credential-free and omit bright-data');
assert(!projectServers['cloudflare-api'], '.mcp.json must not enable broad Cloudflare API access');
assert(!projectServers['netdata-cloud'], '.mcp.json must not enable Netdata without Bip-owned hosts');
assert(!projectServers.dbhub, '.mcp.json must use scoped Supabase instead of generic DBHub access');

for (const [relativePath, parsed] of [
  ['.mcp.json', projectConfig],
  ['.mcp.example.json', exampleConfig],
  ['.vscode/mcp.json', vscodeConfig],
  ['.cursor/mcp.json', cursorConfig],
  ['config/mcp-skill-routing.json', routingConfig],
]) {
  assertNoCommittedSecrets(relativePath, parsed);
}

console.log('[verify:mcp] Bip MCP client schemas, skill routing, authority boundaries, and credential guards are valid.');
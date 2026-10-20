import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

const codex = process.env.CODEX_BIN
  || (existsSync('/opt/codex/bin/codex') ? '/opt/codex/bin/codex' : 'codex');
const servers = [
  ['cloudflare', 'https://mcp.cloudflare.com/mcp', 'CLOUDFLARE_API_TOKEN'],
  ['cloudflare-docs', 'https://docs.mcp.cloudflare.com/mcp'],
  ['cloudflare-bindings', 'https://bindings.mcp.cloudflare.com/mcp'],
  ['cloudflare-builds', 'https://builds.mcp.cloudflare.com/mcp'],
  ['cloudflare-observability', 'https://observability.mcp.cloudflare.com/mcp'],
];

function run(args, capture = false) {
  return spawnSync(codex, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });
}

const version = run(['--version'], true);
if (version.error || version.status !== 0) {
  console.error(`[configure:codex-cloudflare] Codex CLI is unavailable: ${version.error?.message || version.stderr.trim()}`);
  process.exit(1);
}

for (const [name, url, tokenEnv] of servers) {
  const current = run(['mcp', 'get', name], true);
  if (current.status === 0) {
    const expectedToken = tokenEnv ? `bearer_token_env_var: ${tokenEnv}` : 'bearer_token_env_var: -';
    if (current.stdout.includes(`url: ${url}`) && current.stdout.includes(expectedToken)) {
      console.log(`[configure:codex-cloudflare] ${name} already matches; unchanged.`);
      continue;
    }

    console.error(`[configure:codex-cloudflare] ${name} already exists with different settings.`);
    console.error(`[configure:codex-cloudflare] Review \`codex mcp get ${name}\`; this script will not overwrite credentials or authority.`);
    process.exitCode = 1;
    continue;
  }

  const args = ['mcp', 'add', name, '--url', url];
  if (tokenEnv) args.push('--bearer-token-env-var', tokenEnv);
  const added = run(args);
  if (added.error || added.status !== 0) {
    console.error(`[configure:codex-cloudflare] Failed to add ${name}.`);
    process.exitCode = 1;
  }
}

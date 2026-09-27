import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_ENV_NAME = 'CLOUDFLARE_API_TOKEN';
const INVALID_TOKEN_TRANSPORT_ERROR = 'CLOUDFLARE_API_TOKEN_INVALID_TRANSPORT';

export function normalizeCloudflareTokenTransport(value) {
  const raw = String(value ?? '');
  if (!raw) return { token: '', changed: false, nonAsciiRemaining: false };

  let token = raw.trim().normalize('NFKC');
  let previous;
  do {
    previous = token;
    token = token.trim();
    token = token.replace(/^[A-Z_][A-Z0-9_]*[\p{White_Space}\p{Cf}]*=[\p{White_Space}\p{Cf}]*/u, '');
    const asciiQuoted = token.match(/^(["'])([\s\S]*)\1$/u);
    if (asciiQuoted) token = asciiQuoted[2].trim();
    const smartDoubleQuoted = token.match(/^“([\s\S]*)”$/u);
    if (smartDoubleQuoted) token = smartDoubleQuoted[1].trim();
    const smartSingleQuoted = token.match(/^‘([\s\S]*)’$/u);
    if (smartSingleQuoted) token = smartSingleQuoted[1].trim();
    token = token.replace(/^Bearer[\p{White_Space}\p{Cf}]+/iu, '');
  } while (token !== previous);

  token = token.replace(/[\p{White_Space}\p{Cf}]+/gu, '');
  return {
    token,
    changed: token !== raw,
    nonAsciiRemaining: /[^\x21-\x7e]/.test(token),
  };
}

export function runWithNormalizedCloudflareToken({
  argv = process.argv.slice(2),
  env = process.env,
  spawn = spawnSync,
} = {}) {
  const [target, ...targetArgs] = argv;
  if (!target) throw new Error('NORMALIZED_CLOUDFLARE_TOKEN_TARGET_REQUIRED');

  const source = String(env[DEFAULT_ENV_NAME] ?? '');
  const { token, changed, nonAsciiRemaining } = normalizeCloudflareTokenTransport(source);
  console.error(`CLOUDFLARE_TOKEN_TRANSPORT_READY source=${DEFAULT_ENV_NAME} configured=${Boolean(source)} normalized=${changed} ascii=${!nonAsciiRemaining}`);
  if (!token || nonAsciiRemaining) throw new Error(INVALID_TOKEN_TRANSPORT_ERROR);

  const result = spawn(process.execPath, [target, ...targetArgs], {
    cwd: process.cwd(),
    env: { ...env, [DEFAULT_ENV_NAME]: token },
    stdio: 'inherit',
  });

  if (result.error) throw result.error;
  return Number.isInteger(result.status) ? result.status : 1;
}

export function main() {
  try {
    process.exitCode = runWithNormalizedCloudflareToken();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (invokedDirectly) main();

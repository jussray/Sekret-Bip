import fs from 'node:fs/promises';
import path from 'node:path';

const API_BASE = 'https://api.supabase.com/v1';

function env(name, fallback = '') {
  const value = process.env[name];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function required(name) {
  const value = env(name);
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, entry] of Object.entries(value)) {
    out[key] = /(pass|secret|token|key)/i.test(key) ? '[redacted]' : redact(entry);
  }
  return out;
}

async function request(projectRef, accessToken, options = {}) {
  const response = await fetch(`${API_BASE}/projects/${projectRef}/config/auth`, {
    method: options.method ?? 'GET',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.error || response.statusText;
    throw new Error(`Supabase Auth config ${options.method ?? 'GET'} failed (${response.status}): ${message}`);
  }
  return payload;
}

// GHSA advisory: auth_leaked_password_protection. Supabase Auth checks new
// and changed passwords against HaveIBeenPwned.org when this is enabled.
const HIBP_FIELD = 'password_hibp_enabled';
const MIN_LENGTH_FIELD = 'password_min_length';
const MIN_LENGTH = 8;

function desiredConfig() {
  return {
    [HIBP_FIELD]: true,
    [MIN_LENGTH_FIELD]: MIN_LENGTH,
  };
}

function assertApplied(actual, desired) {
  for (const key of Object.keys(desired)) {
    if (actual?.[key] !== desired[key]) {
      throw new Error(`PASSWORD_SECURITY_CONFIG_MISMATCH ${key}: expected=${JSON.stringify(desired[key])} actual=${JSON.stringify(actual?.[key])}`);
    }
  }
}

async function writeReceipt(receipt) {
  const dir = path.resolve('artifacts');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'auth-password-security-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const apply = process.argv.includes('--apply');
  const projectRef = env('SUPABASE_PROJECT_REF', 'tbsevonvegdnlyjgplmm');
  const desired = desiredConfig();

  if (!apply) {
    const receipt = {
      mode: 'plan',
      projectRef,
      desired,
      confirmationRequired: false,
      productionMutation: false,
    };
    await writeReceipt(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  if (env('GITHUB_REF_NAME') && env('GITHUB_REF_NAME') !== 'main') {
    throw new Error(`Production Auth password-security apply is main-only; got ${env('GITHUB_REF_NAME')}.`);
  }

  const accessToken = required('SUPABASE_ACCESS_TOKEN');

  const before = await request(projectRef, accessToken);

  // The Management API does not reject an unknown field in a PATCH body --
  // it silently drops it, which would make this script report success while
  // changing nothing. Fail loudly instead of patching a field this project's
  // Auth config has never returned.
  for (const key of Object.keys(desired)) {
    if (!(key in before)) {
      throw new Error(`PASSWORD_SECURITY_FIELD_UNKNOWN ${key}: not present in current Auth config; API may have renamed it.`);
    }
  }

  await request(projectRef, accessToken, { method: 'PATCH', body: desired });
  const after = await request(projectRef, accessToken);
  assertApplied(after, desired);

  const receipt = {
    mode: 'apply',
    projectRef,
    confirmationRequired: false,
    productionMutation: true,
    before: redact(before),
    after: redact(after),
    rollback: {
      instruction: `Restore the prior values captured in "before" via PATCH ${API_BASE}/projects/${projectRef}/config/auth.`,
      priorConfigCaptured: true,
    },
  };

  await writeReceipt(receipt);
  console.log('PASSWORD_SECURITY_CONFIG_APPLIED');
  console.log(JSON.stringify(receipt, null, 2));
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  try {
    await writeReceipt({ mode: process.argv.includes('--apply') ? 'apply' : 'plan', ok: false, error: message });
  } catch {}
  process.exit(1);
});

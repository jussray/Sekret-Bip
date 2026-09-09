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

function desiredConfig({ smtpPass }) {
  return {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: env('AUTH_SMTP_ADMIN_EMAIL', 'invite@mail.sekretbip.com'),
    smtp_host: env('AUTH_SMTP_HOST', 'smtp.resend.com'),
    smtp_port: Number(env('AUTH_SMTP_PORT', '465')),
    smtp_user: env('AUTH_SMTP_USER', 'resend'),
    smtp_pass: smtpPass,
    smtp_sender_name: env('AUTH_SMTP_SENDER_NAME', "Se'kret Bip"),
  };
}

function comparable(config = {}) {
  return {
    external_email_enabled: config.external_email_enabled,
    mailer_secure_email_change_enabled: config.mailer_secure_email_change_enabled,
    mailer_autoconfirm: config.mailer_autoconfirm,
    smtp_admin_email: config.smtp_admin_email,
    smtp_host: config.smtp_host,
    smtp_port: Number(config.smtp_port),
    smtp_user: config.smtp_user,
    smtp_sender_name: config.smtp_sender_name,
  };
}

function assertApplied(actual, desired) {
  const a = comparable(actual);
  const d = comparable(desired);
  for (const key of Object.keys(d)) {
    if (a[key] !== d[key]) {
      throw new Error(`AUTH_EMAIL_CONFIG_MISMATCH ${key}: expected=${JSON.stringify(d[key])} actual=${JSON.stringify(a[key])}`);
    }
  }
}

async function writeReceipt(receipt) {
  const dir = path.resolve('artifacts');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'auth-email-provider-receipt.json'),
    `${JSON.stringify(receipt, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const apply = process.argv.includes('--apply');
  const projectRef = env('SUPABASE_PROJECT_REF', 'tbsevonvegdnlyjgplmm');
  const desiredPublic = desiredConfig({ smtpPass: '[redacted]' });

  if (!apply) {
    const receipt = {
      mode: 'plan',
      projectRef,
      provider: 'resend-smtp',
      desired: redact(desiredPublic),
      confirmationRequired: true,
      productionMutation: false,
    };
    await writeReceipt(receipt);
    console.log(JSON.stringify(receipt, null, 2));
    return;
  }

  if (env('GITHUB_REF_NAME') && env('GITHUB_REF_NAME') !== 'main') {
    throw new Error(`Production Auth email apply is main-only; got ${env('GITHUB_REF_NAME')}.`);
  }

  const accessToken = required('SUPABASE_ACCESS_TOKEN');
  const smtpPass = required('RESEND_API_KEY');
  const desired = desiredConfig({ smtpPass });

  const before = await request(projectRef, accessToken);
  await request(projectRef, accessToken, { method: 'PATCH', body: desired });
  const after = await request(projectRef, accessToken);
  assertApplied(after, desired);

  const receipt = {
    mode: 'apply',
    projectRef,
    provider: 'resend-smtp',
    confirmationRequired: true,
    productionMutation: true,
    before: redact(before),
    after: redact(after),
    rollback: {
      instruction: 'Restore the prior redacted auth configuration using the protected provider credentials; do not disable email confirmation.',
      priorConfigCaptured: true,
    },
  };

  await writeReceipt(receipt);
  console.log('AUTH_EMAIL_PROVIDER_APPLIED');
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

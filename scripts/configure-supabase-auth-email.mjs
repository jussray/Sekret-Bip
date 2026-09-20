import fs from 'node:fs/promises';
import path from 'node:path';

import {
  buildStaticSupabaseIdentityMarker,
  resolveSupabaseTarget,
  verifySupabaseManagementIdentity,
} from './supabase-target-identity.mjs';

const API_BASE = 'https://api.supabase.com/v1';
const RESEND_API_BASE = 'https://api.resend.com';

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
    throw new Error(`SUPABASE_AUTH_CONFIG_HTTP_${response.status}`);
  }
  return payload;
}

function senderDomain(email) {
  const normalized = String(email || '').trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at <= 0 || at === normalized.length - 1) {
    throw new Error('AUTH_SMTP_ADMIN_EMAIL_INVALID');
  }
  return normalized.slice(at + 1);
}

async function assertResendDomainVerified(apiKey, email) {
  const domainName = senderDomain(email);
  const response = await fetch(`${RESEND_API_BASE}/domains?limit=100`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
      accept: 'application/json',
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`RESEND_DOMAIN_PREFLIGHT_HTTP_${response.status}`);
  }

  const domains = Array.isArray(payload?.data) ? payload.data : [];
  const domain = domains.find((entry) => String(entry?.name || '').toLowerCase() === domainName);
  if (!domain) {
    throw new Error(`RESEND_DOMAIN_NOT_FOUND ${domainName}`);
  }
  if (domain.status !== 'verified') {
    throw new Error(`RESEND_DOMAIN_NOT_VERIFIED ${domainName}: status=${domain.status ?? 'unknown'}`);
  }
  if (domain.capabilities?.sending === 'disabled') {
    throw new Error(`RESEND_DOMAIN_SENDING_DISABLED ${domainName}`);
  }

  return {
    name: domainName,
    status: domain.status,
    sending: domain.capabilities?.sending ?? 'unknown',
  };
}

function desiredConfig({ smtpPass }) {
  return {
    external_email_enabled: true,
    mailer_secure_email_change_enabled: true,
    mailer_autoconfirm: false,
    smtp_admin_email: env('AUTH_SMTP_ADMIN_EMAIL', 'invite@sekretbip.net'),
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
      throw new Error(`AUTH_EMAIL_CONFIG_MISMATCH ${key}`);
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

function printReceiptSummary(label, receipt) {
  const targetName = receipt?.supabaseIdentity?.identity?.target ?? 'unknown';
  const identityFingerprint = receipt?.supabaseIdentity?.fingerprint ?? 'unverified';
  console.log(`${label} target=${targetName} fingerprint=${identityFingerprint}`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const target = await resolveSupabaseTarget();
  const projectRef = target.projectRef;
  const desiredPublic = desiredConfig({ smtpPass: '[redacted]' });

  if (!apply) {
    const receipt = {
      mode: 'plan',
      projectRef,
      supabaseIdentity: buildStaticSupabaseIdentityMarker(target),
      provider: 'resend-smtp',
      desired: redact(desiredPublic),
      confirmationRequired: true,
      productionMutation: false,
    };
    await writeReceipt(receipt);
    printReceiptSummary('AUTH_EMAIL_PROVIDER_PLAN', receipt);
    return;
  }

  if (env('GITHUB_REF_NAME') && env('GITHUB_REF_NAME') !== 'main') {
    throw new Error(`AUTH_EMAIL_APPLY_NON_MAIN ${env('GITHUB_REF_NAME')}`);
  }

  const accessToken = required('SUPABASE_ACCESS_TOKEN');
  const smtpPass = required('RESEND_API_KEY');
  const desired = desiredConfig({ smtpPass });
  const supabaseIdentity = await verifySupabaseManagementIdentity({ target, accessToken });
  const resendDomain = await assertResendDomainVerified(smtpPass, desired.smtp_admin_email);

  const before = await request(projectRef, accessToken);
  await request(projectRef, accessToken, { method: 'PATCH', body: desired });
  const after = await request(projectRef, accessToken);
  assertApplied(after, desired);

  const receipt = {
    mode: 'apply',
    projectRef,
    supabaseIdentity,
    provider: 'resend-smtp',
    confirmationRequired: true,
    productionMutation: true,
    resendDomain,
    before: redact(before),
    after: redact(after),
    rollback: {
      instruction: 'Restore the prior redacted auth configuration using the protected provider credentials; do not disable email confirmation.',
      priorConfigCaptured: true,
    },
  };

  await writeReceipt(receipt);
  printReceiptSummary('AUTH_EMAIL_PROVIDER_APPLIED', receipt);
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('AUTH_EMAIL_PROVIDER_FAILED');
  try {
    await writeReceipt({ mode: process.argv.includes('--apply') ? 'apply' : 'plan', ok: false, error: message });
  } catch {}
  process.exit(1);
});

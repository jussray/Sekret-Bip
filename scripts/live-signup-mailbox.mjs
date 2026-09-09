import crypto from 'node:crypto';
import fs from 'node:fs';

const API_BASE = 'https://api.mail.tm';
const PROVIDER_URL = 'https://mail.tm';
const OWNED_BIP_ADDRESS = 'hello@sekretbip.net';
const command = process.argv[2];
const artifactsDir = 'artifacts';

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function mailboxMode() {
  const mode = process.env.LIVE_MAILBOX_MODE?.trim().toLowerCase() || 'mailtm';
  if (!['mailtm', 'bip_routed'].includes(mode)) {
    throw new Error(`Unsupported LIVE_MAILBOX_MODE: ${mode}`);
  }
  return mode;
}

function appendGithubEnv(name, value) {
  const envFile = required('GITHUB_ENV');
  fs.appendFileSync(envFile, `${name}=${value}\n`, 'utf8');
}

function mask(value) {
  if (value) console.log(`::add-mask::${value}`);
}

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      accept: 'application/json',
      'user-agent': 'Sekret-Bip-live-signup-proof/1.0',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new Error(`Mail.tm ${options.method || 'GET'} ${path} failed with HTTP ${response.status}`);
  }

  return { response, body };
}

function collectionMembers(body) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  const members = body['hydra:member'] ?? body.member ?? [];
  return Array.isArray(members) ? members : [];
}

function randomSecret() {
  return `${crypto.randomBytes(24).toString('base64url')}Aa9!`;
}

function decodeUrlSeparatorsOnce(value) {
  return value.replace(/&(amp|#38);/g, '&');
}

function extractConfirmationUrl(message) {
  const html = Array.isArray(message?.html) ? message.html.join('\n') : String(message?.html || '');
  const source = `${message?.text || ''}\n${html}`;
  const candidates = source.match(/https?:\/\/[^\s"'<>]+/g) || [];

  for (const raw of candidates) {
    const candidate = decodeUrlSeparatorsOnce(raw).replace(/[),.;]+$/g, '');
    try {
      const url = new URL(candidate);
      const isSupabaseVerify = url.hostname.endsWith('.supabase.co') && url.pathname.includes('/auth/v1/verify');
      const isAppConfirm =
        url.hostname === 'sekretbip.net' &&
        (url.pathname.toLowerCase().includes('confirm') || url.searchParams.has('token_hash'));
      if (isSupabaseVerify || isAppConfirm) return url.toString();
    } catch {
      // Ignore non-URL fragments from HTML.
    }
  }

  return null;
}

function writeJson(name, value) {
  fs.mkdirSync(artifactsDir, { recursive: true });
  fs.writeFileSync(`${artifactsDir}/${name}`, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function createMailbox() {
  const runId = required('GITHUB_RUN_ID');
  const headSha = required('EXPECTED_HEAD_SHA');
  const mode = mailboxMode();
  const appPassword = randomSecret();
  const username = `pw${runId}`.slice(0, 24);

  mask(appPassword);
  appendGithubEnv('LIVE_MAILBOX_MODE', mode);
  appendGithubEnv('LIVE_ONBOARDING_USERNAME', username);
  appendGithubEnv('LIVE_ONBOARDING_PASSWORD', appPassword);

  if (mode === 'bip_routed') {
    appendGithubEnv('LIVE_ONBOARDING_EMAIL', OWNED_BIP_ADDRESS);
    writeJson('live-signup-proof-account.json', {
      email: OWNED_BIP_ADDRESS,
      username,
      runId,
      headSha,
      mailboxProvider: 'Se\'kret Bip Cloudflare Email Routing',
      mailboxMode: mode,
      confirmation: 'external-owned-mailbox',
    });
    console.log(`Owned Bip signup proof mailbox: ${OWNED_BIP_ADDRESS}`);
    console.log(`Disposable live signup username: ${username}`);
    return;
  }

  const { body: domainsBody } = await api('/domains?page=1');
  const domains = collectionMembers(domainsBody);
  const domainRecord = domains.find((item) => typeof item?.domain === 'string' && item.domain.trim());
  if (!domainRecord?.domain) {
    const shape = domainsBody && typeof domainsBody === 'object'
      ? { keys: Object.keys(domainsBody), memberCount: domains.length }
      : { bodyType: typeof domainsBody };
    throw new Error(`Mail.tm returned no disposable domain: ${JSON.stringify(shape)}`);
  }

  const localPart = `sekretbip-pw-${runId}-${crypto.randomBytes(3).toString('hex')}`.toLowerCase();
  const address = `${localPart}@${domainRecord.domain}`;
  const mailboxPassword = randomSecret();
  mask(mailboxPassword);

  const accountPayload = JSON.stringify({ address, password: mailboxPassword });
  const { body: account } = await api('/accounts', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: accountPayload,
  });
  if (!account?.id) throw new Error('Mail.tm account creation returned no account id');

  const { body: tokenBody } = await api('/token', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: accountPayload,
  });
  if (!tokenBody?.token) throw new Error('Mail.tm token creation returned no token');
  mask(tokenBody.token);

  appendGithubEnv('LIVE_ONBOARDING_EMAIL', address);
  appendGithubEnv('LIVE_MAILTM_TOKEN', tokenBody.token);
  appendGithubEnv('LIVE_MAILTM_ACCOUNT_ID', account.id);

  writeJson('live-signup-proof-account.json', {
    email: address,
    username,
    runId,
    headSha,
    mailboxProvider: 'Mail.tm',
    mailboxProviderUrl: PROVIDER_URL,
    mailboxMode: mode,
  });

  console.log(`Disposable mailbox provider: Mail.tm (${PROVIDER_URL})`);
  console.log(`Disposable live signup email: ${address}`);
  console.log(`Disposable live signup username: ${username}`);
}

async function confirmMailbox() {
  const mode = mailboxMode();
  const address = required('LIVE_ONBOARDING_EMAIL');

  if (mode === 'bip_routed') {
    console.log(`Owned Bip confirmation is waiting in ${address}; successful returning sign-in is the authoritative confirmation proof.`);
    return;
  }

  const token = required('LIVE_MAILTM_TOKEN');
  const timeoutMs = Number.parseInt(process.env.LIVE_MAILBOX_TIMEOUT_MS || '120000', 10);
  const pollMs = Number.parseInt(process.env.LIVE_MAILBOX_POLL_MS || '3000', 10);
  const deadline = Date.now() + Math.max(timeoutMs, 30_000);
  const headers = { authorization: `Bearer ${token}` };

  let message = null;
  let confirmationUrl = null;

  while (Date.now() < deadline) {
    const { body: messagesBody } = await api('/messages?page=1', { headers });
    const messages = collectionMembers(messagesBody);

    for (const summary of messages) {
      if (!summary?.id) continue;
      const { body: detail } = await api(`/messages/${encodeURIComponent(summary.id)}`, { headers });
      const url = extractConfirmationUrl(detail);
      if (url) {
        message = detail;
        confirmationUrl = url;
        break;
      }
    }

    if (confirmationUrl) break;
    await new Promise((resolve) => setTimeout(resolve, Math.max(pollMs, 1000)));
  }

  if (!confirmationUrl || !message) {
    throw new Error(`No signup confirmation message reached disposable mailbox ${address} before timeout`);
  }

  const confirmation = await fetch(confirmationUrl, {
    redirect: 'manual',
    headers: { 'user-agent': 'Sekret-Bip-live-signup-proof/1.0' },
  });
  if (confirmation.status < 200 || confirmation.status >= 400) {
    throw new Error(`Signup confirmation endpoint returned HTTP ${confirmation.status}`);
  }

  const confirmationHost = new URL(confirmationUrl).hostname;
  const location = confirmation.headers.get('location');
  let redirectHost = null;
  if (location) {
    try {
      redirectHost = new URL(location, confirmationUrl).hostname;
    } catch {
      redirectHost = null;
    }
  }

  writeJson('live-signup-confirmation.json', {
    email: address,
    messageId: message.id ?? null,
    subject: message.subject ?? null,
    confirmationStatus: confirmation.status,
    confirmationHost,
    redirectHost,
    confirmedAt: new Date().toISOString(),
  });

  console.log(`Signup confirmation accepted with HTTP ${confirmation.status}.`);
  console.log(`Confirmation host: ${confirmationHost}`);
  console.log(`Redirect host: ${redirectHost || 'none'}`);
}

async function recordOwnedConfirmation() {
  if (mailboxMode() !== 'bip_routed') return;
  const address = required('LIVE_ONBOARDING_EMAIL');
  writeJson('live-signup-confirmation.json', {
    email: address,
    mailboxProvider: 'Se\'kret Bip Cloudflare Email Routing',
    confirmationStatus: 'proved_by_returning_signin',
    confirmedAt: new Date().toISOString(),
  });
  console.log(`Owned Bip mailbox confirmation proved by successful returning sign-in for ${address}.`);
}

async function cleanupMailbox() {
  const mode = mailboxMode();
  if (mode === 'bip_routed') {
    writeJson('live-signup-mailbox-cleanup.json', {
      mailboxProvider: 'Se\'kret Bip Cloudflare Email Routing',
      mailboxMode: mode,
      status: 'persistent_owned_alias_not_deleted',
      cleanedAt: new Date().toISOString(),
    });
    console.log('Owned Bip routing alias is persistent infrastructure; no mailbox deletion was attempted.');
    return;
  }

  const token = process.env.LIVE_MAILTM_TOKEN?.trim();
  const accountId = process.env.LIVE_MAILTM_ACCOUNT_ID?.trim();
  if (!token || !accountId) {
    console.log('No disposable Mail.tm mailbox to clean up.');
    return;
  }

  const response = await fetch(`${API_BASE}/accounts/${encodeURIComponent(accountId)}`, {
    method: 'DELETE',
    headers: {
      authorization: `Bearer ${token}`,
      'user-agent': 'Sekret-Bip-live-signup-proof/1.0',
    },
  });

  if (response.status !== 204 && response.status !== 404) {
    throw new Error(`Mail.tm cleanup failed with HTTP ${response.status}`);
  }

  writeJson('live-signup-mailbox-cleanup.json', {
    mailboxProvider: 'Mail.tm',
    accountId,
    status: response.status,
    cleanedAt: new Date().toISOString(),
  });
  console.log(`Disposable Mail.tm mailbox cleanup returned HTTP ${response.status}.`);
}

if (command === 'create') {
  await createMailbox();
} else if (command === 'confirm') {
  await confirmMailbox();
} else if (command === 'record-owned-confirmation') {
  await recordOwnedConfirmation();
} else if (command === 'cleanup') {
  await cleanupMailbox();
} else {
  throw new Error('Usage: node scripts/live-signup-mailbox.mjs <create|confirm|record-owned-confirmation|cleanup>');
}

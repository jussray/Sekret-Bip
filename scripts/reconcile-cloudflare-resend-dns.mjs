import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const EVIDENCE_PATH = 'artifacts/cloudflare-resend-dns-evidence.json';

const DKIM_VALUE = 'p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDdwLl2bz78K9hCizfdmnjAKVK6GWPfwtkln+OwkUJBQfUEQekg+roGhGwh5lgkwFVKFhjHA0cUQHaPwheHx8B+7Iw6FfJy51fGFKjNHhkYAhBEoELoSlz43y+pbBkLjuUyqbgmJaTGEYwJf7iEO4NIOZXJlY3dI9YizWAc88Zy8QIDAQAB';
const SPF_VALUE = 'v=spf1 include:amazonses.com ~all';
const MX_VALUE = 'feedback-smtp.us-east-1.amazonses.com';

export function configFromEnv(env = process.env) {
  return {
    token: env.CLOUDFLARE_API_TOKEN || '',
    zoneName: env.BIP_EMAIL_ZONE || 'sekretbip.net',
    zoneId: env.CLOUDFLARE_ZONE_ID || '',
  };
}

export function desiredRecords(zoneName = 'sekretbip.net') {
  return [
    {
      key: 'resend-dkim',
      type: 'TXT',
      name: `resend._domainkey.${zoneName}`,
      content: DKIM_VALUE,
      ttl: 1,
    },
    {
      key: 'resend-return-path-mx',
      type: 'MX',
      name: `send.${zoneName}`,
      content: MX_VALUE,
      priority: 10,
      ttl: 1,
    },
    {
      key: 'resend-spf',
      type: 'TXT',
      name: `send.${zoneName}`,
      content: SPF_VALUE,
      ttl: 1,
    },
  ];
}

function errorText(payload, fallback) {
  const messages = payload?.errors?.map((error) => {
    const code = error?.code === undefined ? '' : `code=${error.code} `;
    return `${code}${error?.message || ''}`.trim();
  }).filter(Boolean);
  return messages?.length ? messages.join('; ') : fallback;
}

async function cfRequest(config, path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.success === false) {
    throw new Error(
      `Cloudflare ${options.method || 'GET'} ${path} failed: ${errorText(payload, response.statusText)}`,
    );
  }
  return payload;
}

async function discoverZone(config) {
  if (config.zoneId) {
    const payload = await cfRequest(config, `/zones/${config.zoneId}`);
    if (payload?.result?.name !== config.zoneName) {
      throw new Error(`ZONE_ID_MISMATCH: ${config.zoneId} does not resolve to ${config.zoneName}.`);
    }
    return config;
  }

  const payload = await cfRequest(
    config,
    `/zones?name=${encodeURIComponent(config.zoneName)}&status=active&per_page=50`,
  );
  const zone = payload?.result?.find((candidate) => candidate?.name === config.zoneName);
  if (!zone?.id) {
    throw new Error(`ZONE_NOT_FOUND: active Cloudflare zone ${config.zoneName} was not found.`);
  }
  return { ...config, zoneId: zone.id };
}

async function listRecords(config, desired) {
  const params = new URLSearchParams({ type: desired.type, name: desired.name, per_page: '100' });
  const payload = await cfRequest(config, `/zones/${config.zoneId}/dns_records?${params.toString()}`);
  return payload?.result || [];
}

function exactMatch(record, desired) {
  if (record?.type !== desired.type) return false;
  if (String(record?.name || '').toLowerCase() !== desired.name.toLowerCase()) return false;
  if (String(record?.content || '') !== desired.content) return false;
  if (desired.type === 'MX' && Number(record?.priority) !== Number(desired.priority)) return false;
  return true;
}

function conflictingRecord(records, desired) {
  if (desired.type === 'MX') {
    return records.find((record) => !exactMatch(record, desired)) || null;
  }
  if (desired.key === 'resend-dkim') {
    return records.find((record) => String(record?.content || '').startsWith('p=') && !exactMatch(record, desired)) || null;
  }
  if (desired.key === 'resend-spf') {
    return records.find((record) => String(record?.content || '').toLowerCase().startsWith('v=spf1') && !exactMatch(record, desired)) || null;
  }
  return null;
}

async function ensureRecord(config, desired) {
  const before = await listRecords(config, desired);
  const exact = before.find((record) => exactMatch(record, desired));
  if (exact) {
    console.log(`RESEND_DNS_OK key=${desired.key} id=${exact.id}`);
    return { key: desired.key, action: 'exists', id: exact.id, desired };
  }

  const conflict = conflictingRecord(before, desired);
  if (conflict) {
    throw new Error(
      `RESEND_DNS_CONFLICT key=${desired.key} existing_id=${conflict.id || 'unknown'} type=${desired.type} name=${desired.name}`,
    );
  }

  const created = await cfRequest(config, `/zones/${config.zoneId}/dns_records`, {
    method: 'POST',
    body: {
      type: desired.type,
      name: desired.name,
      content: desired.content,
      ttl: desired.ttl,
      ...(desired.priority === undefined ? {} : { priority: desired.priority }),
    },
  });

  const createdId = created?.result?.id;
  console.log(`RESEND_DNS_CREATED key=${desired.key} id=${createdId || 'unknown'}`);

  const after = await listRecords(config, desired);
  const verified = after.find((record) => exactMatch(record, desired));
  if (!verified) {
    throw new Error(`RESEND_DNS_VERIFY_FAILED key=${desired.key}`);
  }

  return { key: desired.key, action: 'created', id: verified.id, desired };
}

async function writeEvidence(config, results) {
  await mkdir('artifacts', { recursive: true });
  const evidence = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    zone: config.zoneName,
    deletes: false,
    records: results.map(({ key, action, id, desired }) => ({
      key,
      action,
      id: id || null,
      type: desired.type,
      name: desired.name,
      content: desired.content,
      priority: desired.priority ?? null,
    })),
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`EVIDENCE_WRITTEN path=${EVIDENCE_PATH}`);
}

export async function reconcileCloudflareResendDns(config = configFromEnv()) {
  if (!config.token) {
    throw new Error('CLOUDFLARE_API_TOKEN_MISSING: a scoped Cloudflare token is required for DNS reconciliation.');
  }
  const resolved = await discoverZone(config);
  const results = [];
  for (const desired of desiredRecords(resolved.zoneName)) {
    results.push(await ensureRecord(resolved, desired));
  }
  await writeEvidence(resolved, results);
  console.log(`RESEND_DNS_RECONCILED zone=${resolved.zoneName} records=${results.length}`);
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const config = configFromEnv(env);
  const apply = argv.includes('--apply');
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'plan',
    zone: config.zoneName,
    deletes: false,
    evidenceArtifact: EVIDENCE_PATH,
    records: desiredRecords(config.zoneName).map(({ key, type, name, content, priority }) => ({
      key,
      type,
      name,
      content,
      priority: priority ?? null,
    })),
  }, null, 2));
  if (!apply) return;
  await reconcileCloudflareResendDns(config);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

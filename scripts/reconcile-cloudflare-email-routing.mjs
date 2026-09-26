import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const EVIDENCE_PATH = 'artifacts/cloudflare-email-routing-evidence.json';

export const EMAIL_ALIASES = Object.freeze([
  'hello',
  'founder',
  'partnerships',
  'support',
  'parents',
  'safety',
  'privacy',
  'legal',
  'security',
]);

export function configFromEnv(env = process.env) {
  return {
    token: env.CLOUDFLARE_API_TOKEN || '',
    zoneName: env.BIP_EMAIL_ZONE || 'sekretbip.net',
    workerName: env.BIP_EMAIL_WORKER || 'sekret-backend',
    destinationEmail: env.BIP_EMAIL_DESTINATION || 'sekretbip@gmail.com',
    zoneId: env.CLOUDFLARE_ZONE_ID || '',
    accountId: env.CLOUDFLARE_ACCOUNT_ID || '',
  };
}

export function buildWorkerRule(alias, config = configFromEnv({})) {
  const address = `${alias}@${config.zoneName}`;
  return {
    name: `Route ${address} to ${config.workerName}`,
    enabled: true,
    matchers: [{ type: 'literal', field: 'to', value: address }],
    actions: [{ type: 'worker', value: [config.workerName] }],
  };
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

async function verifyToken(config) {
  const attempts = [];
  const verificationPaths = ['/user/tokens/verify'];
  if (config.accountId) {
    verificationPaths.push(`/accounts/${config.accountId}/tokens/verify`);
  }

  for (const path of verificationPaths) {
    try {
      const payload = await cfRequest(config, path);
      const status = payload?.result?.status;
      if (status === 'active') {
        const verifier = path.startsWith('/accounts/') ? 'account' : 'user';
        console.log(`CLOUDFLARE_API_TOKEN_ACTIVE verifier=${verifier}`);
        return payload.result;
      }
      attempts.push(`${path}: status=${status || 'unknown'}`);
    } catch (error) {
      attempts.push(error instanceof Error ? error.message : String(error));
    }
  }

  try {
    const payload = await cfRequest(
      config,
      `/zones?name=${encodeURIComponent(config.zoneName)}&status=active&per_page=50`,
    );
    const zone = payload?.result?.find((candidate) => candidate?.name === config.zoneName);
    if (zone?.id) {
      console.log('CLOUDFLARE_API_TOKEN_ACTIVE verifier=zone-access');
      return { id: null, status: 'active' };
    }
    attempts.push(`zone-access: ${config.zoneName} was not returned`);
  } catch (error) {
    attempts.push(error instanceof Error ? error.message : String(error));
  }

  throw new Error(`CLOUDFLARE_API_TOKEN_INVALID_OR_UNSCOPED: ${attempts.join(' | ')}`);
}

async function discoverZone(config) {
  if (config.zoneId && config.accountId) return config;

  if (config.zoneId) {
    const payload = await cfRequest(config, `/zones/${config.zoneId}`);
    const zone = payload?.result;
    if (!zone?.id || zone?.name !== config.zoneName) {
      throw new Error(`ZONE_ID_MISMATCH: ${config.zoneId} does not resolve to ${config.zoneName}.`);
    }
    const accountId = config.accountId || zone.account?.id;
    if (!accountId) {
      throw new Error('ACCOUNT_ID_NOT_FOUND: grant Zone Read access or set CLOUDFLARE_ACCOUNT_ID.');
    }
    return { ...config, accountId };
  }

  const payload = await cfRequest(
    config,
    `/zones?name=${encodeURIComponent(config.zoneName)}&status=active&per_page=50`,
  );
  const zone = payload?.result?.find((candidate) => candidate?.name === config.zoneName);
  if (!zone?.id) {
    throw new Error(`ZONE_NOT_FOUND: active Cloudflare zone ${config.zoneName} was not found.`);
  }

  const accountId = config.accountId || zone.account?.id;
  if (!accountId) {
    throw new Error('ACCOUNT_ID_NOT_FOUND: set CLOUDFLARE_ACCOUNT_ID or grant Zone Read access.');
  }

  return { ...config, zoneId: zone.id, accountId };
}

async function routingDns(config) {
  const payload = await cfRequest(config, `/zones/${config.zoneId}/email/routing/dns`);
  return payload?.result || null;
}

async function ensureRoutingDns(config) {
  const current = await routingDns(config);
  if (current?.enabled === true && current?.status === 'ready') {
    console.log(`EMAIL_ROUTING_DNS_OK zone=${config.zoneName}`);
    return current;
  }

  const enabled = await cfRequest(config, `/zones/${config.zoneId}/email/routing/dns`, {
    method: 'POST',
    body: { name: config.zoneName },
  });

  if (enabled?.result?.enabled !== true) {
    throw new Error(`EMAIL_ROUTING_DNS_NOT_READY: ${config.zoneName}`);
  }
  console.log(`EMAIL_ROUTING_DNS_ENABLED zone=${config.zoneName}`);
  return enabled?.result || null;
}

async function listDestinations(config) {
  const payload = await cfRequest(
    config,
    `/accounts/${config.accountId}/email/routing/addresses?per_page=100`,
  );
  return payload?.result || [];
}

async function ensureVerifiedDestination(config) {
  const destinations = await listDestinations(config);
  let destination = destinations.find(
    (candidate) => candidate?.email?.toLowerCase() === config.destinationEmail.toLowerCase(),
  );

  if (!destination) {
    const created = await cfRequest(config, `/accounts/${config.accountId}/email/routing/addresses`, {
      method: 'POST',
      body: { email: config.destinationEmail },
    });
    destination = created?.result;
    console.log(`DESTINATION_CREATED email=${config.destinationEmail}`);
  }

  if (!destination?.verified) {
    throw new Error(
      `DESTINATION_VERIFICATION_REQUIRED: open ${config.destinationEmail} and approve Cloudflare's verification email, then rerun this workflow.`,
    );
  }

  console.log(`DESTINATION_VERIFIED email=${config.destinationEmail}`);
  return destination;
}

function recipientForRule(rule) {
  return rule?.matchers?.find(
    (matcher) => matcher?.type === 'literal' && matcher?.field === 'to',
  )?.value;
}

function workerForRule(rule) {
  return rule?.actions?.find((action) => action?.type === 'worker')?.value?.[0];
}

function ruleMatchesDesired(rule, desired) {
  return (
    rule?.enabled === true &&
    recipientForRule(rule)?.toLowerCase() === recipientForRule(desired)?.toLowerCase() &&
    workerForRule(rule) === workerForRule(desired)
  );
}

async function listRules(config) {
  const payload = await cfRequest(
    config,
    `/zones/${config.zoneId}/email/routing/rules?per_page=100`,
  );
  return payload?.result || [];
}

async function getCatchAll(config) {
  const payload = await cfRequest(
    config,
    `/zones/${config.zoneId}/email/routing/rules/catch_all`,
  );
  return payload?.result || null;
}

function supportedAddressSet(config) {
  return new Set(EMAIL_ALIASES.map((alias) => `${alias}@${config.zoneName}`.toLowerCase()));
}

export function findDuplicateSupportedRules(rules, config = configFromEnv({})) {
  const supported = supportedAddressSet(config);
  const grouped = new Map();
  for (const rule of rules) {
    const address = recipientForRule(rule)?.toLowerCase();
    if (!address || !supported.has(address)) continue;
    grouped.set(address, [...(grouped.get(address) || []), rule]);
  }
  return [...grouped.entries()]
    .filter(([, matches]) => matches.length > 1)
    .map(([address, matches]) => ({ address, ids: matches.map((rule) => rule?.id).filter(Boolean) }));
}

function assertNoDuplicateSupportedRules(rules, config) {
  const duplicates = findDuplicateSupportedRules(rules, config);
  if (duplicates.length) {
    throw new Error(`DUPLICATE_SUPPORTED_ROUTES: ${JSON.stringify(duplicates)}`);
  }
}

function assertCatchAllSafe(catchAll) {
  if (catchAll?.enabled === true) {
    throw new Error('CATCH_ALL_ENABLED: disable the Email Routing catch-all so unknown Se\'kret Bip aliases are rejected.');
  }
  console.log('CATCH_ALL_SAFE enabled=false');
}

async function writeEvidence({ config, phase, dns, destination, rules, catchAll }) {
  await mkdir('artifacts', { recursive: true });
  const evidence = {
    schemaVersion: 1,
    phase,
    generatedAt: new Date().toISOString(),
    zone: config.zoneName,
    worker: config.workerName,
    destination: destination
      ? { email: destination.email, verified: destination.verified || null }
      : null,
    routingDns: dns
      ? { enabled: dns.enabled ?? null, status: dns.status ?? null, name: dns.name || config.zoneName }
      : null,
    catchAll: catchAll
      ? { enabled: catchAll.enabled ?? null, actions: catchAll.actions || [], matchers: catchAll.matchers || [] }
      : null,
    rules: rules.map((rule) => ({
      id: rule?.id || null,
      name: rule?.name || null,
      enabled: rule?.enabled ?? null,
      matchers: rule?.matchers || [],
      actions: rule?.actions || [],
    })),
  };
  await writeFile(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8');
  console.log(`EVIDENCE_WRITTEN phase=${phase} path=${EVIDENCE_PATH}`);
}

async function ensureWorkerRules(config) {
  let rules = await listRules(config);
  assertNoDuplicateSupportedRules(rules, config);

  for (const alias of EMAIL_ALIASES) {
    const desired = buildWorkerRule(alias, config);
    const address = recipientForRule(desired);
    const existing = rules.find(
      (rule) => recipientForRule(rule)?.toLowerCase() === address.toLowerCase(),
    );

    if (!existing) {
      const created = await cfRequest(config, `/zones/${config.zoneId}/email/routing/rules`, {
        method: 'POST',
        body: desired,
      });
      rules.push(created?.result);
      console.log(`ROUTE_CREATED address=${address} worker=${config.workerName}`);
      continue;
    }

    if (ruleMatchesDesired(existing, desired)) {
      console.log(`ROUTE_OK address=${address} worker=${config.workerName}`);
      continue;
    }

    if (!existing.id) {
      throw new Error(`ROUTE_ID_MISSING: cannot safely repair ${address}.`);
    }

    const repaired = await cfRequest(
      config,
      `/zones/${config.zoneId}/email/routing/rules/${existing.id}`,
      { method: 'PUT', body: desired },
    );
    rules = rules.map((rule) => (rule?.id === existing.id ? repaired?.result : rule));
    console.log(`ROUTE_REPAIRED address=${address} worker=${config.workerName}`);
  }

  const finalRules = await listRules(config);
  assertNoDuplicateSupportedRules(finalRules, config);
  for (const alias of EMAIL_ALIASES) {
    const desired = buildWorkerRule(alias, config);
    const address = recipientForRule(desired);
    const actual = finalRules.find(
      (rule) => recipientForRule(rule)?.toLowerCase() === address.toLowerCase(),
    );
    if (!actual || !ruleMatchesDesired(actual, desired)) {
      throw new Error(`ROUTE_VERIFICATION_FAILED: ${address}`);
    }
  }
  return finalRules;
}

export async function reconcileCloudflareEmailRouting(config = configFromEnv()) {
  if (!config.token) {
    throw new Error(
      'CLOUDFLARE_API_TOKEN_MISSING: add a GitHub Actions secret with Zone Read, Zone Settings Write, Email Routing Rules Write, and Email Routing Addresses Write.',
    );
  }

  await verifyToken(config);
  const resolved = await discoverZone(config);
  const preDns = await routingDns(resolved);
  const preDestinations = await listDestinations(resolved);
  const preDestination = preDestinations.find(
    (candidate) => candidate?.email?.toLowerCase() === resolved.destinationEmail.toLowerCase(),
  ) || null;
  const preRules = await listRules(resolved);
  const preCatchAll = await getCatchAll(resolved);
  await writeEvidence({
    config: resolved,
    phase: 'pre-apply',
    dns: preDns,
    destination: preDestination,
    rules: preRules,
    catchAll: preCatchAll,
  });

  assertNoDuplicateSupportedRules(preRules, resolved);
  assertCatchAllSafe(preCatchAll);

  await ensureRoutingDns(resolved);
  await ensureVerifiedDestination(resolved);
  const finalRules = await ensureWorkerRules(resolved);
  const finalDns = await routingDns(resolved);
  const finalDestinations = await listDestinations(resolved);
  const finalDestination = finalDestinations.find(
    (candidate) => candidate?.email?.toLowerCase() === resolved.destinationEmail.toLowerCase(),
  ) || null;
  const finalCatchAll = await getCatchAll(resolved);
  assertCatchAllSafe(finalCatchAll);

  await writeEvidence({
    config: resolved,
    phase: 'post-apply',
    dns: finalDns,
    destination: finalDestination,
    rules: finalRules,
    catchAll: finalCatchAll,
  });

  console.log(
    `EMAIL_ROUTING_RECONCILED zone=${resolved.zoneName} worker=${resolved.workerName} aliases=${EMAIL_ALIASES.length}`,
  );
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  const config = configFromEnv(env);
  const apply = argv.includes('--apply');

  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'plan',
        zone: config.zoneName,
        worker: config.workerName,
        destination: config.destinationEmail,
        aliases: EMAIL_ALIASES.map((alias) => `${alias}@${config.zoneName}`),
        deletes: false,
        catchAllDesired: 'disabled',
        evidenceArtifact: EVIDENCE_PATH,
      },
      null,
      2,
    ),
  );

  if (!apply) return;
  await reconcileCloudflareEmailRouting(config);
}

const invokedDirectly = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (invokedDirectly) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}

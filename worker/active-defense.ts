import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { emitWorkerTelemetry, type WorkerTelemetryEvent } from './telemetry';
import { persistAuditEvent, type AuditPersistEnv } from './audit/persist-event';

export const ACTIVE_DEFENSE_CONTRACT = 'juss/active-defense@v1';
export const HALLWAY_BASE_EXPANSION = 48_000;
export const HALLWAY_RANDOM_EXPANSION_MAX = 48_000;
export const HALLWAY_COOKIE = '__Host-juss_hallway';

export const ACTIVE_ATTACK_FLOWS = [
  'attack10',
  'attack20',
  'attack30',
  'attack3000',
  'attack5000',
  'attack6000',
  'attack48000',
  'redteamI',
  'redteamII',
  'redteamTwin',
  'devil',
  'lindymode',
  'l99',
  'ooda',
  'truthmode',
  'confess',
  'goalfix',
  'proofMode',
  'continuity',
  'rollback',
] as const;

type AttackFlowName = (typeof ACTIVE_ATTACK_FLOWS)[number];
export type ActiveDefenseMode = 'off' | 'observe' | 'contain';
export type ActiveDefenseVerdict = 'ALLOW' | 'VERIFIED_BOT' | 'OBSERVE_AUTOMATION' | 'HALLWAY';

interface BotManagementSignals {
  score?: number;
  verifiedBot?: boolean;
  ja3Hash?: string;
  ja4?: string;
}

interface CloudflareSignals {
  asn?: number;
  asOrganization?: string;
  verifiedBotCategory?: string;
  botManagement?: BotManagementSignals | null;
}

export interface ActiveDefenseEnv extends AuditPersistEnv {
  ACTIVE_DEFENSE_MODE?: ActiveDefenseMode;
  ACTIVE_DEFENSE_HMAC_KEY?: string;
}

export interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface AttackFlowResult {
  flow: AttackFlowName;
  score: number;
  finding: string;
}

export interface ActiveDefenseDecision {
  contract: typeof ACTIVE_DEFENSE_CONTRACT;
  verdict: ActiveDefenseVerdict;
  actorFingerprint: string;
  incidentFingerprint: string;
  continuityParent: string | null;
  sourceIp: string;
  asn: number | null;
  asOrganization: string | null;
  claimedUserAgent: string;
  verifiedBot: boolean;
  verifiedBotCategory: string | null;
  botScore: number | null;
  risk: number;
  fixedExpansion: number;
  randomExpansion: number;
  logicalExpansion: number;
  attackUnit: AttackFlowResult[];
  evidence: {
    method: string;
    pathname: string;
    cfRay: string | null;
    ja3: string | null;
    ja4: string | null;
    automationClaimed: boolean;
    suspiciousPath: boolean;
    hallwayContinuation: boolean;
  };
  controls: {
    outboundProbe: false;
    productionExposure: 0;
    realCredentialsExposed: 0;
    customerDataExposed: 0;
    lazyMaterialization: true;
    sessionIsolationRequired: true;
  };
}

export interface ActiveDefenseResult {
  decision: ActiveDefenseDecision;
  response: Response | null;
}

const AUTOMATION_UA = /(bot|crawler|spider|scrapy|curl|wget|httpclient|python-requests|go-http-client|headless|scanner|nikto|nmap)/i;
const SUSPICIOUS_PATH = /(^|\/)(\.env|\.git|wp-admin|wp-login\.php|phpmyadmin|server-status|actuator|cgi-bin|\.aws|etc\/passwd|vendor\/phpunit|boaform)(\/|$)/i;
const HALLWAY_PATH = /^\/api\/v1\/resource\/[a-f0-9]{16}$/i;
const COOKIE_ID = /^[a-f0-9]{24}$/i;
const COOKIE_SIG = /^[a-f0-9]{32}$/i;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function hmac(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value, 'utf8').digest('hex');
}

function deriveKey(rootSecret: string, purpose: string): string {
  return hmac(rootSecret, `${ACTIVE_DEFENSE_CONTRACT}:sekret-bip:${purpose}`);
}

function normalizedMode(value: unknown): ActiveDefenseMode {
  return value === 'contain' || value === 'observe' || value === 'off' ? value : 'observe';
}

function parseCookies(request: Request): Map<string, string> {
  const result = new Map<string, string>();
  for (const part of (request.headers.get('Cookie') ?? '').split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    result.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return result;
}

function safeHexEqual(left: string, right: string): boolean {
  if (left.length !== right.length || left.length % 2 !== 0) return false;
  try {
    return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
  } catch {
    return false;
  }
}

function continuityParent(request: Request, rootSecret: string): string | null {
  if (!rootSecret) return null;
  const raw = parseCookies(request).get(HALLWAY_COOKIE);
  if (!raw) return null;
  const [id, signature, ...extra] = raw.split('.');
  if (extra.length || !id || !signature || !COOKIE_ID.test(id) || !COOKIE_SIG.test(signature)) return null;
  const key = deriveKey(rootSecret, 'hallway-continuity');
  const expected = hmac(key, id).slice(0, 32);
  return safeHexEqual(signature, expected) ? id.toLowerCase() : null;
}

function signedContinuityCookie(rootSecret: string, incidentFingerprint: string): string | null {
  if (!rootSecret) return null;
  const id = incidentFingerprint.slice(0, 24);
  const key = deriveKey(rootSecret, 'hallway-continuity');
  const signature = hmac(key, id).slice(0, 32);
  return `${HALLWAY_COOKIE}=${id}.${signature}; Path=/; Max-Age=900; Secure; HttpOnly; SameSite=Strict`;
}

function randomExpansion(rootSecret: string, incidentFingerprint: string): number {
  const key = deriveKey(rootSecret, 'hallway-expansion');
  const digest = hmac(key, `step:${incidentFingerprint}`);
  const sample = Number.parseInt(digest.slice(0, 12), 16);
  return 1 + (sample % HALLWAY_RANDOM_EXPANSION_MAX);
}

function flow(name: AttackFlowName, score: number, finding: string): AttackFlowResult {
  return { flow: name, score: clamp(score, 0, 100), finding };
}

function runAttackUnit(input: {
  suspiciousPath: boolean;
  hallwayContinuation: boolean;
  automationClaimed: boolean;
  verifiedBot: boolean;
  botScore: number | null;
  method: string;
  cfRay: string | null;
  sourceIp: string;
}): AttackFlowResult[] {
  const lowBotScore = input.botScore !== null && input.botScore < 30;
  const noRay = !input.cfRay;
  const unknownSource = input.sourceIp === 'unknown';
  const mutationMethod = !['GET', 'HEAD', 'OPTIONS'].includes(input.method);
  const activeHallway = input.hallwayContinuation;

  return [
    flow('attack10', input.suspiciousPath ? 95 : lowBotScore ? 70 : 10, input.suspiciousPath ? 'known reconnaissance path' : 'baseline ingress abuse checks'),
    flow('attack20', noRay ? 55 : activeHallway ? 25 : 5, noRay ? 'continuity witness missing' : activeHallway ? 'hallway successor observed' : 'edge continuity present'),
    flow('attack30', mutationMethod && input.automationClaimed ? 65 : 10, 'state-transition pressure check'),
    flow('attack3000', lowBotScore || activeHallway ? 75 : 15, 'automation pressure sweep'),
    flow('attack5000', mutationMethod ? 45 : activeHallway ? 30 : 10, 'authority-boundary pressure sweep'),
    flow('attack6000', input.automationClaimed && !input.verifiedBot ? 70 : activeHallway ? 65 : 10, 'identity/evidence contradiction sweep'),
    flow('attack48000', input.suspiciousPath || lowBotScore || activeHallway ? 90 : 20, 'portfolio-scale adversarial pressure gate'),
    flow('redteamI', input.suspiciousPath || activeHallway ? 90 : 15, 'premise and exploitability challenge'),
    flow('redteamII', mutationMethod ? 55 : activeHallway ? 40 : 10, 'solution and control-plane challenge'),
    flow('redteamTwin', input.automationClaimed && !input.verifiedBot ? 60 : activeHallway ? 50 : 10, 'counterparty trust challenge'),
    flow('devil', unknownSource || noRay ? 60 : activeHallway ? 55 : 15, 'escape, attribution, and cost-amplification challenge'),
    flow('lindymode', 5, 'bounded stateless controls preferred over fragile retaliation'),
    flow('l99', mutationMethod ? 40 : activeHallway ? 30 : 5, 'authority, state, evidence, rollback, compounding-value check'),
    flow('ooda', input.suspiciousPath || activeHallway ? 70 : 10, 'observe-orient-decide-act-verify loop'),
    flow('truthmode', input.verifiedBot ? 5 : input.automationClaimed || activeHallway ? 45 : 10, 'separate claimed identity from verified identity'),
    flow('confess', input.automationClaimed && !input.verifiedBot ? 45 : activeHallway ? 35 : 5, 'record attribution uncertainty'),
    flow('goalfix', input.suspiciousPath || activeHallway ? 65 : 5, 'smallest reversible containment action'),
    flow('proofMode', noRay ? 50 : activeHallway ? 25 : 5, 'evidence receipt completeness'),
    flow('continuity', noRay ? 45 : activeHallway ? 35 : 5, 'session/evidence lineage check'),
    flow('rollback', 5, 'response-only containment remains instantly reversible'),
  ];
}

function riskFromAttackUnit(results: AttackFlowResult[]): number {
  const top = [...results].sort((a, b) => b.score - a.score).slice(0, 5);
  return Math.round(top.reduce((sum, item) => sum + item.score, 0) / top.length);
}

export function evaluateActiveDefenseRequest(request: Request, env: ActiveDefenseEnv): ActiveDefenseDecision {
  const cf = (request as unknown as { cf?: CloudflareSignals }).cf;
  const bot = cf?.botManagement ?? null;
  const url = new URL(request.url);
  const rootSecret = env.ACTIVE_DEFENSE_HMAC_KEY?.trim() || '';
  const mode = normalizedMode(env.ACTIVE_DEFENSE_MODE);
  const sourceIp = request.headers.get('CF-Connecting-IP')?.trim() || 'unknown';
  const claimedUserAgent = request.headers.get('User-Agent')?.trim() || 'unknown';
  const verifiedBot = bot?.verifiedBot === true;
  const botScore = typeof bot?.score === 'number' && Number.isFinite(bot.score) ? bot.score : null;
  const automationClaimed = AUTOMATION_UA.test(claimedUserAgent);
  const suspiciousPath = SUSPICIOUS_PATH.test(url.pathname);
  const hallwayContinuation = HALLWAY_PATH.test(url.pathname);
  const cfRay = request.headers.get('CF-Ray');
  const asn = typeof cf?.asn === 'number' && Number.isFinite(cf.asn) ? cf.asn : null;
  const asOrganization = typeof cf?.asOrganization === 'string' ? cf.asOrganization : null;
  const parent = continuityParent(request, rootSecret);

  const actorFingerprint = sha256(JSON.stringify({
    sourceIp,
    asn,
    asOrganization,
    claimedUserAgent,
    ja3: bot?.ja3Hash ?? null,
    ja4: bot?.ja4 ?? null,
  }));
  const incidentFingerprint = sha256(JSON.stringify({
    actorFingerprint,
    parent,
    method: request.method,
    pathname: url.pathname,
    queryKeys: [...url.searchParams.keys()].sort(),
    cfRay,
  }));

  const attackUnit = runAttackUnit({
    suspiciousPath,
    hallwayContinuation,
    automationClaimed,
    verifiedBot,
    botScore,
    method: request.method,
    cfRay,
    sourceIp,
  });
  const risk = riskFromAttackUnit(attackUnit);

  let verdict: ActiveDefenseVerdict = 'ALLOW';
  if (verifiedBot) verdict = 'VERIFIED_BOT';
  else if (mode !== 'off' && (automationClaimed || botScore !== null || hallwayContinuation)) verdict = 'OBSERVE_AUTOMATION';
  if (
    mode === 'contain'
    && rootSecret
    && !verifiedBot
    && (suspiciousPath || hallwayContinuation || risk >= 70)
  ) {
    verdict = 'HALLWAY';
  }

  const fixedExpansion = verdict === 'HALLWAY' ? HALLWAY_BASE_EXPANSION : 0;
  const randomExpansionValue = verdict === 'HALLWAY' ? randomExpansion(rootSecret, incidentFingerprint) : 0;

  return {
    contract: ACTIVE_DEFENSE_CONTRACT,
    verdict,
    actorFingerprint,
    incidentFingerprint,
    continuityParent: parent,
    sourceIp,
    asn,
    asOrganization,
    claimedUserAgent,
    verifiedBot,
    verifiedBotCategory: typeof cf?.verifiedBotCategory === 'string' ? cf.verifiedBotCategory : null,
    botScore,
    risk,
    fixedExpansion,
    randomExpansion: randomExpansionValue,
    logicalExpansion: fixedExpansion + randomExpansionValue,
    attackUnit,
    evidence: {
      method: request.method,
      pathname: url.pathname,
      cfRay,
      ja3: bot?.ja3Hash ?? null,
      ja4: bot?.ja4 ?? null,
      automationClaimed,
      suspiciousPath,
      hallwayContinuation,
    },
    controls: {
      outboundProbe: false,
      productionExposure: 0,
      realCredentialsExposed: 0,
      customerDataExposed: 0,
      lazyMaterialization: true,
      sessionIsolationRequired: true,
    },
  };
}

function syntheticLinks(request: Request, decision: ActiveDefenseDecision): string[] {
  const origin = new URL(request.url).origin;
  return Array.from({ length: 8 }, (_, index) => {
    const node = sha256(`${decision.incidentFingerprint}:${index}`).slice(0, 16);
    return `${origin}/api/v1/resource/${node}`;
  });
}

function hallwayResponse(request: Request, decision: ActiveDefenseDecision, rootSecret: string): Response {
  const payload = {
    ok: true,
    request_id: decision.incidentFingerprint.slice(0, 24),
    continuation: syntheticLinks(request, decision),
    cursor: sha256(`cursor:${decision.incidentFingerprint}`).slice(0, 24),
  };
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; object-src 'none'",
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  });
  const continuityCookie = signedContinuityCookie(rootSecret, decision.incidentFingerprint);
  if (continuityCookie) headers.set('Set-Cookie', continuityCookie);
  return new Response(JSON.stringify(payload), { status: 200, headers });
}

function observeDecision(
  request: Request,
  env: ActiveDefenseEnv,
  ctx: MinimalExecutionContext,
  decision: ActiveDefenseDecision,
  started: number,
): void {
  if (
    decision.verdict === 'ALLOW'
    && !decision.evidence.suspiciousPath
    && !decision.evidence.automationClaimed
    && !decision.evidence.hallwayContinuation
  ) return;

  const event: WorkerTelemetryEvent = {
    fingerprint: `worker_active_defense_${decision.verdict.toLowerCase()}`,
    route: decision.evidence.pathname,
    method: decision.evidence.method,
    status: decision.verdict === 'HALLWAY' ? 200 : 0,
    duration_ms: Date.now() - started,
    provider: 'cloudflare',
    operation: 'active_defense',
    request_id: decision.evidence.cfRay || undefined,
    fallback_used: false,
    retry_count: 0,
    trace_id: decision.incidentFingerprint,
    policy_version: ACTIVE_DEFENSE_CONTRACT,
    decision: decision.verdict === 'HALLWAY' ? 'block' : 'allow',
    violation_codes: decision.verdict === 'VERIFIED_BOT'
      ? undefined
      : [
          `active_defense_${decision.verdict.toLowerCase()}`,
          `risk_${decision.risk}`,
        ],
  };
  emitWorkerTelemetry(event);
  ctx.waitUntil(persistAuditEvent(event, env));

  // Cloudflare persistent logs retain the bounded technical-attribution receipt.
  // This is evidence, not proof of a human identity. It never reaches the client.
  console.info(JSON.stringify({
    type: 'juss.active-defense',
    contract: decision.contract,
    verdict: decision.verdict,
    actor_fingerprint: decision.actorFingerprint,
    incident_fingerprint: decision.incidentFingerprint,
    continuity_parent: decision.continuityParent,
    source_ip: decision.sourceIp,
    asn: decision.asn,
    as_organization: decision.asOrganization,
    claimed_user_agent: decision.claimedUserAgent,
    verified_bot: decision.verifiedBot,
    verified_bot_category: decision.verifiedBotCategory,
    bot_score: decision.botScore,
    risk: decision.risk,
    fixed_expansion: decision.fixedExpansion,
    random_expansion: decision.randomExpansion,
    logical_expansion: decision.logicalExpansion,
    attack_flows: decision.attackUnit.map((entry) => entry.flow),
    controls: decision.controls,
  }));
}

export function enforceActiveDefense(
  request: Request,
  env: ActiveDefenseEnv,
  ctx: MinimalExecutionContext,
  started = Date.now(),
): ActiveDefenseResult {
  const decision = evaluateActiveDefenseRequest(request, env);
  observeDecision(request, env, ctx, decision, started);
  const rootSecret = env.ACTIVE_DEFENSE_HMAC_KEY?.trim() || '';
  return {
    decision,
    response: decision.verdict === 'HALLWAY'
      ? hallwayResponse(request, decision, rootSecret)
      : null,
  };
}

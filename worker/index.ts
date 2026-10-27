import worker from './sekret-reply';
import { synthesizeWithPiper, type PiperTtsEnv, type PiperCharacterId } from './piper-tts';
import { authenticate, type AuthEnv, type Principal } from './auth';
import { handleBridgeSummaryGenerate } from './bridge-summary';
import { getModels } from './config/models';
import {
  buildRuntimeStyleInstruction,
  enforceRuntimeStyleResponse,
  normalizeReplyActor,
  normalizeReplySurface,
  resolveRuntimeStyle,
  validateActorSurface,
  type ReplyActorId,
  type RuntimeStyleContract,
} from './runtime-style';

/** Cloudflare Workers Rate Limiting binding (GA). See wrangler.toml [[ratelimits]]. */
interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

type OpenAIVoice = string | { id: string };
type AudioFormat = 'mp3' | 'opus' | 'aac' | 'flac' | 'wav';

interface Env extends PiperTtsEnv, AuthEnv {
  OPENAI_API_KEY?: string;
  OPENAI_CHAT_MODEL?: string;
  OPENAI_TTS_MODEL?: string;
  OPENAI_STT_MODEL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  SUHANA_VOICE_ID?: string;
  SY_VOICE_ID?: string;
  CLOUD_VOICE_ID?: string;
  NIGHT_VOICE_ID?: string;
  SEKRET_VOICE_ID?: string;
  PARENT_COACH_VOICE_ID?: string;
  SEKRET_RATE_LIMITER?: RateLimit;
  ALLOWED_ORIGINS?: string;
}

const DEFAULT_ALLOWED_ORIGINS = [
  'https://sekretbip.net',
  'https://www.sekretbip.net',
  'https://app.sekretbip.net',
];

function allowedOriginList(env: Env): string[] | null {
  const configured = env.ALLOWED_ORIGINS?.trim();
  if (!configured || configured === '*') {
    return env.SEKRET_AUTH_MODE === 'dev-open' ? null : DEFAULT_ALLOWED_ORIGINS;
  }
  return configured.split(',').map((o) => o.trim()).filter(Boolean);
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const allowed = allowedOriginList(env);
  let allowOrigin = '*';
  if (allowed) {
    const origin = request.headers.get('Origin');
    allowOrigin = origin && allowed.includes(origin) ? origin : (allowed[0] ?? 'null');
  }
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin',
  };
}

function originRejected(request: Request, env: Env, cors: Record<string, string>): Response | null {
  const allowed = allowedOriginList(env);
  if (!allowed) return null;
  const origin = request.headers.get('Origin');
  if (!origin || allowed.includes(origin)) return null;
  return json({ error: 'origin not allowed' }, 403, cors);
}

function hasJsonContentType(request: Request): boolean {
  const contentType = request.headers.get('Content-Type')?.split(';', 1)[0]?.trim().toLowerCase() ?? '';
  return contentType === 'application/json' || contentType.endsWith('+json');
}

const CHARACTER_FALLBACKS: Record<ReplyActorId, string[]> = {
  suhana: [
    'Hey! Random or did something actually happen?',
    "That's porchlight behavior. I need the real version.",
    'See, now I need to know what was funny 😭',
    'Okay what happened, break it down.',
    'Girl, okay. What really happened?',
  ],
  sy: [
    "Aight, I'm here. Talk.",
    'Bet. Nothing days count too. You tryna chill or find something to get into?',
    'Right lol. But for real though.',
    "What's going on? All of it.",
    "Say the real version. What's going on?",
  ],
  cloud: [
    "Hey. No pressure. What's on your mind or nothing at all?",
    "That's okay. We can just vibe.",
    "Tiny cloud report: I'm here, no pressure.",
    'No rush. Start wherever feels okay.',
    "We don't have to fix anything. Just talk.",
  ],
  night: [
    'Hey. You trying to talk, plan, or just sit in it?',
    'Nothing-nothing or something on your mind?',
    "Right. But for real, what's actually going on?",
    "Okay, I'm here. What you bringing?",
    "Say more. What's the actual thing?",
  ],
  sekret: [
    'Something brought you here. Start with the part that feels loudest.',
    'Sometimes you show up before the words do. We can start anywhere.',
    "I'm here. No agenda. Take your time.",
    'You showed up. That means something.',
    "There's something circling. Let it arrive in its own words.",
  ],
  parentCoach: [
    "I'm here. Start with what happened at home.",
    'That sounds worth slowing down for. Give me the real version.',
    'You do not have to solve the whole relationship in one conversation.',
    'Start with what you know happened, not the part fear is filling in.',
  ],
};

const BUILT_IN_VOICES: Record<ReplyActorId, string> = {
  suhana: 'nova',
  sy: 'ash',
  cloud: 'shimmer',
  night: 'onyx',
  sekret: 'sage',
  parentCoach: 'sage',
};

function configuredVoice(actorId: ReplyActorId, env: Env): string | undefined {
  if (actorId === 'suhana') return env.SUHANA_VOICE_ID;
  if (actorId === 'sy') return env.SY_VOICE_ID;
  if (actorId === 'cloud') return env.CLOUD_VOICE_ID;
  if (actorId === 'night') return env.NIGHT_VOICE_ID;
  if (actorId === 'parentCoach') return env.PARENT_COACH_VOICE_ID;
  return env.SEKRET_VOICE_ID;
}

function getOpenAIVoice(actorId: ReplyActorId, env: Env): { voice: OpenAIVoice; source: 'configured' | 'built-in' } {
  const custom = configuredVoice(actorId, env)?.trim();
  if (custom) return { voice: custom, source: 'configured' };
  return { voice: BUILT_IN_VOICES[actorId], source: 'built-in' };
}

function normalizeAudioFormat(value: unknown): AudioFormat {
  return value === 'opus' || value === 'aac' || value === 'flac' || value === 'wav' ? value : 'mp3';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    return await request.clone().json() as Record<string, unknown>;
  } catch {
    return null;
  }
}

function requestWithJsonBody(request: Request, body: Record<string, unknown>): Request {
  const headers = new Headers(request.headers);
  headers.set('Content-Type', 'application/json');
  headers.delete('Content-Length');
  return new Request(request.url, {
    method: request.method,
    headers,
    body: JSON.stringify(body),
  });
}

function styleMetadata(style: RuntimeStyleContract): Record<string, unknown> {
  return enforceRuntimeStyleResponse({}, style);
}

/**
 * `sekret-reply.ts` sets its own wildcard CORS headers on every response it
 * builds. Routes delegated to it verbatim (anything not reshaped by
 * rewriteStyledJsonResponse) must still carry this Worker's origin-locked
 * headers, or the delegated response silently reopens CORS to '*'.
 */
function withCors(response: Response, cors: Record<string, string>): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function rewriteStyledJsonResponse(
  response: Response,
  style: RuntimeStyleContract,
  cors: Record<string, string>,
): Promise<Response> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return response;
  try {
    const data = await response.json() as Record<string, unknown>;
    const styled = enforceRuntimeStyleResponse(data, style);
    return json({
      ...styled,
      characterId: style.actorId,
      styleDecision: styled.styleRepaired ? 'repair' : 'allow',
    }, response.status, cors);
  } catch {
    return json({ error: 'invalid delegated response' }, 502, cors);
  }
}

function prepareStyledReply(
  request: Request,
  body: Record<string, unknown>,
): { request: Request; style: RuntimeStyleContract } | { error: string } {
  const actorId = normalizeReplyActor(body.characterId ?? body.personality);
  if (!actorId) return { error: 'characterId must be suhana, sy, cloud, night, sekret, or parentCoach' };

  const surface = normalizeReplySurface(body.surface ?? body.context);
  const mismatch = validateActorSurface(actorId, surface);
  if (mismatch) return { error: mismatch };

  const style = resolveRuntimeStyle(actorId);
  const priorPhaseInstruction = typeof body.phaseInstruction === 'string' ? body.phaseInstruction.trim() : '';
  const styleInstruction = buildRuntimeStyleInstruction(style);
  const styledBody: Record<string, unknown> = {
    ...body,
    characterId: actorId,
    surface,
    phaseInstruction: priorPhaseInstruction
      ? `${priorPhaseInstruction}\n\n${styleInstruction}`
      : styleInstruction,
  };

  return { request: requestWithJsonBody(request, styledBody), style };
}

async function enforceRateLimit(
  request: Request,
  env: Env,
  principal: Principal,
  cors: Record<string, string>,
): Promise<Response | null> {
  const limiter = env.SEKRET_RATE_LIMITER;
  if (!limiter) return null;

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const key = principal.kind === 'user' ? `user:${principal.userId}` : `ip:${ip}`;
  try {
    const { success } = await limiter.limit({ key });
    if (!success) return json({ error: 'rate limit exceeded' }, 429, cors);
  } catch (error) {
    console.error('[rate-limit]', error);
  }
  return null;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

async function handleStyledVoice(
  body: Record<string, unknown>,
  env: Env,
  cors: Record<string, string>,
): Promise<Response> {
  const text = (
    typeof body.reply === 'string' ? body.reply
      : typeof body.text === 'string' ? body.text
        : ''
  ).trim();
  if (!text) return json({ error: 'reply is required' }, 400, cors);

  const actorId = normalizeReplyActor(body.characterId);
  if (!actorId) return json({ error: 'characterId must be suhana, sy, cloud, night, sekret, or parentCoach' }, 400, cors);
  const style = resolveRuntimeStyle(actorId);

  if (env.PIPER_TTS_URL?.trim()) {
    try {
      const audio = await synthesizeWithPiper({ text, characterId: actorId as PiperCharacterId, env });
      if (audio) {
        return json({
          ...styleMetadata(style),
          audioBase64: toBase64(audio.bytes),
          contentType: audio.contentType,
          characterId: actorId,
          voiceSource: 'piper',
          voiceId: audio.voice,
          aiGenerated: true,
          styleDecision: 'allow',
        }, 200, cors);
      }
    } catch (error) {
      console.error('[sekret/voice:piper]', error);
      if (!env.OPENAI_API_KEY) return json({ error: 'piper tts failed' }, 502, cors);
    }
  }

  const openAiKey = env.OPENAI_API_KEY;
  if (!openAiKey) return json({ error: 'voice unavailable' }, 503, cors);

  const format = normalizeAudioFormat(body.format);
  const selectedVoice = getOpenAIVoice(actorId, env);
  const model = getModels({
    OPENAI_API_KEY: openAiKey,
    OPENAI_CHAT_MODEL: env.OPENAI_CHAT_MODEL,
    OPENAI_TTS_MODEL: env.OPENAI_TTS_MODEL,
    OPENAI_STT_MODEL: env.OPENAI_STT_MODEL,
  }).tts;
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiKey}` },
    body: JSON.stringify({
      model,
      voice: selectedVoice.voice,
      input: text.slice(0, 4000),
      instructions: style.speechInstructions,
      response_format: format,
    }),
  });
  if (!response.ok) return json({ error: 'tts failed' }, 502, cors);

  const bytes = new Uint8Array(await response.arrayBuffer());
  return json({
    ...styleMetadata(style),
    audioBase64: toBase64(bytes),
    contentType: `audio/${format === 'mp3' ? 'mpeg' : format}`,
    characterId: actorId,
    voiceSource: selectedVoice.source,
    aiGenerated: true,
    model,
    styleDecision: 'allow',
  }, 200, cors);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const blocked = originRejected(request, env, cors);
    if (blocked) return blocked;

    const path = new URL(request.url).pathname;

    if (request.method === 'GET' && path === '/health') {
      return json({ ok: true, worker: 'sekret-backend', router: 'observed-index' }, 200, cors);
    }

    let principal: Principal | null = null;

    if (request.method === 'POST' && path.includes('/api/') && !hasJsonContentType(request)) {
      return json({ error: 'content-type must be application/json' }, 415, cors);
    }

    if (request.method === 'POST' && path.includes('/api/')) {
      const auth = await authenticate(request, env);
      if (!auth.ok) return json({ error: auth.error }, auth.status, cors);
      principal = auth.principal;

      const limited = await enforceRateLimit(request, env, auth.principal, cors);
      if (limited) return limited;
    }

    if (request.method === 'POST' && path.endsWith('/api/bridge/summary/generate')) {
      if (!principal) return json({ error: 'authentication required' }, 401, cors);
      return handleBridgeSummaryGenerate(request, env, principal, cors);
    }

    if (request.method === 'POST' && path.endsWith('/api/sekret/voice')) {
      if (!principal) return json({ error: 'authentication required' }, 401, cors);
      const body = await readJsonBody(request);
      if (!body) return json({ error: 'Invalid JSON' }, 400, cors);
      return handleStyledVoice(body, env, cors);
    }

    if (request.method === 'POST' && path.endsWith('/api/sekret/reply')) {
      if (!principal) return json({ error: 'authentication required' }, 401, cors);
      const body = await readJsonBody(request);
      if (!body) return json({ error: 'Invalid JSON' }, 400, cors);

      const prepared = prepareStyledReply(request, body);
      if ('error' in prepared) return json({ error: prepared.error }, 400, cors);

      const userText = (
        typeof body.userText === 'string' ? body.userText
          : typeof body.text === 'string' ? body.text
            : ''
      ).trim();
      if (!userText) return json({ error: 'userText is required' }, 400, cors);

      if (!env.OPENAI_API_KEY) {
        const options = CHARACTER_FALLBACKS[prepared.style.actorId];
        const start = stableHash(`${prepared.style.actorId}:${userText.toLowerCase()}`) % options.length;
        console.error('[sekret/reply] OPENAI_API_KEY is not configured, serving fallback');
        const styled = enforceRuntimeStyleResponse({
          reply: options[start],
          tone: prepared.style.actorId === 'parentCoach' ? 'grounded' : 'casual',
          safetyFlag: false,
          parentShareSummary: null,
          suggestedComfortTool: prepared.style.actorId === 'sekret' ? 'self-discovery' : null,
          replySource: 'fallback',
          detectedIntent: 'greeting',
          usedGreetingVariant: false,
        }, prepared.style);
        return json({
          ...styled,
          characterId: prepared.style.actorId,
          styleDecision: styled.styleRepaired ? 'repair' : 'allow',
        }, 200, cors);
      }

      const delegated = await worker.fetch(
        prepared.request,
        env as { OPENAI_API_KEY: string },
        principal,
      );
      return rewriteStyledJsonResponse(delegated, prepared.style, cors);
    }

    const fallback = await worker.fetch(request, env as { OPENAI_API_KEY: string }, principal);
    return withCors(fallback, cors);
  },
};

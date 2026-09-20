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
  SUPABASE_SECRET_KEY?: string;
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
    'Tell me what you noticed before you tell me what you think it means.',
    "Let's slow the situation down and separate what happened from what you're afraid it means.",
    'What did your child actually say or do?',
    "Start with the part you know for sure.",
  ],
};

const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });

const withCors = (response: Response, cors: Record<string, string>) => {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const normalizeVoice = (voice: OpenAIVoice | undefined): string | undefined => {
  if (typeof voice === 'string') return voice;
  if (voice && typeof voice.id === 'string') return voice.id;
  return undefined;
};

const styleActorForPath = (path: string): ReplyActorId | null => {
  const match = path.match(/^\/api\/(suhana|sy|cloud|night|sekret|parent-coach)\/(reply|tts)$/);
  return match ? normalizeReplyActor(match[1]) : null;
};

const voiceForActor = (actor: ReplyActorId, env: Env): string | undefined => {
  const map: Record<ReplyActorId, string | undefined> = {
    suhana: env.SUHANA_VOICE_ID,
    sy: env.SY_VOICE_ID,
    cloud: env.CLOUD_VOICE_ID,
    night: env.NIGHT_VOICE_ID,
    sekret: env.SEKRET_VOICE_ID,
    parentCoach: env.PARENT_COACH_VOICE_ID,
  };
  return map[actor];
};

const authRole = (principal: Principal | null): 'teen' | 'parent' | 'anonymous' => {
  if (!principal) return 'anonymous';
  if (principal.role === 'parent') return 'parent';
  if (principal.role === 'teen') return 'teen';
  return 'anonymous';
};

const fallbackReply = (actor: ReplyActorId): string => {
  const lines = CHARACTER_FALLBACKS[actor] ?? CHARACTER_FALLBACKS.sekret;
  return lines[Math.floor(Math.random() * lines.length)] ?? "I'm here.";
};

const replyBody = async (
  actor: ReplyActorId,
  style: RuntimeStyleContract,
  body: { message?: string; text?: string; history?: unknown[] },
  env: Env,
) => {
  const prompt = String(body.message ?? body.text ?? '').trim();
  if (!prompt) return fallbackReply(actor);

  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return fallbackReply(actor);

  const messages = [
    { role: 'system', content: buildRuntimeStyleInstruction(style) },
    ...(Array.isArray(body.history) ? body.history.slice(-8) : []),
    { role: 'user', content: prompt },
  ];

  const result = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: env.OPENAI_CHAT_MODEL || getModels(env).chat, messages, max_tokens: 350 }),
  });

  if (!result.ok) return fallbackReply(actor);
  const payload = await result.json() as { choices?: Array<{ message?: { content?: string } }> };
  return payload.choices?.[0]?.message?.content?.trim() || fallbackReply(actor);
};

const ttsResponse = async (
  actor: ReplyActorId,
  style: RuntimeStyleContract,
  body: { text?: string; message?: string },
  env: Env,
) => {
  const text = String(body.text ?? body.message ?? '').trim();
  if (!text) return json({ error: 'text required' }, 400);

  const voiceId = voiceForActor(actor, env);
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return json({ error: 'voice unavailable' }, 503);

  const result = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: env.OPENAI_TTS_MODEL || getModels(env).tts,
      voice: normalizeVoice(voiceId) || 'alloy',
      input: text,
      response_format: 'mp3' satisfies AudioFormat,
      instructions: style.speechInstruction,
    }),
  });

  if (!result.ok) return json({ error: 'voice generation failed' }, 502);
  return new Response(result.body, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
};

const sttResponse = async (request: Request, env: Env) => {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return json({ error: 'transcription unavailable' }, 503);
  const form = await request.formData();
  const result = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  return new Response(result.body, {
    status: result.status,
    headers: { 'Content-Type': result.headers.get('Content-Type') || 'application/json' },
  });
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    const rejected = originRejected(request, env, cors);
    if (rejected) return rejected;

    const path = url.pathname;
    if (path === '/health') return json({ ok: true, service: 'sekret' }, 200, cors);
    if (path === '/api/bridge/summary') return withCors(await handleBridgeSummaryGenerate(request, env), cors);
    if (path === '/api/sekret/reply' || path === '/api/sekret/voice' || path === '/api/sekret/transcribe') {
      return withCors(await worker.fetch(request, env as never), cors);
    }

    const actor = styleActorForPath(path);
    if (!actor) return json({ error: 'not found' }, 404, cors);

    const auth = await authenticate(request, env);
    if (!auth.ok) return json({ error: auth.error }, auth.status, cors);
    const role = authRole(auth.principal);
    const surface = path.endsWith('/tts') ? 'voice' : 'chat';
    const validation = validateActorSurface(actor, role, surface);
    if (!validation.allowed) return json({ error: validation.reason }, 403, cors);

    const style = resolveRuntimeStyle(actor, role, surface);
    if (path.endsWith('/reply')) {
      if (!hasJsonContentType(request)) return json({ error: 'content-type must be application/json' }, 415, cors);
      const body = await request.json().catch(() => ({})) as { message?: string; text?: string; history?: unknown[] };
      const responseText = await replyBody(actor, style, body, env);
      return json({ reply: enforceRuntimeStyleResponse(responseText, style) }, 200, cors);
    }
    if (path.endsWith('/tts')) {
      if (!hasJsonContentType(request)) return json({ error: 'content-type must be application/json' }, 415, cors);
      const body = await request.json().catch(() => ({})) as { text?: string; message?: string };
      return withCors(await ttsResponse(actor, style, body, env), cors);
    }
    return json({ error: 'not found' }, 404, cors);
  },
};

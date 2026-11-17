import worker from './sekret-reply';

type CharacterId = 'raylene' | 'rylane' | 'cloud' | 'night' | 'sekret';

interface Env {
  OPENAI_API_KEY?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const CHARACTER_FALLBACKS: Record<CharacterId, string[]> = {
  raylene: [
    "Hey! Random or did something actually happen?",
    "That's valid. We can be random, nosy, calm, or chaotic.",
    "See, now I need to know what was funny 😭",
    "Okay what happened, break it down.",
    "Girl, okay. What really happened?",
  ],
  rylane: [
    "Aight, I'm here. Talk.",
    "Bet. Nothing days count too. You tryna chill or find something to get into?",
    "Right lol. But for real though.",
    "What's going on? All of it.",
    "Say the real version. What's going on?",
  ],
  cloud: [
    "Hey. No pressure — what's on your mind or nothing at all?",
    "That's okay. We can just vibe.",
    "Yeah. What's the kind of vibe today?",
    "No rush. Start wherever feels okay.",
    "We don't have to fix anything. Just talk.",
  ],
  night: [
    "Hey. You trying to talk, plan, or just sit in it?",
    "Nothing-nothing or something on your mind?",
    "Right. But for real — what's actually going on?",
    "Okay, I'm here. What you bringing?",
    "Say more. What's the actual thing?",
  ],
  sekret: [
    "Something brought you here — what is it?",
    "Sometimes you show up before the words do. We can start anywhere.",
    "I'm here. No agenda. Where do you want to start?",
    "You showed up. That means something. What's the thing?",
    "There's something circling. What is it?",
  ],
};

function normalizeCharacter(value: unknown): CharacterId {
  const raw = typeof value === 'string' ? value.toLowerCase().replace(/['']/g, '') : '';
  if (raw.includes('rylane')) return 'rylane';
  if (raw.includes('cloud')) return 'cloud';
  if (raw.includes('night')) return 'night';
  if (raw.includes('sekret') || raw === 'secret' || raw === 'oracle' || raw === 'ja') return 'sekret';
  return 'raylene';
}

function stableHash(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });

    const path = new URL(request.url).pathname;

    if (request.method === 'POST' && path.endsWith('/api/sekret/reply') && !env.OPENAI_API_KEY) {
      let body: Record<string, unknown>;
      try {
        body = await request.clone().json() as Record<string, unknown>;
      } catch {
        return json({ error: 'Invalid JSON' }, 400);
      }

      const userText = (
        typeof body.userText === 'string' ? body.userText
          : typeof body.text === 'string' ? body.text
            : ''
      ).trim();

      if (!userText) return json({ error: 'userText is required' }, 400);

      const characterId = normalizeCharacter(body.characterId ?? body.personality);
      const options = CHARACTER_FALLBACKS[characterId];
      const start = stableHash(`${characterId}:${userText.toLowerCase()}`) % options.length;

      console.error('[sekret/reply] OPENAI_API_KEY is not configured — serving fallback');

      return json({
        reply: options[start],
        tone: 'casual',
        safetyFlag: false,
        parentShareSummary: null,
        suggestedComfortTool: null,
        replySource: 'fallback',
        detectedIntent: 'greeting',
        usedGreetingVariant: false,
      });
    }

    return worker.fetch(request, env as { OPENAI_API_KEY: string });
  },
};

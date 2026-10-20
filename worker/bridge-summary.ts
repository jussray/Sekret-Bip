import type { Principal } from './auth';
import { getModels } from './config/models';
import {
  BRIDGE_JSON_SCHEMA,
  isBridgeSummariesRolloutAllowed,
  isGeneratedSummary,
  passesPrivacyValidator,
  type GeneratedSummary,
} from './bridge-privacy-validator';
import {
  createBridgeSummaryStore,
  type BridgeShareRequestRow,
  type BridgeSummaryStoreEnv,
} from './bridge-summary-store';

interface BridgeSummaryEnv extends BridgeSummaryStoreEnv {
  OPENAI_API_KEY?: string;
  OPENAI_CHAT_MODEL?: string;
  /**
   * Server-side rollout control for Bridge summary generation, independent of
   * the client-bundled relationshipFeatureFlags constant (which a modified
   * client or direct API call can bypass). Values:
   *   unset or 'disabled' -> fail closed; generation is blocked
   *   'enabled'           -> allowed for everyone
   *   comma-separated user IDs -> allowlist for a controlled beta cohort
   * Set via `wrangler secret put BRIDGE_SUMMARIES_ROLLOUT` or [vars] in
   * wrangler.toml — changeable without an app release, unlike the client flag.
   */
  BRIDGE_SUMMARIES_ROLLOUT?: string;
}

interface BridgeSummaryRequestBody {
  requestId?: unknown;
}

const BRIDGE_SYSTEM_PROMPT = `
You turn a teen's private reflections into a short, protective summary for their parent. The parent must NEVER see the teen's exact words — only your generated themes and conversation starters.

RULES:
- Never quote or closely paraphrase the source text. Speak only in generalized themes.
- No clinical or diagnostic language: no "anxiety," "depression," "trauma," "disorder," "symptom." Describe feelings in plain, human terms instead.
- Stay protective of the teen: give the parent enough to open a caring conversation, never enough to feel like surveillance.
- themes: 1-3 short, general phrases (never specific events, names, or exact quotes).
- conversationStarters: 1-2 short questions or openers a parent could actually say out loud.
- limitations: one sentence reminding the parent this is a generated summary, not the teen's full private content, a diagnosis, or proof of what happened.
- Return only valid JSON with keys: themes (string[]), conversationStarters (string[]), limitations (string). No markdown, no code fences.
`.trim();

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

interface BridgeSummaryResponse {
  requestId: string;
  status: 'ready' | 'failed' | 'revoked';
  summary?: {
    themes: string[];
    conversationStarters: string[];
    limitations: string;
  };
  promptVersion?: string;
  model?: string | null;
  usedFallback?: boolean;
  failureCode?: string;
}

const PROMPT_VERSION = 'bridge-summary-v3';
const FALLBACK_SUMMARY = {
  themes: ['A teen chose to share emotional context with you.'],
  conversationStarters: [
    'I saw you wanted me to understand something. Do you want to talk about what support would feel helpful?',
  ],
  limitations: 'This is context, not the teen’s full private content, a diagnosis, or proof of what happened.',
};

function requireUser(principal: Principal): string {
  if (principal.kind !== 'user') throw new Error('user_jwt_required');
  return principal.userId;
}

function requestIsUsable(row: BridgeShareRequestRow): boolean {
  if (row.revoked_at) return false;
  if (['revoked', 'expired', 'deleted'].includes(row.status)) return false;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) return false;
  return true;
}

async function requestSummaryCompletion(apiKey: string, model: string, snippets: string[], correction?: string): Promise<unknown> {
  const messages: Array<{ role: 'system' | 'user'; content: string }> = [
    { role: 'system', content: BRIDGE_SYSTEM_PROMPT },
    { role: 'user', content: `Teen-selected private content to summarize for a parent:\n\n${snippets.join('\n\n')}` },
  ];
  if (correction) messages.push({ role: 'system', content: correction });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 300,
      response_format: { type: 'json_schema', json_schema: BRIDGE_JSON_SCHEMA },
      messages,
    }),
  });
  if (!res.ok) throw new Error(`openai_${res.status}`);
  const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
  return JSON.parse(data.choices?.[0]?.message?.content || '{}');
}

/**
 * Calls the model with only the minimized source snippets as ephemeral input
 * (never persisted). Every candidate summary must pass isGeneratedSummary
 * (shape) and passesPrivacyValidator (content) before being accepted — one
 * corrective retry is attempted on failure, then this returns null so the
 * caller falls back to the static FALLBACK_SUMMARY rather than persisting an
 * unvalidated model output.
 */
async function generateSummary(env: BridgeSummaryEnv, snippets: string[]): Promise<{ summary: GeneratedSummary; model: string } | null> {
  if (!env.OPENAI_API_KEY || snippets.length === 0) return null;
  const apiKey = env.OPENAI_API_KEY;
  const models = getModels({ OPENAI_API_KEY: apiKey, OPENAI_CHAT_MODEL: env.OPENAI_CHAT_MODEL });

  try {
    const first = await requestSummaryCompletion(apiKey, models.chat, snippets);
    if (isGeneratedSummary(first) && passesPrivacyValidator(first, snippets)) {
      return { summary: first, model: models.chat };
    }

    const retry = await requestSummaryCompletion(
      apiKey,
      models.chat,
      snippets,
      'Your previous response either used forbidden clinical language, quoted/closely paraphrased the source text, or exceeded the length/count limits. Send only generalized themes (1-3), conversation starters (1-2), and a short limitations sentence, with no verbatim or near-verbatim source wording.',
    );
    if (isGeneratedSummary(retry) && passesPrivacyValidator(retry, snippets)) {
      return { summary: retry, model: models.chat };
    }

    return null;
  } catch {
    return null;
  }
}

export async function handleBridgeSummaryGenerate(request: Request, env: BridgeSummaryEnv, principal: Principal, cors: Record<string, string>): Promise<Response> {
  let body: BridgeSummaryRequestBody;
  try {
    body = await request.json() as BridgeSummaryRequestBody;
  } catch {
    return json({ error: 'Invalid JSON' }, 400, cors);
  }

  const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
  if (!requestId) return json({ error: 'requestId is required' }, 400, cors);

  let userId = '';
  const store = createBridgeSummaryStore(env);
  try {
    userId = requireUser(principal);
    if (!isBridgeSummariesRolloutAllowed(env, userId)) {
      return json({ requestId, status: 'failed', failureCode: 'bridge_summaries_disabled' }, 403, cors);
    }

    const shareRequest = await store.fetchOwnedRequest(requestId, userId);
    if (!shareRequest) return json({ error: 'request not found' }, 404, cors);
    if (!requestIsUsable(shareRequest)) {
      return json({ requestId, status: 'revoked', failureCode: 'revoked' }, 409, cors);
    }
    if (shareRequest.status === 'ready' || shareRequest.status === 'viewed') {
      return json({ requestId, status: 'ready' }, 200, cors);
    }

    const sources = await store.fetchShareSources(requestId);
    if (sources.length === 0) {
      await store.patchRequestStatus(requestId, userId, 'failed', 'no_sources');
      return json({ requestId, status: 'failed', failureCode: 'no_sources' }, 422, cors);
    }

    let snippets: string[];
    try {
      snippets = await store.fetchSourceContent(userId, sources);
    } catch (error) {
      const sourceFailure = error instanceof Error ? error.message : 'source_lookup_failed';
      if (sourceFailure === 'source_not_available') {
        await store.patchRequestStatus(requestId, userId, 'failed', sourceFailure);
        return json({ requestId, status: 'failed', failureCode: sourceFailure }, 422, cors);
      }
      throw error;
    }

    const generated = await generateSummary(env, snippets);

    if (generated) {
      await store.upsertSummary(requestId, {
        themes: generated.summary.themes,
        conversationStarters: generated.summary.conversationStarters,
        limitations: generated.summary.limitations,
        promptVersion: PROMPT_VERSION,
        model: generated.model,
        usedFallback: false,
      });
      await store.patchRequestStatus(requestId, userId, 'ready');
      const response: BridgeSummaryResponse = {
        requestId,
        status: 'ready',
        summary: generated.summary,
        promptVersion: PROMPT_VERSION,
        model: generated.model,
        usedFallback: false,
      };
      return json(response, 200, cors);
    }

    await store.upsertSummary(requestId, {
      themes: FALLBACK_SUMMARY.themes,
      conversationStarters: FALLBACK_SUMMARY.conversationStarters,
      limitations: FALLBACK_SUMMARY.limitations,
      promptVersion: PROMPT_VERSION,
      model: null,
      usedFallback: true,
    });
    await store.patchRequestStatus(requestId, userId, 'ready');
    const response: BridgeSummaryResponse = {
      requestId,
      status: 'ready',
      summary: FALLBACK_SUMMARY,
      promptVersion: PROMPT_VERSION,
      model: null,
      usedFallback: true,
    };
    return json(response, 200, cors);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'server_error';
    if (message === 'user_jwt_required') return json({ error: message }, 403, cors);
    if (userId) {
      try {
        await store.patchRequestStatus(requestId, userId, 'failed', message.slice(0, 80));
      } catch {
        // Preserve the original failure.
      }
    }
    return json({ requestId, status: 'failed', failureCode: 'server_error' }, 500, cors);
  }
}

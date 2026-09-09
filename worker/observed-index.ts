import worker from './index';
import emailRouter from './email-router';
import { emitWorkerTelemetry, type WorkerTelemetryEvent } from './telemetry';
import { persistAuditEvent, type AuditPersistEnv } from './audit/persist-event';
import { getModels, type WorkerEnv } from './config/models';

/** Minimal shape of Cloudflare's ExecutionContext. */
interface MinimalExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
}

function operationForPath(path: string): string {
  if (path.endsWith('/api/sekret/reply')) return 'reply';
  if (path.endsWith('/api/sekret/voice')) return 'tts';
  if (path.endsWith('/api/sekret/transcribe')) return 'stt';
  if (path.endsWith('/api/bridge/summary/generate')) return 'bridge_summary';
  return 'unknown';
}

function modelForOperation(operation: string, env: WorkerEnv): string | undefined {
  const models = getModels(env);
  if (operation === 'reply') return models.chat;
  if (operation === 'tts') return models.tts;
  if (operation === 'stt') return models.stt;
  return undefined;
}

function fingerprintFor(status: number, operation: string, fallbackUsed: boolean, decision?: string): string {
  if (decision === 'block') return 'openai_reply_blocked';
  if (fallbackUsed && operation === 'reply') return 'openai_reply_fallback';
  if (fallbackUsed && operation === 'bridge_summary') return 'bridge_summary_fallback';
  if (status === 401 || status === 403) return 'worker_auth_failure';
  if (status === 429) return 'worker_rate_limit';
  if (status >= 500) {
    if (operation === 'tts') return 'openai_tts_failure';
    if (operation === 'stt') return 'openai_stt_failure';
    if (operation === 'bridge_summary') return 'bridge_summary_failure';
    return 'openai_reply_failure';
  }
  if (status >= 400) return 'worker_invalid_request';
  if (decision === 'repair' || decision === 'retry') return 'openai_reply_repaired';
  if (operation === 'reply') return 'openai_reply_success';
  if (operation === 'tts') return 'openai_tts_success';
  if (operation === 'stt') return 'openai_stt_success';
  if (operation === 'bridge_summary') return 'bridge_summary_success';
  return 'worker_request_success';
}

interface SafeResponseMetadata {
  characterId?: string;
  actorRole?: string;
  fallbackUsed: boolean;
  voiceSource?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
  decision?: string;
  violationCodes?: string[];
  schemaValid?: boolean;
  promptVersion?: string;
  policyVersion?: string;
  traceId?: string;
  textStyleVersion?: string;
  speechStyleVersion?: string;
  questionBudget?: number;
  styleRepaired?: boolean;
  styleViolationCodes?: string[];
}

async function readSafeResponseMetadata(response: Response, operation: string): Promise<SafeResponseMetadata> {
  if (operation === 'unknown') return { fallbackUsed: false };
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return { fallbackUsed: false };
  try {
    const data = await response.clone().json() as Record<string, unknown>;
    const usage = data.usage as Record<string, unknown> | undefined;
    const fallbackUsed = data.replySource === 'fallback' || data.usedFallback === true;
    const styleDecision = data.styleDecision === 'repair' ? 'repair' : undefined;
    const decision = fallbackUsed ? 'fallback' : styleDecision || (typeof data.decision === 'string' ? data.decision : undefined);
    return {
      characterId: typeof data.characterId === 'string' ? data.characterId : undefined,
      actorRole: typeof data.actorRole === 'string' ? data.actorRole : undefined,
      fallbackUsed,
      voiceSource: typeof data.voiceSource === 'string' ? data.voiceSource : undefined,
      model: typeof data.model === 'string' ? data.model : undefined,
      inputTokens: typeof usage?.inputTokens === 'number' ? usage.inputTokens : undefined,
      outputTokens: typeof usage?.outputTokens === 'number' ? usage.outputTokens : undefined,
      totalTokens: typeof usage?.totalTokens === 'number' ? usage.totalTokens : undefined,
      estimatedCostUsd: typeof data.estimatedCostUsd === 'number' ? data.estimatedCostUsd : undefined,
      decision,
      violationCodes: Array.isArray(data.violationCodes) ? data.violationCodes.filter((v): v is string => typeof v === 'string') : undefined,
      schemaValid: typeof data.schemaValid === 'boolean' ? data.schemaValid : undefined,
      promptVersion: typeof data.promptVersion === 'string' ? data.promptVersion : undefined,
      policyVersion: typeof data.policyVersion === 'string' ? data.policyVersion : undefined,
      traceId: typeof data.traceId === 'string' ? data.traceId : undefined,
      textStyleVersion: typeof data.textStyleVersion === 'string' ? data.textStyleVersion : undefined,
      speechStyleVersion: typeof data.speechStyleVersion === 'string' ? data.speechStyleVersion : undefined,
      questionBudget: typeof data.questionBudget === 'number' ? data.questionBudget : undefined,
      styleRepaired: data.styleRepaired === true,
      styleViolationCodes: Array.isArray(data.styleViolationCodes)
        ? data.styleViolationCodes.filter((v): v is string => typeof v === 'string')
        : undefined,
    };
  } catch {
    return { fallbackUsed: false };
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: MinimalExecutionContext): Promise<Response> {
    const started = Date.now();
    const url = new URL(request.url);
    const operation = operationForPath(url.pathname);
    const requestId = request.headers.get('CF-Ray') || undefined;
    const traceIdFallback = requestId || crypto.randomUUID();
    const typedEnv = env as WorkerEnv;

    try {
      const response = await worker.fetch(request, env as never);
      const metadata = await readSafeResponseMetadata(response, operation);
      const event: WorkerTelemetryEvent = {
        fingerprint: fingerprintFor(response.status, operation, metadata.fallbackUsed, metadata.decision),
        route: url.pathname,
        method: request.method,
        status: response.status,
        duration_ms: Date.now() - started,
        provider: operation === 'unknown' || operation === 'bridge_summary' ? 'cloudflare' : 'openai',
        operation,
        character_id: metadata.characterId,
        actor_role: metadata.actorRole,
        request_id: requestId,
        model: metadata.model || modelForOperation(operation, typedEnv),
        fallback_used: metadata.fallbackUsed,
        retry_count: metadata.decision === 'retry' ? 1 : 0,
        voice_source: metadata.voiceSource,
        text_style_version: metadata.textStyleVersion,
        speech_style_version: metadata.speechStyleVersion,
        question_budget: metadata.questionBudget,
        style_repaired: metadata.styleRepaired,
        style_violation_codes: metadata.styleViolationCodes,
        trace_id: metadata.traceId || traceIdFallback,
        input_tokens: metadata.inputTokens,
        output_tokens: metadata.outputTokens,
        total_tokens: metadata.totalTokens,
        estimated_cost_usd: metadata.estimatedCostUsd,
        prompt_version: metadata.promptVersion,
        policy_version: metadata.policyVersion,
        schema_valid: metadata.schemaValid,
        decision: metadata.decision as WorkerTelemetryEvent['decision'],
        violation_codes: metadata.violationCodes,
      };
      emitWorkerTelemetry(event);
      ctx.waitUntil(persistAuditEvent(event, env as AuditPersistEnv));
      return response;
    } catch (error) {
      const event: WorkerTelemetryEvent = {
        fingerprint: operation === 'unknown' ? 'worker_unhandled_exception' : operation === 'bridge_summary' ? 'bridge_summary_exception' : `openai_${operation}_exception`,
        route: url.pathname,
        method: request.method,
        status: 500,
        duration_ms: Date.now() - started,
        provider: operation === 'unknown' || operation === 'bridge_summary' ? 'cloudflare' : 'openai',
        operation,
        error_name: error instanceof Error ? error.name : 'UnknownError',
        request_id: requestId,
        model: modelForOperation(operation, typedEnv),
        fallback_used: false,
        retry_count: 0,
        trace_id: traceIdFallback,
      };
      emitWorkerTelemetry(event);
      ctx.waitUntil(persistAuditEvent(event, env as AuditPersistEnv));
      throw error;
    }
  },

  async email(message: Parameters<typeof emailRouter.email>[0]): Promise<void> {
    await emailRouter.email(message);
  },
};

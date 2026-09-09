import type {
  CompanionReplyData,
  CompanionReplyRequest,
  TranscriptionData,
  TranscriptionRequest,
  VoiceSynthesisData,
  VoiceSynthesisRequest,
  WorkerErrorCode,
  WorkerFailure,
  WorkerResult,
} from '@/contracts/sekretApi';
import { backendAuthHeaders } from '@/utils/backendAuth';
import { BACKEND_URL } from '@/utils/env';

export const WORKER_BASE_URL = BACKEND_URL.replace(/\/$/, '');

const DEFAULT_TIMEOUT_MS = 12_000;
const HEALTH_TIMEOUT_MS = 6_000;

function errorCodeForStatus(status: number): WorkerErrorCode {
  if (status === 0) return 'NETWORK_ERROR';
  if (status === 400 || status === 415 || status === 422) return 'INVALID_REQUEST';
  if (status === 401) return 'AUTH_REQUIRED';
  if (status === 403) return 'ACCESS_DENIED';
  if (status === 408) return 'TIMEOUT';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 503) return 'VOICE_UNAVAILABLE';
  if (status >= 500) return 'BACKEND_UNAVAILABLE';
  return 'UNKNOWN';
}

function retryableForStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function readTraceId(headers: Headers, body?: Record<string, unknown>): string | undefined {
  const fromBody = typeof body?.traceId === 'string' ? body.traceId : undefined;
  return headers.get('x-trace-id')
    ?? headers.get('cf-ray')
    ?? fromBody;
}

function failure(
  status: number,
  message: string,
  traceId?: string,
  code: WorkerErrorCode = errorCodeForStatus(status),
): WorkerFailure {
  return {
    ok: false,
    error: {
      code,
      status,
      message,
      retryable: retryableForStatus(status),
      traceId,
    },
  };
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return {};
  try {
    const value = await response.json();
    return value && typeof value === 'object' ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

async function request<T>(
  path: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<WorkerResult<T>> {
  if (!WORKER_BASE_URL) {
    return failure(
      0,
      'EXPO_PUBLIC_BACKEND_URL is not configured',
      undefined,
      'BACKEND_UNAVAILABLE',
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${WORKER_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
    });
    const body = await parseJson(response);
    const traceId = readTraceId(response.headers, body);

    if (!response.ok) {
      const message = typeof body.error === 'string'
        ? body.error
        : `Worker ${path} returned ${response.status}`;
      return failure(response.status, message, traceId);
    }

    const fallbackUsed = body.replySource === 'fallback' || body.usedFallback === true;
    return {
      ok: true,
      data: body as T,
      meta: {
        status: response.status,
        traceId,
        fallbackUsed,
      },
    };
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      return failure(
        408,
        `Worker ${path} timed out after ${timeoutMs}ms`,
        undefined,
        'TIMEOUT',
      );
    }
    return failure(
      0,
      `Worker ${path} network error: ${(error as Error).message}`,
      undefined,
      'NETWORK_ERROR',
    );
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(path: string, body: unknown): Promise<WorkerResult<T>> {
  return request<T>(path, {
    method: 'POST',
    headers: await backendAuthHeaders(),
    body: JSON.stringify(body),
  });
}

export interface WorkerHealthResult {
  ok: boolean;
  latencyMs: number;
  version?: string;
  url: string;
  traceId?: string;
}

export const sekretClient = {
  sendReply(input: CompanionReplyRequest): Promise<WorkerResult<CompanionReplyData>> {
    return postJson<CompanionReplyData>('/api/sekret/reply', input);
  },

  synthesizeVoice(input: VoiceSynthesisRequest): Promise<WorkerResult<VoiceSynthesisData>> {
    return postJson<VoiceSynthesisData>('/api/sekret/voice', input);
  },

  transcribeAudio(input: TranscriptionRequest): Promise<WorkerResult<TranscriptionData>> {
    return postJson<TranscriptionData>('/api/sekret/transcribe', input);
  },

  async ping(): Promise<WorkerHealthResult> {
    const startedAt = Date.now();
    const result = await request<{ ok?: boolean; version?: string }>(
      '/health',
      { method: 'GET' },
      HEALTH_TIMEOUT_MS,
    );

    if (!result.ok) {
      return {
        ok: false,
        latencyMs: Date.now() - startedAt,
        url: WORKER_BASE_URL,
        traceId: result.error.traceId,
      };
    }

    return {
      ok: result.data.ok ?? true,
      latencyMs: Date.now() - startedAt,
      version: result.data.version,
      url: WORKER_BASE_URL,
      traceId: result.meta.traceId,
    };
  },
};

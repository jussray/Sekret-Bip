/**
 * Backward-compatible founder-facing adapter for the canonical Se'kret Worker
 * client. New product code should import sekretClient from
 * src/services/backend/sekretClient.
 */

import type {
  CompanionHistoryTurn,
  CompanionId,
  CompanionReplyData,
  CompanionReplyRequest,
  CompanionSurface,
  TranscriptionRequest,
  VoiceSynthesisData,
  VoiceSynthesisRequest,
  WorkerErrorCode,
  WorkerResult,
} from '@/contracts/sekretApi';
import {
  sekretClient,
  WORKER_BASE_URL,
  type WorkerHealthResult,
} from '@/services/backend/sekretClient';

export type CharacterId = CompanionId;
export type Surface = CompanionSurface;
export type ConversationTurn = CompanionHistoryTurn;
export type SendReplyParams = CompanionReplyRequest;
export type CompanionReply = CompanionReplyData;
export type SendVoiceParams = VoiceSynthesisRequest;
export type TranscribeParams = TranscriptionRequest;
export type { WorkerHealthResult };

export class WorkerError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: WorkerErrorCode,
    message: string,
    public readonly retryable = false,
    public readonly traceId?: string,
  ) {
    super(message);
    this.name = 'WorkerError';
  }
}

function unwrap<T>(result: WorkerResult<T>): T {
  if (result.ok) return result.data;
  throw new WorkerError(
    result.error.status,
    result.error.code,
    result.error.message,
    result.error.retryable,
    result.error.traceId,
  );
}

const workerClient = {
  async sendReply(params: SendReplyParams): Promise<CompanionReply> {
    return unwrap(await sekretClient.sendReply(params));
  },

  async synthesizeVoice(params: SendVoiceParams): Promise<VoiceSynthesisData> {
    return unwrap(await sekretClient.synthesizeVoice(params));
  },

  async transcribeAudio(params: TranscribeParams): Promise<{ text: string }> {
    const data = unwrap(await sekretClient.transcribeAudio(params));
    return { text: data.transcript ?? data.text ?? '' };
  },

  ping(): Promise<WorkerHealthResult> {
    return sekretClient.ping();
  },
};

export { workerClient, WORKER_BASE_URL };

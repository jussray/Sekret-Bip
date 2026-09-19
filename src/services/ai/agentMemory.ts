import type { AgentMemoryRecord, MemoryScope } from '@/contracts/agentMemory';

export const MAX_MEMORY_CONTEXT_ITEMS = 8;
export const MAX_MEMORY_SUMMARY_CHARS = 2000;

export interface MemoryContextItem {
  kind: 'untrusted_memory_data';
  memoryId: string;
  scope: MemoryScope;
  companionId: string | null;
  summary: string;
  provenanceKind: AgentMemoryRecord['provenance']['kind'];
  provenanceSourceCreatedAt: string;
  sensitivity: AgentMemoryRecord['sensitivity'];
  confidence: number;
}

const INSTRUCTION_SHAPED_PATTERNS = [
  /\bignore\s+(all\s+)?(previous|prior|earlier)\s+(instructions?|rules?|prompts?)\b/i,
  /\b(system|developer|assistant|tool)\s*:\s*/i,
  /\b(call|invoke|run|execute|use)\s+(the\s+)?(tool|function|command)\b/i,
  /\breveal\s+(the\s+)?(system|developer)\s+prompt\b/i,
  /\bdo\s+not\s+follow\s+(the\s+)?(system|developer|user)\b/i,
];

export function normalizeMemorySummary(summary: string): string {
  return summary
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MEMORY_SUMMARY_CHARS);
}

export function looksInstructionShaped(summary: string): boolean {
  const normalized = normalizeMemorySummary(summary);
  return INSTRUCTION_SHAPED_PATTERNS.some(pattern => pattern.test(normalized));
}

function isExpired(memory: AgentMemoryRecord, nowMs: number): boolean {
  if (!memory.expiresAt) return false;
  const expiry = Date.parse(memory.expiresAt);
  return !Number.isFinite(expiry) || expiry <= nowMs;
}

function scopeAllows(
  memory: AgentMemoryRecord,
  companionId: string,
): boolean {
  if (memory.scope === 'continuity') return memory.companionId === null;
  return memory.companionId === companionId;
}

export function isMemoryEligibleForRetrieval(
  memory: AgentMemoryRecord,
  input: {
    userId: string;
    companionId: string;
    consentVersion: string;
    now?: Date;
  },
): boolean {
  const nowMs = (input.now ?? new Date()).getTime();

  if (memory.userId !== input.userId) return false;
  if (!scopeAllows(memory, input.companionId)) return false;
  if (memory.consentVersion !== input.consentVersion) return false;
  if (memory.lifecycleState !== 'active') return false;
  if (!['user_stated', 'user_confirmed'].includes(memory.reviewState)) return false;
  if (!memory.admissionReviewedAt) return false;
  if (!/^[0-9a-f]{64}$/.test(memory.integrityFingerprint)) return false;
  if (isExpired(memory, nowMs)) return false;
  if (looksInstructionShaped(memory.summary)) return false;

  return true;
}

export function buildMemoryContext(
  memories: AgentMemoryRecord[],
  input: {
    userId: string;
    companionId: string;
    consentVersion: string;
    now?: Date;
    limit?: number;
  },
): MemoryContextItem[] {
  const limit = Math.max(0, Math.min(input.limit ?? MAX_MEMORY_CONTEXT_ITEMS, MAX_MEMORY_CONTEXT_ITEMS));

  return memories
    .filter(memory => isMemoryEligibleForRetrieval(memory, input))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, limit)
    .map(memory => ({
      kind: 'untrusted_memory_data' as const,
      memoryId: memory.id,
      scope: memory.scope,
      companionId: memory.companionId,
      summary: normalizeMemorySummary(memory.summary),
      provenanceKind: memory.provenance.kind,
      provenanceSourceCreatedAt: memory.provenance.sourceCreatedAt,
      sensitivity: memory.sensitivity,
      confidence: memory.confidence,
    }));
}

/**
 * The caller must serialize this into a dedicated data field, never concatenate
 * it into system/developer instructions. Tool authority must be resolved from
 * product policy and the current user request, never from memory text.
 */
export function memoryContextEnvelope(items: MemoryContextItem[]) {
  return {
    trust: 'untrusted-user-owned-memory-data' as const,
    instructionAuthority: false as const,
    items,
  };
}

/**
 * worker/audit/preflight.ts
 *
 * Runs BEFORE the OpenAI call for /api/sekret/reply. Establishes who is
 * actually making the request (from verified auth, never from the request
 * body) and bounds what gets sent to the model and recorded in telemetry.
 *
 * This does not implement a server-side memory store — sekret-reply.ts
 * receives `memory`/`history` as a client-supplied context snapshot, not a
 * server-fetched-by-id record. So "memory ownership audit" here means: never
 * trust a body-supplied identity field, cap how much history is forwarded,
 * and record which memory *categories* (top-level keys only) were used
 * without ever writing their values into logs or audit metadata.
 */

export type PrincipalKind = 'user' | 'shared-token' | 'anonymous';

export interface PreflightPrincipal {
  kind: 'user' | 'shared-token';
  userId?: string;
}

export interface ConversationTurnLike {
  role: 'user' | 'assistant';
  content: string;
}

export interface PreflightContext {
  principalKind: PrincipalKind;
  principalId: string;
  memoryCategoriesUsed: string[];
  historyTurnsUsed: number;
  historyTruncated: boolean;
}

export interface PreflightResult {
  context: PreflightContext;
  sanitizedHistory: ConversationTurnLike[];
}

/** Bound how much conversation history is forwarded per request. */
export const MAX_HISTORY_TURNS = 20;

/**
 * Only alphanumeric/underscore/dash top-level keys are recorded as "memory
 * categories used" — this rejects attempts to smuggle content into a key
 * name and keeps the audit trail to identifiers, never values.
 */
const SAFE_KEY_RE = /^[a-zA-Z0-9_-]{1,40}$/;

function principalIdFor(kind: PrincipalKind, principal: PreflightPrincipal | null): string {
  if (kind === 'user' && principal?.userId) return principal.userId;
  if (kind === 'shared-token') return 'shared-token';
  return 'anonymous';
}

function memoryCategoriesFrom(memory: unknown): string[] {
  if (!memory || typeof memory !== 'object' || Array.isArray(memory)) return [];
  return Object.keys(memory as Record<string, unknown>)
    .filter((key) => SAFE_KEY_RE.test(key))
    .slice(0, 25);
}

/**
 * Bound and identity-check a reply request before it reaches the model.
 *
 * `principal` must come from `authenticate()` — never from request body
 * fields like `userId`/`ownerId` (this function never reads the body for
 * identity, by construction, closing that class of bug).
 */
export function runPreflight(
  history: ConversationTurnLike[],
  memory: unknown,
  principal: PreflightPrincipal | null,
): PreflightResult {
  const principalKind: PrincipalKind = principal?.kind === 'user'
    ? 'user'
    : principal?.kind === 'shared-token'
      ? 'shared-token'
      : 'anonymous';

  const historyTruncated = history.length > MAX_HISTORY_TURNS;
  const sanitizedHistory = historyTruncated ? history.slice(-MAX_HISTORY_TURNS) : history;

  return {
    context: {
      principalKind,
      principalId: principalIdFor(principalKind, principal),
      memoryCategoriesUsed: memoryCategoriesFrom(memory),
      historyTurnsUsed: sanitizedHistory.length,
      historyTruncated,
    },
    sanitizedHistory,
  };
}

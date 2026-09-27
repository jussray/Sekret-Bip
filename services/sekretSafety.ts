const CRISIS_INPUT_RE = /\b(kill myself|end my life|want to die|suicid(?:e|al)|self[- ]?harm|hurt myself|cut myself|disappear forever|run away|abuse|abused|assault|unsafe|not safe|danger|emergency)\b/i;

const CRISIS_RESOURCE_RE = /(?:\b(?:call|text|dial)\s+(?:or\s+text\s+)?988\b|\b988\b[^.\n]{0,48}\b(?:lifeline|crisis)\b|\b(?:lifeline|crisis)\b[^.\n]{0,48}\b988\b|\b(?:text|message)\s+(?:home\s+to\s+)?741741\b|\b741741\b|\b(?:call|dial|contact)\s+911\b|\b911\b[^.\n]{0,32}\b(?:emergency|immediate(?:ly)?|danger)\b)/i;

export const LOCAL_SAFETY_FALLBACK = "Your safety comes first. Tell a trusted adult now. If there is immediate danger, call 911. In the U.S., call or text 988, or text HOME to 741741.";

export type ReplyGuardBypassReason = 'safety-flag' | 'crisis-resource-backstop' | null;

export interface ReplyGuardBypassDecision {
  bypass: boolean;
  reason: ReplyGuardBypassReason;
}

export function isCrisisInput(text: unknown): boolean {
  return typeof text === 'string' && CRISIS_INPUT_RE.test(text);
}

export function getLocalSafetyFallback(text: unknown): string | null {
  return isCrisisInput(text) ? LOCAL_SAFETY_FALLBACK : null;
}

export function hasCrisisResourceMarker(reply: unknown): boolean {
  return typeof reply === 'string' && CRISIS_RESOURCE_RE.test(reply);
}

export function shouldBypassReplyGuard(reply: unknown, safetyFlag: unknown): ReplyGuardBypassDecision {
  const hasReply = typeof reply === 'string' && reply.trim().length > 0;
  if (!hasReply) return { bypass: false, reason: null };
  if (safetyFlag === true) return { bypass: true, reason: 'safety-flag' };
  if (hasCrisisResourceMarker(reply)) return { bypass: true, reason: 'crisis-resource-backstop' };
  return { bypass: false, reason: null };
}

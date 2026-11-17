/**
 * worker/audit/evaluate-reply.ts
 *
 * L99 output-contract evaluator. Inspects a companion reply BEFORE it reaches
 * a teen or parent and decides whether it should be allowed, deterministically
 * repaired, sent back for one bounded retry, or blocked outright.
 *
 * This is the "judge" half of the assurance gateway. It does not call OpenAI
 * and does not know about HTTP — it is pure logic over the parsed reply
 * object, so it can be unit tested without a network or a Worker runtime.
 */

export type Decision = 'allow' | 'repair' | 'retry' | 'block' | 'fallback';

export type ViolationCode =
  | 'empty_reply'
  | 'invalid_schema'
  | 'reply_too_long'
  | 'too_many_questions'
  | 'clinical_language'
  | 'prompt_leakage'
  | 'false_human_claim'
  | 'character_mismatch'
  | 'invalid_parent_summary';

export interface EvaluationResult {
  decision: Decision;
  violations: ViolationCode[];
  schemaValid: boolean;
}

export interface ParsedCompanionReply {
  reply?: unknown;
  tone?: unknown;
  safetyFlag?: unknown;
  parentShareSummary?: unknown;
  suggestedComfortTool?: unknown;
  replySource?: unknown;
}

export interface EvaluateReplyInput {
  parsed: ParsedCompanionReply;
  parentSharingEnabled: boolean;
}

/** Maximum characters for a companion reply. The voice prompt asks for 1-4
 * short sentences; this is a generous ceiling that only catches runaways. */
export const MAX_REPLY_LENGTH = 700;

/** Phrases the master prompt explicitly bans as "clinical" / therapy-speak. */
const CLINICAL_PHRASES = [
  'validate your feelings',
  'process this',
  'process that',
  'unpack this',
  'unpack that',
  'trauma response',
  'coping mechanism',
  'self-regulate',
  'hold space',
  'sit with your feelings',
  'check in with yourself',
];

/** Signs the model leaked its own instructions or system internals. */
const PROMPT_LEAKAGE_PATTERNS: RegExp[] = [
  /\blanguage model\b/i,
  /\bsystem prompt\b/i,
  /\bignore (?:previous|all) instructions\b/i,
  /\bmaster brain prompt\b/i,
  /\bvoice rules\b/i,
  /\bread the room first\b/i,
];

/**
 * False real-world embodiment claims are never allowed.
 *
 * HUMAN-AI relational canon is allowed: companions may sound human, carry
 * Soria-world texture, and say HUMAN-AI when that is the product identity.
 * This guard only blocks real-world biological/offline claims that would make
 * a teen believe the companion has a physical life outside the app.
 */
const FALSE_HUMAN_CLAIM_PATTERNS: RegExp[] = [
  /\bi(?:'m| am) a biological human\b/i,
  /\bi(?:'m| am) a real-world human\b/i,
  /\bi(?:'m| am) a real person\b/i,
  /\bas a biological human\b/i,
  /\bas a real-world human\b/i,
  /\bmy physical body\b/i,
  /\bmy body outside (?:the app|se'?kret bip)\b/i,
  /\bi go to school (?:offline|in real life|outside the app)\b/i,
  /\bmy parents in real life\b/i,
  /\bi(?:'m| am) literally alive\b/i,
  /\bi have an offline life\b/i,
  /\bi can leave the app\b/i,
];

function countQuestionMarks(text: string): number {
  return (text.match(/\?/g) || []).length;
}

function hasClinicalLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  return CLINICAL_PHRASES.some((phrase) => lower.includes(phrase));
}

function hasPromptLeakage(text: string): boolean {
  return PROMPT_LEAKAGE_PATTERNS.some((pattern) => pattern.test(text));
}

function hasFalseHumanClaim(text: string): boolean {
  return FALSE_HUMAN_CLAIM_PATTERNS.some((pattern) => pattern.test(text));
}

function mentionsOracle(text: string): boolean {
  return /\boracle\b/i.test(text);
}

/**
 * Judge a parsed companion reply against the L99 output contract.
 * Never throws — an unparseable/garbage input just produces more violations.
 */
export function evaluateReply(input: EvaluateReplyInput): EvaluationResult {
  const { parsed, parentSharingEnabled } = input;
  const violations: ViolationCode[] = [];

  const replyText = typeof parsed.reply === 'string' ? parsed.reply.trim() : '';
  const schemaValid = replyText.length > 0;
  if (!schemaValid) violations.push('empty_reply');

  if (parsed.reply !== undefined && typeof parsed.reply !== 'string') {
    violations.push('invalid_schema');
  }

  if (replyText) {
    if (replyText.length > MAX_REPLY_LENGTH) violations.push('reply_too_long');
    if (countQuestionMarks(replyText) > 1) violations.push('too_many_questions');
    if (hasClinicalLanguage(replyText)) violations.push('clinical_language');
    if (hasPromptLeakage(replyText)) violations.push('prompt_leakage');
    if (hasFalseHumanClaim(replyText)) violations.push('false_human_claim');
    if (mentionsOracle(replyText)) violations.push('character_mismatch');
  }

  const summary = parsed.parentShareSummary;
  const summaryTypeValid = summary === null || summary === undefined || typeof summary === 'string';
  const summaryLeaksWhenDisabled = !parentSharingEnabled && typeof summary === 'string' && summary.trim().length > 0;
  if (!summaryTypeValid || summaryLeaksWhenDisabled) violations.push('invalid_parent_summary');

  const decision = decisionFor(violations, schemaValid);
  return { decision, violations, schemaValid };
}

/**
 * Priority order (most severe wins): block > retry > repair > allow.
 * - block: never salvageable, never surface as-is. Prompt leakage and false
 *   real-world human embodiment claims are interrupt cases the gateway exists for.
 * - retry: worth one bounded re-ask to OpenAI because a deterministic fix
 *   would either be impossible (empty reply) or would mangle tone (clinical
 *   language reads better regenerated than word-stripped).
 * - repair: deterministically fixable without another API call.
 */
function decisionFor(violations: ViolationCode[], schemaValid: boolean): Decision {
  if (violations.includes('prompt_leakage') || violations.includes('false_human_claim')) return 'block';
  if (!schemaValid || violations.includes('invalid_schema')) return 'retry';
  if (violations.includes('clinical_language')) return 'retry';
  if (
    violations.includes('reply_too_long') ||
    violations.includes('too_many_questions') ||
    violations.includes('character_mismatch') ||
    violations.includes('invalid_parent_summary')
  ) {
    return 'repair';
  }
  return 'allow';
}

/**
 * Deterministically repair a reply for the violation types that don't need
 * another model call. Safe to run even when there's nothing to repair.
 */
export function repairReply(
  parsed: ParsedCompanionReply,
  violations: ViolationCode[],
  parentSharingEnabled: boolean,
): ParsedCompanionReply {
  const repaired: ParsedCompanionReply = { ...parsed };
  let reply = typeof parsed.reply === 'string' ? parsed.reply : '';

  if (violations.includes('character_mismatch')) {
    reply = reply.replace(/\boracle\b/gi, "Se'kret");
  }

  if (violations.includes('too_many_questions')) {
    const firstMark = reply.indexOf('?');
    if (firstMark !== -1) {
      const head = reply.slice(0, firstMark + 1);
      const tail = reply.slice(firstMark + 1).replace(/\?/g, '.');
      reply = head + tail;
    }
  }

  if (violations.includes('reply_too_long') && reply.length > MAX_REPLY_LENGTH) {
    const truncated = reply.slice(0, MAX_REPLY_LENGTH);
    const lastBoundary = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('! '), truncated.lastIndexOf('? '));
    reply = lastBoundary > MAX_REPLY_LENGTH * 0.5 ? truncated.slice(0, lastBoundary + 1) : truncated;
  }

  repaired.reply = reply;

  if (violations.includes('invalid_parent_summary')) {
    repaired.parentShareSummary = parentSharingEnabled && typeof parsed.parentShareSummary === 'string'
      ? parsed.parentShareSummary
      : null;
  }

  return repaired;
}

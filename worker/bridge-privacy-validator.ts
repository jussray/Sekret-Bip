/**
 * Pure, dependency-free Bridge summary validation logic.
 *
 * Deliberately has zero imports so it can be exercised directly by node:test
 * (via a plain relative import with an explicit .ts extension) as well as by
 * the Cloudflare Worker bundler — this is the actual behavior under test, not
 * a regex match against the source file.
 */

export interface GeneratedSummary {
  themes: string[];
  conversationStarters: string[];
  limitations: string;
}

export function isGeneratedSummary(value: unknown): value is GeneratedSummary {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GeneratedSummary>;
  return (
    Array.isArray(candidate.themes) && candidate.themes.every((t) => typeof t === 'string') && candidate.themes.length > 0 &&
    Array.isArray(candidate.conversationStarters) && candidate.conversationStarters.every((t) => typeof t === 'string') && candidate.conversationStarters.length > 0 &&
    typeof candidate.limitations === 'string' && candidate.limitations.length > 0
  );
}

export const MAX_THEME_LEN = 160;
export const MAX_STARTER_LEN = 200;
export const MAX_LIMITATIONS_LEN = 320;
export const LEAK_NGRAM_SIZE = 7;
// Mirrors the non-clinical-language rule stated in the Worker's system prompt —
// enforced here in code rather than trusted from the model's own compliance.
export const CLINICAL_TERMS = ['anxiety', 'anxious', 'depression', 'depressed', 'trauma', 'traumatic', 'disorder', 'symptom', 'symptoms', 'diagnosis', 'diagnosed'];

export function normalizeWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, ' ').split(/\s+/).filter(Boolean);
}

export function ngramSet(words: string[], n: number): Set<string> {
  const set = new Set<string>();
  for (let i = 0; i + n <= words.length; i += 1) set.add(words.slice(i, i + n).join(' '));
  return set;
}

export function containsClinicalLanguage(text: string): boolean {
  const words = new Set(normalizeWords(text));
  return CLINICAL_TERMS.some((term) => words.has(term));
}

/** True if any 7-word run of `text` also appears verbatim in the source content. */
export function leaksSourceContent(text: string, sourceGrams: Set<string>): boolean {
  if (sourceGrams.size === 0) return false;
  const candidateGrams = ngramSet(normalizeWords(text), LEAK_NGRAM_SIZE);
  for (const gram of candidateGrams) if (sourceGrams.has(gram)) return true;
  return false;
}

export function passesPrivacyValidator(summary: GeneratedSummary, snippets: string[]): boolean {
  if (summary.themes.length < 1 || summary.themes.length > 3) return false;
  if (summary.conversationStarters.length < 1 || summary.conversationStarters.length > 2) return false;
  if (summary.themes.some((t) => t.trim().length === 0 || t.length > MAX_THEME_LEN)) return false;
  if (summary.conversationStarters.some((t) => t.trim().length === 0 || t.length > MAX_STARTER_LEN)) return false;
  if (summary.limitations.trim().length === 0 || summary.limitations.length > MAX_LIMITATIONS_LEN) return false;

  // Clinical-language screening applies only to the content-about-the-teen
  // fields. `limitations` is a fixed-purpose disclaimer that is REQUIRED to
  // say things like "not ... a diagnosis" — screening it here would reject
  // every correctly-formed disclaimer for using the word it's negating.
  const contentText = [...summary.themes, ...summary.conversationStarters].join(' ');
  if (containsClinicalLanguage(contentText)) return false;

  const allText = [...summary.themes, ...summary.conversationStarters, summary.limitations].join(' ');
  const sourceGrams = ngramSet(normalizeWords(snippets.join(' ')), LEAK_NGRAM_SIZE);
  if (leaksSourceContent(allText, sourceGrams)) return false;

  return true;
}

export interface RolloutEnv {
  BRIDGE_SUMMARIES_ROLLOUT?: string;
}

/**
 * Server-side rollout control, checked independently of the client flag.
 * Fail closed: an unset or blank value means disabled until production is
 * deliberately configured for `enabled` or a comma-separated user cohort.
 */
export function isBridgeSummariesRolloutAllowed(env: RolloutEnv, userId: string): boolean {
  const raw = env.BRIDGE_SUMMARIES_ROLLOUT?.trim();
  if (!raw || raw === 'disabled') return false;
  if (raw === 'enabled') return true;
  return raw.split(',').map((id) => id.trim()).filter(Boolean).includes(userId);
}

export const BRIDGE_JSON_SCHEMA = {
  name: 'bridge_summary',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      themes: {
        type: 'array',
        minItems: 1,
        maxItems: 3,
        items: { type: 'string', minLength: 1, maxLength: MAX_THEME_LEN },
      },
      conversationStarters: {
        type: 'array',
        minItems: 1,
        maxItems: 2,
        items: { type: 'string', minLength: 1, maxLength: MAX_STARTER_LEN },
      },
      limitations: { type: 'string', minLength: 1, maxLength: MAX_LIMITATIONS_LEN },
    },
    required: ['themes', 'conversationStarters', 'limitations'],
    additionalProperties: false,
  },
} as const;

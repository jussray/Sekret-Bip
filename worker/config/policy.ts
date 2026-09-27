/**
 * worker/config/policy.ts
 *
 * Version tags for the two things the assurance gateway must always be able
 * to answer honestly in an audit record:
 *   - which prompt (MASTER_BRAIN_PROMPT + character prompt) produced a reply
 *   - which policy (evaluate-reply.ts rule set) judged that reply
 *
 * Bump these whenever the corresponding source changes materially. They are
 * plain strings (not derived from git sha) so they can be bumped deliberately
 * in the same commit as the prompt/policy change, and read by both the
 * telemetry emitter and the Supabase audit_events metadata.
 */

/** Bump when MASTER_BRAIN_PROMPT, CHARACTER_PROMPTS, or FEW_SHOT_EXAMPLES change. */
export const PROMPT_VERSION = '2026-07-10.1';

/** Bump when evaluate-reply.ts rules (violations, decision mapping) change. */
export const POLICY_VERSION = '2026-07-10.1';

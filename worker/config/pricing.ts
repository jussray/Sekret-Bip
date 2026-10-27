/**
 * worker/config/pricing.ts
 *
 * Minimal $/token table used only to produce an *estimated* cost for audit
 * telemetry (Control Room "AI cost" view). This is intentionally simple and
 * intentionally not wired to billing — it exists so audit_events carries a
 * defensible number instead of nothing. Update alongside actual OpenAI
 * pricing changes; being a few percent off does not break anything downstream,
 * being silently absent does (that was the original gap).
 *
 * Prices are USD per 1,000 tokens, input/output split, as of the last update.
 */
interface ModelPricing {
  inputPer1k: number;
  outputPer1k: number;
}

const PRICING: Record<string, ModelPricing> = {
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
  'gpt-4o-mini-tts': { inputPer1k: 0.0006, outputPer1k: 0.0006 },
  'whisper-1': { inputPer1k: 0.0001, outputPer1k: 0 },
};

const DEFAULT_PRICING: ModelPricing = { inputPer1k: 0.00015, outputPer1k: 0.0006 };

/**
 * Estimated USD cost for a completed request. Returns undefined when there
 * are no tokens to price (e.g. audio-byte-priced operations without a token
 * count) so callers can omit the field rather than report a false zero.
 */
export function estimateCostUsd(
  model: string | undefined,
  inputTokens: number | undefined,
  outputTokens: number | undefined,
): number | undefined {
  if (!inputTokens && !outputTokens) return undefined;
  const pricing = (model && PRICING[model]) || DEFAULT_PRICING;
  const cost =
    ((inputTokens || 0) / 1000) * pricing.inputPer1k +
    ((outputTokens || 0) / 1000) * pricing.outputPer1k;
  return Math.round(cost * 1_000_000) / 1_000_000; // round to 1e-6 USD
}

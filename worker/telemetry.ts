export interface WorkerTelemetryEvent {
  fingerprint: string;
  route: string;
  method: string;
  status: number;
  duration_ms: number;
  provider?: string;
  operation?: string;
  character_id?: string;
  actor_role?: string;
  error_name?: string;
  request_id?: string;
  model?: string;
  fallback_used?: boolean;
  retry_count?: number;
  voice_source?: string;
  text_style_version?: string;
  speech_style_version?: string;
  question_budget?: number;
  style_repaired?: boolean;
  style_violation_codes?: string[];
  // ── L99 assurance-gateway fields ──────────────────────────────────────────
  /** Correlates this event across Worker logs and the Supabase audit row. */
  trace_id?: string;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  estimated_cost_usd?: number;
  prompt_version?: string;
  policy_version?: string;
  /** Whether the model's parsed JSON satisfied the required-field contract. */
  schema_valid?: boolean;
  /** What the assurance gateway did with the response before it shipped. */
  decision?: 'allow' | 'repair' | 'retry' | 'block' | 'fallback';
  violation_codes?: string[];
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : undefined;
}

function cleanNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function cleanViolations(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const codes = value.filter((v): v is string => typeof v === 'string').slice(0, 20);
  return codes.length ? codes : undefined;
}

export function emitWorkerTelemetry(event: WorkerTelemetryEvent): void {
  console.log(JSON.stringify({
    source: 'cloudflare_worker',
    schema_version: 4,
    timestamp: new Date().toISOString(),
    fingerprint: clean(event.fingerprint) || 'worker_unknown',
    route: clean(event.route) || '/',
    method: clean(event.method) || 'UNKNOWN',
    status: event.status,
    duration_ms: Math.max(0, Math.round(event.duration_ms)),
    provider: clean(event.provider),
    operation: clean(event.operation),
    character_id: clean(event.character_id),
    actor_role: clean(event.actor_role),
    error_name: clean(event.error_name),
    request_id: clean(event.request_id),
    model: clean(event.model),
    fallback_used: event.fallback_used === true,
    retry_count: Number.isFinite(event.retry_count) ? Math.max(0, Math.round(event.retry_count || 0)) : 0,
    voice_source: clean(event.voice_source),
    text_style_version: clean(event.text_style_version),
    speech_style_version: clean(event.speech_style_version),
    question_budget: cleanNumber(event.question_budget),
    style_repaired: event.style_repaired === true,
    style_violation_codes: cleanViolations(event.style_violation_codes),
    trace_id: clean(event.trace_id),
    input_tokens: cleanNumber(event.input_tokens),
    output_tokens: cleanNumber(event.output_tokens),
    total_tokens: cleanNumber(event.total_tokens),
    estimated_cost_usd: cleanNumber(event.estimated_cost_usd),
    prompt_version: clean(event.prompt_version),
    policy_version: clean(event.policy_version),
    schema_valid: typeof event.schema_valid === 'boolean' ? event.schema_valid : undefined,
    decision: clean(event.decision),
    violation_codes: cleanViolations(event.violation_codes),
  }));
}

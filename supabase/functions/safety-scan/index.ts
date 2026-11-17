// supabase/functions/safety-scan/index.ts
// Se'kret Bip — automatic safety scan boundary.
//
// TC-01 Trust Contract:
//   • Private/mixed-visibility child-authored sources are not eligible for
//     automatic scanning.
//   • The caller cannot supply content for moderation. After caller auth and
//     source allowlisting, this function loads only an approved public source.
//   • Private-source rejection happens before content fetch, classification,
//     vendor calls, database writes, parent resolution, notifications, or logs.
//
// Security:
//   • --no-verify-jwt: caller is Postgres trigger, no user JWT available
//   • Shared secret guard: x-scan-secret must match SAFETY_SCAN_SECRET
//   • Privileged Supabase access begins only after the source contract passes

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSupabaseSecretKey } from '../_shared/supabase-api-keys.ts';

const SCAN_SECRET  = Deno.env.get('SAFETY_SCAN_SECRET') ?? '';
const OPENAI_KEY   = Deno.env.get('OPENAI_API_KEY') ?? '';
const SUPA_URL     = Deno.env.get('SUPABASE_URL') ?? '';
const SUPA_SVC_KEY = getSupabaseSecretKey() ?? '';

const AUTOMATIC_SAFETY_ELIGIBLE_SOURCES = new Set(['public_circle_posts']);
const PRIVATE_OR_MIXED_SOURCES = new Set([
  'journal_entries',
  'circle_posts',
  'posts',
  's2tell_entries',
]);

type EligibleSource = 'public_circle_posts';
type Severity = 'high' | 'medium' | 'low';

interface ScanRequestMetadata {
  record_id?: unknown;
  user_id?: unknown;
  source_table?: unknown;
}

interface ScanMetadata {
  flagged: boolean;
  top_category: string | null;
  top_score: number;
  provider: 'openai' | 'keyword-only' | 'none';
}

const PATTERNS: { re: RegExp; severity: Severity; tag: string }[] = [
  { re: /\b(kill myself|end my life|want to die|suicidal|cut myself|self.harm)\b/i, severity: 'high', tag: 'self_harm' },
  { re: /\b(not safe|someone hurt me|being abused|he hits|she hits)\b/i, severity: 'high', tag: 'abuse' },
  { re: /\b(can't take it|i hate myself|nobody cares|give up|disappear forever)\b/i, severity: 'medium', tag: 'distress' },
  { re: /\b(running away|leaving forever|goodbye forever)\b/i, severity: 'medium', tag: 'runaway' },
  { re: /\b(hate everything|worst day|nothing matters)\b/i, severity: 'low', tag: 'negativity' },
];

function patternScan(text: string): { severity: Severity | null; tag: string | null } {
  for (const p of PATTERNS) if (p.re.test(text)) return { severity: p.severity, tag: p.tag };
  return { severity: null, tag: null };
}

interface ModerationResult {
  flagged: boolean;
  categories: Record<string, boolean>;
  scores: Record<string, number>;
}

async function moderationScan(text: string): Promise<ModerationResult | null> {
  if (!OPENAI_KEY) return null;
  try {
    const res = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ input: text }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    const result = json?.results?.[0];
    if (!result) return null;
    return {
      flagged: result.flagged as boolean,
      categories: result.categories as Record<string, boolean>,
      scores: result.category_scores as Record<string, number>,
    };
  } catch {
    return null;
  }
}

const HIGH_MOD_CATS = new Set(['self-harm', 'self-harm/intent', 'self-harm/instructions', 'violence']);
const MEDIUM_MOD_CATS = new Set(['harassment', 'harassment/threatening']);

function severityFromMod(mod: ModerationResult): Severity | null {
  if (!mod.flagged) return null;
  for (const category of HIGH_MOD_CATS) if (mod.categories[category]) return 'high';
  for (const category of MEDIUM_MOD_CATS) if (mod.categories[category]) return 'medium';
  return 'low';
}

// Reduced metadata — never store full OpenAI score array
function buildScanMetadata(mod: ModerationResult | null, kwTag: string | null): ScanMetadata {
  if (!mod) {
    return {
      flagged: kwTag !== null,
      top_category: kwTag,
      top_score: 0,
      provider: kwTag !== null ? 'keyword-only' : 'none',
    };
  }
  const topEntry = Object.entries(mod.scores).reduce<[string, number]>(
    (best, [category, score]) => (score > best[1] ? [category, score] : best),
    ['', 0],
  );
  return {
    flagged: mod.flagged,
    top_category: mod.flagged ? topEntry[0] : null,
    top_score: Number(topEntry[1].toFixed(4)),
    provider: 'openai',
  };
}

function reject(reason: 'invalid_source' | 'private_source' | 'source_not_allowlisted' | 'invalid_metadata') {
  return new Response(JSON.stringify({ accepted: false, reason }), {
    status: 422,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateSource(source: unknown): EligibleSource | null {
  if (typeof source !== 'string') return null;
  if (!AUTOMATIC_SAFETY_ELIGIBLE_SOURCES.has(source)) return null;
  return source as EligibleSource;
}

// ── Parent-safe alert copy ────────────────────────────────────────────────────
// safety_alerts has real `title`/`summary` columns that reach the parent UI —
// these must only ever describe severity/category, never source content.
function buildAlertCopy(
  alertType: 'moderation' | 'keyword',
  severity:  Severity,
): { title: string; summary: string } {
  const title = severity === 'high' ? 'Wellness check suggested' : 'Wellness note';
  const summary =
    alertType === 'moderation'
      ? 'Automated content review flagged a possible wellness concern.'
      : 'A keyword pattern flagged a possible wellness concern.';
  return { title, summary };
}

// ── Parent link lookup ────────────────────────────────────────────────────────
// safety_alerts.parent_user_id is a stored column, not resolved via join at
// read time — the parent-read RLS policy (`teen_user_id = auth.uid() or
// parent_user_id = auth.uid()`) requires it to be set at write time.
async function findActiveParent(
  supabase:     ReturnType<typeof createClient>,
  teen_user_id: string,
): Promise<string | null> {
  const { data: link } = await supabase
    .from('parent_links')
    .select('parent_user_id')
    .eq('teen_user_id', teen_user_id)
    .eq('status', 'active')
    .eq('is_active', true)
    .maybeSingle();

  return link?.parent_user_id ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const incoming = req.headers.get('x-scan-secret') ?? '';
  if (!SCAN_SECRET || incoming !== SCAN_SECRET) return new Response('unauthorized', { status: 401 });

  let metadata: ScanRequestMetadata;
  try {
    metadata = (await req.json()) as ScanRequestMetadata;
  } catch {
    return new Response('bad json', { status: 400 });
  }

  if (typeof metadata.source_table !== 'string') return reject('invalid_source');
  if (PRIVATE_OR_MIXED_SOURCES.has(metadata.source_table)) return reject('private_source');

  const sourceTable = validateSource(metadata.source_table);
  if (!sourceTable) return reject('source_not_allowlisted');
  if (typeof metadata.record_id !== 'string' || typeof metadata.user_id !== 'string') {
    return reject('invalid_metadata');
  }

  if (!SUPA_URL || !SUPA_SVC_KEY) {
    return new Response('server config', { status: 500 });
  }

  const supabase = createClient(SUPA_URL, SUPA_SVC_KEY, { auth: { persistSession: false } });

  const { data: sourceRow, error: sourceError } = await supabase
    .from(sourceTable)
    .select('id,user_id,text')
    .eq('id', metadata.record_id)
    .eq('user_id', metadata.user_id)
    .maybeSingle();

  if (sourceError || !sourceRow || typeof sourceRow.text !== 'string' || !sourceRow.text.trim()) {
    return new Response(JSON.stringify({ accepted: false, reason: 'source_not_found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const content = sourceRow.text;
  const kw = patternScan(content);
  const mod = await moderationScan(content);
  const severity = (mod ? severityFromMod(mod) : null) ?? kw.severity;
  const scanMetadata = buildScanMetadata(mod, kw.tag);

  if (!severity) {
    return new Response(JSON.stringify({ flagged: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const alertType = mod?.flagged ? 'moderation' : 'keyword';
  const { title, summary } = buildAlertCopy(alertType, severity);
  const parent_user_id = await findActiveParent(supabase, metadata.user_id);

  // Insert safety_alert — no content stored anywhere in this row.
  //
  // Live safety_alerts columns (confirmed 2026-07-01, see
  // docs/circle-v2-migration-plan.md §10.3): id, teen_user_id,
  // parent_user_id, source_mood_id, source_post_id, alert_type, severity,
  // title, summary, is_read, created_at, updated_at, scan_metadata.
  // There is no generic source_table/source_id pair — it's a typed-per-
  // source design, but under TC-01 the only eligible source is
  // public_circle_posts, which has no typed FK slot of its own — its
  // origin is kept in scan_metadata instead of forcing it into a column
  // it doesn't belong to.
  const { data: alert, error: alertError } = await supabase
    .from('safety_alerts')
    .insert({
      teen_user_id:  metadata.user_id,
      parent_user_id,
      alert_type:    alertType,
      severity,
      title,
      summary,
      is_read:       false,
      scan_metadata: { ...scanMetadata, source_table: sourceTable, source_id: metadata.record_id },
    })
    .select('id, parent_user_id')
    .single();

  if (alertError || !alert) {
    console.error('SAFETY_SCAN_ALERT_INSERT_FAILED');
    return new Response('db error', { status: 500 });
  }

  await supabase
    .from(sourceTable)
    .update({ safety_flagged: true })
    .eq('user_id', metadata.user_id)
    .eq('id', metadata.record_id);

  // Parent notification — high severity only, active link only, no content.
  // parent_user_id was already resolved and stored on the row above.
  if (severity === 'high' && alert.parent_user_id) {
    // TODO: wire to Expo push token lookup + expo-server-sdk when push ships.
    // Payload shape when ready:
    //   { to: <parent_expo_token>, title, body: summary,
    //     data: { alert_id: alert.id, severity } }   ← NO source content
    console.log('SAFETY_SCAN_PARENT_NOTIFY_QUEUED');
  }

  return new Response(JSON.stringify({ flagged: true, severity, alert_id: alert.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});

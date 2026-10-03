import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const EVENT_TYPES = new Set([
  "journal_completed",
  "voice_bip_completed",
  "comfort_tool_used",
  "goal_progress",
  "streak_milestone",
  "mood_pattern",
  "oracle_understanding",
  "bridge_share_created",
  "crew_check_in",
  "reward_milestone",
]);

const SOURCE_TYPES = new Set([
  "journal",
  "voice_bip",
  "comfort",
  "goal",
  "streak",
  "mood",
  "oracle",
  "bridge",
  "crew",
  "rewards",
]);

const BLOCKED_FIELDS = new Set([
  "rawText",
  "journalText",
  "transcript",
  "fullEntry",
  "content",
  "audioUrl",
  "imageUrl",
  "messageHistory",
  "oracleReasoning",
  "hiddenUnderstanding",
]);

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return respond({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!authorization) return respond({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return respond({ error: "server_config" }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await db.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return respond({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return respond({ error: "bad_json" }, 400);

  for (const keyName of Object.keys(body)) {
    if (BLOCKED_FIELDS.has(keyName)) return respond({ error: "raw_private_content_not_allowed" }, 400);
  }

  const eventType = typeof body.eventType === "string" ? body.eventType.trim() : "";
  const sourceType = typeof body.sourceType === "string" ? body.sourceType.trim() : "";
  const sourceId = typeof body.sourceId === "string" ? body.sourceId.trim() : null;
  const label = typeof body.label === "string" ? body.label.trim().replace(/\s+/g, " ") : "";
  const summary = typeof body.summary === "string" ? body.summary.trim().replace(/\s+/g, " ") : null;
  const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
    ? body.metadata
    : {};

  if (!EVENT_TYPES.has(eventType)) return respond({ error: "invalid_event_type" }, 400);
  if (!SOURCE_TYPES.has(sourceType)) return respond({ error: "invalid_source_type" }, 400);
  if (!label || label.length > 80) return respond({ error: "invalid_label" }, 400);
  if (summary && summary.length > 240) return respond({ error: "invalid_summary" }, 400);
  if (sourceId && sourceId.length > 120) return respond({ error: "invalid_source_id" }, 400);

  for (const keyName of Object.keys(metadata as Record<string, unknown>)) {
    if (BLOCKED_FIELDS.has(keyName)) return respond({ error: "raw_private_content_not_allowed" }, 400);
  }

  const { data, error } = await db
    .from("activity_events")
    .insert({
      user_id: userId,
      event_type: eventType,
      source_type: sourceType,
      source_id: sourceId || null,
      label,
      summary: summary || null,
      metadata,
    })
    .select("id,event_type,source_type,source_id,label,summary,metadata,created_at")
    .single();

  if (error) return respond({ error: "memory_marker_create_failed" }, 500);
  return respond({ ok: true, marker: data }, 201);
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceEdgeFunctionRateLimit } from "../_shared/rate-limit.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const ALLOWED_SHARE_TYPES = new Set([
  "mood_summary",
  "support_request",
  "journal_summary",
  "voice_summary",
  "milestone",
  "safety_check_in",
]);

const ALLOWED_CHARACTERS = new Set(["raylene", "rylane", "cloud", "night", "oracle"]);

Deno.serve(async (req: Request) => {
  const limited = await enforceEdgeFunctionRateLimit(req, "bridge-share-create");
  if (limited) return limited;
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!authorization) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "server_config" }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await db.auth.getUser();
  const user = authData.user;
  if (!user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const shareType = typeof body?.shareType === "string" ? body.shareType : "";
  const charKey = typeof body?.charKey === "string" ? body.charKey : "";
  const convMode = typeof body?.convMode === "string" ? body.convMode.trim() : null;
  const sourceId = typeof body?.sourceId === "string" ? body.sourceId.trim() : null;
  const summary = typeof body?.summary === "string" ? body.summary.trim() : "";

  if (!ALLOWED_SHARE_TYPES.has(shareType)) return json({ error: "invalid_share_type" }, 400);
  if (!ALLOWED_CHARACTERS.has(charKey)) return json({ error: "invalid_character" }, 400);
  if (!summary || summary.length > 1000) return json({ error: "invalid_summary" }, 400);
  if (sourceId && sourceId.length > 120) return json({ error: "invalid_source_id" }, 400);
  if (convMode && convMode.length > 80) return json({ error: "invalid_conversation_mode" }, 400);

  const forbiddenKeys = [
    "rawText",
    "journalText",
    "transcript",
    "fullEntry",
    "content",
    "audioUrl",
    "imageUrl",
    "messageHistory",
  ];
  for (const keyName of forbiddenKeys) {
    if (body && keyName in body) return json({ error: "raw_private_content_not_allowed" }, 400);
  }

  const { data: activeLink, error: linkError } = await db
    .from("parent_links")
    .select("id,parent_user_id")
    .eq("teen_user_id", user.id)
    .eq("status", "active")
    .eq("is_active", true)
    .maybeSingle();

  if (linkError) return json({ error: "parent_link_check_failed" }, 500);
  if (!activeLink?.parent_user_id) return json({ error: "active_parent_link_required" }, 403);

  const { data, error } = await db
    .from("bridge_signals")
    .insert({
      teen_user_id: user.id,
      char_key: charKey,
      share_type: shareType,
      conv_mode: convMode || null,
      source_id: sourceId || null,
      summary,
      sent_at: new Date().toISOString(),
    })
    .select("id,char_key,share_type,conv_mode,source_id,summary,sent_at,created_at")
    .single();

  if (error) return json({ error: "bridge_share_create_failed" }, 500);
  return json({ ok: true, share: data }, 201);
});

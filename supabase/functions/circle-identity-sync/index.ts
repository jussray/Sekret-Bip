import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceEdgeFunctionRateLimit } from "../_shared/rate-limit.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const RESERVED_NAMES = new Set([
  "admin",
  "administrator",
  "moderator",
  "support",
  "sekret bip",
  "se'kret bip",
]);

Deno.serve(async (req: Request) => {
  const limited = await enforceEdgeFunctionRateLimit(req, "circle-identity-sync");
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
  const nickname = typeof body?.nickname === "string" ? body.nickname.trim().replace(/\s+/g, " ") : "";
  const avatarEmoji = typeof body?.avatarEmoji === "string" ? body.avatarEmoji.trim() : "";
  const accountType = body?.accountType === "guardian" ? "guardian" : "teen";

  if (!nickname || nickname.length > 40) return json({ error: "invalid_nickname" }, 400);
  if (!avatarEmoji || avatarEmoji.length > 16) return json({ error: "invalid_avatar" }, 400);
  if (RESERVED_NAMES.has(nickname.toLowerCase())) return json({ error: "reserved_nickname" }, 400);

  const realName = [
    user.user_metadata?.first_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  if (realName.includes(nickname.toLowerCase())) {
    return json({ error: "nickname_must_be_anonymous" }, 400);
  }

  const { data, error } = await db
    .from("circle_profiles")
    .upsert({
      user_id: user.id,
      nickname,
      avatar_emoji: avatarEmoji,
      account_type: accountType,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })
    .select("user_id,nickname,avatar_emoji,account_type,created_at,updated_at")
    .single();

  if (error) return json({ error: "circle_identity_sync_failed" }, 500);
  return json({ ok: true, profile: data });
});

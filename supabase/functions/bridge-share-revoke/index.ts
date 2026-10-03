import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!authorization) return reply({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return reply({ error: "server_config" }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await db.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return reply({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as { shareId?: number | string };
  const shareId = Number(body.shareId);
  if (!Number.isSafeInteger(shareId) || shareId <= 0) {
    return reply({ error: "invalid_share_id" }, 400);
  }

  const revokedAt = new Date().toISOString();
  const { data, error } = await db
    .from("bridge_signals")
    .update({ revoked_at: revokedAt })
    .eq("id", shareId)
    .eq("teen_user_id", userId)
    .is("revoked_at", null)
    .select("id,revoked_at")
    .maybeSingle();

  if (error) return reply({ error: "revoke_failed" }, 500);
  if (!data) return reply({ error: "share_not_found" }, 404);

  return reply({ ok: true, share: data });
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!authData.user) return reply({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const rewardId = typeof body?.rewardId === "string" ? body.rewardId.trim() : "";
  if (!UUID_RE.test(rewardId)) return reply({ error: "invalid_reward_id" }, 400);

  const { data, error } = await db.rpc("request_reward_redemption", {
    p_reward_id: rewardId,
  });

  if (error) {
    const message = String(error.message || "");
    if (message.includes("reward_not_found")) return reply({ error: "reward_not_found" }, 404);
    if (message.includes("out_of_stock")) return reply({ error: "out_of_stock" }, 409);
    if (message.includes("insufficient_points")) return reply({ error: "insufficient_points" }, 409);
    return reply({ error: "reward_redemption_failed" }, 500);
  }

  return reply({ ok: true, redemption: data?.[0] ?? null }, 201);
});

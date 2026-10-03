import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { enforceEdgeFunctionRateLimit } from "../_shared/rate-limit.ts";

const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

Deno.serve(async (req: Request) => {
  const limited = await enforceEdgeFunctionRateLimit(req, "parent-link-redeem");
  if (limited) return limited;
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
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{8}$/.test(inviteCode)) return reply({ error: "invalid_invite_code" }, 400);

  const { data, error } = await db.rpc("redeem_parent_link_invite", {
    p_invite_code: inviteCode,
  });

  if (error) {
    const message = String(error.message || "");
    if (message.includes("invite_not_found")) return reply({ error: "invite_not_found" }, 404);
    if (message.includes("invite_expired")) return reply({ error: "invite_expired" }, 410);
    if (message.includes("invite_not_pending")) return reply({ error: "invite_unavailable" }, 409);
    if (message.includes("cannot_link_self")) return reply({ error: "cannot_link_self" }, 409);
    return reply({ error: "parent_link_redeem_failed" }, 500);
  }

  return reply({ ok: true, link: data?.[0] ?? null });
});

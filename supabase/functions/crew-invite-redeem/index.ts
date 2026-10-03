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
  const user = authData.user;
  if (!user) return reply({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const inviteCode = typeof body?.inviteCode === "string" ? body.inviteCode.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4,32}$/.test(inviteCode)) return reply({ error: "invalid_invite_code" }, 400);

  const firstName = typeof user.user_metadata?.first_name === "string"
    ? user.user_metadata.first_name.trim().slice(0, 60)
    : "Crew member";

  const { data, error } = await db.rpc("redeem_crew_invite", {
    p_invite_code: inviteCode,
    p_first_name: firstName || "Crew member",
  });

  if (error) {
    const message = String(error.message || "");
    if (message.includes("invite_not_found")) return reply({ error: "invite_not_found" }, 404);
    if (message.includes("invite_not_pending") || message.includes("invite_already_claimed")) {
      return reply({ error: "invite_unavailable" }, 409);
    }
    if (message.includes("cannot_redeem_own_invite")) return reply({ error: "cannot_redeem_own_invite" }, 409);
    return reply({ error: "crew_invite_redeem_failed" }, 500);
  }

  return reply({ ok: true, membership: data?.[0] ?? null });
});

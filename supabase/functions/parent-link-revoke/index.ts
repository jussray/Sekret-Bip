import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
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

  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const linkId = typeof body.linkId === "string" && body.linkId.trim().length > 0
    ? body.linkId.trim()
    : null;

  if (linkId && !UUID_PATTERN.test(linkId)) {
    return json({ error: "invalid_link_id" }, 400);
  }

  const { data, error } = await db.rpc("revoke_parent_link", {
    p_link_id: linkId,
  });

  if (error) {
    console.error("[parent-link-revoke] revoke_parent_link failed", error.message);
    return json({ error: "parent_link_revoke_failed" }, 500);
  }

  if (data !== true) return json({ error: "parent_link_not_found" }, 404);

  return json({ ok: true, revoked: 1 });
});

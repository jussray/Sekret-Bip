import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

function parseDob(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) return null;
  return date;
}

function ageOn(dateOfBirth: Date, now: Date): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < dateOfBirth.getUTCMonth() ||
    (now.getUTCMonth() === dateOfBirth.getUTCMonth() && now.getUTCDate() < dateOfBirth.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

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

  const { data: authData } = await db.auth.getUser();
  if (!authData.user) return json({ error: "unauthorized" }, 401);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const dob = parseDob(body?.dateOfBirth);
  const side = body?.side === "guardian" ? "guardian" : body?.side === "teen" ? "teen" : null;

  if (!dob) return json({ error: "invalid_date_of_birth" }, 400);
  if (!side) return json({ error: "invalid_side" }, 400);

  const today = new Date();
  const age = ageOn(dob, today);
  const minimumAge = side === "guardian" ? 18 : 13;
  const eligible = age >= minimumAge;

  return json({
    eligible,
    age,
    minimumAge,
    side,
    reason: eligible ? null : side === "teen" ? "under_13" : "under_18",
  });
});

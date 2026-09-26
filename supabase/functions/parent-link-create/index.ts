import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ParentInviteRequest = {
  parentEmail?: string;
};

type PendingInvite = {
  id: string;
  invite_code: string | null;
  expires_at: string | null;
  status: string;
  is_active: boolean;
};

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const JSON_HEADERS = {
  ...CORS_HEADERS,
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function normalizeInviteCode(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) : "";
}

function normalizeParentEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return email.length > 0 ? email : null;
}

async function findPendingInvite(db: ReturnType<typeof createClient>, teenUserId: string): Promise<PendingInvite | null> {
  const { data, error } = await db
    .from("parent_links")
    .select("id,invite_code,expires_at,status,is_active")
    .eq("teen_user_id", teenUserId)
    .eq("status", "pending")
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as PendingInvite | null;
}

async function ensureInvite(db: ReturnType<typeof createClient>, teenUserId: string): Promise<PendingInvite> {
  const existing = await findPendingInvite(db, teenUserId);
  if (existing?.invite_code) return existing;

  const { data, error } = await db.rpc("create_parent_link_invite");
  if (error) throw error;

  const code = normalizeInviteCode(data);
  if (code.length !== 8) throw new Error("invalid_invite_code_response");

  const refreshed = await findPendingInvite(db, teenUserId);
  if (refreshed?.invite_code) return refreshed;

  return {
    id: "",
    invite_code: code,
    expires_at: null,
    status: "pending",
    is_active: true,
  };
}

async function sendInviteEmail(parentEmail: string, code: string, expiresAt: string | null) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("PARENT_INVITE_FROM_EMAIL") ?? Deno.env.get("RESEND_FROM_EMAIL");

  if (!apiKey || !from) {
    return { status: "failed", error_code: "email_not_configured" };
  }

  const expiryText = expiresAt ? `This code expires at ${expiresAt}.` : "This code expires after 48 hours.";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: parentEmail,
      subject: "Your Se'kret Bip parent invite code",
      text: [
        "Your teen invited you to connect in Se'kret Bip.",
        "",
        `Private code: ${code}`,
        expiryText,
        "",
        "Open Se'kret Bip, finish Parent Setup, and enter this code on the private-code step.",
        "This email does not include private teen content.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    console.error("[parent-link-create] invite email failed", {
      status: response.status,
      provider_error: payload && typeof payload === "object" ? "present" : "unavailable",
    });
    return { status: "failed", error_code: "provider_rejected" };
  }

  return { status: "sent", error_code: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return json({ error: "server_config" }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await db.auth.getUser();
  if (authError || !authData.user) return json({ error: "unauthorized" }, 401);
  if (authData.user.is_anonymous) return json({ error: "permanent_account_required" }, 403);

  let input: ParentInviteRequest = {};
  try {
    input = await req.json();
  } catch {
    input = {};
  }

  const parentEmail = normalizeParentEmail(input.parentEmail);
  if (parentEmail && !EMAIL_PATTERN.test(parentEmail)) {
    return json({ error: "invalid_parent_email" }, 400);
  }

  try {
    const invite = await ensureInvite(db, authData.user.id);
    const code = normalizeInviteCode(invite.invite_code);

    if (code.length !== 8) {
      return json({ error: "invalid_invite_code_response" }, 502);
    }

    const email = parentEmail
      ? await sendInviteEmail(parentEmail, code, invite.expires_at)
      : { status: "not_requested", error_code: null };

    return json({
      ok: true,
      invite: {
        id: invite.id || null,
        invite_code: code,
        expires_at: invite.expires_at,
        status: "pending",
      },
      email,
    });
  } catch (error) {
    console.error(
      "[parent-link-create] failed",
      error instanceof Error ? error.message : String(error),
    );
    return json({ error: "parent_link_create_failed" }, 500);
  }
});

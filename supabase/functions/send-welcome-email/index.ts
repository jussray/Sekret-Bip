import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  getSupabasePublishableKey,
  getSupabaseSecretKey,
} from "../_shared/supabase-api-keys.ts";

type AccountSide = "teen" | "parent";

type AppProfile = {
  private_display_name: string | null;
  account_side: string | null;
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

const WELCOME_EMAIL_VERSION = 1;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function cleanText(value: unknown, maxLength = 64): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

function normalizeOrigin(value: string | undefined, fallback: string): string {
  const candidate = value?.trim() || fallback;
  return candidate.replace(/\/+$/, "");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeSide(value: unknown): AccountSide {
  return value === "parent" ? "parent" : "teen";
}

function buildWelcomeCopy(params: {
  displayName: string;
  side: AccountSide;
  publicOrigin: string;
  appOrigin: string;
}) {
  const { displayName, side, publicOrigin, appOrigin } = params;
  const whatIsUrl = `${publicOrigin}/what-is-sekret-bip/`;
  const howItWorksUrl = `${publicOrigin}/how-it-works/`;
  const privacyUrl = `${publicOrigin}/privacy-and-safety/`;
  const openAppUrl = `${appOrigin}/`;

  const tips = side === "parent"
    ? [
        "Finish Parent Setup so your space is ready.",
        "Use a private connection code only when a teen invites you.",
        "Review privacy and safety before using shared family features.",
      ]
    : [
        "Finish your setup so your private space feels like yours.",
        "Keep reflections private unless you intentionally choose to share.",
        "Use Bridge sharing only when you want a trusted parent or guardian included.",
      ];

  const text = [
    `Hi ${displayName},`,
    "",
    "Welcome to Se'kret Bip. Your account is confirmed and your space is ready.",
    "",
    "A few good first steps:",
    ...tips.map((tip) => `• ${tip}`),
    "",
    "Useful guides:",
    `What is Se'kret Bip: ${whatIsUrl}`,
    `How it works: ${howItWorksUrl}`,
    `Privacy & safety: ${privacyUrl}`,
    "",
    `Open Se'kret Bip: ${openAppUrl}`,
    "",
    "You stay in control of what you choose to share. Se'kret Bip is not a diagnosis.",
  ].join("\n");

  const htmlTips = tips.map((tip) => `<li>${escapeHtml(tip)}</li>`).join("");
  const html = [
    `<p>Hi ${escapeHtml(displayName)},</p>`,
    "<p>Welcome to Se'kret Bip. Your account is confirmed and your space is ready.</p>",
    "<p><strong>A few good first steps:</strong></p>",
    `<ul>${htmlTips}</ul>`,
    "<p><strong>Useful guides:</strong></p>",
    "<ul>",
    `<li><a href="${whatIsUrl}">What is Se'kret Bip?</a></li>`,
    `<li><a href="${howItWorksUrl}">How it works</a></li>`,
    `<li><a href="${privacyUrl}">Privacy &amp; safety</a></li>`,
    "</ul>",
    `<p><a href="${openAppUrl}">Open Se'kret Bip</a></p>`,
    "<p>You stay in control of what you choose to share. Se'kret Bip is not a diagnosis.</p>",
  ].join("");

  return { text, html };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const authorization = req.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return json({ error: "unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableKey = getSupabasePublishableKey();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !publishableKey || !secretKey) {
    return json({ error: "server_config" }, 500);
  }

  const authClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser();
  const user = authData.user;

  if (authError || !user) return json({ error: "unauthorized" }, 401);
  if (user.is_anonymous) return json({ error: "permanent_account_required" }, 403);
  if (!user.email || !user.email_confirmed_at) {
    return json({ ok: true, status: "unconfirmed" });
  }

  const eligibleVersion = Number(user.user_metadata?.welcome_email_version ?? 0);
  if (eligibleVersion !== WELCOME_EMAIL_VERSION) {
    return json({ ok: true, status: "not_eligible" });
  }

  const existingReceipt = user.app_metadata?.welcome_email;
  if (
    existingReceipt
    && typeof existingReceipt === "object"
    && Number((existingReceipt as Record<string, unknown>).version) === WELCOME_EMAIL_VERSION
    && typeof (existingReceipt as Record<string, unknown>).sent_at === "string"
  ) {
    return json({ ok: true, status: "already_sent" });
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let profile: AppProfile | null = null;
  const { data: profileData, error: profileError } = await admin
    .from("app_profiles")
    .select("private_display_name,account_side")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profileError && profileData) profile = profileData as AppProfile;

  const displayName =
    cleanText(profile?.private_display_name)
    ?? cleanText(user.user_metadata?.username)
    ?? "there";
  const side = normalizeSide(profile?.account_side ?? user.user_metadata?.account_side);

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const from =
    Deno.env.get("WELCOME_FROM_EMAIL")
    ?? Deno.env.get("RESEND_FROM_EMAIL")
    ?? Deno.env.get("PARENT_INVITE_FROM_EMAIL");

  if (!resendApiKey || !from) {
    return json({ error: "email_not_configured" }, 503);
  }

  const publicOrigin = normalizeOrigin(
    Deno.env.get("WELCOME_PUBLIC_ORIGIN"),
    "https://welcome.sekretbip.net",
  );
  const appOrigin = normalizeOrigin(
    Deno.env.get("WELCOME_APP_ORIGIN"),
    "https://app.sekretbip.net",
  );
  const copy = buildWelcomeCopy({ displayName, side, publicOrigin, appOrigin });

  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": `sekret-bip-welcome-v${WELCOME_EMAIL_VERSION}:${user.id}`,
    },
    body: JSON.stringify({
      from,
      to: user.email,
      subject: `Welcome to Se'kret Bip, ${displayName} 🌙`,
      text: copy.text,
      html: copy.html,
      tags: [
        { name: "kind", value: "welcome" },
        { name: "account_side", value: side },
        { name: "version", value: String(WELCOME_EMAIL_VERSION) },
      ],
    }),
  });

  const providerPayload = await providerResponse.json().catch(() => null);
  if (!providerResponse.ok) {
    console.error("[send-welcome-email] provider rejected request", {
      status: providerResponse.status,
      provider_error: providerPayload && typeof providerPayload === "object" ? "present" : "unavailable",
    });
    return json({ error: "provider_rejected" }, 502);
  }

  const sentAt = new Date().toISOString();
  const providerId =
    providerPayload
    && typeof providerPayload === "object"
    && typeof (providerPayload as Record<string, unknown>).id === "string"
      ? (providerPayload as Record<string, unknown>).id
      : null;

  const nextAppMetadata = {
    ...(user.app_metadata ?? {}),
    welcome_email: {
      version: WELCOME_EMAIL_VERSION,
      sent_at: sentAt,
      provider_id: providerId,
    },
  };

  let receiptPersisted = false;
  for (let attempt = 0; attempt < 2 && !receiptPersisted; attempt += 1) {
    const { error: receiptError } = await admin.auth.admin.updateUserById(user.id, {
      app_metadata: nextAppMetadata,
    });
    if (!receiptError) {
      receiptPersisted = true;
      break;
    }
    console.error("[send-welcome-email] receipt persistence failed", { attempt: attempt + 1 });
  }

  return json({
    ok: true,
    status: "sent",
    receipt_persisted: receiptPersisted,
  });
});

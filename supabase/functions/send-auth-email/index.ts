import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

type EmailActionType =
  | "signup"
  | "recovery"
  | "invite"
  | "magiclink"
  | "email_change"
  | "reauthentication"
  | string;

type HookPayload = {
  user: {
    id: string;
    email?: string | null;
  };
  email_data: {
    token?: string | null;
    token_hash?: string | null;
    token_new?: string | null;
    token_hash_new?: string | null;
    redirect_to?: string | null;
    email_action_type?: EmailActionType | null;
    site_url?: string | null;
  };
};

function cleanEnv(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function hookError(status: number, message: string): Response {
  return json(
    {
      error: {
        http_code: status,
        message,
      },
    },
    status,
  );
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function subjectFor(action: EmailActionType): string {
  switch (action) {
    case "signup":
      return "Confirm your Se'kret Bip account";
    case "recovery":
      return "Reset your Se'kret Bip password";
    case "invite":
      return "You're invited to Se'kret Bip";
    case "magiclink":
      return "Your Se'kret Bip sign-in link";
    case "email_change":
      return "Confirm your Se'kret Bip email change";
    case "reauthentication":
      return "Confirm it's you";
    default:
      return "Your Se'kret Bip verification link";
  }
}

function introFor(action: EmailActionType): string {
  switch (action) {
    case "signup":
      return "Confirm your email to finish creating your Se'kret Bip account.";
    case "recovery":
      return "Use the secure link below to continue resetting your password.";
    case "invite":
      return "Use the secure link below to accept your Se'kret Bip invitation.";
    case "magiclink":
      return "Use the secure link below to sign in to Se'kret Bip.";
    case "email_change":
      return "Use the secure link below to confirm your email change.";
    case "reauthentication":
      return "Use the secure link below to confirm it's you.";
    default:
      return "Use the secure link below to continue.";
  }
}

function buildVerifyUrl(
  supabaseUrl: string,
  tokenHash: string,
  action: EmailActionType,
  redirectTo: string | null,
): string {
  const verifyUrl = new URL("/auth/v1/verify", supabaseUrl);
  verifyUrl.searchParams.set("token", tokenHash);
  verifyUrl.searchParams.set("type", action);
  if (redirectTo) verifyUrl.searchParams.set("redirect_to", redirectTo);
  return verifyUrl.toString();
}

function verifySignedPayload(
  payload: string,
  headers: Record<string, string>,
  configuredSecrets: string,
): HookPayload {
  const candidates = configuredSecrets
    .split("|")
    .map((secret) => secret.trim())
    .filter(Boolean);

  let lastError: unknown = new Error("No usable webhook secret");

  for (const candidate of candidates) {
    const rawSecret = candidate.startsWith("v1,whsec_")
      ? candidate.slice("v1,whsec_".length)
      : candidate;

    try {
      const webhook = new Webhook(rawSecret);
      return webhook.verify(payload, headers) as HookPayload;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return hookError(405, "method_not_allowed");
  }

  const hookSecret = cleanEnv(Deno.env.get("SEND_EMAIL_HOOK_SECRET"));
  const resendApiKey = cleanEnv(Deno.env.get("RESEND_API_KEY"));
  const from =
    cleanEnv(Deno.env.get("AUTH_FROM_EMAIL"))
    ?? cleanEnv(Deno.env.get("RESEND_FROM_EMAIL"))
    ?? cleanEnv(Deno.env.get("PARENT_INVITE_FROM_EMAIL"));
  const supabaseUrl = cleanEnv(Deno.env.get("SUPABASE_URL"));

  if (!hookSecret || !resendApiKey || !from || !supabaseUrl) {
    console.error("[send-auth-email] required server configuration is missing");
    return hookError(500, "server_config");
  }

  const rawPayload = await req.text();
  const headers = Object.fromEntries(req.headers);

  let hook: HookPayload;
  try {
    hook = verifySignedPayload(rawPayload, headers, hookSecret);
  } catch {
    return hookError(401, "invalid_webhook_signature");
  }

  const recipient = hook.user?.email?.trim();
  const action = hook.email_data?.email_action_type?.trim() || "verification";
  const tokenHash =
    hook.email_data?.token_hash?.trim()
    || hook.email_data?.token_hash_new?.trim()
    || null;
  const token =
    hook.email_data?.token?.trim()
    || hook.email_data?.token_new?.trim()
    || null;
  const redirectTo = hook.email_data?.redirect_to?.trim() || null;

  if (!recipient || !hook.user?.id || !tokenHash) {
    return hookError(400, "invalid_hook_payload");
  }

  const verifyUrl = buildVerifyUrl(supabaseUrl, tokenHash, action, redirectTo);
  const subject = subjectFor(action);
  const intro = introFor(action);
  const safeUrl = escapeHtml(verifyUrl);
  const safeToken = token ? escapeHtml(token) : null;

  const text = [
    intro,
    "",
    verifyUrl,
    ...(token ? ["", `Verification code: ${token}`] : []),
    "",
    "If you did not request this, you can ignore this email.",
  ].join("\n");

  const html = [
    `<p>${escapeHtml(intro)}</p>`,
    `<p><a href="${safeUrl}">Continue securely</a></p>`,
    ...(safeToken ? [`<p>Verification code: <strong>${safeToken}</strong></p>`] : []),
    "<p>If you did not request this, you can ignore this email.</p>",
  ].join("");

  const providerResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${resendApiKey}`,
      "content-type": "application/json",
      "Idempotency-Key": `sekret-bip-auth:${action}:${hook.user.id}:${tokenHash.slice(0, 24)}`,
    },
    body: JSON.stringify({
      from,
      to: recipient,
      subject,
      text,
      html,
      tags: [
        { name: "kind", value: "auth" },
        { name: "action", value: action.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) },
      ],
    }),
  });

  if (!providerResponse.ok) {
    console.error("[send-auth-email] provider rejected request", {
      status: providerResponse.status,
    });
    return hookError(502, "provider_rejected");
  }

  return json({});
});

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
    new_email?: string | null;
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

  const action = hook.email_data?.email_action_type?.trim() || "";
  const userId = hook.user?.id?.trim();
  const currentEmail = hook.user?.email?.trim() || null;
  const newEmail = hook.user?.new_email?.trim() || null;
  const data = hook.email_data;
  const redirectTo = data?.redirect_to?.trim() || null;
  const tokenHash = data?.token_hash?.trim() || null;
  const tokenHashNew = data?.token_hash_new?.trim() || null;
  const token = data?.token?.trim() || null;
  const tokenNew = data?.token_new?.trim() || null;

  // Supabase's field names are intentionally counterintuitive:
  // token_hash_new + token belong to the CURRENT email address;
  // token_hash + token_new belong to the NEW email address.
  // Keep recipients and tokens paired to avoid leaking either confirmation.
  const notifications: Record<string, { subject: string; intro: string }> = {
    password_changed_notification: {
      subject: "Your Se'kret Bip password was changed",
      intro: "Your Se'kret Bip account password was changed.",
    },
    email_changed_notification: {
      subject: "Your Se'kret Bip email was changed",
      intro: "Your Se'kret Bip account email address was changed.",
    },
    phone_changed_notification: {
      subject: "Your Se'kret Bip phone was changed",
      intro: "Your Se'kret Bip account phone number was changed.",
    },
    identity_linked_notification: {
      subject: "A sign-in method was linked to Se'kret Bip",
      intro: "A sign-in method was linked to your Se'kret Bip account.",
    },
    identity_unlinked_notification: {
      subject: "A sign-in method was removed from Se'kret Bip",
      intro: "A sign-in method was removed from your Se'kret Bip account.",
    },
    mfa_factor_enrolled_notification: {
      subject: "A verification method was added to Se'kret Bip",
      intro: "A verification method was added to your Se'kret Bip account.",
    },
    mfa_factor_unenrolled_notification: {
      subject: "A verification method was removed from Se'kret Bip",
      intro: "A verification method was removed from your Se'kret Bip account.",
    },
  };
  const verificationActions = new Set([
    "signup", "recovery", "invite", "magiclink", "email",
    "email_change", "reauthentication",
  ]);

  if (!userId || !action || (!verificationActions.has(action) && !notifications[action])) {
    return hookError(400, "invalid_hook_payload");
  }

  type OutboundEmail = {
    recipient: string;
    code: string | null;
    hash: string | null;
    subject: string;
    intro: string;
  };
  const planned: OutboundEmail[] = [];

  if (action === "email_change") {
    if (!newEmail || !tokenHash || (tokenHashNew && !currentEmail)) {
      return hookError(400, "invalid_email_change_payload");
    }
    if (tokenHashNew && currentEmail) {
      planned.push({
        recipient: currentEmail,
        code: token,
        hash: tokenHashNew,
        subject: subjectFor(action),
        intro: introFor(action),
      });
    }
    planned.push({
      recipient: newEmail,
      code: tokenHashNew ? tokenNew : (tokenNew || token),
      hash: tokenHash,
      subject: subjectFor(action),
      intro: introFor(action),
    });
  } else if (notifications[action]) {
    if (!currentEmail) return hookError(400, "invalid_hook_payload");
    planned.push({
      recipient: currentEmail,
      code: null,
      hash: null,
      ...notifications[action],
    });
  } else {
    if (!currentEmail || !tokenHash) return hookError(400, "invalid_hook_payload");
    planned.push({
      recipient: currentEmail,
      code: token,
      hash: tokenHash,
      subject: subjectFor(action),
      intro: introFor(action),
    });
  }

  // Send both sides of a secure email change concurrently, inside the Auth Hook deadline.
  // Resend idempotency keys make partial retries safe for token-bearing messages.
  const outcomes = await Promise.all(planned.map(async (message) => {
    const verifyUrl = message.hash
      ? buildVerifyUrl(supabaseUrl, message.hash, action, redirectTo)
      : null;
    const text = [
      message.intro,
      ...(verifyUrl ? ["", verifyUrl] : []),
      ...(message.code ? ["", `Verification code: ${message.code}`] : []),
      "",
      "If you did not request this, review your account security.",
    ].join("\n");
    const html = [
      `<p>${escapeHtml(message.intro)}</p>`,
      ...(verifyUrl
        ? [`<p><a href="${escapeHtml(verifyUrl)}">Continue securely</a></p>`]
        : []),
      ...(message.code
        ? [`<p>Verification code: <strong>${escapeHtml(message.code)}</strong></p>`]
        : []),
      "<p>If you did not request this, review your account security.</p>",
    ].join("");
    let providerResponse: Response;
    try {
      providerResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(2_500),
        headers: {
          authorization: `Bearer ${resendApiKey}`,
          "content-type": "application/json",
          ...(message.hash ? { "Idempotency-Key": `sekret-bip-auth:${action}:${userId}:${message.hash.slice(0, 24)}` } : {}),
        },
        body: JSON.stringify({
          from,
          to: message.recipient,
          subject: message.subject,
          text,
          html,
          tags: [
            { name: "kind", value: "auth" },
            { name: "action", value: action.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) },
          ],
        }),
      });
    } catch {
      console.error("[send-auth-email] provider request failed");
      return "provider_unavailable";
    }

    if (!providerResponse.ok) {
      console.error("[send-auth-email] provider rejected request", {
        status: providerResponse.status,
      });
      return "provider_rejected";
    }
    return null;
  }));

  const rejected = outcomes.find((outcome) => outcome !== null);
  if (rejected) return hookError(502, rejected);

  return json({});
});

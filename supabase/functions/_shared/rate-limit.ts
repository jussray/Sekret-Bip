import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getSupabaseSecretKey } from "./supabase-api-keys.ts";

type RateLimitRow = {
  allowed?: boolean;
  retry_after_seconds?: number;
};

const DEFAULT_LIMIT = 120;
const DEFAULT_WINDOW_SECONDS = 60;

function jsonError(error: string, status: number, retryAfter = DEFAULT_WINDOW_SECONDS): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": String(Math.max(1, retryAfter)),
      "x-content-type-options": "nosniff",
    },
  });
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function callerKey(request: Request): Promise<string> {
  // Supabase's gateway sits behind Cloudflare and forwards cf-connecting-ip to
  // Edge Functions. Prefer that provider-controlled network identity and never
  // accept caller-supplied forwarding metadata as a bucket selector.
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) return sha256(`ip:${cloudflareIp}`);

  const authorization = request.headers.get("authorization")?.trim();
  if (authorization) return sha256(`authorization:${authorization}`);

  const apiKey = request.headers.get("apikey")?.trim();
  if (apiKey) return sha256(`apikey:${apiKey}`);

  return sha256("anonymous");
}

export async function enforceEdgeFunctionRateLimit(
  request: Request,
  scope: string,
  options: { limit?: number; windowSeconds?: number } = {},
): Promise<Response | null> {
  if (request.method === "OPTIONS") return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const secretKey = getSupabaseSecretKey();
  if (!supabaseUrl || !secretKey) {
    return jsonError("rate_limit_unavailable", 503);
  }

  const admin = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const keyHash = await callerKey(request);
  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowSeconds = options.windowSeconds ?? DEFAULT_WINDOW_SECONDS;

  const { data, error } = await admin.rpc("consume_edge_function_rate_limit", {
    p_scope: scope,
    p_key_hash: keyHash,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error) {
    console.error("edge-function rate limiter failed", {
      scope,
      error: String(error.message || "rate_limit_rpc_failed"),
    });
    return jsonError("rate_limit_unavailable", 503, windowSeconds);
  }

  const row = (Array.isArray(data) ? data[0] : data) as RateLimitRow | null;
  if (row?.allowed === true) return null;
  if (row?.allowed === false) {
    return jsonError(
      "rate_limit_exceeded",
      429,
      Number.isFinite(row.retry_after_seconds) ? Number(row.retry_after_seconds) : windowSeconds,
    );
  }

  return jsonError("rate_limit_unavailable", 503, windowSeconds);
}

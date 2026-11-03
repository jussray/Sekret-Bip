type NamedKeyMap = Record<string, unknown>;

function clean(value: string | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function readNamedDefault(envName: string): string | null {
  const raw = clean(Deno.env.get(envName));
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as NamedKeyMap;
    const key = parsed?.default;
    return typeof key === 'string' ? clean(key) : null;
  } catch {
    return null;
  }
}

/**
 * Supabase hosted Edge Functions inject the modern publishable keys as a JSON
 * dictionary keyed by name. Keep the legacy anon key as a temporary migration
 * fallback until provider/runtime proof shows no deployed caller still needs it.
 */
export function getSupabasePublishableKey(): string | null {
  return (
    readNamedDefault('SUPABASE_PUBLISHABLE_KEYS') ??
    clean(Deno.env.get('SUPABASE_PUBLISHABLE_KEY')) ??
    clean(Deno.env.get('SUPABASE_ANON_KEY'))
  );
}

/**
 * Modern secret keys replace service_role keys for privileged Edge Function
 * access. They still bypass RLS and must never be exposed to browser code.
 */
export function getSupabaseSecretKey(): string | null {
  return (
    readNamedDefault('SUPABASE_SECRET_KEYS') ??
    clean(Deno.env.get('SUPABASE_SECRET_KEY')) ??
    clean(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
  );
}

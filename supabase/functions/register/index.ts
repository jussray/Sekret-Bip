// supabase/functions/register/index.ts
// Se'kret Bip — Age-gated signup Edge Function
//
// Replaces direct supabase.auth.signUp() on the client so that age validation
// cannot be bypassed by calling the auth API directly.
//
// Flow:
//   1. Client POSTs { email, password, birth_month, birth_year }
//   2. This function validates age >= 13 (month-accurate)
//   3. If valid, calls admin.createUser — Supabase sends the confirmation email
//   4. Client shows "check your email" screen and waits for confirmation
//
// Security:
//   --no-verify-jwt: caller is a new user with no session yet
//   SUPABASE_SERVICE_ROLE_KEY is Deno env only — never in client code
//
// Deployment note:
//   supabase functions deploy register --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPA_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPA_SVC_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST')   return json({ error: 'method_not_allowed' }, 405);

  let body: { email?: unknown; password?: unknown; birth_month?: unknown; birth_year?: unknown; consent_at?: unknown };
  try {
    body = await req.json() as typeof body;
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const { email, password, birth_month, birth_year, consent_at } = body;

  if (
    typeof email        !== 'string' || !email.trim() ||
    typeof password     !== 'string' || !password     ||
    typeof birth_month  !== 'number' ||
    typeof birth_year   !== 'number'
  ) {
    return json({ error: 'missing_fields' }, 400);
  }

  if (birth_month < 1 || birth_month > 12 || birth_year < 1900 || birth_year > new Date().getFullYear()) {
    return json({ error: 'invalid_date' }, 400);
  }

  // Month-accurate age check — avoids the off-by-one that year-only comparisons allow.
  // We don't ask for birth day, so treat birth as the 1st of the month (slightly
  // permissive by up to 30 days, which is standard for month-granularity gates).
  const now = new Date();
  const ageMonths =
    (now.getFullYear() - birth_year) * 12 + ((now.getMonth() + 1) - birth_month);

  if (ageMonths < 13 * 12) {
    return json(
      { error: 'age_requirement', message: 'You must be 13 or older to create an account.' },
      403,
    );
  }

  if (!SUPA_URL || !SUPA_SVC_KEY) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  const admin = createClient(SUPA_URL, SUPA_SVC_KEY, {
    auth: { persistSession: false },
  });

  const dateOfBirth = `${birth_year}-${String(birth_month).padStart(2, '0')}-01`;

  const { error: createErr } = await admin.auth.admin.createUser({
    email:         email.trim(),
    password,
    email_confirm: false, // Supabase sends the confirmation email
    user_metadata: {
      date_of_birth: dateOfBirth,
      consent_at: typeof consent_at === 'string' ? consent_at : new Date().toISOString(),
    },
  });

  if (createErr) {
    // Surface Supabase errors (duplicate email, weak password, etc.)
    return json({ error: createErr.message }, 400);
  }

  return json({ message: 'check_email' });
});

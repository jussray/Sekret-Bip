// supabase/functions/account-data-export/index.ts
// Se'kret Bip — user-initiated "Download my data" export.
//
// Authenticated with the caller's own session JWT (not service-role), using
// the publishable key exactly like account-deletion-request/index.ts. Every
// query below relies on RLS as the enforcement layer, not just the WHERE
// clause: even a bug in this function's filtering cannot leak another
// account's rows, because RLS only ever returns the caller's own rows for
// every table queried here.
//
// Scope for this first slice (see docs/trust/DATA_EXPORT_MANIFEST.md):
// account info, mood_history, journal_entries, room_memory, agent_memories
// (the user's own companion/continuity memories only). Deliberately NOT
// included yet: Bridge tables, crew/circle tables, bip_tasks — each of those
// involves another account's visibility boundary and needs its own founder
// review before export, not a default inclusion.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getSupabasePublishableKey } from '../_shared/supabase-api-keys.ts';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authorization = req.headers.get('authorization');
  if (!authorization) return json({ error: 'unauthorized' }, 401);

  const url = Deno.env.get('SUPABASE_URL');
  const key = getSupabasePublishableKey();
  if (!url || !key) return json({ error: 'server_config' }, 500);

  const db = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });

  const { data: authData } = await db.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return json({ error: 'unauthorized' }, 401);

  const [profile, verification, moods, journals, room, memories] = await Promise.all([
    db.from('app_profiles').select('email,created_at').eq('user_id', userId).maybeSingle(),
    db.from('account_verification').select('verification_state,parent_link_state,verification_updated_at').eq('user_id', userId).maybeSingle(),
    db.from('mood_history').select('mood,date,time,created_at').eq('user_id', userId).order('created_at', { ascending: true }),
    db.from('journal_entries').select('text,mood,date,time,sekret_reply,created_at').eq('user_id', userId).order('created_at', { ascending: true }),
    db.from('room_memory').select('character,last_visit,last_hotspot,last_summon,visit_count,updated_at').eq('user_id', userId).maybeSingle(),
    db.from('agent_memories').select('scope,companion_id,kind,summary,created_at,updated_at').eq('user_id', userId).order('created_at', { ascending: true }),
  ]);

  const failures = [
    { label: 'profile', error: profile.error },
    { label: 'verification', error: verification.error },
    { label: 'mood_history', error: moods.error },
    { label: 'journal_entries', error: journals.error },
    { label: 'room_memory', error: room.error },
    { label: 'agent_memories', error: memories.error },
  ].filter((entry) => entry.error);

  if (failures.length > 0) {
    return json({ error: 'export_partial_failure', failed: failures.map((f) => f.label) }, 500);
  }

  return json({
    ok: true,
    export: {
      exportedAt: new Date().toISOString(),
      scope: ['account', 'mood_history', 'journal_entries', 'room_memory', 'companion_memory'],
      account: profile.data ?? null,
      verification: verification.data ?? null,
      moodHistory: moods.data ?? [],
      journalEntries: journals.data ?? [],
      roomMemory: room.data ?? null,
      companionMemory: memories.data ?? [],
    },
  });
});

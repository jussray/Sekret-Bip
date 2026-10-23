// supabase/functions/process-deletions/index.ts
// Se'kret Bip — Account Deletion Background Worker
//
// Purpose:
//   Hard-deletes auth.users rows for accounts that requested deletion
//   more than COOLING_OFF_DAYS ago. Deleting the auth row cascades to
//   ALL user data (journal_entries, mood_history, oracle_sessions, etc.)
//   via ON DELETE CASCADE foreign keys established in each migration.
//
// Invocation:
//   Schedule via pg_cron or Supabase Dashboard → Edge Functions → Schedule.
//   Recommended: daily at 03:00 UTC.
//
//   pg_cron example (run once after enabling the extension):
//     SELECT cron.schedule(
//       'process-deletions-daily',
//       '0 3 * * *',
//       $$SELECT net.http_post(
//           url := current_setting('app.supabase_url') || '/functions/v1/process-deletions',
//           headers := '{"x-deletion-secret": "<DELETION_SECRET>"}'::jsonb,
//           body := '{}'::jsonb
//       )$$
//     );
//
// Security:
//   • DELETION_SECRET shared secret prevents accidental or external invocation
//   • Service role key is Deno env only — never in client code
//   • Hard limit: processes at most MAX_BATCH users per run to bound runtime
//   • Logs user_id + outcome but never user content

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DELETION_SECRET = Deno.env.get('DELETION_SECRET')          ?? '';
const SUPA_URL        = Deno.env.get('SUPABASE_URL')             ?? '';
const SUPA_SVC_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const COOLING_OFF_DAYS = 30;
const MAX_BATCH        = 50; // safety cap per run

interface DeletionRow {
  id: string; // user_profiles.id = auth.users.id
  data_deletion_requested_at: string;
}

Deno.serve(async (req: Request) => {
  // Only POST
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  // Shared secret guard
  const secret = req.headers.get('x-deletion-secret') ?? '';
  if (!DELETION_SECRET || secret !== DELETION_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  if (!SUPA_URL || !SUPA_SVC_KEY) {
    return new Response('server misconfigured', { status: 500 });
  }

  const supabase = createClient(SUPA_URL, SUPA_SVC_KEY, {
    auth: { persistSession: false },
  });

  // Find accounts past the cooling-off window
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - COOLING_OFF_DAYS);

  const { data: pending, error: fetchErr } = await supabase
    .from('user_profiles')
    .select('id, data_deletion_requested_at')
    .lt('data_deletion_requested_at', cutoff.toISOString())
    .is('data_deletion_completed_at', null)
    .limit(MAX_BATCH)
    .returns<DeletionRow[]>();

  if (fetchErr) {
    console.error('[process-deletions] fetch error:', fetchErr.message);
    return new Response('db error', { status: 500 });
  }

  if (!pending?.length) {
    console.log('[process-deletions] nothing to process');
    return new Response(JSON.stringify({ processed: 0 }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  console.log(`[process-deletions] processing ${pending.length} accounts`);

  const results: { id: string; outcome: 'deleted' | 'error'; detail?: string }[] = [];

  for (const row of pending) {
    try {
      // auth.admin.deleteUser triggers ON DELETE CASCADE across all tables:
      //   user_profiles, consent_log, journal_entries, mood_history,
      //   voice_notes, circle_posts, oracle_sessions, safety_alerts, etc.
      const { error: delErr } = await supabase.auth.admin.deleteUser(row.id);
      if (delErr) throw delErr;
      // Note: the user_profiles row is gone via cascade at this point,
      // so we cannot UPDATE data_deletion_completed_at. The deletion itself
      // is the record of completion. Ops can query auth.audit_log_entries for confirmation.
      results.push({ id: row.id, outcome: 'deleted' });
      console.log(`[process-deletions] deleted user=${row.id}`);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      results.push({ id: row.id, outcome: 'error', detail });
      console.error(`[process-deletions] error user=${row.id}:`, detail);
    }
  }

  const deleted = results.filter(r => r.outcome === 'deleted').length;
  const errored = results.filter(r => r.outcome === 'error').length;

  return new Response(
    JSON.stringify({ processed: results.length, deleted, errored }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});

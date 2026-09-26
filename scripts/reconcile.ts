#!/usr/bin/env tsx
/**
 * Reconciliation sync — Sekret-Bip
 *
 * Pulls the control-room.manifest.json, compares it against the
 * live Supabase state, and surfaces drift as a structured report.
 *
 * Run: npx tsx scripts/reconcile.ts
 * Used by: Control Room reconciliation controller (event-triggered)
 *
 * Output: JSON to stdout — designed to be ingested by Control Room
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }));
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type DriftItem = {
  type: 'missing_table' | 'row_count_zero' | 'policy_missing' | 'unknown';
  detail: string;
};

async function run() {
  const manifestPath = path.resolve(__dirname, '../control-room.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  const drift: DriftItem[] = [];
  const start = Date.now();

  // Check declared tables exist and have rows
  const tables: string[] = manifest?.supabase?.required_tables ?? [];
  for (const table of tables) {
    const { count, error } = await client.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      drift.push({ type: 'missing_table', detail: `Table '${table}' inaccessible: ${error.message}` });
    } else if (count === 0) {
      drift.push({ type: 'row_count_zero', detail: `Table '${table}' exists but has 0 rows` });
    }
  }

  const report = {
    service: 'sekret-bip',
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - start,
    status: drift.length === 0 ? 'clean' : 'drift_detected',
    drift,
  };

  console.log(JSON.stringify(report, null, 2));
  process.exit(drift.length > 0 ? 1 : 0);
}

run().catch(e => {
  console.error(JSON.stringify({ error: String(e) }));
  process.exit(2);
});

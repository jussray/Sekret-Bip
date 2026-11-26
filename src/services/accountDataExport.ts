import { getSupabase } from '@/utils/supabase';

export interface AccountDataExport {
  exportedAt: string;
  scope: string[];
  account: { email: string | null; created_at: string | null } | null;
  verification: { verification_state: string; parent_link_state: string; verification_updated_at: string } | null;
  moodHistory: Array<{ mood: string; date: string; time: string; created_at: string }>;
  journalEntries: Array<{ text: string; mood: string; date: string; time: string; sekret_reply: string | null; created_at: string }>;
  roomMemory: { character: string; last_visit: string | null; last_hotspot: string | null; last_summon: string | null; visit_count: number; updated_at: string } | null;
  companionMemory: Array<{ scope: string; companion_id: string | null; kind: string; summary: string; created_at: string; updated_at: string }>;
}

export type AccountDataExportResult =
  | { ok: true; value: AccountDataExport }
  | { ok: false; message: string };

function isAccountDataExport(data: unknown): data is AccountDataExport {
  if (!data || typeof data !== 'object') return false;
  const row = data as Record<string, unknown>;
  return (
    typeof row.exportedAt === 'string' &&
    Array.isArray(row.scope) &&
    Array.isArray(row.moodHistory) &&
    Array.isArray(row.journalEntries) &&
    Array.isArray(row.companionMemory)
  );
}

export async function requestAccountDataExport(): Promise<AccountDataExportResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, message: 'Data export is unavailable right now.' };

  const { data, error } = await supabase.functions.invoke('account-data-export', {
    body: {},
  });

  if (error) {
    if (__DEV__) console.info('ACCOUNT_DATA_EXPORT_REQUEST_FAILED');
    return { ok: false, message: 'Could not prepare your data export. Check your connection and try again.' };
  }

  const exportData = (data as { export?: unknown } | null)?.export;
  if (!isAccountDataExport(exportData)) {
    return { ok: false, message: 'The server returned an invalid export. Try again.' };
  }

  return { ok: true, value: exportData };
}

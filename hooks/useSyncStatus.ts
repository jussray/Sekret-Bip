/**
 * hooks/useSyncStatus.ts
 *
 * Guardrail 2 — Sync status product feature.
 *
 * Returns a `syncStatus` value that drives <SyncBadge>.
 * Also exports `withSyncWrap` — a helper that wraps any async save call,
 * sets the status to 'syncing' before and 'synced'/'failed' after,
 * and guarantees the local save always happens first.
 *
 * The hook never talks to Supabase directly — it observes the result of
 * calling sync.ts helpers from within the screen.
 *
 * Usage:
 *
 *   const { syncStatus, withSyncWrap } = useSyncStatus();
 *
 *   const handleSave = () => withSyncWrap(async () => {
 *     // 1. Local save (always happens — sync.ts won't throw)
 *     await saveState({ entries: updatedEntries });
 *     // 2. Cloud sync attempt (silent no-op if Supabase down)
 *     syncJournal(newEntry);
 *   });
 *
 *   return <SyncBadge status={syncStatus} />;
 */

import { useCallback, useState } from 'react';
import { getSupabase } from '@/utils/supabase';
import type { SyncStatus } from '../components/SyncBadge';

export function useSyncStatus() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const withSyncWrap = useCallback(async (fn: () => Promise<void>) => {
    // Determine connectivity: if Supabase isn't configured, we're local-only.
    const isOnline = !!getSupabase();

    setSyncStatus(isOnline ? 'syncing' : 'local');
    try {
      await fn();
      setSyncStatus(isOnline ? 'synced' : 'local');
    } catch {
      // Local save still happened inside fn() — only cloud failed.
      setSyncStatus('failed');
    }
  }, []);

  return { syncStatus, withSyncWrap, setSyncStatus };
}

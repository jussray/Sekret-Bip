/**
 * src/hooks/useSafetyCheck.ts
 *
 * Polls safety_alerts for unacknowledged items on app open.
 *
 * Call this once in the teen layout. Pass isReady=true after loading completes.
 * The 2-second delay gives the Supabase trigger time to fire after any
 * content that was written just before app open.
 *
 * Returns:
 *   experience  — the most severe unacknowledged SafetyExperience, or null
 *   clear       — call when the sheet is dismissed (clears local state only;
 *                 acknowledgment is written by SafetyExperienceSheet itself)
 */

import { useCallback, useEffect, useState } from 'react';
import { checkForFlaggedItems, type SafetyExperience } from '@/features/safety/safetyCoordinator';
import type { CompanionId } from '@/features/sekret/companionEngine';

const POLL_DELAY_MS = 2000;

export function useSafetyCheck(
  companionId: CompanionId = 'suhana',
  isReady: boolean = true,
) {
  const [experience, setExperience] = useState<SafetyExperience | null>(null);

  useEffect(() => {
    if (!isReady) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await checkForFlaggedItems(companionId);
      if (!cancelled) setExperience(result);
    }, POLL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isReady, companionId]);

  const clear = useCallback(() => setExperience(null), []);

  return { experience, clear };
}

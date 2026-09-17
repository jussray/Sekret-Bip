import { useEffect, useMemo, useState } from 'react';
import { useLinkedTeen, type LinkedTeenData, type SharedJournalEntry } from '@/hooks/useLinkedTeen';
import {
  fetchBridgeSharesResult,
  subscribeToBridgeShares,
  type BridgeShare,
} from '@/features/bridge/bridgeShareCompat';
import { getDevTestFamily } from '@/features/testing/devTestFamily';

function toSharedEntry(share: BridgeShare): SharedJournalEntry {
  const text = share.payload.rewrite ?? share.payload.text ?? null;
  return {
    id: share.id,
    text,
    mood_tag: share.payload.kind === 's2tell' ? 's2tell' : 'bridge',
    created_at: share.shared_at,
  };
}

export function useLinkedBridge(): LinkedTeenData {
  // Bridge owns explicit signals/S2Tell content. Generated journal/mood summaries
  // have their own consent-bounded inbox, so do not download raw shared rows here.
  const linked = useLinkedTeen({ includeSharedContent: false });
  const [shares, setShares] = useState<BridgeShare[]>([]);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareLoadError, setShareLoadError] = useState(false);
  const [testTeenId, setTestTeenId] = useState<string | null>(null);

  useEffect(() => {
    void getDevTestFamily().then(family => setTestTeenId(family?.teenId ?? null));
  }, []);

  useEffect(() => {
    if (!linked.linkedTeenId || linked.loadError || testTeenId) {
      setShares([]);
      setShareLoading(false);
      setShareLoadError(false);
      return;
    }

    let active = true;
    let unsubscribe = () => {};
    const teenId = linked.linkedTeenId;

    setShares([]);
    setShareLoading(true);
    setShareLoadError(false);

    void (async () => {
      const result = await fetchBridgeSharesResult(teenId);
      if (!active) return;
      if (!result.ok) {
        setShares([]);
        setShareLoadError(true);
        setShareLoading(false);
        return;
      }

      setShares(result.shares);
      setShareLoading(false);

      try {
        const fn = await subscribeToBridgeShares(teenId, share => {
          if (active) setShares(previous => [share, ...previous]);
        });
        if (active) unsubscribe = fn;
        else fn();
      } catch {
        // The initial authoritative read succeeded, so keep that snapshot.
        // Realtime subscription is supplementary and must not fabricate a read failure.
      }
    })().catch(() => {
      if (!active) return;
      setShares([]);
      setShareLoadError(true);
      setShareLoading(false);
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [linked.linkedTeenId, linked.loadError, testTeenId]);

  const sharedJournal = useMemo(
    () => shares.map(toSharedEntry)
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [shares],
  );

  if (testTeenId) {
    return {
      ...linked,
      linkedTeenId: testTeenId,
      isLinked: true,
      isLoading: false,
      activitySummary: linked.activitySummary ?? { streakDays: 3, sessionCount: 5, pointsTier: 'test' },
      sharedJournal,
    };
  }

  return {
    ...linked,
    sharedJournal,
    isLoading: linked.isLoading || shareLoading,
    loadError: linked.loadError || shareLoadError,
  };
}

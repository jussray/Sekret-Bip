import { useEffect, useMemo, useState } from 'react';
import { useLinkedTeen, type LinkedTeenData, type SharedJournalEntry } from '@/hooks/useLinkedTeen';
import {
  fetchBridgeShares,
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
  const linked = useLinkedTeen();
  const [shares, setShares] = useState<BridgeShare[]>([]);
  const [testTeenId, setTestTeenId] = useState<string | null>(null);

  useEffect(() => {
    void getDevTestFamily().then(family => setTestTeenId(family?.teenId ?? null));
  }, []);

  useEffect(() => {
    if (!linked.linkedTeenId || linked.loadError || testTeenId) {
      setShares([]);
      return;
    }

    let active = true;
    let unsubscribe = () => {};
    const teenId = linked.linkedTeenId;

    // A teen/link transition must never render the previous teen's Bridge
    // payload while the next authority-scoped read is still in flight.
    setShares([]);
    void fetchBridgeShares(teenId).then(nextShares => {
      if (active) setShares(nextShares);
    });
    void subscribeToBridgeShares(teenId, share => {
      if (active) setShares(previous => [share, ...previous]);
    }).then(fn => {
      if (active) unsubscribe = fn;
      else fn();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [linked.linkedTeenId, linked.loadError, testTeenId]);

  const sharedJournal = useMemo(
    () => [...shares.map(toSharedEntry), ...linked.sharedJournal]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [shares, linked.sharedJournal],
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

  return { ...linked, sharedJournal };
}

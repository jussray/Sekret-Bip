import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '@/utils/supabase';
import { fetchLinkedTeenId } from '@/utils/parentLink';

export interface ParentDoorbellEvent {
  id: number;
  type: 'mood' | 'thought' | 'need' | 'win' | 'other';
  companion: 'raylene' | 'rylane';
  mode: string | null;
  sentAt: string;
}

function normalizeType(value: string): ParentDoorbellEvent['type'] {
  return value === 'mood' || value === 'thought' || value === 'need' || value === 'win'
    ? value
    : 'other';
}

export function useParentDoorbell() {
  const [events, setEvents] = useState<ParentDoorbellEvent[]>([]);
  const [linkedTeenId, setLinkedTeenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const teenId = await fetchLinkedTeenId();
      setLinkedTeenId(teenId);
      if (!teenId) {
        setEvents([]);
        return;
      }

      const { data, error: queryError } = await supabase
        .from('bridge_signals')
        .select('id,share_type,char_key,conv_mode,sent_at')
        .eq('teen_user_id', teenId)
        .order('sent_at', { ascending: false })
        .limit(20);

      if (queryError) throw queryError;

      setEvents((data ?? []).map(row => ({
        id: Number(row.id),
        type: normalizeType(String(row.share_type ?? 'other')),
        companion: row.char_key === 'rylane' ? 'rylane' : 'raylene',
        mode: row.conv_mode ? String(row.conv_mode) : null,
        sentAt: String(row.sent_at),
      })));
    } catch (caught) {
      setEvents([]);
      setError(caught instanceof Error ? caught.message : 'Unable to load shared moments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { events, linkedTeenId, loading, error, refresh };
}

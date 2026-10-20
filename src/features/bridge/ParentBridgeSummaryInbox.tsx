import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import type { BridgeSummaryListItem } from '@/types/bridgeSummary';
import {
  fetchParentBridgeSummaryInbox,
  markBridgeSummaryViewed,
} from '@/services/parentBridgeSummaryService';

interface ParentBridgeSummaryInboxProps {
  audience?: 'founder' | 'internal' | 'beta' | 'public';
}

const PREVIEW_SUMMARY: BridgeSummaryListItem = {
  requestId: 'preview-bridge-request',
  summaryId: 'preview-bridge-summary',
  teenUserId: 'preview-teen',
  parentUserId: 'preview-parent',
  status: 'ready',
  generatedAt: new Date().toISOString(),
  viewedAt: null,
  usedFallback: false,
  summary: {
    themes: [
      'They may be carrying more pressure than they want to explain all at once.',
      'They want support without feeling watched or rushed.',
    ],
    conversationStarters: [
      'I’m here. Would listening, comfort, space, or help making a plan feel best right now?',
      'You do not have to tell me everything for me to take you seriously.',
    ],
    limitations: 'Founder Preview sample: this is generalized context, not the teen’s full private content, a diagnosis, or proof of what happened.',
  },
};

export function ParentBridgeSummaryInbox({ audience = 'public' }: ParentBridgeSummaryInboxProps) {
  const founderPreview = isFounderPreviewEnabled();
  const [items, setItems] = useState<BridgeSummaryListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [previewViewed, setPreviewViewed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await fetchParentBridgeSummaryInbox(audience);
    if (result.ok) {
      setItems(result.value);
      setMessage(null);
    } else if (founderPreview) {
      setItems([]);
      setMessage(null);
    } else {
      setItems([]);
      setMessage(result.message);
    }
    setLoading(false);
  }, [audience, founderPreview]);

  useEffect(() => {
    void load();
  }, [load]);

  const visibleItems = useMemo(() => {
    if (items.length > 0) return items;
    if (!founderPreview) return [];
    return [{ ...PREVIEW_SUMMARY, viewedAt: previewViewed ? new Date().toISOString() : null }];
  }, [founderPreview, items, previewViewed]);

  const markViewed = useCallback(async (item: BridgeSummaryListItem) => {
    if (item.requestId === PREVIEW_SUMMARY.requestId) {
      setPreviewViewed(true);
      return;
    }
    if (item.viewedAt || !item.summaryId) return;
    const result = await markBridgeSummaryViewed(item.summaryId, audience);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setItems((current) => current.map((entry) => (
      entry.summaryId && entry.summaryId === item.summaryId
        ? { ...entry, viewedAt: new Date().toISOString() }
        : entry
    )));
  }, [audience]);

  if (loading) {
    return (
      <View style={styles.stateCard} accessibilityLabel="Loading Bridge summaries">
        <ActivityIndicator />
        <Text style={styles.stateText}>Loading Bridge summaries…</Text>
      </View>
    );
  }

  if (message) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.stateText}>{message}</Text>
      </View>
    );
  }

  if (visibleItems.length === 0) {
    return (
      <View style={styles.stateCard}>
        <Text style={styles.emptyTitle}>No Bridge Summaries yet</Text>
        <Text style={styles.stateText}>Only summaries your teen deliberately shares will appear here.</Text>
      </View>
    );
  }

  const showingPreview = visibleItems[0]?.requestId === PREVIEW_SUMMARY.requestId;

  return (
    <View style={styles.list}>
      {showingPreview ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewKicker}>FOUNDER PREVIEW SAMPLE</Text>
          <Text style={styles.previewText}>
            This card demonstrates the privacy-safe parent experience. No teen content was read, summarized, or written to Supabase.
          </Text>
        </View>
      ) : null}

      {visibleItems.map((item) => {
        const summary = item.summary;
        if (!summary) return null;
        return (
          <TouchableOpacity
            key={item.summaryId ?? item.requestId}
            style={styles.card}
            activeOpacity={0.86}
            onPress={() => void markViewed(item)}
            accessibilityRole="button"
            accessibilityLabel={`Bridge Summary from ${new Date(item.generatedAt ?? Date.now()).toLocaleDateString()}`}
          >
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle}>Bridge Summary</Text>
              {!item.viewedAt && <Text style={styles.newBadge}>New</Text>}
            </View>

            <Text style={styles.dateText}>
              {new Date(item.generatedAt ?? Date.now()).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </Text>

            <Text style={styles.sectionLabel}>Themes noticed</Text>
            {summary.themes.map((theme) => (
              <Text key={theme} style={styles.bodyText}>• {theme}</Text>
            ))}

            <Text style={styles.sectionLabel}>Conversation starters</Text>
            {summary.conversationStarters.map((starter) => (
              <Text key={starter} style={styles.bodyText}>• {starter}</Text>
            ))}

            <View style={styles.noticeBox}>
              <Text style={styles.noticeText}>{summary.limitations}</Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  previewBanner: { borderRadius: 14, borderWidth: 1, borderColor: '#f59e0b66', backgroundColor: '#4a230a55', padding: 12 },
  previewKicker: { color: '#fde68a', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  previewText: { color: '#d7c39b', fontSize: 10, lineHeight: 16, marginTop: 4 },
  card: {
    backgroundColor: 'rgba(46,26,16,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(233,160,74,0.35)',
    borderRadius: 18,
    padding: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: '#f5e8c8', fontSize: 18, fontWeight: '700' },
  newBadge: {
    color: '#2e1a10',
    backgroundColor: '#e9a04a',
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: { color: 'rgba(245,232,200,0.65)', marginTop: 4, marginBottom: 14 },
  sectionLabel: { color: '#e9a04a', fontSize: 13, fontWeight: '700', marginTop: 10, marginBottom: 5 },
  bodyText: { color: '#f5e8c8', lineHeight: 21, marginBottom: 3 },
  noticeBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(233,160,74,0.10)',
  },
  noticeText: { color: 'rgba(245,232,200,0.78)', fontSize: 12, lineHeight: 18 },
  stateCard: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(233,160,74,0.25)',
    padding: 20,
  },
  emptyTitle: { color: '#f5e8c8', fontSize: 17, fontWeight: '700' },
  stateText: { color: 'rgba(245,232,200,0.72)', textAlign: 'center', lineHeight: 20 },
});

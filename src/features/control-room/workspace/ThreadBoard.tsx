import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BlockedThreadCard from './BlockedThreadCard';
import PRDependencyRail from './PRDependencyRail';
import ThreadDetailPane from './ThreadDetailPane';
import {
  WORKSPACE_COLUMNS,
  WORKSPACE_PREVIEW_DEPENDENCIES,
  WORKSPACE_PREVIEW_DISCLAIMER,
  WORKSPACE_PREVIEW_THREADS,
} from './types';
import type { WorkspaceThread, WorkspaceThreadStatus } from './types';

const C = {
  bg: '#080611',
  surface: '#0d0a15',
  border: '#272238',
  purple: '#6d28d9',
  purpleDim: '#3b1f6e',
  text: '#e2dff0',
  muted: '#8f899e',
  faint: '#4a4660',
  green: '#22c55e',
  yellow: '#eab308',
  teal: '#14b8a6',
} as const;

/**
 * Unregistered, read-only workspace preview.
 *
 * This component intentionally has no persistence, network, Supabase, merge,
 * approval, deployment, publishing, credential, or external-account actions.
 */
export default function ThreadBoard() {
  const [selectedThread, setSelectedThread] = useState<WorkspaceThread | null>(null);
  const [activeColumn, setActiveColumn] = useState<WorkspaceThreadStatus | null>(null);

  const visibleColumns = useMemo(
    () => WORKSPACE_COLUMNS.filter((column) => activeColumn === null || column.status === activeColumn),
    [activeColumn],
  );

  const threadsForStatus = (status: WorkspaceThreadStatus) =>
    WORKSPACE_PREVIEW_THREADS.filter((thread) => thread.status === status);

  return (
    <View style={styles.root}>
      <View style={styles.previewBanner}>
        <Text style={styles.previewLabel}>READ-ONLY WORKSPACE PREVIEW</Text>
        <Text style={styles.previewText}>{WORKSPACE_PREVIEW_DISCLAIMER}</Text>
      </View>

      <View style={styles.railContainer}>
        <PRDependencyRail chain={WORKSPACE_PREVIEW_DEPENDENCIES} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.columnTabs}
        contentContainerStyle={styles.columnTabsContent}
      >
        <TouchableOpacity
          style={[styles.columnTab, activeColumn === null && styles.columnTabActive]}
          onPress={() => setActiveColumn(null)}
        >
          <Text style={[styles.columnTabText, activeColumn === null && styles.columnTabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {WORKSPACE_COLUMNS.map((column) => {
          const count = threadsForStatus(column.status).length;
          if (count === 0) return null;
          const active = activeColumn === column.status;
          return (
            <TouchableOpacity
              key={column.status}
              style={[styles.columnTab, active && styles.columnTabActive]}
              onPress={() => setActiveColumn(column.status)}
            >
              <Text style={[styles.columnTabText, active && styles.columnTabTextActive]}>
                {column.emoji} {column.label}
              </Text>
              <View style={styles.columnCount}>
                <Text style={styles.columnCountText}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {visibleColumns.map((column) => {
          const threads = threadsForStatus(column.status);
          if (threads.length === 0) return null;

          return (
            <View key={column.status} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{column.emoji}</Text>
                <Text style={styles.sectionTitle}>{column.label.toUpperCase()}</Text>
                <View style={styles.sectionCount}>
                  <Text style={styles.sectionCountText}>{threads.length}</Text>
                </View>
              </View>

              {threads.map((thread) =>
                thread.status === 'blocked' || thread.status === 'failed' ? (
                  <BlockedThreadCard
                    key={thread.id}
                    thread={thread}
                    onViewDetail={setSelectedThread}
                  />
                ) : (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onPress={() => setSelectedThread(thread)}
                  />
                ),
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal
        visible={selectedThread !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedThread(null)}
      >
        {selectedThread ? (
          <ThreadDetailPane
            thread={selectedThread}
            onClose={() => setSelectedThread(null)}
          />
        ) : null}
      </Modal>
    </View>
  );
}

function ThreadCard({ thread, onPress }: { thread: WorkspaceThread; onPress: () => void }) {
  const statusColors: Record<string, string> = {
    draft: C.faint,
    planned: C.teal,
    running: C.purple,
    review: C.yellow,
    rolled_back: C.green,
  };
  const dotColor = statusColors[thread.status] ?? C.muted;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <Text style={styles.cardTitle} numberOfLines={1}>{thread.title}</Text>
        <Text style={styles.cardDomain}>{thread.domain}</Text>
      </View>
      <Text style={styles.cardBrief} numberOfLines={2}>{thread.brief}</Text>
      {thread.artifacts.length > 0 ? (
        <Text style={styles.cardArtifacts}>
          {thread.artifacts.length} artifact{thread.artifacts.length === 1 ? '' : 's'}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  previewBanner: {
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  previewLabel: { color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  previewText: { color: C.muted, fontSize: 12, lineHeight: 18 },
  railContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  columnTabs: { maxHeight: 44, borderBottomWidth: 1, borderColor: C.border },
  columnTabsContent: { paddingHorizontal: 12, gap: 6, alignItems: 'center', paddingVertical: 6 },
  columnTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  columnTabActive: { backgroundColor: C.purple, borderColor: C.purple },
  columnTabText: { color: C.muted, fontSize: 11, fontWeight: '700' },
  columnTabTextActive: { color: '#fff' },
  columnCount: {
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.purpleDim,
  },
  columnCountText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  list: { flex: 1 },
  listContent: { gap: 16, padding: 14, paddingBottom: 40 },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  sectionEmoji: { fontSize: 14 },
  sectionTitle: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.2, flex: 1 },
  sectionCount: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  sectionCountText: { color: C.muted, fontSize: 9, fontWeight: '700' },
  card: {
    gap: 6,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 7, height: 7, borderRadius: 999 },
  cardTitle: { color: C.text, fontWeight: '700', fontSize: 13, flex: 1 },
  cardDomain: { color: '#a78bfa', fontSize: 10, fontWeight: '700' },
  cardBrief: { color: C.muted, fontSize: 12, lineHeight: 17 },
  cardArtifacts: { color: C.faint, fontSize: 11 },
});

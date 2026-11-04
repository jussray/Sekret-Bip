import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WorkspaceBlockReason, WorkspaceThread } from './types';

const C = {
  surface: '#0d0a15',
  surface2: '#110e1c',
  border: '#272238',
  purple: '#6d28d9',
  purpleDim: '#3b1f6e',
  text: '#e2dff0',
  muted: '#8f899e',
  faint: '#4a4660',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
  orange: '#f97316',
} as const;

const BLOCK_LABELS: Record<WorkspaceBlockReason, { label: string; color: string }> = {
  runner_startup_failure: { label: 'Runner startup failure', color: C.red },
  workflow_no_jobs: { label: 'Workflow has no jobs', color: C.orange },
  workflow_step_failure: { label: 'Workflow step failure', color: C.orange },
  founder_gate_pending: { label: 'Founder gate pending', color: C.yellow },
  dependency_not_merged: { label: 'Dependency not merged', color: C.yellow },
  ci_evidence_incomplete: { label: 'CI evidence incomplete', color: C.muted },
  supabase_split_brain: { label: 'Supabase split-brain', color: C.red },
  manual_hold: { label: 'Manual hold', color: C.faint },
};

interface Props {
  thread: WorkspaceThread;
  onViewDetail?: (thread: WorkspaceThread) => void;
}

export default function BlockedThreadCard({ thread, onViewDetail }: Props) {
  const [expanded, setExpanded] = useState(false);
  const blockMeta = thread.blockReason ? BLOCK_LABELS[thread.blockReason] : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={() => setExpanded((current) => !current)}
        activeOpacity={0.85}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title} numberOfLines={expanded ? undefined : 1}>
              {thread.title}
            </Text>
            <View style={styles.domainBadge}>
              <Text style={styles.domainText}>{thread.domain.toUpperCase()}</Text>
            </View>
          </View>
          <RiskBadge level={thread.riskLevel} />
        </View>

        {blockMeta ? (
          <View style={[styles.blockBadge, { borderColor: `${blockMeta.color}55` }]}>
            <Text style={[styles.blockBadgeText, { color: blockMeta.color }]}>
              {blockMeta.label}
            </Text>
          </View>
        ) : null}

        <Text style={styles.brief} numberOfLines={expanded ? undefined : 2}>
          {thread.brief}
        </Text>

        {expanded ? (
          <View style={styles.expanded}>
            {thread.blockDetail ? (
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>DETAIL</Text>
                <Text style={styles.detailText}>{thread.blockDetail}</Text>
              </View>
            ) : null}

            {thread.blastRadius ? (
              <Metadata label="BLAST RADIUS" value={thread.blastRadius} />
            ) : null}
            {thread.rollbackNote ? (
              <Metadata label="ROLLBACK" value={thread.rollbackNote} />
            ) : null}
          </View>
        ) : null}

        <Text style={styles.caret}>{expanded ? '▲ less' : '▼ more'}</Text>
      </TouchableOpacity>

      {expanded && onViewDetail ? (
        <TouchableOpacity
          style={styles.detailButton}
          onPress={() => onViewDetail(thread)}
          activeOpacity={0.75}
        >
          <Text style={styles.detailButtonText}>View read-only detail</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
  const color = level === 'high' ? C.red : level === 'medium' ? C.yellow : C.green;
  return (
    <View style={[styles.riskBadge, { backgroundColor: `${color}22`, borderColor: `${color}55` }]}>
      <Text style={[styles.riskText, { color }]}>{level.toUpperCase()}</Text>
    </View>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 8,
    padding: 14,
    marginBottom: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: `${C.red}44`,
    backgroundColor: C.surface,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { flex: 1, gap: 4, marginRight: 8 },
  title: { color: C.text, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  domainBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.purpleDim,
  },
  domainText: { color: C.purple, fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  riskText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.8 },
  blockBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: C.surface2,
  },
  blockBadgeText: { fontSize: 11, fontWeight: '700' },
  brief: { color: C.muted, fontSize: 13, lineHeight: 18 },
  expanded: { gap: 8, marginTop: 4 },
  detailBox: {
    gap: 4,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#080611',
  },
  detailLabel: { color: C.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  detailText: { color: C.muted, fontSize: 12, fontFamily: 'monospace' },
  metaRow: { gap: 2 },
  metaLabel: { color: C.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  metaValue: { color: C.muted, fontSize: 12 },
  caret: { color: C.faint, fontSize: 10, textAlign: 'right', marginTop: 6 },
  detailButton: {
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${C.purple}66`,
    alignItems: 'center',
  },
  detailButtonText: { color: '#a78bfa', fontSize: 12, fontWeight: '700' },
});

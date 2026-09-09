import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { WorkspaceArtifact, WorkspaceThread } from './types';
import { WORKSPACE_PREVIEW_DISCLAIMER } from './types';
import PRDependencyRail from './PRDependencyRail';

const C = {
  bg: '#080611',
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
  teal: '#14b8a6',
} as const;

const STATUS_COLOR: Record<string, string> = {
  draft: C.faint,
  planned: C.teal,
  running: C.purple,
  review: C.yellow,
  blocked: C.red,
  failed: C.red,
  rolled_back: C.orange,
};

interface Props {
  thread: WorkspaceThread;
  onClose?: () => void;
}

export default function ThreadDetailPane({ thread, onClose }: Props) {
  const statusColor = STATUS_COLOR[thread.status] ?? C.muted;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: statusColor }]}>
            {thread.status.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.domainChip}>{thread.domain}</Text>
        </View>
        {onClose ? (
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.previewBanner}>
          <Text style={styles.previewLabel}>READ-ONLY PREVIEW</Text>
          <Text style={styles.previewText}>{WORKSPACE_PREVIEW_DISCLAIMER}</Text>
        </View>

        <Text style={styles.title}>{thread.title}</Text>

        <View style={styles.riskRow}>
          <Text style={styles.sectionLabel}>RISK</Text>
          <Text
            style={[
              styles.riskValue,
              {
                color:
                  thread.riskLevel === 'high'
                    ? C.red
                    : thread.riskLevel === 'medium'
                      ? C.yellow
                      : C.green,
              },
            ]}
          >
            {thread.riskLevel.toUpperCase()}
          </Text>
        </View>

        <Section label="BRIEF">
          <Text style={styles.body}>{thread.brief}</Text>
        </Section>

        {thread.blockDetail ? (
          <Section label="BLOCK DETAIL">
            <View style={styles.codeBox}>
              <Text style={styles.code}>{thread.blockDetail}</Text>
            </View>
          </Section>
        ) : null}

        {thread.dependencies.length > 0 ? (
          <Section label="DEPENDENCY CHAIN">
            <PRDependencyRail chain={thread.dependencies} label="" />
          </Section>
        ) : null}

        {thread.artifacts.length > 0 ? (
          <Section label="ARTIFACTS">
            {thread.artifacts.map((artifact) => (
              <ArtifactRow key={artifact.id} artifact={artifact} />
            ))}
          </Section>
        ) : null}

        {thread.blastRadius ? (
          <Section label="BLAST RADIUS">
            <Text style={[styles.body, { color: C.orange }]}>{thread.blastRadius}</Text>
          </Section>
        ) : null}

        {thread.rollbackNote ? (
          <Section label="ROLLBACK NOTE">
            <Text style={styles.body}>{thread.rollbackNote}</Text>
          </Section>
        ) : null}

        {thread.decisionEvidence.length > 0 ? (
          <Section label="RECORDED DECISION EVIDENCE">
            {thread.decisionEvidence.map((event) => (
              <View key={event.id} style={styles.decisionRow}>
                <Text
                  style={[
                    styles.decision,
                    {
                      color:
                        event.decision === 'approved'
                          ? C.green
                          : event.decision === 'rejected'
                            ? C.red
                            : C.yellow,
                    },
                  ]}
                >
                  {event.decision.toUpperCase()}
                </Text>
                <Text style={styles.decisionActor}>{event.actorLabel}</Text>
                <Text style={styles.decisionSource}>{event.source}</Text>
                {event.note ? <Text style={styles.decisionNote}>{event.note}</Text> : null}
              </View>
            ))}
          </Section>
        ) : null}

        <View style={styles.authorityBox}>
          <Text style={styles.authorityLabel}>NO ACTION CONTROLS</Text>
          <Text style={styles.authorityText}>
            Approval, merge, database, deployment, publishing, credential, account, and paid-capacity decisions remain outside this preview.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={sectionStyles.root}>
      <Text style={sectionStyles.label}>{label}</Text>
      {children}
    </View>
  );
}

function ArtifactRow({ artifact }: { artifact: WorkspaceArtifact }) {
  const kindEmoji: Record<string, string> = {
    pull_request: '🔀',
    sql_migration: '💾',
    deploy_evidence: '🧾',
    email_draft: '✉️',
    spec: '📄',
    report: '📊',
    ci_log: '📋',
  };

  return (
    <View style={sectionStyles.artifactRow}>
      <Text style={sectionStyles.artifactEmoji}>{kindEmoji[artifact.kind] ?? '📎'}</Text>
      <Text style={sectionStyles.artifactLabel}>{artifact.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderColor: C.border,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.8 },
  domainChip: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: C.purpleDim,
    color: '#a78bfa',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  closeButton: { color: C.muted, fontSize: 16, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { gap: 16, padding: 16, paddingBottom: 48 },
  previewBanner: {
    gap: 6,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${C.purple}55`,
    backgroundColor: C.surface,
  },
  previewLabel: { color: '#a78bfa', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  previewText: { color: C.muted, fontSize: 12, lineHeight: 18 },
  title: { color: C.text, fontWeight: '800', fontSize: 17, lineHeight: 24 },
  riskRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionLabel: { color: C.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  riskValue: { fontSize: 11, fontWeight: '800' },
  body: { color: C.muted, fontSize: 13, lineHeight: 20 },
  codeBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface2,
  },
  code: { color: C.red, fontSize: 11, fontFamily: 'monospace', lineHeight: 18 },
  decisionRow: { gap: 3, marginBottom: 8 },
  decision: { fontSize: 11, fontWeight: '800' },
  decisionActor: { color: C.muted, fontSize: 12 },
  decisionSource: { color: C.faint, fontSize: 11 },
  decisionNote: { color: C.faint, fontSize: 11, fontStyle: 'italic' },
  authorityBox: {
    gap: 6,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  authorityLabel: { color: C.faint, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  authorityText: { color: C.muted, fontSize: 12, lineHeight: 18 },
});

const sectionStyles = StyleSheet.create({
  root: { gap: 8 },
  label: { color: C.faint, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  artifactRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  artifactEmoji: { fontSize: 14 },
  artifactLabel: { color: C.text, fontSize: 13 },
});

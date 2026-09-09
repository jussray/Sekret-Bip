import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getCurrentFounderProfile, isFounderProfile, type FounderProfile } from '@/services/founderAudit';
import {
  loadControlRoomAnalytics,
  type ControlRoomAnalytics,
  type MetricPoint,
} from '@/services/controlRoomAnalytics';

const emptyAnalytics: ControlRoomAnalytics = {
  cost: { estimatedUsd: 0, requests: 0, tokens: 0, byProvider: [] },
  companions: [],
  voice: [],
  signals: [],
  adoption: [],
  crashes: [],
  fallback: {
    total: 0,
    safety: 0,
    identity: 0,
    natural: 0,
    founderApprovalState: 'draft_founder_review',
    latestPackVersion: null,
    byCompanion: [],
    bySurface: [],
    byPackVersion: [],
  },
  releases: [],
};

function title(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function MetricBar({ item, max }: { item: MetricPoint; max: number }) {
  return <View style={styles.metricRow}>
    <View style={styles.row}>
      <Text style={styles.metricLabel}>{title(item.label)}</Text>
      <Text style={styles.metricValue}>{item.value}</Text>
    </View>
    <View style={styles.barTrack}>
      <View style={[styles.barFill, { width: `${Math.max(4, (item.value / Math.max(1, max)) * 100)}%` }]} />
    </View>
  </View>;
}

function MetricList({ titleText, items, empty }: { titleText: string; items: MetricPoint[]; empty: string }) {
  const max = Math.max(1, ...items.map((item) => item.value));
  return <View style={styles.panel}>
    <Text style={styles.panelTitle}>{titleText}</Text>
    {items.length
      ? items.map((item) => <MetricBar key={item.label} item={item} max={max} />)
      : <Text style={styles.muted}>{empty}</Text>}
  </View>;
}

export default function FallbackTelemetryPanel() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [analytics, setAnalytics] = useState<ControlRoomAnalytics>(emptyAnalytics);

  const load = useCallback(async () => {
    const founderProfile = await getCurrentFounderProfile();
    setProfile(founderProfile);
    if (isFounderProfile(founderProfile)) {
      setAnalytics(await loadControlRoomAnalytics(30));
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { await load(); } finally { setRefreshing(false); }
  }, [load]);

  if (loading) return <View style={styles.center}><ActivityIndicator color="#a78bfa" /><Text style={styles.muted}>Loading fallback telemetry…</Text></View>;
  if (!isFounderProfile(profile)) return <View style={styles.center}><Text style={styles.lock}>🔒</Text><Text style={styles.title}>Founder telemetry locked</Text><Text style={styles.muted}>Fallback analytics stay founder-only.</Text></View>;

  const fallback = analytics.fallback ?? emptyAnalytics.fallback!;
  const identityRate = fallback.total ? Math.round((fallback.identity / fallback.total) * 100) : 0;
  const safetyRate = fallback.total ? Math.round((fallback.safety / fallback.total) * 100) : 0;

  return <ScrollView
    style={styles.root}
    contentContainerStyle={styles.content}
    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#a78bfa" />}
  >
    <Text style={styles.kicker}>SE'KRET BIP · CONTROL ROOM</Text>
    <Text style={styles.title}>Fallback Telemetry</Text>
    <Text style={styles.muted}>Founder-visible view of companion fallback usage. It uses aggregate-safe metadata only and does not expose teen message text.</Text>

    <View style={styles.heroGrid}>
      <View style={styles.stat}><Text style={styles.statNum}>{fallback.total}</Text><Text style={styles.muted}>total fallback replies</Text></View>
      <View style={styles.stat}><Text style={styles.statNum}>{fallback.natural}</Text><Text style={styles.muted}>natural fallbacks</Text></View>
      <View style={styles.stat}><Text style={styles.statNum}>{identityRate}%</Text><Text style={styles.muted}>identity disclosure rate</Text></View>
      <View style={styles.stat}><Text style={[styles.statNum, fallback.safety ? styles.warning : null]}>{safetyRate}%</Text><Text style={styles.muted}>safety fallback rate</Text></View>
    </View>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Active pack</Text>
      <Text style={styles.big}>{fallback.latestPackVersion ?? 'No pack observed yet'}</Text>
      <Text style={styles.muted}>Founder approval: {title(fallback.founderApprovalState)}</Text>
    </View>

    <MetricList titleText="Fallbacks by companion" items={fallback.byCompanion} empty="No companion fallback telemetry yet." />
    <MetricList titleText="Fallbacks by surface" items={fallback.bySurface} empty="No surface fallback telemetry yet." />
    <MetricList titleText="Fallback pack versions" items={fallback.byPackVersion} empty="No fallback pack versions observed yet." />

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Red-team read</Text>
      <Text style={styles.body}>High fallback volume means the Worker/OpenAI path needs inspection. Identity fallback spikes mean teens are testing whether companions are human. Safety fallback spikes need immediate founder review.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  content: { padding: 20, paddingTop: 72, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#080611', gap: 12, padding: 24 },
  lock: { fontSize: 36 },
  kicker: { color: '#a78bfa', fontWeight: '800', fontSize: 11, letterSpacing: 2, marginBottom: 8 },
  title: { color: '#fff', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  muted: { color: '#8f899e', fontSize: 12, lineHeight: 18 },
  body: { color: '#c8c3d2', fontSize: 13, lineHeight: 20 },
  heroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 18, marginBottom: 12 },
  stat: { flexGrow: 1, flexBasis: '45%', backgroundColor: '#12101c', borderWidth: 1, borderColor: '#272238', borderRadius: 16, padding: 14 },
  statNum: { color: '#a78bfa', fontSize: 24, fontWeight: '900' },
  warning: { color: '#fb923c' },
  panel: { backgroundColor: '#12101c', borderWidth: 1, borderColor: '#272238', borderRadius: 18, padding: 16, marginBottom: 12 },
  panelTitle: { color: '#fff', fontWeight: '800', fontSize: 16, marginBottom: 10 },
  big: { color: '#c4b5fd', fontWeight: '900', fontSize: 18, marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricRow: { marginBottom: 12 },
  metricLabel: { color: '#d7d2df', fontSize: 12 },
  metricValue: { color: '#a78bfa', fontWeight: '800' },
  barTrack: { height: 7, backgroundColor: '#29233a', borderRadius: 99, overflow: 'hidden', marginTop: 6 },
  barFill: { height: 7, backgroundColor: '#8b5cf6', borderRadius: 99 },
});

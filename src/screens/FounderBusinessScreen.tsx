import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import {
  getCurrentFounderProfile,
  getFounderBusinessSnapshot,
  isFounderBusinessProfile,
  type FounderBusinessSnapshot,
  type FounderProfile,
} from '@/services/founderAudit';

const tools = [
  {
    title: 'Users & onboarding',
    detail: 'Account roles, activation, verification, and onboarding health.',
    status: 'Planned · no live tool yet',
  },
  {
    title: 'Content & approvals',
    detail: 'Founder review queues, publishing decisions, and moderation status.',
    status: 'Planned · no live tool yet',
  },
  {
    title: 'Orders & revenue',
    detail: 'Commerce, rewards, inventory, fulfillment, and revenue signals.',
    status: 'Planned · no live tool yet',
  },
  {
    title: 'Product health',
    detail: 'Releases, open issues, audit events, and operational proof.',
    status: 'Planned · no live tool yet',
  },
] as const;

export default function FounderBusinessScreen() {
  const [profile, setProfile] = useState<FounderProfile | null>(null);
  const [snapshot, setSnapshot] = useState<FounderBusinessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const nextProfile = await getCurrentFounderProfile();
        if (!active) return;
        setProfile(nextProfile);
        if (isFounderBusinessProfile(nextProfile)) {
          const nextSnapshot = await getFounderBusinessSnapshot();
          if (!active) return;
          setSnapshot(nextSnapshot);
          if (!nextSnapshot) {
            setError('Business data is unavailable. No totals were inferred or replaced with zero.');
          }
        }
      } catch {
        if (active) setError('Business data could not be loaded. Your access was not changed.');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#b794f4" />
        <Text style={styles.muted}>Opening your private business side…</Text>
      </View>
    );
  }

  if (!isFounderBusinessProfile(profile)) {
    return (
      <View style={styles.center}>
        <Text style={styles.lock}>🔐</Text>
        <Text style={styles.lockTitle}>Founder access required</Text>
        <Text style={styles.lockCopy}>
          This side only opens for the signed-in Supabase profile with the founder role, app-management permission, and audit-view permission.
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Back to Se'kret Bip"
          style={styles.primary}
          onPress={() => router.replace('/')}
        >
          <Text style={styles.primaryText}>Back to Se’kret Bip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const snapshotAvailable = snapshot !== null;
  const latestRelease = snapshot?.latestRelease;
  const releaseTitle = snapshotAvailable
    ? latestRelease?.release_key ?? 'No release recorded'
    : 'Unavailable';
  const releaseMeta = !snapshotAvailable
    ? 'Release evidence could not be loaded.'
    : latestRelease
      ? `${latestRelease.status} · ${new Date(latestRelease.deployed_at).toLocaleString()}`
      : 'No release evidence has been recorded yet.';

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PRIVATE FOUNDER SIDE</Text>
        <Text style={styles.title}>Se’kret Bip Business</Text>
        <Text style={styles.subtitle}>
          A protected operating view for product, people, releases, and revenue. Signed in as {profile?.email ?? 'founder'}.
        </Text>
        <View style={styles.heroActions}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Open Founder Control Room"
            style={styles.primary}
            onPress={() => router.push('/control-room')}
          >
            <Text style={styles.primaryText}>Open Control Room</Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Return to public Se'kret Bip"
            style={styles.secondary}
            onPress={() => router.push('/')}
          >
            <Text style={styles.secondaryText}>View public side</Text>
          </TouchableOpacity>
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.metrics}>
        <Metric label="Accounts" value={snapshotAvailable ? snapshot.users : null} />
        <Metric label="Open issues" value={snapshotAvailable ? snapshot.openIssues : null} />
        <Metric label="Unresolved audits" value={snapshotAvailable ? snapshot.unresolvedAudits : null} />
        <Metric label="Releases" value={snapshotAvailable ? snapshot.releases : null} />
      </View>

      <View style={styles.releaseCard}>
        <Text style={styles.sectionLabel}>LATEST RELEASE</Text>
        <Text style={styles.releaseTitle}>{releaseTitle}</Text>
        <Text style={styles.releaseMeta}>{releaseMeta}</Text>
      </View>

      <Text style={styles.sectionTitle}>Business tools</Text>
      <View style={styles.toolGrid}>
        {tools.map(tool => (
          <View key={tool.title} style={styles.toolCard}>
            <Text style={styles.toolTitle}>{tool.title}</Text>
            <Text style={styles.toolDetail}>{tool.detail}</Text>
            <Text style={styles.comingSoon}>{tool.status}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: number | null }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value === null ? 'Unavailable' : value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  content: { padding: 20, paddingTop: 48, paddingBottom: 56, gap: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#080611', padding: 28 },
  muted: { color: '#9d96ad', fontSize: 13 },
  lock: { fontSize: 38 },
  lockTitle: { color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  lockCopy: { color: '#a8a0b8', fontSize: 14, lineHeight: 21, maxWidth: 480, textAlign: 'center' },
  hero: {
    borderRadius: 28,
    padding: 24,
    backgroundColor: '#120d22',
    borderWidth: 1,
    borderColor: '#342653',
    gap: 10,
  },
  eyebrow: { color: '#b794f4', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  title: { color: '#fff', fontSize: 32, fontWeight: '900' },
  subtitle: { color: '#b8afc9', fontSize: 14, lineHeight: 21, maxWidth: 720 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  primary: { backgroundColor: '#6d28d9', borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12 },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { borderWidth: 1, borderColor: '#4a3a66', borderRadius: 14, paddingHorizontal: 17, paddingVertical: 12 },
  secondaryText: { color: '#e6dcf7', fontWeight: '800' },
  error: { color: '#fca5a5', backgroundColor: '#2a1018', borderRadius: 14, padding: 14 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { minWidth: 145, flexGrow: 1, borderRadius: 20, padding: 18, backgroundColor: '#0f0b19', borderWidth: 1, borderColor: '#292139' },
  metricValue: { color: '#fff', fontSize: 28, fontWeight: '900' },
  metricLabel: { color: '#958da4', fontSize: 12, marginTop: 4, fontWeight: '700' },
  releaseCard: { borderRadius: 20, padding: 20, backgroundColor: '#0d0a15', borderWidth: 1, borderColor: '#292139', gap: 6 },
  sectionLabel: { color: '#8b7aa8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  releaseTitle: { color: '#fff', fontSize: 19, fontWeight: '900' },
  releaseMeta: { color: '#9d96ad', fontSize: 12 },
  sectionTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 4 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: { minWidth: 260, flexBasis: 320, flexGrow: 1, borderRadius: 22, padding: 20, backgroundColor: '#0f0b19', borderWidth: 1, borderColor: '#292139', gap: 8 },
  toolTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  toolDetail: { color: '#a69eb5', fontSize: 13, lineHeight: 19 },
  comingSoon: { color: '#b794f4', fontSize: 11, fontWeight: '900', marginTop: 6 },
});

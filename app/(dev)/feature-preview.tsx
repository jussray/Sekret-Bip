import React, { useEffect, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  FOUNDER_PREVIEW_FEATURES,
  isFounderPreviewEnabled,
  type FounderPreviewFeature,
  type PreviewFeatureStatus,
} from '@/constants/founderPreview';
import { useAppContext } from '@/context/AppContext';
import { logEvent } from '@/services/logEvent';

const STATUS_COPY: Record<PreviewFeatureStatus, { label: string; color: string }> = {
  live: { label: 'OPEN NOW', color: '#86efac' },
  needs_setup: { label: 'OPEN · NEEDS REAL DATA', color: '#fde68a' },
  server_rollout: { label: 'SERVER ROLLOUT CLOSED', color: '#fdba74' },
  ui_preview: { label: 'FOUNDER PREVIEW', color: '#bfdbfe' },
  not_built: { label: 'NOT BUILT YET', color: '#fca5a5' },
};

function groupFeatures(features: readonly FounderPreviewFeature[]) {
  const groups = new Map<string, FounderPreviewFeature[]>();
  for (const feature of features) {
    const current = groups.get(feature.group) ?? [];
    current.push(feature);
    groups.set(feature.group, current);
  }
  return [...groups.entries()];
}

export default function FounderFeaturePreviewRoute() {
  const { setUserSide } = useAppContext();
  const enabled = isFounderPreviewEnabled();
  const grouped = useMemo(() => groupFeatures(FOUNDER_PREVIEW_FEATURES), []);

  useEffect(() => {
    if (!enabled) return;
    void logEvent('founder_preview_opened', {
      catalogVersion: 'v1',
      featureCount: FOUNDER_PREVIEW_FEATURES.length,
    });
  }, [enabled]);

  if (!enabled) {
    return (
      <View style={styles.lockedRoot}>
        <Text style={styles.lockedEmoji}>🔒</Text>
        <Text style={styles.lockedTitle}>Founder Preview is closed.</Text>
        <Text style={styles.lockedBody}>
          This catalog opens only in Expo Go or another development build. Production ignores the preview flag entirely.
        </Text>
      </View>
    );
  }

  function openRoute(route: string) {
    if (route.startsWith('/(parent)/')) setUserSide('parent');
    if (route.startsWith('/(teen)/')) setUserSide('teen');
    router.push(route as never);
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#10051f', '#1d0d35', '#090511']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← back</Text>
          </TouchableOpacity>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>EXPO GO · DEV ONLY</Text>
          </View>
        </View>

        <Text style={styles.kicker}>FOUNDER PREVIEW</Text>
        <Text style={styles.title}>Every Bip surface, one place.</Text>
        <Text style={styles.subtitle}>
          This catalog opens every built teen, parent, and founder route. Preview points do not touch Supabase, rewards, purchases, Tickets, or your real Bip Energy balance.
        </Text>

        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>What “all features unlocked” means</Text>
          <Text style={styles.noticeBody}>
            UI and client-side locks are open in development. Age, login, consent, accepted-connection, privacy, and safety boundaries remain enforced. Empty-data features may still need real linked accounts. Features that do not exist yet are labeled instead of impersonating software.
          </Text>
        </View>

        {grouped.map(([group, features]) => (
          <View key={group} style={styles.group}>
            <Text style={styles.groupTitle}>{group.toUpperCase()}</Text>
            {features.map(feature => {
              const status = STATUS_COPY[feature.status];
              return (
                <View key={feature.key} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{feature.title}</Text>
                      <Text style={styles.sideLabel}>{feature.side}</Text>
                    </View>
                    <Text style={[styles.status, { color: status.color }]}>{status.label}</Text>
                  </View>
                  <Text style={styles.cardDetail}>{feature.detail}</Text>
                  {feature.route ? (
                    <TouchableOpacity
                      style={styles.openButton}
                      onPress={() => openRoute(feature.route as string)}
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${feature.title}`}
                    >
                      <Text style={styles.openButtonText}>Open feature</Text>
                      <Text style={styles.openArrow}>›</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.noRoute}>
                      <Text style={styles.noRouteText}>No honest screen exists to open yet.</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        ))}

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Production remains locked.</Text>
          <Text style={styles.footerBody}>
            `isFounderPreviewEnabled()` returns false whenever `__DEV__` is false. Public releases cannot be unlocked by accidentally shipping an environment variable.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090511' },
  lockedRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#090511', padding: 30 },
  lockedEmoji: { fontSize: 44, marginBottom: 14 },
  lockedTitle: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  lockedBody: { color: '#a89bb5', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10, maxWidth: 420 },
  content: { paddingHorizontal: 18, paddingTop: 58, paddingBottom: 70, maxWidth: 680, width: '100%', alignSelf: 'center' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  backButton: { paddingVertical: 8, paddingRight: 10 },
  backText: { color: '#b8a9c9', fontSize: 12, fontWeight: '800' },
  previewBadge: { borderRadius: 999, borderWidth: 1, borderColor: '#f59e0b66', backgroundColor: '#78350f44', paddingHorizontal: 10, paddingVertical: 5 },
  previewBadgeText: { color: '#fde68a', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  kicker: { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginBottom: 8 },
  title: { color: '#fff', fontSize: 31, lineHeight: 38, fontWeight: '900' },
  subtitle: { color: '#b8a9c9', fontSize: 13, lineHeight: 20, marginTop: 9, marginBottom: 18 },
  noticeCard: { borderRadius: 18, borderWidth: 1, borderColor: '#f59e0b44', backgroundColor: '#3a210d66', padding: 15, marginBottom: 20 },
  noticeTitle: { color: '#fde68a', fontSize: 13, fontWeight: '900' },
  noticeBody: { color: '#d8c49a', fontSize: 11, lineHeight: 17, marginTop: 5 },
  group: { marginBottom: 18 },
  groupTitle: { color: '#88769a', fontSize: 10, fontWeight: '900', letterSpacing: 1.6, marginBottom: 9, marginLeft: 3 },
  card: { borderRadius: 20, borderWidth: 1, borderColor: '#ffffff16', backgroundColor: 'rgba(27,14,46,0.94)', padding: 16, marginBottom: 10 },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  sideLabel: { color: '#756582', fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 3 },
  status: { fontSize: 8, fontWeight: '900', letterSpacing: 0.8, textAlign: 'right', maxWidth: 150 },
  cardDetail: { color: '#9f91ad', fontSize: 11, lineHeight: 17, marginTop: 7 },
  openButton: { minHeight: 44, borderRadius: 14, backgroundColor: '#6d28d9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 13, paddingHorizontal: 15 },
  openButtonText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  openArrow: { color: '#fff', fontSize: 22, marginLeft: 7 },
  noRoute: { borderRadius: 13, backgroundColor: '#2a1420', padding: 11, marginTop: 13 },
  noRouteText: { color: '#e3a5b6', fontSize: 10, textAlign: 'center', fontWeight: '700' },
  footerCard: { borderRadius: 18, borderWidth: 1, borderColor: '#86efac33', backgroundColor: '#12331f55', padding: 15, marginTop: 8 },
  footerTitle: { color: '#bbf7d0', fontSize: 13, fontWeight: '900' },
  footerBody: { color: '#9bc9aa', fontSize: 11, lineHeight: 17, marginTop: 5 },
});

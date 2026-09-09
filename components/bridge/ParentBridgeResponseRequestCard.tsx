import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  fetchBridgeSignals,
  fetchLinkedTeenId,
  type BridgeSignal,
} from '@/utils/parentBridgeCompat';
import { getBridgeResponsePreference } from '@/features/bridge/responsePreference';

export function ParentBridgeResponseRequestCard() {
  const [latest, setLatest] = useState<BridgeSignal | null>(null);
  const [loading, setLoading] = useState(true);
  const [linked, setLinked] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const teenId = await fetchLinkedTeenId();
      if (!active) return;
      setLinked(Boolean(teenId));
      if (!teenId) {
        setLoading(false);
        return;
      }

      const signals = await fetchBridgeSignals(teenId);
      if (!active) return;
      setLatest(signals.find(signal => Boolean(signal.response_preference)) ?? null);
      setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const request = useMemo(
    () => getBridgeResponsePreference(latest?.response_preference),
    [latest?.response_preference],
  );

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#e9a04a" />
        <Text style={styles.loading}>checking the latest support request…</Text>
      </View>
    );
  }

  if (!linked) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>RESPONSE REQUEST</Text>
        <Text style={styles.empty}>Link a teen account before Bridge can show what kind of support they asked for.</Text>
      </View>
    );
  }

  if (!request || !latest) {
    return (
      <View style={styles.card}>
        <Text style={styles.eyebrow}>RESPONSE REQUEST</Text>
        <Text style={styles.empty}>No response request has come through yet. Bridge will show it here when your teen chooses one.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>HOW THEY ASKED YOU TO RESPOND</Text>
      <View style={styles.requestRow}>
        <Text style={styles.emoji}>{request.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{request.parentLabel}</Text>
          <Text style={styles.body}>{request.hint}</Text>
        </View>
      </View>
      <View style={styles.boundaryCard}>
        <Text style={styles.boundaryText}>
          Honor the request without asking to see journals, chats, mood history, or anything else they did not share.
        </Text>
      </View>
      <Text style={styles.time}>
        Latest request · {new Date(latest.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(233,160,74,0.35)',
    backgroundColor: 'rgba(46,26,16,0.88)',
    padding: 16,
    marginBottom: 16,
  },
  loading: { color: 'rgba(245,232,200,0.68)', fontSize: 11, textAlign: 'center', marginTop: 8 },
  eyebrow: { color: '#e9a04a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10 },
  empty: { color: 'rgba(245,232,200,0.70)', fontSize: 12, lineHeight: 18 },
  requestRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  emoji: { fontSize: 28 },
  title: { color: '#f5e8c8', fontSize: 16, fontWeight: '900', lineHeight: 22 },
  body: { color: 'rgba(245,232,200,0.66)', fontSize: 11, lineHeight: 17, marginTop: 4 },
  boundaryCard: { borderRadius: 12, backgroundColor: 'rgba(233,160,74,0.09)', padding: 11, marginTop: 13 },
  boundaryText: { color: '#e8c994', fontSize: 10, lineHeight: 15 },
  time: { color: 'rgba(245,232,200,0.42)', fontSize: 9, marginTop: 10 },
});

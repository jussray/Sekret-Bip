import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  SITE_CONTINUITY_COOKIE,
  SITE_CONTINUITY_FINGERPRINT,
} from './siteContinuity';

function truthColor(state: string): string {
  if (state === 'VERIFIED') return '#4ade80';
  if (state === 'STALE' || state === 'SUPERSEDED') return '#fb7185';
  return '#facc15';
}

export default function SiteContinuityPanel() {
  const cookie = SITE_CONTINUITY_COOKIE;

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <Text style={styles.kicker}>SITE CONTINUITY</Text>
      <Text style={styles.title}>Se’kret Bip audit mirror</Text>
      <Text style={styles.body}>The ChatGPT Site is an observe/request audit mirror. It is not a second Control Room and it does not gain merge, deploy, provider, or publication authority.</Text>
    </View>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Continuity fingerprint</Text>
      <Text selectable style={styles.code}>{SITE_CONTINUITY_FINGERPRINT}</Text>
      <Text style={styles.muted}>Deterministic identity marker for the repository + branch + audit-mirror role + exact Site origin + compatibility route. It is continuity evidence, not an auth secret.</Text>
    </View>

    <View style={styles.panel}>
      <View style={styles.row}>
        <Text style={styles.panelTitle}>Continuity cookie</Text>
        <Text style={[styles.state, { color: truthColor(cookie.livePublicationReadback) }]}>{cookie.livePublicationReadback}</Text>
      </View>
      <Text style={styles.key}>schema</Text>
      <Text selectable style={styles.value}>{cookie.schema}</Text>
      <Text style={styles.key}>repository binding</Text>
      <Text style={styles.value}>{cookie.repositoryBinding}</Text>
      <Text style={styles.key}>authority</Text>
      <Text style={styles.value}>{cookie.authority}</Text>
      <Text style={styles.key}>browser cookie</Text>
      <Text style={styles.value}>{String(cookie.browserCookie)}</Text>
      <Text style={styles.muted}>This is a non-secret continuity receipt carried in application state/code. Se’kret Bip’s zero-browser-cookie auth policy remains unchanged.</Text>
    </View>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Bound Site</Text>
      <Text style={styles.key}>origin</Text>
      <Text selectable style={styles.value}>{cookie.siteOrigin}</Text>
      <Text style={styles.key}>audit route</Text>
      <Text selectable style={styles.value}>{cookie.auditViewLink}</Text>
      <Text style={styles.key}>canonical Control Room</Text>
      <Text selectable style={styles.value}>{cookie.canonicalControlRoomEntry}</Text>
      <TouchableOpacity
        accessibilityRole="link"
        accessibilityLabel="Open Se'kret Bip audit mirror"
        style={styles.primary}
        onPress={() => void Linking.openURL(cookie.auditViewLink)}
      >
        <Text style={styles.primaryText}>Open audit mirror</Text>
      </TouchableOpacity>
    </View>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Invalidation triggers</Text>
      {cookie.invalidatesOn.map((reason) => <Text key={reason} style={styles.listItem}>• {reason}</Text>)}
      <Text style={styles.muted}>A new runtime readback can upgrade or invalidate this receipt. Repository truth never silently proves Site publication truth.</Text>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  content: { paddingHorizontal: 18, paddingTop: 88, paddingBottom: 40, gap: 12 },
  header: { gap: 8, marginBottom: 4 },
  kicker: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  body: { color: '#c4bdd0', fontSize: 13, lineHeight: 19 },
  panel: { backgroundColor: '#0d0a15', borderWidth: 1, borderColor: '#272238', borderRadius: 16, padding: 14, gap: 7 },
  panelTitle: { color: '#fff', fontSize: 15, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  state: { fontSize: 11, fontWeight: '900' },
  key: { color: '#8f899e', fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.7 },
  value: { color: '#ddd6fe', fontSize: 12 },
  code: { color: '#c4b5fd', backgroundColor: '#151022', borderRadius: 10, padding: 10, fontSize: 13, fontWeight: '800' },
  muted: { color: '#8f899e', fontSize: 11, lineHeight: 16 },
  listItem: { color: '#c4bdd0', fontSize: 12, lineHeight: 18 },
  primary: { alignSelf: 'flex-start', marginTop: 6, backgroundColor: '#6d28d9', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 },
  primaryText: { color: '#fff', fontWeight: '900', fontSize: 12 },
});

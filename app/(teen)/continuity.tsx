import React from 'react';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '@/context/AppContext';
import { resolveVisibleIdentity } from '@/features/sekret/identityContract';

export default function ContinuityRoute() {
  const { entries, moodHistory, selectedSekret } = useAppContext();
  // Title-casing the stored id would render the pre-cutover names
  // ('Raylene'/'Rylane'); resolve through the canonical display map instead.
  const companion = selectedSekret ? resolveVisibleIdentity(selectedSekret) : 'Suhana';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0d0518', '#1a0b32', '#0d0518']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← More</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>MEMORY & CONTINUITY</Text>
        <Text style={styles.title}>What Bip remembers now</Text>
        <Text style={styles.subtitle}>A clear view of saved app history without quietly turning on long-term AI memory.</Text>

        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>L4 STATUS</Text>
          <Text style={styles.statusTitle}>Protected, not active</Text>
          <Text style={styles.body}>Durable continuity stays off until ownership, correction, expiration, deletion, privacy rules, and denial tests are approved. This screen does not bypass that gate.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Saved in your app today</Text>
          <View style={styles.row}><Text style={styles.rowLabel}>Pages entries</Text><Text style={styles.rowValue}>{entries.length}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Mood check-ins</Text><Text style={styles.rowValue}>{moodHistory.length}</Text></View>
          <View style={styles.row}><Text style={styles.rowLabel}>Current companion</Text><Text style={styles.rowValue}>{companion}</Text></View>
          <Text style={styles.note}>These are ordinary app records. They are not permission for a model to build a hidden permanent profile.</Text>
        </View>

        <TouchableOpacity style={styles.primary} onPress={() => router.push('/(teen)/history' as any)}>
          <Text style={styles.primaryText}>Open my history</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(teen)/pages' as any)}>
          <Text style={styles.secondaryText}>Open Pages</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/(teen)/settings' as any)}>
          <Text style={styles.secondaryText}>Review privacy settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0518' },
  scroll: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 80, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  back: { alignSelf: 'flex-start', marginBottom: 24 },
  backText: { color: '#c4b5fd', fontSize: 14, fontWeight: '700' },
  kicker: { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginBottom: 8 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginBottom: 8 },
  subtitle: { color: '#cbb6f7', fontSize: 14, lineHeight: 21, marginBottom: 22 },
  statusCard: { borderWidth: 1, borderColor: '#facc1555', backgroundColor: 'rgba(66,45,10,0.34)', borderRadius: 20, padding: 18, marginBottom: 16 },
  statusLabel: { color: '#facc15', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 6 },
  statusTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 8 },
  body: { color: '#e5ddf5', fontSize: 13, lineHeight: 20 },
  card: { borderWidth: 1, borderColor: '#a78bfa55', backgroundColor: 'rgba(30,18,55,0.88)', borderRadius: 20, padding: 18, marginBottom: 18 },
  cardTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#ffffff18', paddingVertical: 10 },
  rowLabel: { color: '#cbb6f7', fontSize: 13 },
  rowValue: { color: '#fff', fontSize: 14, fontWeight: '800' },
  note: { color: '#9f91b5', fontSize: 12, lineHeight: 18, marginTop: 14 },
  primary: { minHeight: 52, borderRadius: 16, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondary: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: '#a78bfa66', backgroundColor: 'rgba(30,18,55,0.7)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  secondaryText: { color: '#ddd6fe', fontSize: 14, fontWeight: '800' },
});

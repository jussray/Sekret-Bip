import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  loadMeaningfulReturnSnapshot,
  type MeaningfulCategory,
  type MeaningfulReturnSnapshot,
} from '@/features/retention/meaningfulReturn';

interface MeaningfulHistoryScreenProps {
  onBack: () => void;
  onNavigate: (screen: string) => void;
}

const CATEGORY_COPY: Record<MeaningfulCategory, { icon: string; label: string; detail: string }> = {
  understand: { icon: '💭', label: 'understood yourself', detail: 'mood check-ins and private reflection' },
  express: { icon: '📓', label: 'let it out', detail: 'Pages and Voice Bip' },
  regulate: { icon: '☁️', label: 'helped yourself settle', detail: 'Comfort, breathing, and resets' },
  connect: { icon: '🌉', label: 'connected safely', detail: 'Circle, Crew, and Bridge' },
  grow: { icon: '🌱', label: 'moved forward', detail: 'goals and growing-up steps' },
};

export function MeaningfulHistoryScreen({ onBack, onNavigate }: MeaningfulHistoryScreenProps) {
  const [snapshot, setSnapshot] = useState<MeaningfulReturnSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    void loadMeaningfulReturnSnapshot().then(next => {
      if (active) setSnapshot(next);
    });
    return () => { active = false; };
  }, []);

  const strongestCategory = useMemo(() => {
    if (!snapshot) return null;
    return (Object.entries(snapshot.categoryCounts) as Array<[MeaningfulCategory, number]>)
      .sort((a, b) => b[1] - a[1])[0] ?? null;
  }, [snapshot]);

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0b0614', '#160b28', '#0a0612']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← room</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.kicker}>YOUR BIP STORY</Text>
            <Text style={styles.title}>How you showed up</Text>
          </View>
        </View>

        {!snapshot ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator color="#a78bfa" />
            <Text style={styles.loadingText}>gathering your private receipts…</Text>
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroNumber}>{snapshot.activeDays30}</Text>
              <Text style={styles.heroLabel}>days you checked in this month</Text>
              <Text style={styles.heroBody}>
                They do not have to be consecutive. Missing a day does not erase anything.
              </Text>
            </View>

            <View style={styles.statRow}>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{snapshot.activeDays8}</Text>
                <Text style={styles.statLabel}>active days · last 8</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statNumber}>{snapshot.meaningfulActions30}</Text>
                <Text style={styles.statLabel}>meaningful actions · month</Text>
              </View>
            </View>

            {strongestCategory && strongestCategory[1] > 0 ? (
              <View style={styles.noteCard}>
                <Text style={styles.noteIcon}>{CATEGORY_COPY[strongestCategory[0]].icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteTitle}>A pattern worth noticing</Text>
                  <Text style={styles.noteBody}>
                    You most often {CATEGORY_COPY[strongestCategory[0]].label}. That is information, not a grade.
                  </Text>
                </View>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Your ways of showing up</Text>
            {(Object.entries(CATEGORY_COPY) as Array<[MeaningfulCategory, typeof CATEGORY_COPY[MeaningfulCategory]]>)
              .map(([category, copy]) => (
                <View key={category} style={styles.categoryCard}>
                  <Text style={styles.categoryIcon}>{copy.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryTitle}>{copy.label}</Text>
                    <Text style={styles.categoryDetail}>{copy.detail}</Text>
                  </View>
                  <Text style={styles.categoryCount}>{snapshot.categoryCounts[category]}</Text>
                </View>
              ))}

            <Text style={styles.sectionTitle}>Come back through value</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => onNavigate('pages')}>
                <Text style={styles.actionIcon}>✏️</Text>
                <Text style={styles.actionText}>let it out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => onNavigate('calm')}>
                <Text style={styles.actionIcon}>☁️</Text>
                <Text style={styles.actionText}>settle</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => onNavigate('bridge')}>
                <Text style={styles.actionIcon}>🌉</Text>
                <Text style={styles.actionText}>connect</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.guardrailCard}>
              <Text style={styles.guardrailTitle}>No broken streaks here.</Text>
              <Text style={styles.guardrailBody}>
                This page counts care, expression, regulation, growth, and connection. It does not punish normal inconsistency.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b0614' },
  scroll: { paddingTop: 58, paddingHorizontal: 16, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  backButton: { paddingVertical: 8, paddingRight: 8 },
  backText: { color: '#a99db8', fontSize: 12, fontWeight: '800' },
  kicker: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 27, fontWeight: '900', marginTop: 3 },
  loadingCard: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.04)', padding: 28, alignItems: 'center' },
  loadingText: { color: '#9487a4', fontSize: 12, marginTop: 10 },
  heroCard: { borderRadius: 26, borderWidth: 1, borderColor: '#8b5cf655', backgroundColor: 'rgba(76,29,149,0.19)', padding: 22, marginBottom: 12 },
  heroNumber: { color: '#fff', fontSize: 58, fontWeight: '900', lineHeight: 64 },
  heroLabel: { color: '#e9ddff', fontSize: 15, fontWeight: '900' },
  heroBody: { color: '#a99db8', fontSize: 12, lineHeight: 18, marginTop: 7 },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', padding: 15 },
  statNumber: { color: '#fff', fontSize: 28, fontWeight: '900' },
  statLabel: { color: '#91859f', fontSize: 9, fontWeight: '800', marginTop: 3 },
  noteCard: { flexDirection: 'row', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: '#86efac33', backgroundColor: 'rgba(22,101,52,0.15)', padding: 15, marginBottom: 20 },
  noteIcon: { fontSize: 25 },
  noteTitle: { color: '#d9fbe3', fontSize: 13, fontWeight: '900' },
  noteBody: { color: '#a7cbb2', fontSize: 11, lineHeight: 17, marginTop: 3 },
  sectionTitle: { color: '#efe8f7', fontSize: 14, fontWeight: '900', marginTop: 14, marginBottom: 10 },
  categoryCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 17, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: 'rgba(255,255,255,0.035)', padding: 14, marginBottom: 8 },
  categoryIcon: { fontSize: 22 },
  categoryTitle: { color: '#eee8f4', fontSize: 12, fontWeight: '900' },
  categoryDetail: { color: '#8e819b', fontSize: 10, marginTop: 2 },
  categoryCount: { color: '#c4b5fd', fontSize: 20, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 8 },
  actionButton: { flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#8b5cf633', backgroundColor: 'rgba(139,92,246,0.09)' },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionText: { color: '#e6ddf2', fontSize: 10, fontWeight: '800' },
  guardrailCard: { borderRadius: 18, borderWidth: 1, borderColor: '#f9a8d433', backgroundColor: 'rgba(131,24,67,0.12)', padding: 15, marginTop: 18 },
  guardrailTitle: { color: '#fce7f3', fontSize: 13, fontWeight: '900' },
  guardrailBody: { color: '#c6a8b8', fontSize: 11, lineHeight: 17, marginTop: 4 },
});

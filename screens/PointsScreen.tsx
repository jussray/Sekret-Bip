// screens/PointsScreen.tsx
// Se'kret Bip — Bip Points
//
// Phase 2 build. NOT a gamified leaderboard. NOT a streak-to-beat. This is a
// soft receipts page: "here's what you earned just by showing up for
// yourself." Points are derived from the existing activity logs (mood,
// journal, voice, calm, comfort, circle, crew check-ins). No backend needed.
//
// Voice:
//   • Sy: "the reps stack. respect."
//   • Suhana: "soft points 💜 you earned every single one."
//
// Tiers are emotional, not competitive:
//   • cloud just forming   (0–49)
//   • cloud is here        (50–149)
//   • soft sky             (150–349)
//   • full moon energy     (350–749)
//   • whole night sky      (750+)

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { snapshotPoints } from '@/utils/sync';
import { fetchPointsHistory, syncTeenActivitySummary, type PointsHistoryEntry } from '@/utils/pointsCompat';
import { usePoints, TIERS, tierFor, type Tier } from '@/features/activity/ledger';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import type {
  MoodEntry, JournalEntry, VoiceNote, CirclePost,
  ComfortSession, CrewCheckIn,
} from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Point values (small, soft, not addictive) ─── kept for prop-based fallback ─
const PT_MOOD     = 2;
const PT_JOURNAL  = 5;
const PT_VOICE    = 5;
const PT_CIRCLE   = 4;
const PT_COMFORT  = 3;
const PT_CREW     = 6;
const PT_STREAK   = 3;

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  t: Record<string, any>;
  mood: string;
  selectedSekret: 'rylane' | 'raylene' | string;
  moodHistory: MoodEntry[];
  journalEntries: JournalEntry[];
  voiceNotes: VoiceNote[];
  circlePosts: CirclePost[];
  comfortSessions: ComfortSession[];
  crewCheckIns: CrewCheckIn[];
  streakDays: number;
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function PointsScreen({
  t, mood, selectedSekret,
  moodHistory, journalEntries, voiceNotes, circlePosts,
  comfortSessions, crewCheckIns, streakDays,
  setScreen, BottomNav,
}: Props) {
  const isRylane = selectedSekret === 'rylane';
  const tod = timeOfDay();
  const bg = getRoomBg(isRylane ? 'rylane' : 'raylene', tod);
  const glow = glowFor(mood);
  const accent = isRylane ? '#4DA3FF' : '#e879a3';
  const softAccent = isRylane ? '#b6dcff' : '#f5b8cf';
  const cardBg = isRylane ? 'rgba(10,20,40,0.82)' : 'rgba(40,15,40,0.82)';

  const ledger = usePoints();

  // ── Compute points — ledger wins when loaded, props used as offline fallback ─
  const breakdown = useMemo(() => {
    if (ledger.isLoaded) {
      return {
        total: ledger.total,
        rows: ledger.breakdown.map(r => ({ key: r.key, label: r.label, each: r.each, count: r.count, pts: r.pts, emoji: r.emoji })),
      };
    }
    const moodPts    = (moodHistory?.length    || 0) * PT_MOOD;
    const journalPts = (journalEntries?.length || 0) * PT_JOURNAL;
    const voicePts   = (voiceNotes?.length     || 0) * PT_VOICE;
    const circlePts  = (circlePosts?.length    || 0) * PT_CIRCLE;
    const comfortPts = (comfortSessions?.length|| 0) * PT_COMFORT;
    const crewPts    = (crewCheckIns?.length   || 0) * PT_CREW;
    const streakPts  = Math.max(0, streakDays) * PT_STREAK;
    const total = moodPts + journalPts + voicePts + circlePts + comfortPts + crewPts + streakPts;
    return {
      total,
      rows: [
        { key: 'mood',    label: 'mood logs',        each: PT_MOOD,    count: moodHistory?.length    || 0, pts: moodPts,    emoji: '💭' },
        { key: 'journal', label: 'journal entries',  each: PT_JOURNAL, count: journalEntries?.length || 0, pts: journalPts, emoji: '📓' },
        { key: 'voice',   label: 'voice bips',       each: PT_VOICE,   count: voiceNotes?.length     || 0, pts: voicePts,   emoji: '🎤' },
        { key: 'circle',  label: 'circle drops',     each: PT_CIRCLE,  count: circlePosts?.length    || 0, pts: circlePts,  emoji: '🌫️' },
        { key: 'comfort', label: 'comfort sessions', each: PT_COMFORT, count: comfortSessions?.length|| 0, pts: comfortPts, emoji: '🤍' },
        { key: 'crew',    label: 'crew check-ins',   each: PT_CREW,    count: crewCheckIns?.length   || 0, pts: crewPts,    emoji: '🤝' },
        { key: 'streak',  label: 'streak days',      each: PT_STREAK,  count: Math.max(0, streakDays),     pts: streakPts,  emoji: '🌙' },
      ],
    };
  }, [ledger, moodHistory, journalEntries, voiceNotes, circlePosts, comfortSessions, crewCheckIns, streakDays]);

  const [pointsHistory, setPointsHistory] = useState<PointsHistoryEntry[]>([]);

  // Snapshot current points total to Supabase for cross-device history
  useEffect(() => {
    if (breakdown.total > 0) void snapshotPoints(breakdown.total);
  }, [breakdown.total]);

  // Load 30-day history for chart
  useEffect(() => {
    fetchPointsHistory(30).then(setPointsHistory).catch(() => {});
  }, []);

  // Sync wellbeing summary for parent dashboard (privacy-safe aggregates only).
  // pointsCompat reads streakDays / sessionCount / pointsTier from stored state
  // internally — no args needed here.
  useEffect(() => {
    if (breakdown.total === 0) return;
    void syncTeenActivitySummary();
  }, [breakdown.total]);

  const tier: Tier = ledger.isLoaded ? ledger.tier : tierFor(breakdown.total);
  const tierIdx = TIERS.findIndex(t2 => t2.key === tier.key);
  const nextTier = TIERS[tierIdx + 1];
  const progress = nextTier
    ? Math.min(1, Math.max(0, (breakdown.total - tier.min) / (nextTier.min - tier.min)))
    : 1;

  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fade, slide, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const chartMax = Math.max(1, ...pointsHistory.map(p => p.total));

  return (
    <View style={{ flex: 1, backgroundColor: '#0a0612' }}>
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient colors={['rgba(5,3,10,0.50)', 'rgba(5,3,10,0.84)']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>
          <Text style={[st.eyebrow, { color: softAccent }]}>Bip Points</Text>
          <Text style={st.title}>{isRylane ? 'the reps stack.' : 'soft points 💜'}</Text>
          <Text style={st.sub}>{isRylane ? 'quiet proof you kept showing up.' : 'you earned these by coming back to yourself.'}</Text>
        </Animated.View>

        <Animated.View style={[st.hero, { borderColor: glow, backgroundColor: cardBg, transform: [{ scale: breathScale }] }]}>
          <Text style={st.heroEmoji}>{tier.emoji}</Text>
          <Text style={[st.total, { color: tier.color }]}>{breakdown.total}</Text>
          <Text style={st.totalLabel}>total points</Text>
          <Text style={[st.tier, { color: tier.color }]}>{tier.label}</Text>
          <View style={st.barTrack}>
            <View style={[st.barFill, { width: `${progress * 100}%`, backgroundColor: tier.color }]} />
          </View>
          <Text style={st.nextText}>{nextTier ? `${Math.max(0, nextTier.min - breakdown.total)} until ${nextTier.label}` : 'you filled the whole sky ✨'}</Text>
        </Animated.View>

        {pointsHistory.length > 0 && (
          <View style={[st.card, { borderColor: glow + '44', backgroundColor: cardBg }]}>
            <Text style={st.cardTitle}>last 30 days</Text>
            <View style={st.chartRow}>
              {pointsHistory.slice(-30).map((p, i) => (
                <View key={`${p.captured_at}-${i}`} style={st.chartBarWrap}>
                  <View style={[st.chartBar, { height: `${Math.max(8, (p.total / chartMax) * 100)}%`, backgroundColor: tier.color }]} />
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={[st.card, { borderColor: glow + '44', backgroundColor: cardBg }]}>
          <Text style={st.cardTitle}>where they came from</Text>
          {breakdown.rows.map(row => (
            <View key={row.key} style={st.row}>
              <Text style={st.rowEmoji}>{row.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.rowLabel}>{row.label}</Text>
                <Text style={st.rowSub}>{row.count} × {row.each} pts</Text>
              </View>
              <Text style={[st.rowPts, { color: accent }]}>{row.pts}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={() => setScreen('home')} style={[st.back, { borderColor: glow + '55' }]}>
          <Text style={st.backText}>← back to room</Text>
        </TouchableOpacity>
      </ScrollView>

      {BottomNav}
    </View>
  );
}

const st = StyleSheet.create({
  scroll: { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 42, paddingBottom: 120, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  eyebrow: { fontSize: 12, fontWeight: '800', letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 6 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginBottom: 6 },
  sub: { color: 'rgba(255,255,255,0.78)', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  hero: { borderWidth: 1, borderRadius: 28, padding: 22, alignItems: 'center', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
  heroEmoji: { fontSize: 38, marginBottom: 4 },
  total: { fontSize: 56, fontWeight: '900', letterSpacing: -1 },
  totalLabel: { color: 'rgba(255,255,255,0.68)', fontSize: 12, fontWeight: '700', marginTop: -4, marginBottom: 6 },
  tier: { fontSize: 16, fontWeight: '900', marginBottom: 14 },
  barTrack: { height: 9, width: '100%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%', borderRadius: 999 },
  nextText: { color: 'rgba(255,255,255,0.60)', fontSize: 11, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 16 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 12 },
  chartRow: { height: 90, flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  chartBarWrap: { flex: 1, height: '100%', justifyContent: 'flex-end', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 5, overflow: 'hidden' },
  chartBar: { width: '100%', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  rowEmoji: { fontSize: 22, width: 34 },
  rowLabel: { color: '#fff', fontSize: 13, fontWeight: '800' },
  rowSub: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 },
  rowPts: { fontSize: 18, fontWeight: '900' },
  back: { borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  backText: { color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: '800' },
});

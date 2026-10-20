// screens/HistoryScreen.tsx
// Se'kret Bip — History ("I'm actually doing better")
//
// Phase 2 build: a soft, scrapbook receipts page. Not a clinical dashboard —
// the point is to let the user feel time passing and notice their own
// pattern. We pull mood frequency from moodHistory, count
// journals/voice/comfort sessions/circle posts, surface the current streak,
// and end with a char-aware sticky note.
//
// Voice:
//   • Sy (blue): "respect, look at the reps fr · lock in continues"
//   • Suhana (pink/purple): "we see you 💜 · look how far you've come"
//
// Same polish patterns as the rest of the app: time-of-day backdrop, mood
// glow, gradient hero overlay, stagger entrance, breath-loop on the streak
// pill, scrapbook sticky-note at the bottom.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import type { MoodEntry, JournalEntry, VoiceNote, CirclePost } from '@/types';

// ── Glow palette ─────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Mood swatches (matches the rest of the app) ─────────────────────────────
const MOOD_COLORS: Record<string, string> = {
  happy:      '#fbbf24',
  calm:       '#c4b5fd',
  sad:        '#7dd3fc',
  anxious:    '#7dd3fc',
  angry:      '#f472b6',
  overwhelmed:'#f472b6',
  stressed:   '#f472b6',
  tired:      '#6d28d9',
};

function colorForMood(m: string): string {
  const k = (m || '').toLowerCase();
  for (const key of Object.keys(MOOD_COLORS)) {
    if (k.includes(key)) return MOOD_COLORS[key];
  }
  return '#c4b5fd';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(iso: string): number {
  if (!iso) return 9999;
  const then = new Date(iso).getTime();
  if (isNaN(then)) return 9999;
  const ms = Date.now() - then;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function withinDays<T extends { date?: string }>(items: T[], n: number): number {
  let c = 0;
  for (const it of items || []) {
    if (it && it.date && daysAgo(it.date) <= n) c++;
  }
  return c;
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  t: Record<string, any>;
  mood: string;
  selectedSekret: 'rylane' | 'raylene' | string;
  moodHistory: MoodEntry[];
  journalEntries: JournalEntry[];
  voiceNotes: VoiceNote[];
  circlePosts: CirclePost[];
  streakDays: number;
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function HistoryScreen({
  t, mood, selectedSekret,
  moodHistory, journalEntries, voiceNotes, circlePosts,
  streakDays, setScreen, BottomNav,
}: Props) {
  const isRylane = selectedSekret === 'rylane';
  const tod = timeOfDay();
  const bg  = getRoomBg(isRylane ? 'rylane' : 'raylene', tod);
  const glow = glowFor(mood);
  const accent = isRylane ? '#4DA3FF' : '#e879a3';
  const softAccent = isRylane ? '#b6dcff' : '#f5b8cf';
  const cardBg = isRylane ? 'rgba(10,20,40,0.82)' : 'rgba(40,15,40,0.82)';

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const moodCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of moodHistory || []) {
      if (!e || !e.mood) continue;
      if (daysAgo(e.date) > 14) continue;
      const key = e.mood.toLowerCase();
      m[key] = (m[key] || 0) + 1;
    }
    return m;
  }, [moodHistory]);

  const moodBars = useMemo(() => {
    const entries = Object.entries(moodCounts).sort((a, b) => b[1] - a[1]);
    const max = entries.length ? entries[0][1] : 1;
    return entries.slice(0, 6).map(([k, v]) => ({
      mood: k,
      count: v,
      pct: Math.max(8, Math.round((v / max) * 100)),
      color: colorForMood(k),
    }));
  }, [moodCounts]);

  const counts7 = useMemo(() => ({
    journals: withinDays(journalEntries, 7),
    voice:    withinDays(voiceNotes, 7),
    circle:   withinDays(circlePosts, 7),
    moods:    withinDays(moodHistory, 7),
  }), [journalEntries, voiceNotes, circlePosts, moodHistory]);

  const counts30 = useMemo(() => ({
    journals: withinDays(journalEntries, 30),
    voice:    withinDays(voiceNotes, 30),
    circle:   withinDays(circlePosts, 30),
    moods:    withinDays(moodHistory, 30),
  }), [journalEntries, voiceNotes, circlePosts, moodHistory]);

  const totalReps =
    (journalEntries?.length || 0) +
    (voiceNotes?.length || 0) +
    (circlePosts?.length || 0) +
    (moodHistory?.length || 0);

  // ── Animations ─────────────────────────────────────────────────────────────
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const card1Anim  = useRef(new Animated.Value(0)).current;
  const card2Anim  = useRef(new Animated.Value(0)).current;
  const card3Anim  = useRef(new Animated.Value(0)).current;
  const card4Anim  = useRef(new Animated.Value(0)).current;
  const noteAnim   = useRef(new Animated.Value(0)).current;
  const breath     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(160, [
      Animated.timing(heroAnim,  { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card1Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card2Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card3Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(card4Anim, { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(noteAnim,  { toValue: 1, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [breath, heroAnim, card1Anim, card2Anim, card3Anim, card4Anim, noteAnim]);

  const enter = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });

  // ── Copy ───────────────────────────────────────────────────────────────────
  const heroTitle = isRylane
    ? 'respect — look at the reps'
    : "look how far you've come \u{1F49C}";

  const heroSub = isRylane
    ? 'lock in continues. quietly. day by day.'
    : "soft proof that you're actually doing better.";

  const streakCopy =
    streakDays <= 0
      ? (isRylane ? "fresh start. let's build it." : "today counts. that's a start \u{1F49C}")
      : streakDays === 1
        ? (isRylane ? 'day 1. respect.' : 'day 1. proud of you already \u{1F49C}')
        : (isRylane
            ? `${streakDays} days in. legend.`
            : `${streakDays} days in. look at you \u{1F49C}`);

  const moodTop = moodBars[0]?.mood;
  const moodLine = moodTop
    ? (isRylane
        ? `most logged in the last 2 weeks: ${moodTop}. noted.`
        : `most logged in the last 2 weeks: ${moodTop}. that's real info \u{1F49C}`)
    : (isRylane
        ? "no mood logs yet. drop one when you're ready."
        : "no mood logs yet. tap one when you're ready.");

  const stickyAffirmation = isRylane
    ? '“the reps are quiet. the change is loud.”'
    : '"you\'re actually doing better. it\'s ok to notice."';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ImageBackground source={bg} style={styles.bg} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <Animated.View style={[styles.hero, enter(heroAnim)]}>
          <Animated.View
            style={[
              styles.pill,
              { borderColor: softAccent, backgroundColor: 'rgba(20,12,40,0.55)' },
              { opacity: breathOpacity, transform: [{ scale: breathScale }] },
            ]}
          >
            <Text style={[styles.pillText, { color: softAccent }]}>
              {isRylane ? '\u{1F9CD} sy is here' : '☁\uFE0F suhana is here'}
            </Text>
          </Animated.View>

          <Text style={[styles.heroTitle, { textShadowColor: glow }]}>
            {heroTitle}
          </Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </Animated.View>

        {/* Streak card */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card1Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>your streak</Text>
          <Text style={styles.bigNum}>{streakDays}</Text>
          <Text style={styles.cardLine}>{streakCopy}</Text>
          <View style={styles.divider} />
          <Text style={styles.cardSub}>
            {isRylane
              ? "streak = days you opened the room. that's it. small reps, real result."
              : 'streak = days you opened the room. soft and small. it counts \u{1F49C}'}
          </Text>
        </Animated.View>

        {/* Mood frequency bar chart */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card2Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>mood map · last 14 days</Text>
          <Text style={styles.cardLine}>{moodLine}</Text>

          {moodBars.length === 0 ? (
            <Text style={styles.empty}>
              {isRylane ? 'nothing logged. log one and come back.' : 'nothing here yet. log a mood and come back \u{1F49C}'}
            </Text>
          ) : (
            <View style={{ marginTop: 14, gap: 10 }}>
              {moodBars.map(b => (
                <View key={b.mood} style={styles.barRow}>
                  <Text style={styles.barLabel}>{b.mood}</Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${b.pct}%`, backgroundColor: b.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.barCount}>{b.count}</Text>
                </View>
              ))}
            </View>
          )}
        </Animated.View>

        {/* Reps last 7 days */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card3Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>this week · last 7 days</Text>
          <View style={styles.statGrid}>
            <Stat label="journals" value={counts7.journals} accent={accent} />
            <Stat label="voice bips" value={counts7.voice} accent={accent} />
            <Stat label="circle drops" value={counts7.circle} accent={accent} />
            <Stat label="mood logs" value={counts7.moods} accent={accent} />
          </View>
          <Text style={styles.cardSub}>
            {isRylane
              ? "the reps don't need to be huge. they need to be yours."
              : 'small steps stack \u{1F49C} look at all that softness.'}
          </Text>
        </Animated.View>

        {/* Lifetime totals + 30 day */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card4Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>all time · the receipts</Text>
          <View style={styles.statGrid}>
            <Stat label="total reps" value={totalReps} accent={accent} />
            <Stat label="30d journals" value={counts30.journals} accent={accent} />
            <Stat label="30d voice" value={counts30.voice} accent={accent} />
            <Stat label="30d circle" value={counts30.circle} accent={accent} />
          </View>
          <Text style={styles.cardSub}>
            {isRylane
              ? "numbers are not the point. they're proof the point is working."
              : "these aren't scores. they're soft proof you showed up \u{1F49C}"}
          </Text>

          <TouchableOpacity
            style={[styles.cta, { backgroundColor: accent }]}
            onPress={() => setScreen('home')}
          >
            <Text style={styles.ctaText}>
              {isRylane ? 'back to the room →' : 'back to the room \u{1F49C}'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Scrapbook sticky note */}
        <Animated.View style={[styles.sticky, enter(noteAnim)]}>
          <Text style={styles.stickyText}>{stickyAffirmation}</Text>
          <Text style={styles.stickySig}>
            {isRylane ? '— sy' : '— suhana'}
          </Text>
        </Animated.View>

        <View style={{ height: 100 }} />
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

// ── Stat tile ────────────────────────────────────────────────────────────────
function Stat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={[styles.statNum, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg:     { flex: 1, width: '100%', height: '100%' },
  scroll: { padding: 20, paddingTop: 60, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  hero:      { alignItems: 'center', marginBottom: 22 },
  pill:      {
    borderWidth: 1, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12,
  },
  pillText:  { fontSize: 12, letterSpacing: 0.4 },
  heroTitle: {
    color: '#fff', fontSize: 28, fontWeight: '700',
    textAlign: 'center', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 },
    marginBottom: 8,
    ...(Platform.OS === 'web' ? ({ textShadow: '0 0 14px rgba(196,181,253,0.6)' } as any) : null),
  },
  heroSub:   { color: '#e9e4ff', fontSize: 14, textAlign: 'center', opacity: 0.9 },

  card: {
    borderRadius: 18, borderWidth: 1,
    padding: 18, marginBottom: 16,
  },
  cardKicker: { fontSize: 12, letterSpacing: 0.6, marginBottom: 6, textTransform: 'uppercase' },
  cardLine:   { color: '#fff', fontSize: 15, lineHeight: 22 },
  cardSub:    { color: '#cfc6e8', fontSize: 13, lineHeight: 19, marginTop: 12, fontStyle: 'italic' },
  divider:    { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  empty:      { color: '#cfc6e8', fontSize: 13, marginTop: 12, fontStyle: 'italic' },

  bigNum:    { color: '#fff', fontSize: 56, fontWeight: '700', textAlign: 'center', marginVertical: 6 },

  barRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:  { color: '#e9e4ff', width: 90, fontSize: 12 },
  barTrack:  { flex: 1, height: 14, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  barFill:   { height: '100%', borderRadius: 999 },
  barCount:  { color: '#fff', width: 28, textAlign: 'right', fontSize: 12, fontWeight: '600' },

  statGrid:  { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginHorizontal: -6 },
  statTile:  {
    width: '50%', paddingHorizontal: 6, paddingVertical: 8, alignItems: 'flex-start',
  },
  statNum:   { fontSize: 24, fontWeight: '700' },
  statLabel: { color: '#cfc6e8', fontSize: 12, marginTop: 2 },

  cta:       { borderRadius: 14, paddingVertical: 12, alignItems: 'center', marginTop: 14 },
  ctaText:   { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.3 },

  sticky: {
    backgroundColor: '#fff8e7',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    borderStyle: 'dashed',
    transform: [{ rotate: '-2deg' }],
    marginTop: 4,
    marginHorizontal: 8,
  },
  stickyText: { color: '#3b2a1a', fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  stickySig:  { color: '#7a5a2a', fontSize: 12, marginTop: 6, textAlign: 'right' },
});

// screens/ComfortStreaksScreen.tsx
// Se'kret Bip — Comfort Streaks
//
// Phase 2 build: a soft ritual tracker. Not a fitbit. The point is to give
// the user a gentle reminder that they have, in fact, been showing up for
// themselves — calm sessions, comfort sessions, voice bips, journal entries
// — and to surface their longest streak of consecutive days they used a
// comfort tool. No fire emoji. No "don't break it" pressure.
//
// Voice:
//   • Sy: "respect, you kept showing up · the streak is the work"
//   • Suhana: "look at you, soft and consistent 💜 · cozy on cozy"
//
// Pulls from comfortSessions[] — every time trackActivity() fires we log a
// session. We compute current streak, longest streak, by-type tallies, and
// a 14-day calendar dot strip.

import React, { useEffect, useMemo, useRef } from 'react';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import type { ComfortSession } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function uniqueDayKeys(sessions: ComfortSession[]): Set<number> {
  const out = new Set<number>();
  for (const s of sessions || []) {
    if (!s?.date) continue;
    const d = new Date(s.date);
    if (isNaN(d.getTime())) continue;
    out.add(startOfDay(d));
  }
  return out;
}

function computeStreaks(sessions: ComfortSession[]): { current: number; longest: number } {
  const days = uniqueDayKeys(sessions);
  if (days.size === 0) return { current: 0, longest: 0 };

  const sorted = Array.from(days).sort((a, b) => a - b);
  let longest = 1;
  let run = 1;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] === ONE_DAY) {
      run++;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  // Current: count back from today (or yesterday if today missing)
  const today = startOfDay(new Date());
  const yest  = today - ONE_DAY;
  let cursor: number;
  if (days.has(today))      cursor = today;
  else if (days.has(yest))  cursor = yest;
  else return { current: 0, longest };

  let current = 0;
  while (days.has(cursor)) {
    current++;
    cursor -= ONE_DAY;
  }
  return { current, longest };
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  t: Record<string, any>;
  mood: string;
  selectedSekret: 'rylane' | 'raylene' | string;
  comfortSessions: ComfortSession[];
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

const TYPE_META: Record<string, { label: string; emoji: string; color: string }> = {
  comfort: { label: 'comfort mode',   emoji: '\u{1F32C}\uFE0F', color: '#7dd3fc' },
  calm:    { label: 'calm me',         emoji: '\u{1F90D}',       color: '#c4b5fd' },
  voice:   { label: 'voice bip',       emoji: '\u{1F3A4}',       color: '#fbbf24' },
  journal: { label: 'write it out',    emoji: '\u{1F4D3}',       color: '#f5b8cf' },
  growth:  { label: 'growth rep',      emoji: '\u{1F331}',       color: '#86efac' },
  mood:    { label: 'mood logged',     emoji: '\u{1F4AD}',       color: '#e879a3' },
};

export function ComfortStreaksScreen({
  t, mood, selectedSekret, comfortSessions, setScreen, BottomNav,
}: Props) {
  const isRylane = selectedSekret === 'rylane';
  const tod = timeOfDay();
  const bg = getRoomBg(isRylane ? 'rylane' : 'raylene', tod);
  const glow = glowFor(mood);
  const accent = isRylane ? '#4DA3FF' : '#e879a3';
  const softAccent = isRylane ? '#b6dcff' : '#f5b8cf';
  const cardBg = isRylane ? 'rgba(10,20,40,0.82)' : 'rgba(40,15,40,0.82)';

  // ── Aggregates ─────────────────────────────────────────────────────────────
  const { current, longest } = useMemo(
    () => computeStreaks(comfortSessions),
    [comfortSessions],
  );

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const s of comfortSessions || []) {
      if (!s?.type) continue;
      m[s.type] = (m[s.type] || 0) + 1;
    }
    return m;
  }, [comfortSessions]);

  // last 14 days calendar dots (oldest -> newest)
  const calendar = useMemo(() => {
    const days = uniqueDayKeys(comfortSessions);
    const out: { key: number; label: string; hit: boolean }[] = [];
    const today = startOfDay(new Date());
    const ONE_DAY = 24 * 60 * 60 * 1000;
    for (let i = 13; i >= 0; i--) {
      const k = today - i * ONE_DAY;
      const d = new Date(k);
      out.push({
        key: k,
        label: d.toLocaleDateString([], { weekday: 'narrow' }),
        hit: days.has(k),
      });
    }
    return out;
  }, [comfortSessions]);

  const recent = useMemo(
    () => (comfortSessions || []).slice(0, 6),
    [comfortSessions],
  );

  // ── Animations ─────────────────────────────────────────────────────────────
  const heroAnim   = useRef(new Animated.Value(0)).current;
  const card1Anim  = useRef(new Animated.Value(0)).current;
  const card2Anim  = useRef(new Animated.Value(0)).current;
  const card3Anim  = useRef(new Animated.Value(0)).current;
  const card4Anim  = useRef(new Animated.Value(0)).current;
  const noteAnim   = useRef(new Animated.Value(0)).current;
  const breath     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(150, [
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
  const heroTitle = isRylane ? 'comfort streaks' : 'comfort streaks \u{1F49C}';
  const heroSub = isRylane
    ? "soft reps. consistent. that's the move."
    : 'soft on soft. cozy on cozy. you keep showing up.';

  const currentCopy =
    current <= 0
      ? (isRylane ? 'no current streak. today can start it.' : 'no current streak. today can start one \u{1F49C}')
      : current === 1
        ? (isRylane ? 'day 1. respect.' : 'day 1. proud of you \u{1F49C}')
        : (isRylane
            ? `${current} days in a row. lock in continues.`
            : `${current} days in a row \u{1F49C} look at you`);

  const longestCopy =
    longest <= 0
      ? (isRylane ? "no record yet. let's build one." : 'no record yet. soft beginnings \u{1F49C}')
      : (isRylane
          ? `your longest run: ${longest} days. legend.`
          : `your longest run: ${longest} days \u{1F49C} that's yours forever`);

  const stickyAffirmation = isRylane
    ? '“the streak is the work. not the number.”'
    : "“cozy is a discipline too. you're doing it.”";

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

          <Text style={[styles.heroTitle, { textShadowColor: glow }]}>{heroTitle}</Text>
          <Text style={styles.heroSub}>{heroSub}</Text>
        </Animated.View>

        {/* Current + longest */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card1Anim)]}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.cardKicker, { color: softAccent }]}>right now</Text>
              <Text style={styles.bigNum}>{current}</Text>
              <Text style={styles.cardLine}>{currentCopy}</Text>
            </View>
            <View style={styles.divCol} />
            <View style={styles.half}>
              <Text style={[styles.cardKicker, { color: softAccent }]}>longest</Text>
              <Text style={styles.bigNum}>{longest}</Text>
              <Text style={styles.cardLine}>{longestCopy}</Text>
            </View>
          </View>
        </Animated.View>

        {/* 14-day calendar dots */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card2Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>last 14 days</Text>
          <View style={styles.calRow}>
            {calendar.map(d => (
              <View key={d.key} style={styles.calCell}>
                <View
                  style={[
                    styles.dot,
                    d.hit
                      ? { backgroundColor: accent, borderColor: accent }
                      : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.18)' },
                  ]}
                />
                <Text style={styles.calLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.cardSub}>
            {isRylane
              ? 'each dot = a day you opened a comfort tool. simple.'
              : 'each filled dot = a day you took a soft minute for yourself \u{1F49C}'}
          </Text>
        </Animated.View>

        {/* By type */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card3Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>by ritual · all time</Text>
          <View style={{ marginTop: 8, gap: 10 }}>
            {Object.keys(TYPE_META).map(key => {
              const meta = TYPE_META[key];
              const count = typeCounts[key] || 0;
              return (
                <View key={key} style={styles.typeRow}>
                  <Text style={styles.typeEmoji}>{meta.emoji}</Text>
                  <Text style={styles.typeLabel}>{meta.label}</Text>
                  <Text style={[styles.typeCount, { color: meta.color }]}>{count}</Text>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Recent sessions */}
        <Animated.View style={[styles.card, { backgroundColor: cardBg, borderColor: softAccent }, enter(card4Anim)]}>
          <Text style={[styles.cardKicker, { color: softAccent }]}>recent rituals</Text>

          {recent.length === 0 ? (
            <Text style={styles.empty}>
              {isRylane
                ? 'no sessions logged yet. open a comfort tool and it counts.'
                : 'no sessions logged yet. open a comfort tool and it counts \u{1F49C}'}
            </Text>
          ) : (
            <View style={{ marginTop: 8, gap: 8 }}>
              {recent.map(s => {
                const meta = TYPE_META[s.type] || TYPE_META.comfort;
                return (
                  <View key={s.id} style={styles.sessionRow}>
                    <Text style={styles.sessionEmoji}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionLine}>{meta.label}</Text>
                      <Text style={styles.sessionMeta}>
                        {s.date} · {s.time}{s.mood ? `  ·  ${s.mood}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={styles.ctaRow}>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: accent, flex: 1 }]}
              onPress={() => setScreen('comfort')}
            >
              <Text style={styles.ctaText}>
                {isRylane ? 'open comfort →' : 'open comfort \u{1F49C}'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.cta, { backgroundColor: 'rgba(255,255,255,0.12)', flex: 1, borderWidth: 1, borderColor: softAccent }]}
              onPress={() => setScreen('calm')}
            >
              <Text style={styles.ctaText}>
                {isRylane ? 'open calm →' : 'open calm \u{1F49C}'}
              </Text>
            </TouchableOpacity>
          </View>
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

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg:     { flex: 1 },
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
  cardLine:   { color: '#fff', fontSize: 14, lineHeight: 20 },
  cardSub:    { color: '#cfc6e8', fontSize: 13, lineHeight: 19, marginTop: 12, fontStyle: 'italic' },
  empty:      { color: '#cfc6e8', fontSize: 13, marginTop: 12, fontStyle: 'italic' },

  row:       { flexDirection: 'row', alignItems: 'flex-start' },
  half:      { flex: 1, alignItems: 'center' },
  divCol:    { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
  bigNum:    { color: '#fff', fontSize: 48, fontWeight: '700', textAlign: 'center', marginVertical: 4 },

  calRow:    { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  calCell:   { alignItems: 'center', gap: 4 },
  dot:       { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  calLabel:  { color: '#cfc6e8', fontSize: 10 },

  typeRow:   { flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  typeLabel: { color: '#e9e4ff', fontSize: 14, flex: 1 },
  typeCount: { fontSize: 16, fontWeight: '700' },

  sessionRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  sessionEmoji:{ fontSize: 18, width: 24, textAlign: 'center' },
  sessionLine: { color: '#fff', fontSize: 14, fontWeight: '600' },
  sessionMeta: { color: '#cfc6e8', fontSize: 12, marginTop: 2 },

  ctaRow:    { flexDirection: 'row', gap: 10, marginTop: 16 },
  cta:       { borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  ctaText:   { color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 0.3 },

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

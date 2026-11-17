// screens/InsightsScreen.tsx
// Side-aware insights dashboard.
// Teen: personal growth patterns — mood log, streak, journal count, growth areas.
// Parent: their own engagement in Bip — connection quality, notes, milestones.
// Privacy: teen insights are private to the teen. Parent sees only their own data.

import React, { useRef, useEffect, useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { fetchParentEngagement, ParentEngagement } from '@/utils/sync';

// ─── Teen static insight data (real data would come from local storage / sync) ─
const MOOD_HISTORY = [
  { label: 'calm',      emoji: '😌', count: 8  },
  { label: 'happy',     emoji: '😊', count: 6  },
  { label: 'tired',     emoji: '😴', count: 5  },
  { label: 'okay',      emoji: '🤍', count: 4  },
  { label: 'emotional', emoji: '🥺', count: 3  },
  { label: 'stressed',  emoji: '🤯', count: 2  },
];
const TEEN_GROWTH_AREAS = [
  { emoji: '🧠', label: 'Mindset',     visited: true  },
  { emoji: '🕊️', label: 'Confidence',  visited: true  },
  { emoji: '🌙', label: 'Calm',        visited: true  },
  { emoji: '📝', label: 'Journalling', visited: false },
  { emoji: '🩸', label: 'Womanhood',   visited: false },
  { emoji: '🪱', label: 'Manhood',     visited: false },
];

const TEEN_STATS = [
  { label: 'journal entries', value: 14,   emoji: '📝' },
  { label: 'mood check-ins',  value: 28,   emoji: '🌡️' },
  { label: 'calm sessions',   value: 7,    emoji: '🌙' },
  { label: 'day streak',      value: 12,   emoji: '🔥' },
];

// ─── Parent milestone list (same as Bippin2Screen parent view) ─────────────────
const PARENT_MILESTONES: Array<{
  id: string; emoji: string; label: string; sub: string;
  check: (e: ParentEngagement) => boolean;
}> = [
  { id: 'first_note',     emoji: '💜', label: 'First Warm Note',   sub: 'You reached out.',            check: e => e.notesSent >= 1   },
  { id: 'tip_explorer',   emoji: '📖', label: 'Tip Explorer',      sub: 'Read 3+ tips.',               check: e => e.tipsRead >= 3    },
  { id: 'notes_five',     emoji: '✉️', label: 'Regular Voice',     sub: '5 notes sent.',               check: e => e.notesSent >= 5   },
  { id: 'bridge_builder', emoji: '🌉', label: 'Bridge Builder',    sub: 'Used the Bridge.',            check: e => e.bridgeUsed       },
  { id: 'week_presence',  emoji: '🌿', label: '7-Day Presence',    sub: '7 days in a row.',            check: e => e.daysActive >= 7  },
  { id: 'month_connected',emoji: '🤝', label: '30-Day Connected',  sub: 'A month of staying close.',  check: e => e.daysActive >= 30 },
];

// Connection quality score 0–100 from engagement
function connectionScore(e: ParentEngagement): number {
  let score = 0;
  if (e.notesSent >= 1)  score += 20;
  if (e.notesSent >= 5)  score += 15;
  if (e.daysActive >= 7) score += 20;
  if (e.daysActive >= 14) score += 15;
  if (e.bridgeUsed)      score += 20;
  if (e.tipsRead >= 3)   score += 10;
  return Math.min(score, 100);
}

interface InsightsScreenProps {
  side: 'teen' | 'parent';
  mood?: string;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
}

export function InsightsScreen({ side, mood, setScreen, BottomNav }: InsightsScreenProps) {
  const [engagement, setEngagement] = useState<ParentEngagement>({
    notesSent: 0, tipsRead: 0, daysActive: 0, bridgeUsed: false,
  });

  const fade1  = useRef(new Animated.Value(0)).current;
  const fade2  = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;
  const bar    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const s = (v: Animated.Value, d: number) =>
      Animated.timing(v, { toValue: 1, duration: 420, delay: d, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([s(fade1, 0), s(fade2, 240)]).start();

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();

    if (side === 'parent') {
      fetchParentEngagement().then(data => {
        if (data) {
          setEngagement(data);
          Animated.timing(bar, {
            toValue: connectionScore(data) / 100,
            duration: 900,
            delay: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
          }).start();
        }
      });
    } else {
      Animated.timing(bar, {
        toValue: 0.72,
        duration: 900,
        delay: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }

    return () => loop.stop();
  }, [fade1, fade2, breath, bar, side]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const slide = (v: Animated.Value) => ({
    opacity: v,
    transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const accent = side === 'parent' ? '#a78bfa' : '#c4b5fd';
  const soft   = side === 'parent' ? '#ede9fe' : '#e9defc';
  const bg1    = side === 'parent' ? '#100826' : '#0e0820';
  const bg2    = side === 'parent' ? '#1a0d3a' : '#1a0d3a';

  // ── Teen view ──────────────────────────────────────────────────────────────
  if (side === 'teen') {
    const topMood = MOOD_HISTORY[0];
    const totalMoods = MOOD_HISTORY.reduce((s, m) => s + m.count, 0);

    return (
      <View style={st.root}>
        <AmbientWeatherOverlay />
        <LinearGradient colors={[bg1, bg2]} style={StyleSheet.absoluteFill} />

        <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
          <Animated.View style={slide(fade1)}>
            <Text style={[st.title, { color: accent }]}>Insights 🔍</Text>
            <Text style={[st.sub, { color: soft }]}>
              your patterns. private. just for you.
            </Text>
          </Animated.View>

          {/* Stat pills */}
          <Animated.View style={[slide(fade1), st.statsGrid]}>
            {TEEN_STATS.map(s => (
              <View key={s.label} style={[st.statPill, { borderColor: accent + '55' }]}>
                <Text style={st.statEmoji}>{s.emoji}</Text>
                <Animated.Text style={[st.statNum, { color: accent, transform: [{ scale: breathScale }] }]}>
                  {s.value}
                </Animated.Text>
                <Text style={[st.statLabel, { color: soft + 'aa' }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Mood breakdown */}
          <Animated.View style={[slide(fade2), st.card, { borderColor: accent + '44' }]}>
            <Text style={[st.cardTitle, { color: accent }]}>mood log {topMood.emoji}</Text>
            <Text style={[st.cardSub, { color: soft + 'aa' }]}>{totalMoods} check-ins logged</Text>
            {MOOD_HISTORY.map(m => (
              <View key={m.label} style={st.moodRow}>
                <Text style={st.moodEmoji}>{m.emoji}</Text>
                <Text style={[st.moodLabel, { color: soft }]}>{m.label}</Text>
                <View style={st.moodBarOuter}>
                  <View style={[st.moodBarInner, {
                    width: `${(m.count / MOOD_HISTORY[0].count) * 100}%` as any,
                    backgroundColor: accent,
                  }]} />
                </View>
                <Text style={[st.moodCount, { color: soft + '88' }]}>{m.count}</Text>
              </View>
            ))}
          </Animated.View>

          {/* Growth areas */}
          <Animated.View style={[slide(fade2), st.card, { borderColor: accent + '44' }]}>
            <Text style={[st.cardTitle, { color: accent }]}>growth areas visited</Text>
            <View style={st.areaGrid}>
              {TEEN_GROWTH_AREAS.map(a => (
                <View key={a.label} style={[st.areaChip, {
                  borderColor: a.visited ? accent + '88' : soft + '22',
                  opacity: a.visited ? 1 : 0.4,
                }]}>
                  <Text style={{ fontSize: 18 }}>{a.emoji}</Text>
                  <Text style={[st.areaLabel, { color: a.visited ? soft : soft + '66' }]}>{a.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Streak note */}
          <Animated.View style={[slide(fade2), st.streakCard, { borderColor: accent + '55', transform: [{ scale: breathScale }] }]}>
            <Text style={{ fontSize: 32, textAlign: 'center', marginBottom: 6 }}>🔥</Text>
            <Text style={[st.streakNum, { color: accent }]}>12-day streak</Text>
            <Text style={[st.streakSub, { color: soft }]}>you keep showing up. that's everything.</Text>
          </Animated.View>

          <TouchableOpacity style={[st.ghostBtn, { borderColor: accent + '44' }]} onPress={() => setScreen('home')}>
            <Text style={[st.ghostBtnText, { color: soft + 'aa' }]}>{'<- back'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {BottomNav}
      </View>
    );
  }

  // ── Parent view ─────────────────────────────────────────────────────────────
  const achieved = PARENT_MILESTONES.filter(m => m.check(engagement)).length;
  const score    = connectionScore(engagement);

  return (
    <View style={st.root}>
      <AmbientWeatherOverlay />
      <LinearGradient colors={[bg1, bg2]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={st.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={slide(fade1)}>
          <Text style={[st.title, { color: accent }]}>Your Insights 🌿</Text>
          <Text style={[st.sub, { color: soft }]}>
            how you're showing up in Bip. all yours.
          </Text>
        </Animated.View>

        {/* Connection quality bar */}
        <Animated.View style={[slide(fade1), st.card, { borderColor: accent + '44' }]}>
          <Text style={[st.cardTitle, { color: accent }]}>connection quality</Text>
          <View style={st.qualityBarOuter}>
            <Animated.View style={[st.qualityBarInner, {
              width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: score >= 70 ? '#6ee7b7' : score >= 40 ? accent : '#fcd34d',
            }]} />
          </View>
          <Text style={[st.qualityScore, { color: soft }]}>
            {score}% — {score >= 70 ? 'strong presence' : score >= 40 ? 'building connection' : 'just getting started'}
          </Text>
          <Text style={[st.cardSub, { color: soft + '88' }]}>
            based on your notes, days active, and Bridge usage
          </Text>
        </Animated.View>

        {/* Stats */}
        <Animated.View style={[slide(fade1), st.statsGrid]}>
          {[
            { emoji: '✉️', num: engagement.notesSent, label: 'notes sent',   color: accent       },
            { emoji: '🌿', num: engagement.daysActive, label: 'days active', color: '#6ee7b7'    },
            { emoji: '🏅', num: `${achieved}/${PARENT_MILESTONES.length}`, label: 'milestones', color: '#fcd34d' },
          ].map(s => (
            <View key={s.label} style={[st.statPill, { borderColor: s.color + '55' }]}>
              <Text style={st.statEmoji}>{s.emoji}</Text>
              <Animated.Text style={[st.statNum, { color: s.color, transform: [{ scale: breathScale }] }]}>
                {s.num}
              </Animated.Text>
              <Text style={[st.statLabel, { color: soft + 'aa' }]}>{s.label}</Text>
            </View>
          ))}
        </Animated.View>

        {/* Milestones */}
        <Animated.View style={[slide(fade2), st.card, { borderColor: accent + '44' }]}>
          <Text style={[st.cardTitle, { color: accent }]}>milestones</Text>
          {PARENT_MILESTONES.map(m => {
            const done = m.check(engagement);
            return (
              <View key={m.id} style={[st.milestoneRow, { opacity: done ? 1 : 0.38 }]}>
                <Animated.Text style={[{ fontSize: 20 }, done && { transform: [{ scale: breathScale }] }]}>
                  {m.emoji}
                </Animated.Text>
                <View style={{ flex: 1 }}>
                  <Text style={[st.milestoneLabel, { color: done ? '#fff' : soft + '77' }]}>{m.label}</Text>
                  <Text style={[st.milestoneSub, { color: soft + '66' }]}>{m.sub}</Text>
                </View>
                {done && <Text style={{ fontSize: 11, fontWeight: '700', color: '#6ee7b7' }}>done</Text>}
              </View>
            );
          })}
        </Animated.View>

        <TouchableOpacity style={[st.ghostBtn, { borderColor: accent + '44' }]} onPress={() => setScreen('home')}>
          <Text style={[st.ghostBtnText, { color: soft + 'aa' }]}>{'<- back'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {BottomNav}
    </View>
  );
}

const st = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#0e0820' },
  scroll:        { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  title:         { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  sub:           { fontSize: 13, lineHeight: 20, marginBottom: 20 },
  statsGrid:     { flexDirection: 'row', gap: 10, marginBottom: 18, flexWrap: 'wrap' },
  statPill:      { flex: 1, minWidth: 80, backgroundColor: 'rgba(40,20,70,0.82)', borderWidth: 1, borderRadius: 16, padding: 14, alignItems: 'center', gap: 4 },
  statEmoji:     { fontSize: 20 },
  statNum:       { fontSize: 24, fontWeight: '800' },
  statLabel:     { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  card:          { backgroundColor: 'rgba(40,20,70,0.78)', borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 14 },
  cardTitle:     { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  cardSub:       { fontSize: 12, marginTop: 6, fontStyle: 'italic' },
  moodRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  moodEmoji:     { fontSize: 16, width: 22 },
  moodLabel:     { fontSize: 12, width: 72, fontWeight: '600', textTransform: 'capitalize' },
  moodBarOuter:  { flex: 1, height: 8, backgroundColor: 'rgba(20,10,40,0.8)', borderRadius: 4, overflow: 'hidden' },
  moodBarInner:  { height: '100%', borderRadius: 4 },
  moodCount:     { fontSize: 11, width: 20, textAlign: 'right' },
  areaGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  areaChip:      { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(20,10,40,0.6)', borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  areaLabel:     { fontSize: 12, fontWeight: '600' },
  streakCard:    { backgroundColor: 'rgba(40,20,70,0.78)', borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center', marginBottom: 14 },
  streakNum:     { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  streakSub:     { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  qualityBarOuter: { height: 12, backgroundColor: 'rgba(20,10,40,0.8)', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  qualityBarInner: { height: '100%', borderRadius: 6 },
  qualityScore:    { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  milestoneRow:  { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  milestoneLabel:{ fontSize: 13, fontWeight: '700', marginBottom: 1 },
  milestoneSub:  { fontSize: 11, lineHeight: 16 },
  ghostBtn:      { borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', marginTop: 8 },
  ghostBtnText:  { fontSize: 14, fontWeight: '600' },
});

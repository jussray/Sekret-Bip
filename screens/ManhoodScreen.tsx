// screens/ManhoodScreen.tsx
// Se'kret Bip — Bippin 2: Manhood Dashboard (Sy-led)
// Layout matches the Manhood mockup:
//   Hero → Greeting + Streak → Quick Access Grid →
//   Energy + Sleep cards → Quick Tip → Mood Check-In →
//   Goal Tracker → BIP FLOW steps

import React, { useState, useMemo } from 'react';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg, type TimeOfDay } from '../constants/theme';
import { glowForMood } from '../constants/moodGlow';

function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

interface ManhoodScreenProps {
  t:              Record<string, any>;
  setScreen:      (screen: string) => void;
  BottomNav:      React.ReactNode;
  mood?:          string;
  selectedSekret?: string;
  streakDays?:    number;
}

const glowFor = (mood?: string) => glowForMood(mood, '#4DA3FF');

function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

const QUICK_ACCESS = [
  { emoji: '⚡', label: 'puberty\nguide',         target: null },
  { emoji: '💪', label: 'body\nchanges',           target: null },
  { emoji: '⭐', label: 'confidence\nboost',       target: null },
  { emoji: '🧼', label: 'hygiene +\nself-care',   target: null },
  { emoji: '🧠', label: 'mind\ncheck-in',          target: 'sekret' },
  { emoji: '📔', label: 'private\njournal',        target: 'pages' },
];

const MOOD_CHECK = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😌', label: 'calm' },
  { emoji: '😤', label: 'stressed' },
  { emoji: '😠', label: 'angry' },
  { emoji: '😴', label: 'tired' },
  { emoji: '😶', label: 'okay' },
];

const BIP_FLOW = [
  { emoji: '⚡',  step: 'notice',   sub: "what's up" },
  { emoji: '📔',  step: 'name it',  sub: 'be honest' },
  { emoji: '🔄',  step: 'reset',    sub: 'refocus' },
  { emoji: '🌊',  step: 'release',  sub: 'clear it out' },
  { emoji: '🏆',  step: 'grow',     sub: 'level up' },
];

const TIPS = [
  "Small habits. Big future. Stay focused, stay you.",
  "Consistency beats motivation every time.",
  "Rest is part of the plan, not a setback.",
  "Who you're becoming matters more than what you look like.",
];

export function ManhoodScreen({
  t, setScreen, BottomNav, mood, selectedSekret, streakDays = 0,
}: ManhoodScreenProps) {
  const glow = useMemo(() => glowFor(mood), [mood]);
  const greeting = timeGreeting();
  const time = useMemo(() => timeOfDay(), []);
  const bgSource = useMemo(() => getRoomBg('rylane', time), [time]);
  const [checkedMood, setCheckedMood] = useState<string | null>(null);
  const [tipIdx] = useState(() => Math.floor(Math.random() * TIPS.length));

  const cardBg = 'rgba(8,18,40,0.90)';
  const card = [styles.card, { backgroundColor: cardBg, borderColor: glow + '55' }];
  const cardHalf = [styles.cardHalf, { backgroundColor: cardBg, borderColor: glow + '44' }];

  return (
    <View style={styles.root}>
      <ImageBackground
        source={bgSource}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["rgba(5,10,25,0.25)", "rgba(5,10,30,0.82)", "rgba(3,6,18,0.97)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Bippin 2{"\n"}Manhood ⚡</Text>
          <Text style={styles.heroSub}>growing into yourself. 💙</Text>
        </View>

        {/* ── GREETING + STREAK ── */}
        <View style={styles.row}>
          <View style={[cardHalf, { flex: 1.6 }]}>
            <Text style={styles.greetLabel}>{greeting}, Sy ⚡</Text>
            <Text style={styles.greetBody}>
              Keep building the best{"\n"}version of you.{"\n"}You've got this.
            </Text>
          </View>
          <View style={[cardHalf, { flex: 1, alignItems: 'center' }]}>
            <Text style={{ fontSize: 26 }}>🔥</Text>
            <Text style={[styles.streakNum, { color: glow }]}>
              {streakDays > 0 ? streakDays : "💙"}
            </Text>
            {streakDays > 0
              ? <Text style={styles.streakSub}>day streak{"\n"}consistency builds confidence</Text>
              : <Text style={styles.streakSub}>proud of you{"\n"}seriously.</Text>
            }
          </View>
        </View>

        {/* ── QUICK ACCESS GRID ── */}
        <View style={styles.gridRow}>
          {QUICK_ACCESS.map(item => (
            <TouchableOpacity
              key={item.label}
              style={[styles.gridItem, { borderColor: glow + '44' }]}
              onPress={() => item.target && setScreen(item.target)}
              activeOpacity={0.75}
            >
              <Text style={styles.gridEmoji}>{item.emoji}</Text>
              <Text style={styles.gridLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── ENERGY + SLEEP CARDS ── */}
        <View style={styles.row}>
          <TouchableOpacity style={[cardHalf, { flex: 1 }]} onPress={() => setScreen('sekret')}>
            <Text style={[styles.cardTitle, { color: glow }]}>energy check-in</Text>
            <Text style={styles.cardBody}>How are you feeling right now?</Text>
            <View style={[styles.energyBar, { borderColor: glow }]}>
              <View style={[styles.energyFill, { backgroundColor: glow, width: '72%' }]} />
            </View>
            <Text style={[styles.cardLink, { color: glow }]}>check in →</Text>
          </TouchableOpacity>

          <View style={[cardHalf, { flex: 1 }]}>
            <Text style={[styles.cardTitle, { color: glow }]}>sleep tracker</Text>
            <Text style={styles.cardBody}>How'd you sleep?</Text>
            <Text style={{ fontSize: 30, marginBottom: 4 }}>🌙</Text>
            <Text style={[styles.cardLink, { color: glow }]}>track sleep →</Text>
          </View>
        </View>

        {/* ── QUICK TIP ── */}
        <View style={card}>
          <Text style={[styles.cardTitle, { color: glow }]}>quick tip ⚡</Text>
          <Text style={styles.cardBody}>{TIPS[tipIdx]}</Text>
          <TouchableOpacity onPress={() => setScreen('growth')}>
            <Text style={[styles.cardLink, { color: glow }]}>more tips →</Text>
          </TouchableOpacity>
        </View>

        {/* ── MOOD CHECK-IN ── */}
        <View style={card}>
          <Text style={[styles.cardTitle, { color: glow }]}>mood check-in</Text>
          <Text style={styles.cardBody}>How are you feeling right now?</Text>
          <View style={styles.moodRow}>
            {MOOD_CHECK.map(({ emoji, label }) => (
              <TouchableOpacity
                key={label}
                style={[
                  styles.moodBtn,
                  checkedMood === label && { backgroundColor: glow + '33', borderColor: glow },
                ]}
                onPress={() => setCheckedMood(label)}
              >
                <Text style={styles.moodEmoji}>{emoji}</Text>
                <Text style={styles.moodLabel}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── GOAL TRACKER ── */}
        <TouchableOpacity style={card} onPress={() => setScreen('growth')}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: glow }]}>goal tracker 🎯</Text>
              <Text style={styles.cardBody}>Track your goals and level up. every day.</Text>
              <Text style={[styles.cardLink, { color: glow }]}>view goals →</Text>
            </View>
            <Text style={{ fontSize: 40, marginLeft: 10 }}>🎯</Text>
          </View>
        </TouchableOpacity>

        {/* ── BIP FLOW ── */}
        <View style={card}>
          <Text style={[styles.cardTitle, { color: glow }]}>BIP FLOW ⚡</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.flowRow}>
              {BIP_FLOW.map((item, i) => (
                <View key={item.step} style={styles.flowItem}>
                  <View style={[styles.flowCircle, { borderColor: glow }]}>
                    <Text style={styles.flowEmoji}>{item.emoji}</Text>
                  </View>
                  <Text style={[styles.flowStep, { color: glow }]}>{item.step}</Text>
                  <Text style={styles.flowSub}>{item.sub}</Text>
                  {i < BIP_FLOW.length - 1 && (
                    <Text style={[styles.flowArrow, { color: glow }]}>→</Text>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {BottomNav}
    </View>
  );
}

const styles = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#030612' },
  container: { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 16, paddingBottom: 100 },

  hero:      { marginBottom: 18, paddingTop: 8 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38, marginBottom: 6 },
  heroSub:   { fontSize: 15, color: '#a8d4ff', fontStyle: 'italic' },

  row:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  rowBetween:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  card:      { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHalf:  { borderRadius: 18, borderWidth: 1, padding: 14 },

  greetLabel:{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  greetBody: { fontSize: 13, color: '#c8deff', lineHeight: 19 },

  streakNum: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  streakSub: { fontSize: 11, color: '#b0c8e8', textAlign: 'center', lineHeight: 16, marginTop: 4 },

  gridRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridItem:  { width: '30%', backgroundColor: 'rgba(10,20,50,0.85)', borderWidth: 1, borderRadius: 16, padding: 10, alignItems: 'center' },
  gridEmoji: { fontSize: 24, marginBottom: 4 },
  gridLabel: { fontSize: 10, color: '#c8deff', textAlign: 'center', lineHeight: 14 },

  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardBody:  { fontSize: 13, color: '#c8deff', lineHeight: 19, marginBottom: 8 },
  cardLink:  { fontSize: 13, fontWeight: '700' },

  energyBar: { height: 10, borderRadius: 5, borderWidth: 1, backgroundColor: 'rgba(20,40,80,0.5)', marginBottom: 10, overflow: 'hidden' },
  energyFill:{ height: '100%', borderRadius: 5 },

  moodRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  moodBtn:   { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(100,150,220,0.3)', backgroundColor: 'rgba(10,25,60,0.5)' },
  moodEmoji: { fontSize: 22, marginBottom: 3 },
  moodLabel: { fontSize: 10, color: '#b0c8e8' },

  flowRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  flowItem:  { alignItems: 'center', marginRight: 6, width: 60, position: 'relative' },
  flowCircle:{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: 'rgba(10,25,60,0.6)' },
  flowEmoji: { fontSize: 20 },
  flowStep:  { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  flowSub:   { fontSize: 10, color: '#b0c8e8', textAlign: 'center', lineHeight: 13 },
  flowArrow: { position: 'absolute', right: -10, top: 14, fontSize: 16 },
});

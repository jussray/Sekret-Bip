// screens/WomanhoodScreen.tsx
// Se'kret Bip — Bippin 2: Womanhood Dashboard (Suhana-led)
// Layout matches the Womanhood mockup:
//   Hero → Greeting + Streak → Quick Access Grid →
//   First Period + Comfort Tip cards → Mood Check-In →
//   Cycle Calendar card → BIP FLOW steps

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

interface WomanhoodScreenProps {
  t:              Record<string, any>;
  setScreen:      (screen: string) => void;
  BottomNav:      React.ReactNode;
  mood?:          string;
  selectedSekret?: string;
  streakDays?:    number;
}

const glowFor = (mood?: string) => glowForMood(mood, '#e879a3');

function timeGreeting() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Good night';
}

const QUICK_ACCESS = [
  { emoji: '🩸', label: 'first period\nsupport', target: 'periodCalendar' },
  { emoji: '🌙', label: 'cycle\nwellness',       target: 'periodCalendar' },
  { emoji: '💜', label: 'mood + body\ncheck-in',  target: null },
  { emoji: '🫂', label: 'comfort\nmode',          target: 'calm' },
  { emoji: '💬', label: "ask\nse\'kret",           target: 'sekret' },
  { emoji: '📔', label: 'private\njournal',       target: 'pages' },
];

const MOOD_CHECK = [
  { emoji: '😊', label: 'happy' },
  { emoji: '😌', label: 'calm' },
  { emoji: '😴', label: 'tired' },
  { emoji: '😰', label: 'scared' },
  { emoji: '🥹', label: 'emotional' },
  { emoji: '😶', label: 'okay' },
];

const BIP_FLOW = [
  { emoji: '☁️',   step: 'notice',   sub: 'how you feel' },
  { emoji: '📔',   step: 'name it',  sub: 'be real' },
  { emoji: '🌸',   step: 'nourish',  sub: 'yourself' },
  { emoji: '💜',   step: 'release',  sub: 'let it out' },
  { emoji: '⭐',   step: 'grow',     sub: 'keep bippin' },
];

export function WomanhoodScreen({
  t, setScreen, BottomNav, mood, selectedSekret, streakDays = 0,
}: WomanhoodScreenProps) {
  const glow = useMemo(() => glowFor(mood), [mood]);
  const greeting = timeGreeting();
  const time = useMemo(() => timeOfDay(), []);
  const bgSource = useMemo(() => getRoomBg('raylene', time), [time]);
  const [checkedMood, setCheckedMood] = useState<string | null>(null);
  const [expandedPeriod, setExpandedPeriod] = useState(false);

  const cardBg = 'rgba(30,10,50,0.88)';
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
        colors={["rgba(15,5,30,0.3)", "rgba(10,3,22,0.82)", "rgba(8,2,18,0.97)"]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HERO ── */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Bippin 2{"\n"}Womanhood 💜</Text>
          <Text style={styles.heroSub}>growing at your own pace. 💜</Text>
        </View>

        {/* ── GREETING + STREAK ── */}
        <View style={styles.row}>
          <View style={[cardHalf, { flex: 1.6 }]}>
            <Text style={styles.greetLabel}>{greeting}, Suhana 💜</Text>
            <Text style={styles.greetBody}>
              Your body is changing.{"\n"}
              That's not something{"\n"}to fear or hide.
            </Text>
          </View>
          <View style={[cardHalf, { flex: 1, alignItems: 'center' }]}>
            <Text style={{ fontSize: 26 }}>🔥</Text>
            <Text style={[styles.streakNum, { color: glow }]}>
              {streakDays > 0 ? streakDays : "✨"}
            </Text>
            {streakDays > 0
              ? <Text style={styles.streakSub}>days{"\n"}you're showing up for you</Text>
              : <Text style={styles.streakSub}>you showed{"\n"}up today 💜</Text>
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

        {/* ── FEATURE CARDS ── */}
        <View style={styles.row}>
          <TouchableOpacity
            style={[cardHalf, { flex: 1 }]}
            onPress={() => setExpandedPeriod(v => !v)}
          >
            <Text style={[styles.cardTitle, { color: glow }]}>first period support</Text>
            <Text style={styles.cardBody}>
              It's okay to feel scared.{"\n"}You're not alone.
            </Text>
            {expandedPeriod && (
              <Text style={styles.cardBodyExpanded}>
                Periods are normal — a sign your body is doing its thing.
                Keep a small pouch in your bag. Track it in the Cycle Calendar
                so you're never surprised. 💜
              </Text>
            )}
            <Text style={[styles.cardLink, { color: glow }]}>
              {expandedPeriod ? "less ↑" : "learn more →"}
            </Text>
          </TouchableOpacity>

          <View style={[cardHalf, { flex: 1 }]}>
            <Text style={[styles.cardTitle, { color: glow }]}>comfort tip</Text>
            <Text style={styles.cardBody}>
              Use warmth for cramps, drink water, rest, and be gentle with yourself.
            </Text>
            <TouchableOpacity onPress={() => setScreen('calm')}>
              <Text style={[styles.cardLink, { color: glow }]}>more tips →</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── MOOD CHECK-IN ── */}
        <View style={card}>
          <Text style={[styles.cardTitle, { color: glow }]}>mood check-in 💜</Text>
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

        {/* ── CYCLE CALENDAR ── */}
        <TouchableOpacity style={card} onPress={() => setScreen('periodCalendar')}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: glow }]}>cycle calendar 🌙</Text>
              <Text style={styles.cardBody}>
                Track your cycle with ease and privacy.
              </Text>
              <Text style={[styles.cardLink, { color: glow }]}>view calendar →</Text>
            </View>
            <Text style={{ fontSize: 40, marginLeft: 10 }}>📅</Text>
          </View>
        </TouchableOpacity>

        {/* ── BIP FLOW ── */}
        <View style={card}>
          <Text style={[styles.cardTitle, { color: glow }]}>BIP FLOW 💜</Text>
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
  root:      { flex: 1, backgroundColor: '#0d0518' },
  container: { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 56 : 36, paddingHorizontal: 16, paddingBottom: 100 },

  hero:      { marginBottom: 18, paddingTop: 8 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#fff', lineHeight: 38, marginBottom: 6 },
  heroSub:   { fontSize: 15, color: '#e9b8e8', fontStyle: 'italic' },

  row:       { flexDirection: 'row', gap: 10, marginBottom: 12 },
  rowBetween:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  card:      { borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHalf:  { borderRadius: 18, borderWidth: 1, padding: 14 },

  greetLabel:{ fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 6 },
  greetBody: { fontSize: 13, color: '#e9defc', lineHeight: 19 },

  streakNum: { fontSize: 28, fontWeight: '900', marginTop: 4 },
  streakSub: { fontSize: 11, color: '#d8c3f5', textAlign: 'center', lineHeight: 16, marginTop: 4 },

  gridRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  gridItem:  { width: '30%', backgroundColor: 'rgba(30,10,50,0.8)', borderWidth: 1, borderRadius: 16, padding: 10, alignItems: 'center' },
  gridEmoji: { fontSize: 24, marginBottom: 4 },
  gridLabel: { fontSize: 10, color: '#e9defc', textAlign: 'center', lineHeight: 14 },

  cardTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  cardBody:  { fontSize: 13, color: '#e9defc', lineHeight: 19, marginBottom: 8 },
  cardBodyExpanded: { fontSize: 12, color: '#c4b5fd', lineHeight: 18, marginBottom: 8 },
  cardLink:  { fontSize: 13, fontWeight: '700' },

  moodRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  moodBtn:   { alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(200,150,255,0.3)', backgroundColor: 'rgba(50,20,80,0.5)' },
  moodEmoji: { fontSize: 22, marginBottom: 3 },
  moodLabel: { fontSize: 10, color: '#d8c3f5' },

  flowRow:   { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8 },
  flowItem:  { alignItems: 'center', marginRight: 6, width: 60, position: 'relative' },
  flowCircle:{ width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 4, backgroundColor: 'rgba(50,20,80,0.6)' },
  flowEmoji: { fontSize: 20 },
  flowStep:  { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  flowSub:   { fontSize: 10, color: '#c4b5fd', textAlign: 'center', lineHeight: 13 },
  flowArrow: { position: 'absolute', right: -10, top: 14, fontSize: 16 },
});

// screens/GrowthScreen.tsx
// Se'kret Bip — Growth (Sy-led life skills hub)
//
// Phase 2 build: separates pure "life skills" Growth from Bippin2 (which stays
// as the Womanhood/Manhood content layer). Same voice and polish patterns as
// the rest of the app: room backdrop, mood glow, stagger entrance, breath
// loop, scrapbook accents, char-aware copy.
//
// Tracks (life skills, no gendered content here):
//   • Focus / lock in
//   • Confidence / showing up
//   • Mindset / self-talk
//   • Money / basics
//   • School / handling pressure
//   • Social / talking to people
//   • Habits / small wins
//
// Tapping a track opens a quick mini-lesson card with 3 micro-actions. Hooked
// to onMilestone() so progress can count toward streaks once Supabase lands.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const GROWTH_COMPLETED_KEY = 'bip_growth_completed';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';

// ── Glow palette ─────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Tracks ───────────────────────────────────────────────────────────────────
type TrackKey =
  | 'focus' | 'confidence' | 'mindset' | 'money' | 'school' | 'social' | 'habits';

interface Track {
  key:       TrackKey;
  emoji:     string;
  title:     string;
  sub:       string;
  lesson:    string;
  micro:     string[];
  rylaneHook: string;
  rayleneHook: string;
}

const TRACKS: Track[] = [
  {
    key: 'focus',
    emoji: '🎯',
    title: 'Lock In',
    sub: 'focus when it counts',
    lesson: "focus isn't magic. it's removing the easy distractions before you start.",
    micro: [
      'Phone face down, in another room if you can.',
      'Set a 25-min timer. Just start.',
      "When you drift, come back gently. Don't shame yourself.",
    ],
    rylaneHook: "bet. lock in for 25. that's it.",
    rayleneHook: "one small block. you don't have to grind, just start.",
  },
  {
    key: 'confidence',
    emoji: '🪞',
    title: 'Show Up',
    sub: 'confidence is a verb',
    lesson: "confidence isn't feeling fearless. it's doing it scared and finding out you survive.",
    micro: [
      'Speak first in a small moment today.',
      'Walk in like you already belong (because you do).',
      'Catch one self-roast. Replace it with neutral words.',
    ],
    rylaneHook: "shoulders back. head up. that's the move.",
    rayleneHook: "you don't need permission to take up space. 💜",
  },
  {
    key: 'mindset',
    emoji: '🧠',
    title: 'Self-Talk',
    sub: 'how you speak to you',
    lesson: 'your inner voice trains your nervous system. soft is not weak. soft is precise.',
    micro: [
      'Notice one mean thought.',
      'Ask: would I say this to my friend?',
      'Rewrite it kinder. Out loud if you can.',
    ],
    rylaneHook: 'be your own coach, not your hater.',
    rayleneHook: 'talk to yourself like someone you love. 💜',
  },
  {
    key: 'money',
    emoji: '💸',
    title: 'Money Basics',
    sub: 'no shame, just skills',
    lesson: 'money is a skill, not a personality. start with awareness, not restriction.',
    micro: [
      'Write down what you spent yesterday.',
      'Name one need vs one want from this week.',
      'Save anything. $1 counts.',
    ],
    rylaneHook: "know where every dollar going. that's power.",
    rayleneHook: "small habits stack. you don't need it perfect 💜",
  },
  {
    key: 'school',
    emoji: '📚',
    title: 'School Pressure',
    sub: 'when it feels like a lot',
    lesson: "pressure isn't proof you're failing. it's proof you care. break it down.",
    micro: [
      'Write the next 3 things. Not all of it.',
      'Pick the easiest one. Start there.',
      'Drink water. Sit up. Try again.',
    ],
    rylaneHook: "don't fight everything. pick one.",
    rayleneHook: "one task at a time. you're doing more than you think 💜",
  },
  {
    key: 'social',
    emoji: '🫂',
    title: 'Talking To People',
    sub: 'low-pressure social',
    lesson: 'people remember how you made them feel, not your perfect sentence. be curious, not impressive.',
    micro: [
      'Ask one real question today.',
      "Listen for the answer (don't plan your reply).",
      'Say something kind without expecting anything back.',
    ],
    rylaneHook: "don't try to win the convo. just be there.",
    rayleneHook: "you don't have to be on. just present 💜",
  },
  {
    key: 'habits',
    emoji: '🌱',
    title: 'Small Wins',
    sub: 'tiny daily proof',
    lesson: 'identity follows action. one bed made, one glass of water, one walk = you said yes to yourself.',
    micro: [
      'Make your bed in under 60 seconds.',
      'Drink one full glass of water.',
      'Step outside for 2 minutes.',
    ],
    rylaneHook: "small wins. stack 'em. respect.",
    rayleneHook: "kindness counts when it's for you too 💜",
  },
];

// ── Props ────────────────────────────────────────────────────────────────────
interface GrowthScreenProps {
  t:               Record<string, any>;
  mood:            string;
  selectedSekret:  string;
  setScreen:       (s: string) => void;
  BottomNav:       React.ReactNode;
  onMilestone?:    () => void;
  streakDays?:     number;
}

export function GrowthScreen({
  t, mood, selectedSekret, setScreen, BottomNav, onMilestone, streakDays = 0,
}: GrowthScreenProps) {

  const isRylane = selectedSekret === 'rylane';
  const charKey: 'raylene' | 'rylane' = isRylane ? 'rylane' : 'raylene';
  const charName = isRylane ? 'Sy' : 'Suhana';

  const time     = useMemo(() => timeOfDay(), []);
  const bgSource = useMemo(() => getRoomBg(charKey, time), [charKey, time]);
  const glow     = useMemo(() => glowFor(mood), [mood]);

  const [openKey, setOpenKey] = useState<TrackKey | null>(null);
  const [completed, setCompleted] = useState<Record<TrackKey, boolean>>({
    focus: false, confidence: false, mindset: false,
    money: false, school: false, social: false, habits: false,
  });

  useEffect(() => {
    AsyncStorage.getItem(GROWTH_COMPLETED_KEY).then(raw => {
      if (!raw) return;
      try {
        const keys = JSON.parse(raw) as TrackKey[];
        setCompleted(prev => {
          const next = { ...prev };
          keys.forEach(k => { if (k in next) next[k] = true; });
          return next;
        });
      } catch {}
    });
  }, []);

  // ── Animations ──────────────────────────────────────────────────────────
  const fadeHero   = useRef(new Animated.Value(0)).current;
  const fadeStreak = useRef(new Animated.Value(0)).current;
  const fadeGrid   = useRef(new Animated.Value(0)).current;
  const fadeNote   = useRef(new Animated.Value(0)).current;
  const transHero   = useRef(new Animated.Value(10)).current;
  const transStreak = useRef(new Animated.Value(10)).current;
  const transGrid   = useRef(new Animated.Value(10)).current;
  const transNote   = useRef(new Animated.Value(10)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (op: Animated.Value, tr: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(tr, { toValue: 0, duration: 400, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]);
    Animated.parallel([
      stagger(fadeHero,   transHero,   0),
      stagger(fadeStreak, transStreak, 160),
      stagger(fadeGrid,   transGrid,   320),
      stagger(fadeNote,   transNote,   460),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breath, { toValue: 0, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1,    1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1   ] });

  const markComplete = (key: TrackKey) => {
    setCompleted(prev => {
      const next = { ...prev, [key]: true };
      const done = (Object.keys(next) as TrackKey[]).filter(k => next[k]);
      AsyncStorage.setItem(GROWTH_COMPLETED_KEY, JSON.stringify(done)).catch(() => {});
      return next;
    });
    onMilestone?.();
  };

  const heroTitle = isRylane ? 'Growth 🪱' : 'Growth 🌱';
  const heroSub   = isRylane
    ? 'real life skills. small reps. keep building.'
    : "real life skills. soft pace. you're doing it.";
  const cloudLine = isRylane
    ? "pick one. don't overthink it. lock in."
    : 'pick what feels light today. nothing is required 💜';
  const streakLabel = isRylane ? 'reps streak' : 'showing up streak';
  const streakNote  = isRylane ? 'respect, fr.' : 'proud of you 💜';

  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header chips */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setScreen('home')}>
            <Text style={styles.backChipText}>🛡 room</Text>
          </TouchableOpacity>
          <View style={[styles.privateBadge, { borderColor: glow + '66' }]}>
            <Text style={styles.privateBadgeText}>🔒 just you</Text>
          </View>
        </View>

        {/* Hero */}
        <Animated.View style={{ opacity: fadeHero, transform: [{ translateY: transHero }] }}>
          <Text style={[styles.title, { color: glow }]}>{heroTitle}</Text>
          <Text style={styles.subtitle}>{heroSub}</Text>

          <Animated.View style={[
            styles.companion,
            { backgroundColor: 'rgba(30,18,55,0.78)', borderColor: glow + '88', shadowColor: glow,
              opacity: breathOpacity, transform: [{ scale: breathScale }] },
          ]}>
            <Text style={styles.companionText}>
              {isRylane ? '⚡' : '💜'}  {charName} is here, no pressure
            </Text>
          </Animated.View>

          {/* Cloud bubble */}
          <View style={styles.cloudRow}>
            <Animated.Text style={[styles.cloudMascot, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}>
              ☁️
            </Animated.Text>
            <View style={[styles.cloudBubble, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '66' }]}>
              <Text style={styles.cloudText}>{cloudLine}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Streak */}
        <Animated.View style={{ opacity: fadeStreak, transform: [{ translateY: transStreak }] }}>
          <Animated.View style={[
            styles.streakCard,
            { backgroundColor: 'rgba(30,18,55,0.82)', borderColor: glow + '88', shadowColor: glow,
              transform: [{ scale: breathScale }] },
          ]}>
            <Text style={[styles.streakLabel, { color: glow }]}>{streakLabel}</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakFlame}>{isRylane ? '🪱' : '🫀'}</Text>
              <Text style={styles.streakDays}>{streakDays} days</Text>
            </View>
            <Text style={styles.streakNote}>{streakNote}</Text>
          </Animated.View>
        </Animated.View>

        {/* Tracks grid */}
        <Animated.View style={{ opacity: fadeGrid, transform: [{ translateY: transGrid }] }}>
          <Text style={styles.sectionTitle}>tracks</Text>
          <View style={styles.grid}>
            {TRACKS.map(track => {
              const isOpen = openKey === track.key;
              const done   = completed[track.key];
              return (
                <View key={track.key} style={{ width: '100%' }}>
                  <TouchableOpacity
                    style={[
                      styles.trackCard,
                      {
                        backgroundColor: isOpen ? 'rgba(30,18,55,0.92)' : 'rgba(30,18,55,0.78)',
                        borderColor: (done ? '#86efac' : glow) + (isOpen ? 'cc' : '88'),
                        shadowColor: done ? '#86efac' : glow,
                      },
                    ]}
                    onPress={() => setOpenKey(isOpen ? null : track.key)}
                  >
                    <View style={styles.trackHeaderRow}>
                      <Text style={styles.trackEmoji}>{track.emoji}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.trackTitle}>{track.title}{done ? ' ✓' : ''}</Text>
                        <Text style={styles.trackSub}>{track.sub}</Text>
                      </View>
                      <Text style={styles.chev}>{isOpen ? '▾' : '▸'}</Text>
                    </View>

                    {isOpen ? (
                      <View style={styles.trackBody}>
                        <Text style={styles.trackLesson}>{track.lesson}</Text>
                        <Text style={[styles.trackHook, { color: glow }]}>
                          {isRylane ? track.rylaneHook : track.rayleneHook}
                        </Text>

                        <View style={styles.microList}>
                          {track.micro.map((step, i) => (
                            <View key={i} style={styles.microRow}>
                              <Text style={[styles.microBullet, { color: glow }]}>•</Text>
                              <Text style={styles.microText}>{step}</Text>
                            </View>
                          ))}
                        </View>

                        <TouchableOpacity
                          style={[styles.doneBtn, { backgroundColor: done ? '#86efac' : glow, shadowColor: done ? '#86efac' : glow }]}
                          onPress={() => markComplete(track.key)}
                          disabled={done}
                        >
                          <Text style={styles.doneBtnText}>
                            {done ? 'logged ✓' : (isRylane ? 'bet, did one' : 'i tried one 💜')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Sticky note */}
        <Animated.View style={{ opacity: fadeNote, transform: [{ translateY: transNote }], alignItems: 'center' }}>
          <View style={styles.sticky}>
            <Text style={styles.stickyText}>
              {isRylane
                ? 'one rep is more than zero. keep going.'
                : 'soft consistency > harsh streaks. you got this 💜'}
            </Text>
          </View>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {BottomNav}
    </ImageBackground>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1, width: '100%', height: '100%' },
  container:    { padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  headerRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backChip:     { backgroundColor: 'rgba(20,12,40,0.7)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  backChipText: { color: '#cbb5ff', fontSize: 13, fontWeight: '600' },
  privateBadge: { backgroundColor: 'rgba(20,12,40,0.7)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  privateBadgeText: { color: '#cbb5ff', fontSize: 12, fontWeight: '600' },

  title:        { fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 6, marginBottom: 6 },
  subtitle:     { fontSize: 14, color: '#cbb5ff', textAlign: 'center', marginBottom: 14, lineHeight: 20 },

  companion:    { alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginBottom: 14, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  companionText:{ color: '#F8FAFC', fontSize: 13, fontWeight: '600' },

  cloudRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 18 },
  cloudMascot:  { fontSize: 28, marginTop: 4 },
  cloudBubble:  { flex: 1, padding: 12, borderRadius: 16, borderWidth: 1 },
  cloudText:    { color: '#f5f0ff', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },

  streakCard:   { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 20, alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  streakLabel:  { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 },
  streakRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  streakFlame:  { fontSize: 24 },
  streakDays:   { color: '#fff', fontSize: 22, fontWeight: '800' },
  streakNote:   { color: '#cbb5ff', fontSize: 12, fontStyle: 'italic' },

  sectionTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 12, marginTop: 4 },

  grid:         { gap: 12, marginBottom: 16 },
  trackCard:    { borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 4, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  trackHeaderRow:{ flexDirection: 'row', alignItems: 'center', gap: 12 },
  trackEmoji:   { fontSize: 26 },
  trackTitle:   { color: '#fff', fontSize: 16, fontWeight: '700' },
  trackSub:     { color: '#cbb5ff', fontSize: 12, marginTop: 2 },
  chev:         { color: '#cbb5ff', fontSize: 18 },

  trackBody:    { marginTop: 14 },
  trackLesson:  { color: '#e2d6ff', fontSize: 14, lineHeight: 21, marginBottom: 8 },
  trackHook:    { fontSize: 13, fontStyle: 'italic', marginBottom: 12 },

  microList:    { marginBottom: 14 },
  microRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  microBullet:  { fontSize: 16, lineHeight: 20 },
  microText:    { color: '#f5f0ff', fontSize: 13, lineHeight: 20, flex: 1 },

  doneBtn:      { paddingVertical: 12, borderRadius: 14, alignItems: 'center', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
  doneBtnText:  { color: '#1a0a3a', fontSize: 14, fontWeight: '800' },

  sticky:       { backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, transform: [{ rotate: '-2deg' }], maxWidth: 320 },
  stickyText:   { color: '#3b1f6b', fontStyle: 'italic', fontSize: 13, textAlign: 'center' },
});

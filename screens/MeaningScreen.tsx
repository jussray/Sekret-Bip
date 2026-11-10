// screens/MeaningScreen.tsx
// Se'kret Bip — Meaning (Night-led purpose + values hub)
//
// Six deep reflection cards that help teens surface what actually matters
// to them: real pursuits, core values, future-self, the pull they can't
// walk away from. Each card expands to a companion-voiced prompt + a
// text-input field. Reflections persist in AsyncStorage; a spark counter
// rewards engagement.
//
// Architecture mirrors GrowthScreen — same ImageBackground + stagger
// entrance + accordion card pattern, Night-default companion voice.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Text, TouchableOpacity, ScrollView, View,
  ImageBackground, Animated, Easing, StyleSheet,
  Platform, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';

// ── Time helper ───────────────────────────────────────────────────────────────
function timeOfDay(): TimeOfDay {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ── Spark card data ───────────────────────────────────────────────────────────
type SparkKey =
  | 'real_pursuit' | 'feeling_real' | 'sacrifice' | 'future_self' | 'the_pull' | 'your_mark';

interface Spark {
  key:        SparkKey;
  emoji:      string;
  title:      string;
  sub:        string;
  question:   string;
  nightHook:  string;
  rayleneHook:string;
  rylaneHook: string;
}

const SPARKS: Spark[] = [
  {
    key: 'real_pursuit',
    emoji: '🔥',
    title: 'The Real Pursuit',
    sub: "what you'd chase with no audience",
    question: "If no one was watching you and failure wasn't possible — what would you actually be doing?",
    nightHook:   "that pull you keep pushing aside — it's not random. it's a signal.",
    rayleneHook: "that quiet thing you won't say out loud? that might be the truest part of you. 💜",
    rylaneHook:  "stop sleeping on your own thing. what's the real move?",
  },
  {
    key: 'feeling_real',
    emoji: '💫',
    title: 'Feeling Like You',
    sub: "when you're most yourself",
    question: 'When do you feel like the most undiluted, real version of yourself — not performing, not explaining, just being?',
    nightHook:   "those moments aren't small. they're the whole map.",
    rayleneHook: "not the version people expect — the version that actually exists. 💜",
    rylaneHook:  "when you're not fronting. when it's just you. that's the baseline.",
  },
  {
    key: 'sacrifice',
    emoji: '🌿',
    title: "What You'd Give For",
    sub: 'your values live here',
    question: 'What would you give up sleep, comfort, or ease for — without anyone making you?',
    nightHook:   "what you sacrifice for is what you actually value. not what you say you value.",
    rayleneHook: "your real values live in what you give without being asked. 💜",
    rylaneHook:  "actions don't lie. what you show up for — that's your value system.",
  },
  {
    key: 'future_self',
    emoji: '🪞',
    title: 'Future You',
    sub: "who you're becoming",
    question: "Who is the version of you that you're slowly becoming? What does that person believe about themselves and the world?",
    nightHook:   "you're always becoming someone. the question is whether you decide who.",
    rayleneHook: "your future self is already in there, waiting for you to believe in them. 💜",
    rylaneHook:  "don't drift into whoever. build toward someone specific.",
  },
  {
    key: 'the_pull',
    emoji: '🧲',
    title: 'The Pull',
    sub: "what you can't walk away from",
    question: 'What idea, person, cause, or practice keeps pulling you back no matter how many times you try to set it down?',
    nightHook:   "recurring pulls aren't coincidences. that thing is yours.",
    rayleneHook: "the thing that won't leave you alone might actually belong to you. 💜",
    rylaneHook:  "if you keep coming back to it — that's where your energy's supposed to go.",
  },
  {
    key: 'your_mark',
    emoji: '✨',
    title: 'Your Mark',
    sub: 'what you want to leave',
    question: 'Years from now — what would you want people to say about the way you lived?',
    nightHook:   "reverse-engineer from that answer. it tells you everything about right now.",
    rayleneHook: "you don't need to have it figured out for it to start guiding you. 💜",
    rylaneHook:  "legacy isn't fame. it's how people felt around you. what's that?",
  },
];

// ── Props ─────────────────────────────────────────────────────────────────────
interface MeaningScreenProps {
  t:               Record<string, any>;
  mood:            string;
  selectedSekret:  string;
  setScreen:       (s: string) => void;
  BottomNav:       React.ReactNode;
  onMilestone?:    () => void;
}

export function MeaningScreen({
  t, mood, selectedSekret, setScreen, BottomNav, onMilestone,
}: MeaningScreenProps) {

  const isNight   = selectedSekret === 'night' || selectedSekret === 'sekret';
  const isRylane  = selectedSekret === 'rylane';
  // all other companions use the raylene (warm) track

  const charKey = isNight ? 'night' : isRylane ? 'rylane' : 'raylene';
  const charName = isNight ? 'Night' : isRylane ? 'Sy' : 'Suhana';
  const charEmoji = isNight ? '🌙' : isRylane ? '⚡' : '💜';

  const time     = useMemo(() => timeOfDay(), []);
  const bgSource = useMemo(() => getRoomBg(charKey as any, time), [charKey, time]);
  const glow     = useMemo(() => glowFor(mood), [mood]);

  const [openKey,   setOpenKey]   = useState<SparkKey | null>(null);
  const [drafts,    setDrafts]    = useState<Record<SparkKey, string>>({
    real_pursuit: '', feeling_real: '', sacrifice: '',
    future_self: '', the_pull: '', your_mark: '',
  });
  const [engaged,   setEngaged]   = useState<Record<SparkKey, boolean>>({
    real_pursuit: false, feeling_real: false, sacrifice: false,
    future_self: false, the_pull: false, your_mark: false,
  });

  // Load persisted state from AsyncStorage on mount
  useEffect(() => {
    (async () => {
      try {
        const keys = SPARKS.map(s => [`meaning_draft_${s.key}`, `meaning_engaged_${s.key}`]).flat();
        const pairs = await AsyncStorage.multiGet(keys);
        const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
        setDrafts(prev => {
          const next = { ...prev };
          SPARKS.forEach(s => {
            const val = map[`meaning_draft_${s.key}`];
            if (val) next[s.key] = val;
          });
          return next;
        });
        setEngaged(prev => {
          const next = { ...prev };
          SPARKS.forEach(s => {
            if (map[`meaning_engaged_${s.key}`] === 'true') next[s.key] = true;
          });
          return next;
        });
      } catch { /* tolerate AsyncStorage read failures */ }
    })();
  }, []);

  const sparkCount = Object.values(engaged).filter(Boolean).length;

  // ── Animations ─────────────────────────────────────────────────────────────
  const fadeHero  = useRef(new Animated.Value(0)).current;
  const fadeSpark = useRef(new Animated.Value(0)).current;
  const fadeCards = useRef(new Animated.Value(0)).current;
  const fadeNote  = useRef(new Animated.Value(0)).current;
  const transHero  = useRef(new Animated.Value(12)).current;
  const transSpark = useRef(new Animated.Value(12)).current;
  const transCards = useRef(new Animated.Value(12)).current;
  const transNote  = useRef(new Animated.Value(12)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = (op: Animated.Value, tr: Animated.Value, delay: number) =>
      Animated.parallel([
        Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
        Animated.timing(tr, { toValue: 0, duration: 420, delay, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      ]);
    Animated.parallel([
      anim(fadeHero,  transHero,  0),
      anim(fadeSpark, transSpark, 140),
      anim(fadeCards, transCards, 280),
      anim(fadeNote,  transNote,  420),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        Animated.timing(breath, { toValue: 0, duration: 2200, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
      ])
    ).start();
  }, []);

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.80, 1] });

  // ── Actions ─────────────────────────────────────────────────────────────────
  async function saveDraft(key: SparkKey, text: string) {
    setDrafts(prev => ({ ...prev, [key]: text }));
    try { await AsyncStorage.setItem(`meaning_draft_${key}`, text); } catch { /* tolerate */ }
  }

  async function markEngaged(key: SparkKey) {
    setEngaged(prev => ({ ...prev, [key]: true }));
    onMilestone?.();
    try { await AsyncStorage.setItem(`meaning_engaged_${key}`, 'true'); } catch { /* tolerate */ }
  }

  // ── Hero copy ────────────────────────────────────────────────────────────────
  const heroLine = isNight
    ? "what actually drives you, before everything else gets in the way."
    : isRylane
    ? "no fluff. what actually matters to you. let's figure that out."
    : "the quiet things you know but haven't said yet. we have time. 💜";

  const companionIntro = isNight
    ? `${charEmoji}  Night is here — no pressure, just honesty`
    : isRylane
    ? `${charEmoji}  Sy is in it with you — straight up`
    : `${charEmoji}  Suhana is here — no judgment, just you`;

  const stickyLine = isNight
    ? "meaning isn't found. it's noticed over time."
    : isRylane
    ? "what you care about is the whole game. don't ignore it."
    : "the truest version of you already knows. let her speak. 💜";

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground source={bgSource} style={s.root} resizeMode="cover">
        <LinearGradient
          colors={['rgba(10,5,28,0.60)', 'rgba(22,10,48,0.75)', 'rgba(8,4,20,0.94)']}
          style={StyleSheet.absoluteFill}
        />

        <ScrollView
          contentContainerStyle={s.container}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header chips */}
          <View style={s.headerRow}>
            <TouchableOpacity style={s.backChip} onPress={() => setScreen('more')}>
              <Text style={s.backChipText}>← more</Text>
            </TouchableOpacity>
            <View style={[s.sparkBadge, { borderColor: glow + '88' }]}>
              <Text style={[s.sparkBadgeText, { color: glow }]}>✨ {sparkCount} / {SPARKS.length} sparks</Text>
            </View>
          </View>

          {/* Hero */}
          <Animated.View style={{ opacity: fadeHero, transform: [{ translateY: transHero }] }}>
            <Text style={[s.title, { color: glow }]}>Meaning 🌙</Text>
            <Text style={s.subtitle}>{heroLine}</Text>

            <Animated.View style={[
              s.companionPill,
              { borderColor: glow + '99', shadowColor: glow, opacity: breathOpacity, transform: [{ scale: breathScale }] },
            ]}>
              <Text style={s.companionPillText}>{companionIntro}</Text>
            </Animated.View>
          </Animated.View>

          {/* Spark counter card */}
          <Animated.View style={{ opacity: fadeSpark, transform: [{ translateY: transSpark }] }}>
            <Animated.View style={[
              s.counterCard,
              { borderColor: glow + '99', shadowColor: glow, transform: [{ scale: breathScale }] },
            ]}>
              <Text style={[s.counterLabel, { color: glow }]}>sparks found</Text>
              <View style={s.counterRow}>
                {SPARKS.map(spark => (
                  <View
                    key={spark.key}
                    style={[
                      s.counterDot,
                      { backgroundColor: engaged[spark.key] ? glow : 'rgba(255,255,255,0.12)', borderColor: glow + '66' },
                    ]}
                  />
                ))}
              </View>
              <Text style={s.counterSub}>
                {sparkCount === 0
                  ? 'open a card and sit with a question'
                  : sparkCount === SPARKS.length
                  ? "you've gone deep. that takes something."
                  : `${SPARKS.length - sparkCount} more left to explore`}
              </Text>
            </Animated.View>
          </Animated.View>

          {/* Spark cards */}
          <Animated.View style={{ opacity: fadeCards, transform: [{ translateY: transCards }] }}>
            <Text style={s.sectionTitle}>questions worth sitting with</Text>
            <View style={s.cardList}>
              {SPARKS.map(spark => {
                const isOpen = openKey === spark.key;
                const done   = engaged[spark.key];
                const hook   = isNight ? spark.nightHook : isRylane ? spark.rylaneHook : spark.rayleneHook;

                return (
                  <View key={spark.key}>
                    <TouchableOpacity
                      style={[
                        s.sparkCard,
                        {
                          backgroundColor: isOpen ? 'rgba(25,12,50,0.95)' : 'rgba(25,12,50,0.80)',
                          borderColor: (done ? '#86efac' : glow) + (isOpen ? 'cc' : '55'),
                          shadowColor: done ? '#86efac' : glow,
                        },
                      ]}
                      onPress={() => setOpenKey(isOpen ? null : spark.key)}
                      activeOpacity={0.82}
                    >
                      <View style={s.sparkHeader}>
                        <Text style={s.sparkEmoji}>{spark.emoji}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={s.sparkTitle}>{spark.title}{done ? '  ✓' : ''}</Text>
                          <Text style={s.sparkSub}>{spark.sub}</Text>
                        </View>
                        <Text style={s.chev}>{isOpen ? '▾' : '▸'}</Text>
                      </View>

                      {isOpen ? (
                        <View style={s.sparkBody}>
                          {/* The question */}
                          <View style={[s.questionBox, { borderLeftColor: glow }]}>
                            <Text style={s.questionText}>{spark.question}</Text>
                          </View>

                          {/* Companion hook */}
                          <Text style={[s.hookText, { color: glow }]}>{charEmoji}  {hook}</Text>

                          {/* Reflection input */}
                          <TextInput
                            style={[s.reflectInput, { borderColor: glow + '55' }]}
                            placeholder="write whatever comes up. it's just for you."
                            placeholderTextColor="#4a3e6a"
                            multiline
                            value={drafts[spark.key]}
                            onChangeText={text => saveDraft(spark.key, text)}
                            textAlignVertical="top"
                          />

                          {/* Mark engaged */}
                          <TouchableOpacity
                            style={[
                              s.sitBtn,
                              { backgroundColor: done ? '#86efac' : glow, shadowColor: done ? '#86efac' : glow },
                            ]}
                            onPress={() => markEngaged(spark.key)}
                            disabled={done}
                          >
                            <Text style={s.sitBtnText}>
                              {done
                                ? 'sparked ✓'
                                : isNight
                                ? "i sat with this"
                                : isRylane
                                ? "thought about it"
                                : "i held this 💜"}
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
          <Animated.View style={{ opacity: fadeNote, transform: [{ translateY: transNote }], alignItems: 'center', marginTop: 4 }}>
            <View style={s.sticky}>
              <Text style={s.stickyText}>{stickyLine}</Text>
            </View>
          </Animated.View>

          <View style={{ height: 48 }} />
        </ScrollView>

        {BottomNav}
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:      { flex: 1 },
  container: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 100,
    ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}),
  },

  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  backChip:        { backgroundColor: 'rgba(20,10,42,0.72)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  backChipText:    { color: '#c4b5fd', fontSize: 13, fontWeight: '600' },
  sparkBadge:      { backgroundColor: 'rgba(20,10,42,0.72)', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  sparkBadgeText:  { fontSize: 12, fontWeight: '700' },

  title:    { fontSize: 30, fontWeight: '900', textAlign: 'center', marginTop: 4, marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#c4b5fd', textAlign: 'center', marginBottom: 14, lineHeight: 21 },

  companionPill: {
    alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 9,
    borderRadius: 999, borderWidth: 1, marginBottom: 18,
    backgroundColor: 'rgba(28,14,54,0.82)',
    shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  companionPillText: { color: '#f5f0ff', fontSize: 13, fontWeight: '600' },

  counterCard: {
    padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 22,
    backgroundColor: 'rgba(22,10,44,0.85)',
    alignItems: 'center',
    shadowOpacity: 0.38, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  counterLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 },
  counterRow:   { flexDirection: 'row', gap: 8, marginBottom: 8 },
  counterDot:   { width: 14, height: 14, borderRadius: 7, borderWidth: 1 },
  counterSub:   { color: '#a090c0', fontSize: 12, fontStyle: 'italic' },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },

  cardList:   { gap: 12, marginBottom: 16 },
  sparkCard:  {
    borderRadius: 18, borderWidth: 1, padding: 16,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  sparkHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sparkEmoji:  { fontSize: 26 },
  sparkTitle:  { color: '#fff', fontSize: 16, fontWeight: '700' },
  sparkSub:    { color: '#c4b5fd', fontSize: 12, marginTop: 2 },
  chev:        { color: '#c4b5fd', fontSize: 18 },

  sparkBody: { marginTop: 16 },

  questionBox: {
    borderLeftWidth: 3,
    paddingLeft: 12,
    marginBottom: 12,
  },
  questionText: { color: '#e8e0ff', fontSize: 14, lineHeight: 22, fontStyle: 'italic' },

  hookText: { fontSize: 13, fontStyle: 'italic', marginBottom: 14, lineHeight: 19 },

  reflectInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    color: '#f5f0ff',
    fontSize: 14,
    lineHeight: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginBottom: 14,
  },

  sitBtn: {
    paddingVertical: 12, borderRadius: 14,
    alignItems: 'center',
    shadowOpacity: 0.38, shadowRadius: 10, shadowOffset: { width: 0, height: 0 },
  },
  sitBtnText: { color: '#0d0820', fontSize: 14, fontWeight: '800' },

  sticky: {
    backgroundColor: '#fff8e7',
    borderColor: '#7c3aed',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    transform: [{ rotate: '-1.5deg' }],
    maxWidth: 320,
  },
  stickyText: { color: '#3b1f6b', fontStyle: 'italic', fontSize: 13, textAlign: 'center' },
});

// app/(teen)/comfort.tsx
// Se'kret Bip — Comfort Screen
//
// Reached via:
//   router.push('/(teen)/comfort')
//   — or — companion loop nudge from companion-chat.tsx (comfortNudge state)
//
// Purpose: soft-landing space for teens experiencing emotional load.
// Offers grounding tools (breathing, body scan, affirmation) and a
// warm return path back to their companion.
//
// No safety logic here — safetyCoordinator handles that upstream.
// This screen is purely restorative.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

// ── Types ─────────────────────────────────────────────────────────────────────

type Tool = 'breathe' | 'ground' | 'affirm';

interface BreathPhase {
  label: string;
  duration: number; // ms
  scale: number;    // circle scale target
}

// ── Constants ─────────────────────────────────────────────────────────────────

const BREATH_CYCLE: BreathPhase[] = [
  { label: 'Breathe in',  duration: 4000, scale: 1.0 },
  { label: 'Hold',        duration: 4000, scale: 1.0 },
  { label: 'Breathe out', duration: 6000, scale: 0.55 },
  { label: 'Rest',        duration: 2000, scale: 0.55 },
];

const GROUND_STEPS = [
  { n: 5, sense: 'things you can see',    emoji: '👁️' },
  { n: 4, sense: 'things you can touch',  emoji: '✋' },
  { n: 3, sense: 'things you can hear',   emoji: '👂' },
  { n: 2, sense: 'things you can smell',  emoji: '🌿' },
  { n: 1, sense: 'thing you can taste',   emoji: '💧' },
];

const AFFIRMATIONS = [
  "You don't have to have it all figured out right now.",
  "Your feelings make sense, even when they're confusing.",
  "You've handled hard things before. You're still here.",
  "Being kind to yourself isn't weakness — it's wisdom.",
  "Right now, breathing is enough.",
  "You are allowed to take up space and feel what you feel.",
  "Hard moments are temporary. You are not your hard moment.",
];

const TOOL_LABELS: Record<Tool, { label: string; emoji: string; desc: string }> = {
  breathe: { label: 'Breathe',  emoji: '🫁', desc: 'Box breathing to settle the nervous system' },
  ground:  { label: 'Ground',   emoji: '🌱', desc: '5-4-3-2-1 to come back to the present' },
  affirm:  { label: 'Affirm',   emoji: '💜', desc: 'A gentle reminder just for you' },
};

// ── Breathing Tool ────────────────────────────────────────────────────────────

function BreatheView() {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [active, setActive]     = useState(false);
  const scale                   = useRef(new Animated.Value(0.55)).current;
  const timerRef                = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef                 = useRef<Animated.CompositeAnimation | null>(null);

  const runPhase = useCallback((idx: number) => {
    const phase = BREATH_CYCLE[idx];
    animRef.current = Animated.timing(scale, {
      toValue:         phase.scale,
      duration:        phase.duration,
      easing:          Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    animRef.current.start(() => {
      const next = (idx + 1) % BREATH_CYCLE.length;
      setPhaseIdx(next);
      timerRef.current = setTimeout(() => runPhase(next), 0);
    });
  }, [scale]);

  const start = () => {
    setActive(true);
    setPhaseIdx(0);
    runPhase(0);
  };

  const stop = () => {
    setActive(false);
    animRef.current?.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
    Animated.timing(scale, {
      toValue: 0.55, duration: 400, easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();
  };

  useEffect(() => () => {
    animRef.current?.stop();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const phase = BREATH_CYCLE[phaseIdx];

  return (
    <View style={bt.wrap}>
      <Pressable onPress={active ? stop : start} style={bt.orb}>
        <Animated.View style={[bt.circle, { transform: [{ scale }] }]}>
          <LinearGradient
            colors={['#c4b5fd', '#7c3aed', '#4c1d95']}
            style={bt.grad}
          />
        </Animated.View>
        <View style={bt.labelWrap}>
          <Text style={bt.phaseLabel}>
            {active ? phase.label : 'Tap to begin'}
          </Text>
          {active && (
            <Text style={bt.subLabel}>
              {Math.round(phase.duration / 1000)}s
            </Text>
          )}
        </View>
      </Pressable>
      <Text style={bt.hint}>
        {active ? 'Tap the circle to pause' : 'Box breathing · 4-4-6-2'}
      </Text>
    </View>
  );
}

const bt = StyleSheet.create({
  wrap:      { alignItems: 'center', paddingVertical: 24 },
  orb:       { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  circle: {
    width: 200, height: 200, borderRadius: 100,
    overflow: 'hidden', position: 'absolute',
  },
  grad:      { flex: 1 },
  labelWrap: { alignItems: 'center', zIndex: 2 },
  phaseLabel: {
    fontSize: 17, fontWeight: '600',
    color: '#fff', textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4,
  },
  subLabel:  { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 3 },
  hint:      { fontSize: 12, color: 'rgba(255,255,255,0.38)', marginTop: 14, fontStyle: 'italic' },
});

// ── Grounding Tool ────────────────────────────────────────────────────────────

function GroundView() {
  const [step, setStep] = useState(0);
  const done            = step >= GROUND_STEPS.length;
  const current         = done ? null : GROUND_STEPS[step];

  return (
    <View style={gv.wrap}>
      {!done ? (
        <>
          <Text style={gv.big}>{current!.emoji}</Text>
          <Text style={gv.title}>
            Name {current!.n} {current!.sense}
          </Text>
          <Text style={gv.sub}>Take your time. No rush.</Text>
          <TouchableOpacity
            style={gv.btn}
            onPress={() => setStep(s => s + 1)}
          >
            <Text style={gv.btnLabel}>Done ✓</Text>
          </TouchableOpacity>
          <View style={gv.dots}>
            {GROUND_STEPS.map((_, i) => (
              <View
                key={i}
                style={[gv.dot, i <= step && gv.dotActive]}
              />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={gv.big}>🌿</Text>
          <Text style={gv.title}>You're here.</Text>
          <Text style={gv.sub}>That was 5-4-3-2-1. You just grounded yourself.</Text>
          <TouchableOpacity style={gv.btn} onPress={() => setStep(0)}>
            <Text style={gv.btnLabel}>Do it again</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const gv = StyleSheet.create({
  wrap:      { alignItems: 'center', paddingVertical: 16 },
  big:       { fontSize: 48, marginBottom: 12 },
  title:     { fontSize: 20, fontWeight: '700', color: '#e9d5ff', textAlign: 'center', marginBottom: 6 },
  sub:       { fontSize: 14, color: 'rgba(255,255,255,0.50)', textAlign: 'center', marginBottom: 20, maxWidth: 260 },
  btn: {
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 24, backgroundColor: 'rgba(139,92,246,0.25)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.40)',
  },
  btnLabel:  { color: '#e9d5ff', fontSize: 15, fontWeight: '600' },
  dots:      { flexDirection: 'row', gap: 6, marginTop: 20 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
  dotActive: { backgroundColor: '#a78bfa' },
});

// ── Affirmation Tool ──────────────────────────────────────────────────────────

function AffirmView() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * AFFIRMATIONS.length));
  const next          = () => setIdx(i => (i + 1) % AFFIRMATIONS.length);

  return (
    <View style={av.wrap}>
      <Text style={av.quote}>❝</Text>
      <Text style={av.text}>{AFFIRMATIONS[idx]}</Text>
      <TouchableOpacity style={av.btn} onPress={next}>
        <Text style={av.btnLabel}>Another one</Text>
      </TouchableOpacity>
    </View>
  );
}

const av = StyleSheet.create({
  wrap:     { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 8 },
  quote:    { fontSize: 36, color: 'rgba(167,139,250,0.4)', marginBottom: 8 },
  text: {
    fontSize: 18, lineHeight: 28, color: '#e9d5ff',
    textAlign: 'center', fontStyle: 'italic', maxWidth: 300, marginBottom: 24,
  },
  btn: {
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 20, backgroundColor: 'rgba(139,92,246,0.18)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.30)',
  },
  btnLabel: { color: '#c4b5fd', fontSize: 14, fontWeight: '500' },
});

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function ComfortScreen() {
  const router  = useRouter();
  const params  = useLocalSearchParams<{ returnTo?: string; companion?: string }>();
  const [tool, setTool] = useState<Tool>('breathe');

  const handleReturn = () => {
    if (params.returnTo === 'companion-chat' && params.companion) {
      router.replace({
        pathname: '/(teen)/companion-chat',
        params: { companion: params.companion, surface: 'journal' },
      });
    } else {
      router.back();
    }
  };

  return (
    <LinearGradient
      colors={['#0f0a1e', '#1a0e35', '#0f0a1e']}
      style={s.root}
    >
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backLabel}>‹ Back</Text>
          </TouchableOpacity>
          <Text style={s.title}>Comfort</Text>
          <View style={s.backBtn} />
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Intro */}
          <Text style={s.intro}>
            You came here for a reason. That's already something.{' '}
            Pick whatever feels right.
          </Text>

          {/* Tool picker */}
          <View style={s.toolRow}>
            {(Object.keys(TOOL_LABELS) as Tool[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[s.toolTab, tool === t && s.toolTabActive]}
                onPress={() => setTool(t)}
              >
                <Text style={s.toolEmoji}>{TOOL_LABELS[t].emoji}</Text>
                <Text style={[s.toolLabel, tool === t && s.toolLabelActive]}>
                  {TOOL_LABELS[t].label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active tool desc */}
          <Text style={s.toolDesc}>{TOOL_LABELS[tool].desc}</Text>

          {/* Tool content */}
          <View style={s.toolBox}>
            {tool === 'breathe' && <BreatheView />}
            {tool === 'ground'  && <GroundView />}
            {tool === 'affirm'  && <AffirmView />}
          </View>

          {/* Return path */}
          {params.returnTo === 'companion-chat' && params.companion && (
            <TouchableOpacity style={s.returnBtn} onPress={handleReturn}>
              <Text style={s.returnLabel}>
                Return to your companion
              </Text>
            </TouchableOpacity>
          )}

          {/* Quiet footer */}
          <Text style={s.footer}>
            This is your private space. Nothing here is shared.
          </Text>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:  { flex: 1 },
  safe:  { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    paddingBottom: 12,
  },
  backBtn:   { width: 60 },
  backLabel: { color: '#a78bfa', fontSize: 16 },
  title: {
    fontSize: 17, fontWeight: '700',
    color: '#e9d5ff', textAlign: 'center',
  },

  intro: {
    fontSize: 15, lineHeight: 22, color: 'rgba(255,255,255,0.55)',
    textAlign: 'center', marginBottom: 24, marginTop: 4,
  },

  toolRow: {
    flexDirection: 'row', gap: 10,
    marginBottom: 10, justifyContent: 'center',
  },
  toolTab: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  toolTabActive: {
    borderColor: 'rgba(167,139,250,0.50)',
    backgroundColor: 'rgba(139,92,246,0.18)',
  },
  toolEmoji: { fontSize: 20, marginBottom: 4 },
  toolLabel: { fontSize: 12, color: 'rgba(255,255,255,0.40)', fontWeight: '500' },
  toolLabelActive: { color: '#e9d5ff' },

  toolDesc: {
    fontSize: 12, color: 'rgba(255,255,255,0.32)',
    textAlign: 'center', marginBottom: 16, fontStyle: 'italic',
  },

  toolBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    paddingHorizontal: 16,
    marginBottom: 24,
    minHeight: 260,
    justifyContent: 'center',
  },

  returnBtn: {
    alignSelf: 'center',
    paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(139,92,246,0.22)',
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.38)',
    marginBottom: 20,
  },
  returnLabel: { color: '#e9d5ff', fontSize: 14, fontWeight: '600' },

  footer: {
    fontSize: 11, color: 'rgba(255,255,255,0.20)',
    textAlign: 'center', fontStyle: 'italic', marginTop: 8,
  },
});

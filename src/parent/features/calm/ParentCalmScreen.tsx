// src/parent/features/calm/ParentCalmScreen.tsx
//
// "Calm Before Replying" — parent-specific pause tool.
// Used before hard conversations with a teen.
// Pattern: Pause → Breathe → Reflect → Approach

import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, Animated, Platform, Easing,
} from 'react-native';

const TOP = Platform.OS === 'ios' ? 56 : 36;

// ── Breathing steps ──────────────────────────────────────────────────────────
const BREATHE_STEPS = [
  { label: 'breathe in',  count: 4 },
  { label: 'hold',        count: 4 },
  { label: 'breathe out', count: 6 },
  { label: 'hold',        count: 2 },
];

// ── Reflection prompts ───────────────────────────────────────────────────────
const REFLECT_PROMPTS = [
  "What am I actually feeling right now — beyond frustration?",
  "What does my teen need from me in this moment?",
  "Is this about today, or something older?",
  "What would 'connection first' look like here?",
  "If I responded from love instead of fear, what would I say?",
  "What do I wish someone had said to me at their age?",
  "Am I reacting to what they did, or what I am afraid it means?",
  "What do I actually know versus what am I assuming?",
  "What's the worst case I'm bracing for? Is that what's actually happening?",
  "How would I want them to tell this story about me in 10 years?",
  "What's under the anger? Usually there's something softer.",
  "What do I need before I can show up the way I actually want to?",
  "If a close friend was going through this with their teen, what would I tell them?",
  "What's the one thing I actually want them to feel after this conversation?",
  "Am I trying to fix this or control it? There's a difference.",
  "What would staying curious look like right now instead of staying certain?",
  "What's my real fear here — about them, or about myself as a parent?",
  "What would I do right now if I trusted them more?",
];

// ── Approach starters ────────────────────────────────────────────────────────
const APPROACH_STARTERS = [
  { label: 'Stay curious',  text: '"Help me understand what is going on for you."' },
  { label: 'Stay soft',     text: '"I love you. I am not going anywhere. Can we talk?"' },
  { label: 'Acknowledge',   text: '"That sounds really hard. I hear you."' },
  { label: 'Own it',        text: '"I overreacted. Can we start over?"' },
  { label: 'Ask first',     text: '"Do you want advice, or do you just need me to listen?"' },
  { label: 'Make space',    text: '"You don\'t have to explain anything right now. I\'m just here."' },
  { label: 'No agenda',     text: '"I\'m not coming in to lecture. I just miss talking to you."' },
  { label: 'Be honest',     text: '"I don\'t know what to say. But I didn\'t want to say nothing."' },
  { label: 'Repair first',  text: '"Before anything else — I love you. That\'s not conditional on any of this."' },
  { label: 'Invite',        text: '"Whenever you\'re ready — today, tonight, tomorrow — I\'m not going anywhere."' },
  { label: 'Name it',       text: '"Things have been off between us and I don\'t want to pretend they haven\'t."' },
  { label: 'Collaborate',   text: '"I want to figure this out with you. Not at you."' },
];

// ── Se'kret presence lines ────────────────────────────────────────────────────
const PRESENCE = [
  "pause before you respond. that is not weakness. that is wisdom.",
  "the goal is not to win. the goal is to stay connected.",
  "your calm is contagious. so is your panic. choose calm.",
  "breathe. then speak. in that order.",
  "you do not have to have the right answer. showing up is enough.",
  "regulation first. conversation second.",
  "they need your presence more than your perfection.",
  "the best thing you can do for your teen right now is take care of yourself for one minute.",
  "whatever just happened — you're still their parent. that doesn't change.",
  "anger is information. so is fear. so is love. breathe until you know which one is loudest.",
  "you don't have to resolve it tonight. you just have to stay in relationship.",
  "your teen is watching how you handle hard things. right now, they're watching.",
  "you can be honest about being triggered and still choose how you respond.",
  "soften before you speak. a soft opening changes everything.",
  "come back with love first. everything else is secondary.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Component ────────────────────────────────────────────────────────────────
interface ParentCalmScreenProps {
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

type Phase = 'pause' | 'breathe' | 'reflect' | 'approach';

export function ParentCalmScreen({ setScreen, BottomNav }: ParentCalmScreenProps) {
  const [phase, setPhase]         = useState<Phase>('pause');
  const [stepIdx, setStepIdx]     = useState(0);
  const [counter, setCounter]     = useState(BREATHE_STEPS[0].count);
  const [running, setRunning]     = useState(false);
  const [promptIdx, setPromptIdx] = useState(() => Math.floor(Math.random() * REFLECT_PROMPTS.length));
  const [starterIdx, setStarterIdx] = useState(0);
  const [presenceLine]            = useState(() => pick(PRESENCE));

  const circleScale = useRef(new Animated.Value(1)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, [phase]);

  // Breathing animation — expands on inhale, contracts on exhale
  useEffect(() => {
    if (!running) return;
    const step = BREATHE_STEPS[stepIdx];
    const toValue = step.label === 'breathe in' ? 1.28
      : step.label === 'hold' ? (stepIdx === 1 ? 1.28 : 1.0)
      : 1.0;
    const anim = Animated.timing(circleScale, {
      toValue,
      duration: step.count * 1000,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });
    anim.start(({ finished }) => {
      if (!finished) return;
      setStepIdx(i => (i + 1) % BREATHE_STEPS.length);
    });
    return () => anim.stop();
  }, [running, stepIdx]);

  // Counter ticker
  useEffect(() => {
    if (!running) return;
    const step = BREATHE_STEPS[stepIdx];
    setCounter(step.count);
    const id = setInterval(() => setCounter(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [running, stepIdx]);

  const currentStep = BREATHE_STEPS[stepIdx];

  const switchPhase = (p: Phase) => {
    fadeIn.setValue(0);
    setPhase(p);
  };

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setScreen('home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.back}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Calm Before Replying</Text>
            <Text style={s.sub}>pause. breathe. reconnect.</Text>
          </View>
        </View>

        {/* ── Presence line ── */}
        <View style={s.presenceRow}>
          <Text style={s.presenceText}>{'"'}{presenceLine}{'"'}</Text>
        </View>

        {/* ── Phase tabs ── */}
        <View style={s.tabs}>
          {(['pause', 'breathe', 'reflect', 'approach'] as Phase[]).map((p, i) => (
            <TouchableOpacity
              key={p}
              style={[s.tab, phase === p && s.tabActive]}
              onPress={() => switchPhase(p)}
            >
              <Text style={[s.tabText, phase === p && s.tabTextActive]}>
                {['⏸', '🌬️', '💭', '💬'][i]} {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Phase: Pause ── */}
        {phase === 'pause' && (
          <Animated.View style={[s.phaseCard, { opacity: fadeIn }]}>
            <Text style={s.phaseTitle}>Before you respond{'…'}</Text>
            <Text style={s.phaseBody}>
              {"Something happened. You have a feeling. That's real.\n\n"}
              {'Before you react, give yourself 60 seconds.\n'}
              {'Not to plan what to say.\n'}
              {'Just to land back in your body.'}
            </Text>
            <View style={s.pauseActions}>
              <TouchableOpacity style={s.primaryBtn} onPress={() => switchPhase('breathe')}>
                <Text style={s.primaryBtnText}>Start breathing</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.ghostBtn} onPress={() => switchPhase('reflect')}>
                <Text style={s.ghostBtnText}>Skip to reflection</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Phase: Breathe ── */}
        {phase === 'breathe' && (
          <Animated.View style={[s.breatheWrap, { opacity: fadeIn }]}>
            <Text style={s.phaseTitle}>4-4-6-2 Breathing</Text>
            <Text style={s.phaseSub}>activates your parasympathetic nervous system</Text>

            <TouchableOpacity onPress={() => setRunning(r => !r)} activeOpacity={0.85}>
              <Animated.View style={[s.circle, { transform: [{ scale: circleScale }] }]}>
                <Text style={s.circleLabel}>{running ? currentStep.label : 'tap to start'}</Text>
                {running && <Text style={s.circleCounter}>{counter}</Text>}
              </Animated.View>
            </TouchableOpacity>

            <View style={s.stepsRow}>
              {BREATHE_STEPS.map((step, i) => (
                <View key={i} style={[s.stepPill, running && stepIdx === i && s.stepPillActive]}>
                  <Text style={s.stepText}>{step.label} {step.count}s</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={[s.primaryBtn, { marginTop: 24 }]} onPress={() => { setRunning(false); switchPhase('reflect'); }}>
              <Text style={s.primaryBtnText}>Reflect</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Phase: Reflect ── */}
        {phase === 'reflect' && (
          <Animated.View style={[s.phaseCard, { opacity: fadeIn }]}>
            <Text style={s.phaseTitle}>One honest question</Text>
            <View style={s.promptCard}>
              <Text style={s.promptText}>{REFLECT_PROMPTS[promptIdx]}</Text>
            </View>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => setPromptIdx(i => (i + 1) % REFLECT_PROMPTS.length)}
            >
              <Text style={s.ghostBtnText}>Different question ({promptIdx + 1}/{REFLECT_PROMPTS.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={() => switchPhase('approach')}>
              <Text style={s.primaryBtnText}>Ready to approach</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ── Phase: Approach ── */}
        {phase === 'approach' && (
          <Animated.View style={[s.phaseCard, { opacity: fadeIn }]}>
            <Text style={s.phaseTitle}>How to open the conversation</Text>
            <Text style={s.phaseSub}>Pick the one that fits right now. No script is perfect.</Text>
            <View style={s.approachCard}>
              <Text style={s.approachLabel}>{APPROACH_STARTERS[starterIdx].label}</Text>
              <Text style={s.approachText}>{APPROACH_STARTERS[starterIdx].text}</Text>
            </View>
            <TouchableOpacity
              style={s.ghostBtn}
              onPress={() => setStarterIdx(i => (i + 1) % APPROACH_STARTERS.length)}
            >
              <Text style={s.ghostBtnText}>Different opener ({starterIdx + 1}/{APPROACH_STARTERS.length})</Text>
            </TouchableOpacity>
            <View style={s.allApproachWrap}>
              {APPROACH_STARTERS.filter((_, i) => i !== starterIdx).map(a => (
                <TouchableOpacity
                  key={a.label}
                  style={s.approachCardSmall}
                  onPress={() => setStarterIdx(APPROACH_STARTERS.indexOf(a))}
                >
                  <Text style={s.approachLabelSmall}>{a.label}</Text>
                  <Text style={s.approachTextSmall}>{a.text}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={[s.primaryBtn, { marginTop: 12 }]} onPress={() => setScreen('home')}>
              <Text style={s.primaryBtnText}>Back to the room</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

      </ScrollView>
      {BottomNav}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06030f' },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 12,
  },
  back:   { color: '#c4b5fd', fontSize: 22, fontWeight: '300' },
  title:  { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:    { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  presenceRow: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderLeftWidth: 2, borderLeftColor: '#c084fc',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  presenceText: { color: '#e9d5ff', fontSize: 13, fontStyle: 'italic', lineHeight: 20 },


  tabs: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 8,
    paddingHorizontal: 20, marginBottom: 20,
  },
  tab:           { borderWidth: 1, borderColor: '#374151', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tabActive:     { backgroundColor: 'rgba(192,132,252,0.18)', borderColor: '#c084fc' },
  tabText:       { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  tabTextActive: { color: '#e9d5ff' },

  phaseCard:  { marginHorizontal: 20 },
  phaseTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 8 },
  phaseSub:   { color: '#94A3B8', fontSize: 12, marginBottom: 16, lineHeight: 18 },
  phaseBody:  { color: '#CBD5E1', fontSize: 15, lineHeight: 26, marginBottom: 24 },

  pauseActions: { gap: 10 },

  primaryBtn: {
    backgroundColor: 'rgba(192,132,252,0.18)',
    borderWidth: 1, borderColor: '#c084fc',
    borderRadius: 16, paddingVertical: 14, alignItems: 'center',
  },
  primaryBtnText: { color: '#e9d5ff', fontSize: 15, fontWeight: '700' },

  ghostBtn:     { alignItems: 'center', paddingVertical: 10 },
  ghostBtnText: { color: '#64748B', fontSize: 13 },

  breatheWrap: { marginHorizontal: 20, alignItems: 'center' },
  circle:      {
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(192,132,252,0.15)',
    borderWidth: 1.5, borderColor: '#c084fc',
    justifyContent: 'center', alignItems: 'center',
    marginVertical: 24,
    shadowColor: '#c084fc', shadowOpacity: 0.5, shadowRadius: 20, elevation: 8,
  },
  circleLabel:    { color: '#e9d5ff', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  circleCounter:  { color: '#c084fc', fontSize: 36, fontWeight: '900', marginTop: 4 },
  stepsRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  stepPill:       { borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  stepPillActive: { borderColor: '#c084fc', backgroundColor: 'rgba(192,132,252,0.18)' },
  stepText:       { color: '#94A3B8', fontSize: 11 },

  promptCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: '#334155',
    borderRadius: 16, padding: 20, marginBottom: 16,
  },
  promptText: { color: '#fff', fontSize: 17, lineHeight: 28, fontWeight: '600' },

  approachCard: {
    backgroundColor: 'rgba(192,132,252,0.08)',
    borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)',
    borderRadius: 14, padding: 16, marginBottom: 8,
  },
  approachLabel:     { color: '#c084fc', fontSize: 11, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
  approachText:      { color: '#e2e8f0', fontSize: 15, lineHeight: 24, fontStyle: 'italic' },
  allApproachWrap:   { gap: 8, marginTop: 8 },
  approachCardSmall: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, padding: 12,
  },
  approachLabelSmall: { color: '#64748B', fontSize: 10, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5, textTransform: 'uppercase' },
  approachTextSmall:  { color: '#94A3B8', fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
});

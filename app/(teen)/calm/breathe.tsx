// app/(teen)/calm/breathe.tsx
// Se'kret Calm — Breathe With Me (dedicated screen)
// Box, 4-7-8, Calming, Belly breathing with animated visuals,
// playlist audio player, and optional reminder scheduling.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Easing,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAudioPlayer } from '../../../hooks/useAudioPlayer';
import { emitEvent } from '../../../src/features/activity/events';

// ── Breathing patterns ────────────────────────────────────────────────────────
type BreathPhase = 'in' | 'hold' | 'out';
interface BreathStep { label: string; count: number; phase: BreathPhase }
interface Pattern { name: string; emoji: string; sub: string; steps: BreathStep[] }

const PATTERNS: Record<string, Pattern> = {
  box: {
    name: 'Box Breathing',
    emoji: '✦',
    sub: 'equal sides. grounding.',
    steps: [
      { label: 'breathe in',  count: 4, phase: 'in' },
      { label: 'hold',        count: 4, phase: 'hold' },
      { label: 'breathe out', count: 4, phase: 'out' },
      { label: 'hold',        count: 4, phase: 'hold' },
    ],
  },
  '4-7-8': {
    name: '4-7-8',
    emoji: '🌙',
    sub: 'calm anxiety. help sleep.',
    steps: [
      { label: 'breathe in',  count: 4, phase: 'in' },
      { label: 'hold',        count: 7, phase: 'hold' },
      { label: 'breathe out', count: 8, phase: 'out' },
    ],
  },
  calming: {
    name: 'Calming Breath',
    emoji: '☁️',
    sub: 'quick reset for stress.',
    steps: [
      { label: 'breathe in',  count: 4, phase: 'in' },
      { label: 'hold',        count: 2, phase: 'hold' },
      { label: 'breathe out', count: 6, phase: 'out' },
    ],
  },
  belly: {
    name: 'Deep Belly',
    emoji: '🌊',
    sub: 'release physical tension.',
    steps: [
      { label: 'breathe in',  count: 5, phase: 'in' },
      { label: 'breathe out', count: 5, phase: 'out' },
    ],
  },
};

const PATTERN_KEYS = Object.keys(PATTERNS) as Array<keyof typeof PATTERNS>;

const PHASE_COLORS: Record<BreathPhase, string> = {
  in:   '#a855f7',
  hold: '#c084fc',
  out:  '#7c3aed',
};

// Playlist — replace URIs with real CDN audio before shipping
const CALM_PLAYLIST = [
  { id: 'rain',   emoji: '🌧️', label: 'night rain',  sub: 'soothing rain sounds', duration: '20:00', uri: '' },
  { id: 'lofi',   emoji: '🎵', label: 'soft lo-fi',  sub: 'focus + unwind',       duration: '30:00', uri: '' },
  { id: 'ocean',  emoji: '🌊', label: 'ocean waves', sub: 'reset your mind',      duration: '25:00', uri: '' },
  { id: 'piano',  emoji: '🎹', label: 'soft piano',  sub: 'ease into stillness',  duration: '15:00', uri: '' },
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function BreatheScreen() {
  const [patternKey, setPatternKey]   = useState<string>('box');
  const [stepIdx,    setStepIdx]      = useState(0);
  const [counter,    setCounter]      = useState(4);
  const [running,    setRunning]      = useState(false);
  const [activeSong, setActiveSong]   = useState<string | null>(null);
  const [reminderSet, setReminderSet] = useState(false);
  const [showNudge,   setShowNudge]   = useState(false);
  const hasStartedRef  = useRef(false);
  const startTimeRef   = useRef<number>(0);

  const circleScale  = useRef(new Animated.Value(1)).current;
  const glowOpacity  = useRef(new Animated.Value(0.4)).current;
  const glowScale    = useRef(new Animated.Value(1)).current;
  const animRef      = useRef<Animated.CompositeAnimation | null>(null);

  const audio = useAudioPlayer();

  const pattern = PATTERNS[patternKey];
  const step    = pattern.steps[stepIdx % pattern.steps.length];
  const phaseColor = PHASE_COLORS[step.phase];

  // ── Breathing animation ───────────────────────────────────────────────────
  const runStep = useCallback((sIdx: number, pKey: string) => {
    const pat  = PATTERNS[pKey];
    const s    = pat.steps[sIdx % pat.steps.length];
    const targetScale = s.phase === 'in' ? 1.38 : s.phase === 'out' ? 1.0 : undefined;
    const dur  = s.count * 1000;

    if (targetScale !== undefined) {
      const anim = Animated.parallel([
        Animated.timing(circleScale, {
          toValue: targetScale,
          duration: dur,
          easing: s.phase === 'in' ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: targetScale,
          duration: dur,
          easing: s.phase === 'in' ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]);
      animRef.current = anim;
      anim.start(({ finished }) => {
        if (!finished) return;
        setStepIdx(i => (i + 1) % pat.steps.length);
      });
    } else {
      // hold — glow pulse
      const glowAnim = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.85, duration: dur / 2, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.4,  duration: dur / 2, useNativeDriver: true }),
        ]),
        { iterations: 1 }
      );
      animRef.current = glowAnim;
      glowAnim.start(({ finished }) => {
        if (!finished) return;
        setStepIdx(i => (i + 1) % pat.steps.length);
      });
    }
  }, [circleScale, glowOpacity]);

  useEffect(() => {
    if (!running) {
      animRef.current?.stop();
      return;
    }
    runStep(stepIdx, patternKey);
  }, [running, stepIdx, patternKey, runStep]);

  // ── Counter ticker ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!running) return;
    const s = PATTERNS[patternKey].steps[stepIdx % PATTERNS[patternKey].steps.length];
    setCounter(s.count);
    const id = setInterval(() => setCounter(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [running, stepIdx, patternKey]);

  function toggleRunning() {
    if (!running) {
      hasStartedRef.current = true;
      startTimeRef.current  = Date.now();
      setShowNudge(false);
      setStepIdx(0);
      setCounter(PATTERNS[patternKey].steps[0].count);
      circleScale.setValue(1);
      glowScale.setValue(1);
    } else {
      animRef.current?.stop();
      if (hasStartedRef.current) {
        const durationSecs = Math.round((Date.now() - startTimeRef.current) / 1000);
        emitEvent('breathe_completed', { durationSecs });
        setShowNudge(true);
      }
    }
    setRunning(r => !r);
  }

  function switchPattern(key: string) {
    animRef.current?.stop();
    setRunning(false);
    setShowNudge(false);
    hasStartedRef.current = false;
    setPatternKey(key);
    setStepIdx(0);
    setCounter(PATTERNS[key].steps[0].count);
    circleScale.setValue(1);
    glowScale.setValue(1);
    glowOpacity.setValue(0.4);
  }

  // ── Audio ─────────────────────────────────────────────────────────────────
  async function handleSongPress(song: typeof CALM_PLAYLIST[number]) {
    if (!song.uri) {
      Alert.alert('Coming soon', 'Audio tracks will be available in the next update. 💜');
      return;
    }
    if (activeSong === song.id) {
      if (audio.state === 'playing') await audio.pause();
      else await audio.play();
      return;
    }
    setActiveSong(song.id);
    await audio.load(song.uri);
    await audio.play();
  }

  // ── Reminder ─────────────────────────────────────────────────────────────
  async function scheduleReminder() {
    try {
      // expo-notifications dynamic import to avoid crash if not configured
      const Notifications = await import('expo-notifications');
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Enable notifications in settings to get breathing reminders. 💜');
        return;
      }
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Time to breathe 💜",
          body: "Take a moment. Open Bip for a gentle breathing session.",
          sound: true,
        },
        trigger: { seconds: 60 * 60, repeats: true } as any,
      });
      setReminderSet(true);
      Alert.alert('Reminder set 💜', 'You\'ll get a gentle nudge every hour to breathe.');
    } catch (error) {
      setReminderSet(false);
      console.warn('Failed to schedule breathing reminder', error);
      Alert.alert(
        'Reminder not set',
        'We could not schedule the reminder. Check notification settings and try again.'
      );
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={s.root}>
      <LinearGradient colors={['#0d0518', '#120825', '#0d0518']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.kicker}>SE'KRET CALM</Text>
              <Text style={s.title}>Breathe with me 💜</Text>
              <Text style={s.subtitle}>slow down. just breathe.</Text>
            </View>
          </View>

          {/* Pattern picker */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.patternRail}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          >
            {PATTERN_KEYS.map(key => {
              const p = PATTERNS[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[s.patternChip, patternKey === key && s.patternChipActive]}
                  onPress={() => switchPattern(key)}
                >
                  <Text style={s.patternChipEmoji}>{p.emoji}</Text>
                  <Text style={[s.patternChipText, patternKey === key && s.patternChipTextActive]}>
                    {p.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Pattern description */}
          <Text style={s.patternSub}>{pattern.sub}</Text>

          {/* Animated circle */}
          <TouchableOpacity style={s.circleWrap} onPress={toggleRunning} activeOpacity={0.9}>
            <Animated.View style={[
              s.circleGlow,
              {
                opacity: glowOpacity,
                shadowColor: phaseColor,
                transform: [{ scale: glowScale }],
              },
            ]} />
            <Animated.View style={[
              s.circle,
              { backgroundColor: phaseColor, transform: [{ scale: circleScale }] },
            ]}>
              {running ? (
                <>
                  <Text style={s.circlePhaseText}>{step.label}</Text>
                  <Text style={s.circleCounter}>{counter}</Text>
                </>
              ) : (
                <Text style={s.circleTapText}>tap to start</Text>
              )}
            </Animated.View>
          </TouchableOpacity>

          {/* Step chips */}
          <View style={s.stepsRow}>
            {pattern.steps.map((st, i) => {
              const active = running && (stepIdx % pattern.steps.length) === i;
              return (
                <View
                  key={i}
                  style={[s.stepChip, active && { backgroundColor: `${PHASE_COLORS[st.phase]}30`, borderColor: PHASE_COLORS[st.phase] }]}
                >
                  <Text style={[s.stepChipText, active && { color: PHASE_COLORS[st.phase] }]}>
                    {st.label} {st.count}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Start/stop button */}
          <TouchableOpacity
            style={[s.startBtn, running && s.startBtnRunning]}
            onPress={toggleRunning}
          >
            <Text style={s.startBtnText}>{running ? '⏸  pause' : '▶  start'}</Text>
          </TouchableOpacity>

          {/* Loop nudge — shown after a breathing session ends */}
          {showNudge && !running && (
            <View style={s.nudgeWrap}>
              <Text style={s.nudgeText}>nice work. want to capture how you feel?</Text>
              <View style={s.nudgeRow}>
                <TouchableOpacity
                  style={s.nudgeBtn}
                  onPress={() => { setShowNudge(false); router.push('/(teen)/pages' as any); }}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Open Pages journal"
                >
                  <Text style={s.nudgeBtnText}>write in Pages</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowNudge(false)}
                  style={s.nudgeDismiss}
                  accessibilityRole="button"
                  accessibilityLabel="Dismiss"
                >
                  <Text style={s.nudgeDismissText}>not now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Calm Playlist */}
          <Text style={s.sectionTitle}>Calm Playlist ✦</Text>
          <Text style={s.sectionSub}>let the sound hold you</Text>
          {CALM_PLAYLIST.map(song => {
            const isActive = activeSong === song.id;
            const isPlaying = isActive && audio.state === 'playing';
            const isLoading = isActive && audio.state === 'loading';
            return (
              <TouchableOpacity
                key={song.id}
                style={[s.songRow, isActive && s.songRowActive]}
                onPress={() => handleSongPress(song)}
                activeOpacity={0.8}
              >
                <Text style={s.songEmoji}>{song.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.songLabel}>{song.label}</Text>
                  <Text style={s.songSub}>{song.sub}</Text>
                  {isActive && audio.durationMs > 0 && (
                    <View style={s.progressTrack}>
                      <View style={[s.progressFill, { width: `${audio.progress * 100}%` as any }]} />
                    </View>
                  )}
                </View>
                <Text style={s.songDur}>{song.duration}</Text>
                <View style={s.playBtn}>
                  <Text style={s.playBtnIcon}>
                    {isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Breathe Reminder */}
          <View style={s.reminderCard}>
            <Text style={s.reminderTitle}>Breathe Reminder</Text>
            <Text style={s.reminderSub}>set a gentle hourly nudge to breathe</Text>
            <TouchableOpacity
              style={[s.reminderBtn, reminderSet && s.reminderBtnSet]}
              onPress={reminderSet ? undefined : scheduleReminder}
            >
              <Text style={[s.reminderBtnText, reminderSet && s.reminderBtnTextSet]}>
                {reminderSet ? '✓ reminder active' : '+ add reminder'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quote */}
          <View style={s.quoteStrip}>
            <Text style={s.quoteOpen}>"</Text>
            <Text style={s.quoteText}>
              Your breath is your anchor.{'\n'}You can always come back to it. ✦
            </Text>
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0518' },
  safe: { flex: 1 },
  scroll: { paddingBottom: 80 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(168,85,247,0.12)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backBtnText: { color: '#e9d5ff', fontSize: 22, lineHeight: 26 },
  kicker: { color: '#a855f7', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#7c5a9e', fontSize: 13, marginTop: 4 },

  patternRail: { marginBottom: 8 },
  patternChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.08)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)' },
  patternChipActive: { backgroundColor: 'rgba(168,85,247,0.22)', borderColor: '#a855f7' },
  patternChipEmoji: { fontSize: 14 },
  patternChipText: { color: '#7c5a9e', fontSize: 12, fontWeight: '700' },
  patternChipTextActive: { color: '#e9d5ff' },
  patternSub: { color: '#5a3e72', fontSize: 12, textAlign: 'center', marginBottom: 20, marginTop: 4 },

  circleWrap: { alignItems: 'center', justifyContent: 'center', height: 260, marginBottom: 12 },
  circleGlow: {
    position: 'absolute',
    width: 220, height: 220, borderRadius: 110,
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 40, shadowOpacity: 1, elevation: 20,
    backgroundColor: 'transparent',
  },
  circle: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowRadius: 24, shadowOpacity: 0.6, shadowColor: '#a855f7', elevation: 14,
  },
  circlePhaseText: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  circleCounter: { color: '#fff', fontSize: 48, fontWeight: '900', lineHeight: 52 },
  circleTapText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' },

  stepsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 20 },
  stepChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(168,85,247,0.06)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.15)' },
  stepChipText: { color: '#5a3e72', fontSize: 11, fontWeight: '700' },

  startBtn: { marginHorizontal: 40, paddingVertical: 14, borderRadius: 28, backgroundColor: '#a855f7', alignItems: 'center', marginBottom: 28, shadowColor: '#a855f7', shadowOffset: { width: 0, height: 0 }, shadowRadius: 16, shadowOpacity: 0.5, elevation: 8 },
  startBtnRunning: { backgroundColor: '#7c3aed' },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  sectionTitle: { color: '#a855f7', fontSize: 16, fontWeight: '800', marginHorizontal: 16, marginBottom: 4 },
  sectionSub: { color: '#5a3e72', fontSize: 12, marginHorizontal: 16, marginBottom: 12 },

  songRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, marginBottom: 8, backgroundColor: 'rgba(168,85,247,0.06)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.18)', padding: 12 },
  songRowActive: { backgroundColor: 'rgba(168,85,247,0.14)', borderColor: 'rgba(168,85,247,0.5)' },
  songEmoji: { fontSize: 28, width: 36, textAlign: 'center' },
  songLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  songSub: { color: '#7c5a9e', fontSize: 11 },
  songDur: { color: '#5a3e72', fontSize: 11, marginRight: 4 },
  playBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(168,85,247,0.25)', alignItems: 'center', justifyContent: 'center' },
  playBtnIcon: { color: '#fff', fontSize: 14 },
  progressTrack: { height: 3, backgroundColor: 'rgba(168,85,247,0.2)', borderRadius: 2, marginTop: 4, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: '#a855f7', borderRadius: 2 },

  reminderCard: { marginHorizontal: 16, marginTop: 20, marginBottom: 12, backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', padding: 18 },
  reminderTitle: { color: '#a855f7', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  reminderSub: { color: '#7c5a9e', fontSize: 12, marginBottom: 14 },
  reminderBtn: { borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)', borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  reminderBtnSet: { backgroundColor: 'rgba(168,85,247,0.18)', borderColor: '#a855f7' },
  reminderBtnText: { color: '#7c5a9e', fontSize: 13, fontWeight: '700' },
  reminderBtnTextSet: { color: '#c4b5fd' },

  quoteStrip: { margin: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.2)', borderRadius: 14, padding: 18 },
  quoteOpen: { color: '#4a2e6a', fontSize: 32, lineHeight: 28, marginBottom: 4 },
  quoteText: { color: '#c4b5fd', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  nudgeWrap:        { marginHorizontal: 16, marginBottom: 20, backgroundColor: 'rgba(168,85,247,0.10)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.28)', borderRadius: 16, padding: 14 },
  nudgeText:        { color: '#c4b5fd', fontSize: 13, fontWeight: '600', marginBottom: 10 },
  nudgeRow:         { flexDirection: 'row', gap: 10 },
  nudgeBtn:         { flex: 1, backgroundColor: 'rgba(168,85,247,0.20)', borderRadius: 12, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)' },
  nudgeBtnText:     { color: '#f0ebff', fontSize: 13, fontWeight: '700' },
  nudgeDismiss:     { justifyContent: 'center', paddingHorizontal: 12 },
  nudgeDismissText: { color: '#5a3e72', fontSize: 12 },
});
// screens/CalmScreen.tsx
// Se'kret Bip — Se'kret Calm (Calm Me)
// Vision: Weighted blanket for the brain. Slow down. Box breathing.
// Cloud-led tools, soft purple, low-pressure. Comfort Mode escalates to here.
//
// Polish pass (2026-06-07):
//   - Time-of-day-aware hero backdrop via getRoomBg(character, time)
//   - Real LinearGradient hero overlay (replaces flat 45% black)
//   - Cloud companion presence pill + breath loop above hero
//   - selectedSekret prop wired through (optional, defaults to 'raylene')
//   - Character-aware tips + greeting + 'says' label
//   - Mood-tinted glow on breathing circle + 'says' card
//   - Curly quotes throughout (real Unicode glyphs in JSX text)
//   - Quote strip uses curly “ ” not straight "
//   - Staggered entrance on greeting + mood row + tools (140ms)
//
// Previous fixes preserved: A1/A2/A3, B1/B2/B3/B4/B5, C1/C2/C3, D1/D2

import React, { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { IMAGES, getRoomBg, normalizeCharacterKey, type TimeOfDay } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { MOOD_GLOW } from '../constants/moodGlow';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  View,
  Animated,
  Image,
  StyleSheet,
  Platform,
  Alert,
  Easing,
} from 'react-native';

// ── Assets ─────────────────────────────────────────────────────────────────
const CLOUD_HEADPHONES = IMAGES.cloudHeadphones;

// ── TIME OF DAY ────────────────────────────────────────────────────────────
function getTimeOfDay(hour: number): TimeOfDay {
  if (hour >= 5  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}
const TIME_BADGE: Record<TimeOfDay, string> = {
  morning: '☀️ morning',
  day:     '🌤️ day',
  evening: '🌆 evening',
  night:   '🌙 night',
};

const CALM_COMPANION_META = {
  raylene: { label: 'Suhana', emoji: '💜' },
  rylane: { label: 'Sy', emoji: '⚡' },
  cloud: { label: 'Cloud', emoji: '☁️' },
  night: { label: 'Night', emoji: '🌙' },
} as const;

// ── Constants ──────────────────────────────────────────────────────────────
const COMFORT_MESSAGES = [
  { emoji: '🌙', text: "You've survived every hard day so far. That matters." },
  { emoji: '☁️', text: 'Rest is productive too. You are allowed to pause.' },
  { emoji: '💙', text: "Someone is glad you're still here tonight." },
  { emoji: '🌧️', text: 'Bad moments are real. So is your strength.' },
  { emoji: '✨', text: "You don't need to be perfect to be loved." },
  { emoji: '🫶', text: 'Your feelings are allowed here.' },
  { emoji: '🕯️', text: 'Soft moment. Slow breath. Stay with me.' },
  { emoji: '💜', text: "Rest is productive, too. You don't have to earn peace. I'm proud of you for choosing you tonight." },
];

const MOOD_CHIPS = [
  { emoji: '😰', label: 'anxious' },
  { emoji: '⛈️', label: 'overwhelmed' },
  { emoji: '😢', label: 'sad' },
  { emoji: '😤', label: 'stressed' },
  { emoji: '😴', label: 'tired' },
  { emoji: '😌', label: 'calm' },
];

const CALM_TOOLS = [
  { emoji: '💜', label: 'Breathe\nwith me', sub: '1–5 min',         action: 'breathe' },
  { emoji: '🌿', label: 'Ground\nYourself',  sub: '3–7 min',         action: 'mindReset' },
  { emoji: '☁️', label: 'Cloud\nThoughts',  sub: 'say what\'s heavy',    action: 'cloud' },
  { emoji: '📝', label: 'Release\nIt Out',   sub: 'write + let go',       action: 'pages' },
  { emoji: '🌙', label: 'Sleep\nBetter',     sub: 'stories + sounds',     action: 'breathe' },
  { emoji: '🚨', label: 'SOS\nCalm Now',     sub: '30 sec reset',         action: 'comfort' },
];

// Replace uri values with real CDN audio URLs before shipping.
const CALM_PICKS = [
  { emoji: '🌧️', label: 'late night\nrain',   duration: '20 min', uri: '' },
  { emoji: '🌊', label: 'deep sleep\nwaves',   duration: '30 min', uri: '' },
  { emoji: '🎹', label: 'soft piano\n+ heart', duration: '25 min', uri: '' },
  { emoji: '📖', label: 'bedtime\nstory',      duration: '15 min', uri: '' },
  { emoji: '✨', label: 'healing\nfrequency',  duration: '20 min', uri: '' },
];

const DEFAULT_PLAN = [
  { id: 1, label: 'Breathe for 2 minutes',      time: '7:30 PM', done: false },
  { id: 2, label: "Write down what's heavy", time: '7:40 PM', done: false },
  { id: 3, label: 'Listen to a comfort sound',  time: '',        done: false },
  { id: 4, label: 'Affirm something kind',      time: '',        done: false },
];

const BOX_BREATHING_STEPS = [
  { label: 'breathe in', count: 4, direction: 'top' },
  { label: 'hold',       count: 4, direction: 'right' },
  { label: 'breathe out',count: 4, direction: 'bottom' },
  { label: 'hold',       count: 4, direction: 'left' },
];

const MORE_BREATHING = [
  { label: '4-7-8 Breathing',  sub: 'calm anxiety + help sleep', duration: '5 min' },
  { label: 'Calming Breath',   sub: 'quick reset for stress',    duration: '2 min' },
  { label: 'Deep Belly Breath',sub: 'release tension',           duration: '3 min' },
];

const CALM_PLAYLIST = [
  { emoji: '🔥', label: 'night rain',  sub: 'soothing rain sounds', duration: '20:00' },
  { emoji: '🎵', label: 'soft lo-fi',  sub: 'focus + unwind',       duration: '30:00' },
  { emoji: '🌊', label: 'ocean waves', sub: 'reset your mind',      duration: '25:00' },
];

// ── Props ──────────────────────────────────────────────────────────────────
interface CalmScreenProps {
  t:               Record<string, any>;
  mood:            string;
  setMood:         (mood: string) => void;
  setScreen:       (screen: string) => void;
  BottomNav:       React.ReactNode;
  selectedSekret?: string;
  onOpenBreathe?:  () => void;
}

// ── Component ──────────────────────────────────────────────────────────────
const PLAN_KEY = '@bip/calm_plan';

export function CalmScreen({
  t, mood, setMood, setScreen, BottomNav, selectedSekret = 'raylene', onOpenBreathe,
}: CalmScreenProps) {

  const breatheAnim = useRef(new Animated.Value(1)).current;
  const [comfortIdx, setComfortIdx] = useState(0);
  const [plan, setPlan] = useState(DEFAULT_PLAN);
  const [showBreathe, setShowBreathe] = useState(false);
  const [breatheStep, setBreatheStep] = useState(0);
  const [breatheRunning, setBreatheRunning] = useState(false);
  const [activePick, setActivePick] = useState<string | null>(null);
  const pickAudio = useAudioPlayer();
  const reduceMotion = useReducedMotion();

  const scrollRef = useRef<ScrollView>(null);
  const moodRowY  = useRef(0);

  // Character / time / mood ─────────────────────────────────────────────────
  const hour       = new Date().getHours();
  const timeOfDay  = getTimeOfDay(hour);
  const character  = normalizeCharacterKey(selectedSekret);
  const isRylane   = character === 'rylane';
  const charLabel  = CALM_COMPANION_META[character].label;
  const charEmoji  = CALM_COMPANION_META[character].emoji;
  const heroArt    = getRoomBg(character, timeOfDay);
  const moodKey    = mood?.toLowerCase?.() ?? mood;
  const moodGlow   = MOOD_GLOW[moodKey] ?? MOOD_GLOW[mood] ?? MOOD_GLOW.Neutral;

  // Greeting variant
  const greetCopy = isRylane
    ? { title: 'Take a slow breath. 💪', sub: 'you held it together today. respect.' }
    : { title: 'Take a deep breath. 💜', sub: 'you made it through today. that matters.' };

  // Animations ──────────────────────────────────────────────────────────────
  useEffect(() => {
    breatheAnim.stopAnimation();
    breatheAnim.setValue(1);
    if (reduceMotion) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.18, duration: 4000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1.0,  duration: 4000, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breatheAnim, reduceMotion]);

  // Box breathing step ticker
  useEffect(() => {
    if (!breatheRunning) return;
    const timer = setInterval(() => {
      setBreatheStep(s => (s + 1) % BOX_BREATHING_STEPS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [breatheRunning]);

  // Persist Calm Plan to AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(PLAN_KEY).then(saved => {
      if (saved) setPlan(JSON.parse(saved));
    }).catch(() => {});
  }, []);
  useEffect(() => {
    AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan)).catch(() => {});
  }, [plan]);

  // Companion presence breath
  const pillBreath = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    pillBreath.stopAnimation();
    pillBreath.setValue(0);
    if (reduceMotion) return undefined;

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pillBreath, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(pillBreath, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pillBreath, reduceMotion]);
  const pillStyle = reduceMotion ? {
    opacity: 1,
    transform: [{ scale: 1 }],
  } : {
    opacity: pillBreath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] }),
    transform: [{ scale: pillBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }],
  };

  // Staggered card entrance
  const cards = useRef([0, 0, 0, 0].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    cards.forEach(value => {
      value.stopAnimation();
      value.setValue(reduceMotion ? 1 : 0);
    });
    if (reduceMotion) return undefined;

    const entrance = Animated.stagger(140, cards.map(v =>
      Animated.timing(v, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true })
    ));
    entrance.start();
    return () => entrance.stop();
  }, [cards, reduceMotion]);
  const cardAnim = (i: number) => reduceMotion ? {
    opacity: 1,
    transform: [{ translateY: 0 }],
  } : {
    opacity: cards[i],
    transform: [{ translateY: cards[i].interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  };

  async function handlePickPlay(label: string, uri: string) {
    if (!uri) {
      if (onOpenBreathe) {
        onOpenBreathe();
        return;
      }
      Alert.alert('Audio library', 'Open the full breathing screen to use available calm tools.');
      return;
    }
    if (activePick === label) {
      if (pickAudio.state === 'playing') await pickAudio.pause();
      else await pickAudio.play();
      return;
    }
    setActivePick(label);
    await pickAudio.load(uri);
    await pickAudio.play();
  }

  const togglePlanItem = (id: number) => {
    setPlan(prev => prev.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  // ── Breathe sub-screen ─────────────────────────────────────────────────
  if (showBreathe) return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.breatheHeader}>
          <TouchableOpacity onPress={() => setShowBreathe(false)}>
            <Text style={[styles.backArrow, { color: t.soft }]}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.breatheTitle, { color: '#fff' }]}>Breathe with me {charEmoji}</Text>
            <Text style={[styles.breatheSub, { color: t.soft }]}>slow down. just breathe.</Text>
          </View>
        </View>

        <View style={[styles.boxCard, { backgroundColor: t.card, borderColor: t.accent, shadowColor: moodGlow }]}>
          <Text style={[styles.boxTitle, { color: '#fff' }]}>Box Breathing ✦</Text>
          <Text style={[styles.boxSub, { color: t.soft }]}>a simple way to calm your mind and body</Text>

          <View style={styles.boxDiagram}>
            <Text style={[styles.boxTop, { color: '#fff' }]}>breathe in{'\n'}4</Text>
            <View style={styles.boxMiddleRow}>
              <Text style={[styles.boxSide, { color: '#fff' }]}>hold{'\n'}4</Text>
              <Animated.View style={[
                styles.breatheCircleSm,
                { backgroundColor: t.accent, transform: [{ scale: breatheAnim }] },
              ]}>
                <Image source={CLOUD_HEADPHONES} style={styles.boxCloudImg} resizeMode="contain" />
              </Animated.View>
              <Text style={[styles.boxSide, { color: '#fff' }]}>hold{'\n'}4</Text>
            </View>
            <Text style={[styles.boxBottom, { color: '#fff' }]}>breathe out{'\n'}4</Text>
          </View>

          <TouchableOpacity
            style={[styles.pauseBtn, { backgroundColor: '#2d1b4e' }]}
            onPress={() => setBreatheRunning(r => !r)}
          >
            <Text style={[styles.pauseBtnText, { color: '#fff' }]}>
              {breatheRunning ? '⏸ pause' : '▶ start'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionTitle, { color: '#fff' }]}>More Breathing Exercises</Text>
        {MORE_BREATHING.map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.listRow, { backgroundColor: t.card, borderColor: t.accent }]}
            onPress={() => onOpenBreathe ? onOpenBreathe() : Alert.alert('Breathing exercises', 'Open the full breathing screen to choose this exercise.')}
          >
            <Image source={CLOUD_HEADPHONES} style={styles.listRowIcon} resizeMode="contain" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.listRowTitle, { color: '#fff' }]}>{item.label}</Text>
              <Text style={[styles.listRowSub, { color: t.soft }]}>{item.sub}</Text>
            </View>
            <Text style={[styles.listRowDur, { color: t.soft }]}>{item.duration}</Text>
            <Text style={{ color: t.soft }}>›</Text>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: '#fff' }]}>Calm Playlist ✦</Text>
        <Text style={[styles.sectionSub, { color: t.soft }]}>music + sounds to relax</Text>
        {CALM_PLAYLIST.map(item => (
          <TouchableOpacity
            key={item.label}
            style={[styles.listRow, { backgroundColor: t.card, borderColor: t.accent }]}
            onPress={() => onOpenBreathe ? onOpenBreathe() : Alert.alert('Audio library', 'Open the full breathing screen to use available calm tools.')}
          >
            <Text style={styles.playlistEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.listRowTitle, { color: '#fff' }]}>{item.label}</Text>
              <Text style={[styles.listRowSub, { color: t.soft }]}>{item.sub}</Text>
            </View>
            <Text style={[styles.listRowDur, { color: t.soft }]}>{item.duration}</Text>
            <Text style={{ color: t.soft }}>›</Text>
          </TouchableOpacity>
        ))}

        <View style={[styles.reminderCard, { backgroundColor: t.card, borderColor: t.accent }]}>
          <Text style={[styles.reminderTitle, { color: t.accent }]}>Breathe Reminder</Text>
          <Text style={[styles.reminderSub, { color: t.soft }]}>set a gentle reminder to breathe</Text>
          <TouchableOpacity
            style={[styles.addReminderBtn, { borderColor: t.accent }]}
            onPress={() => onOpenBreathe ? onOpenBreathe() : Alert.alert('Breathe Reminder', 'Open the full breathing screen to schedule a reminder.')}
          >
            <Text style={[styles.addReminderText, { color: t.soft }]}>+ Add Reminder</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.quoteStrip, { borderColor: t.accent }]}>
          <Text style={styles.quoteOpen}>“</Text>
          <Text style={[styles.quoteText, { color: '#fff' }]}>Your breath is your anchor.{'\n'}You can always come back to it. ✦</Text>
        </View>

      </ScrollView>
      {BottomNav}
    </View>
  );

  // ── Main calm screen ───────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <AmbientWeatherOverlay />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero header ── */}
        <View style={styles.heroWrap}>
          <Image source={heroArt} style={styles.heroImage} resizeMode="cover" blurRadius={1.5} />

          {/* Mood-tinted scrim */}
          <View style={[styles.heroMoodScrim, { backgroundColor: moodGlow + '14' }]} pointerEvents="none" />

          {/* Real gradient overlay */}
          <LinearGradient
            colors={['rgba(13,0,20,0.25)', 'rgba(13,0,20,0.55)', 'rgba(13,0,20,0.92)']}
            style={styles.heroGradient}
            pointerEvents="none"
          />

          {/* Time badge */}
          <View style={styles.timeBadge} pointerEvents="none">
            <Text style={styles.timeBadgeText}>{TIME_BADGE[timeOfDay]}</Text>
          </View>

          {/* Private badge */}
          <View style={[styles.privateBadge, { backgroundColor: 'rgba(13,0,20,0.7)' }]} pointerEvents="none">
            <Text style={styles.privateBadgeText}>🔒 private</Text>
          </View>

          {/* Companion presence pill */}
          <Animated.View testID="calm-presence-pill" style={[styles.presencePill, pillStyle]} pointerEvents="none">
            <Text style={styles.presenceText}>
              {charLabel}'s here · weighted blanket mode
            </Text>
          </Animated.View>

          <View style={styles.heroOverlay} pointerEvents="none">
            <Text style={[styles.heroTitle, { color: '#fff', textShadowColor: moodGlow + '99' }]}>
              Se'kret Calm 💜
            </Text>
            <Text style={[styles.heroLines, { color: t.soft }]}>
              your calm.{'\n'}your reset.{'\n'}your safe place.
            </Text>
          </View>
        </View>

        {/* Personalized greeting + check-in button */}
        <Animated.View testID="calm-greeting-card" style={[styles.greetRow, { backgroundColor: t.card, shadowColor: moodGlow }, cardAnim(0)]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.greetTitle, { color: '#fff' }]}>{greetCopy.title}</Text>
            <Text style={[styles.greetSub, { color: t.soft }]}>{greetCopy.sub}</Text>
          </View>
          <TouchableOpacity
            style={[styles.checkInBtn, { borderColor: t.accent }]}
            onPress={() => scrollRef.current?.scrollTo({ y: moodRowY.current, animated: true })}
          >
            <Text style={[styles.checkInText, { color: t.soft }]}>check-in ›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Mood check-in row */}
        <Animated.View
          onLayout={e => { moodRowY.current = e.nativeEvent.layout.y; }}
          style={cardAnim(1)}
        >
          <Text style={[styles.sectionTitle, { color: t.accent }]}>How are you feeling right now?</Text>
          <View style={styles.moodRow}>
            {MOOD_CHIPS.map(chip => {
              const selected = mood?.toLowerCase?.() === chip.label;
              return (
                <TouchableOpacity
                  key={chip.label}
                  style={[
                    styles.moodChip,
                    { backgroundColor: selected ? t.accent : t.card, borderColor: t.accent },
                  ]}
                  onPress={() => setMood(chip.label)}
                >
                  <Text style={styles.moodEmoji}>{chip.emoji}</Text>
                  <Text style={[styles.moodLabel, { color: selected ? '#fff' : t.soft }]}>{chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ── Calm Tools grid ── */}
        <Animated.View style={cardAnim(2)}>
          <View style={styles.toolsHeader}>
            <Text style={[styles.sectionTitle, { color: t.accent }]}>Calm Tools ✦</Text>
            <TouchableOpacity onPress={() => setScreen('more')}>
              <Text style={[styles.seeAll, { color: t.soft }]}>see all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.toolsScroll}>
            {CALM_TOOLS.map(tool => (
              <TouchableOpacity
                key={tool.label}
                style={[styles.toolCard, { backgroundColor: t.card, borderColor: t.accent }]}
                onPress={() => {
                  if (tool.action === 'breathe') {
                    if (onOpenBreathe) { onOpenBreathe(); return; }
                    setShowBreathe(true); return;
                  }
                  if (tool.action) setScreen(tool.action);
                }}
              >
                <Text style={styles.toolEmoji}>{tool.emoji}</Text>
                <Text style={[styles.toolLabel, { color: '#fff' }]}>{tool.label}</Text>
                <Text style={[styles.toolSub, { color: t.soft }]}>{tool.sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* Today's Calm Plan */}
        <Animated.View style={cardAnim(3)}>
          <View style={styles.toolsHeader}>
            <Text style={[styles.sectionTitle, { color: t.accent }]}>Today's Calm Plan 💜</Text>
            <TouchableOpacity onPress={() => setPlan(DEFAULT_PLAN.map(item => ({ ...item, done: false })))}>
              <Text style={[styles.seeAll, { color: t.soft }]}>reset plan ↺</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.sectionSub, { color: t.soft }]}>small steps. big difference.</Text>
          <View style={[styles.planCard, { backgroundColor: t.card, borderColor: t.accent }]}>
            {plan.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.planRow}
                onPress={() => togglePlanItem(item.id)}
              >
                <View style={[styles.planCheck, { borderColor: t.accent, backgroundColor: item.done ? t.accent : 'transparent' }]}>
                  {item.done && <Text style={styles.planCheckMark}>✓</Text>}
                </View>
                <Text style={[styles.planLabel, { color: item.done ? t.soft : '#fff', textDecorationLine: item.done ? 'line-through' : 'none' }]}>
                  {item.label}
                </Text>
                {item.time ? (
                  <Text style={[styles.planTime, { color: t.soft }]}>{item.time} ›</Text>
                ) : (
                  <Text style={[styles.planTime, { color: '#4B5563' }]}>—</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>

        {/* ── Breathing circle teaser ── */}
        <TouchableOpacity style={styles.circleWrap} onPress={() => onOpenBreathe ? onOpenBreathe() : setShowBreathe(true)}>
          <Animated.View testID="calm-breathe-pulse" style={[
            styles.circle,
            {
              transform: [{ scale: breatheAnim }],
              backgroundColor: t.accent,
              shadowColor: moodGlow,
              shadowOpacity: 0.7,
              shadowRadius: 28,
              elevation: 14,
            },
          ]}>
            <Image source={CLOUD_HEADPHONES} style={styles.circleImg} resizeMode="contain" />
            <Text style={styles.circleTextSmall}>Breathe</Text>
          </Animated.View>
          <Text style={[styles.circleHint, { color: t.soft }]}>tap to open breathing</Text>
        </TouchableOpacity>

        {/* Calm Picks */}
        <View style={styles.toolsHeader}>
          <Text style={[styles.sectionTitle, { color: t.accent }]}>Calm Picks for You ✦</Text>
          <TouchableOpacity onPress={() => onOpenBreathe ? onOpenBreathe() : setShowBreathe(true)}>
            <Text style={[styles.seeAll, { color: t.soft }]}>see all</Text>
          </TouchableOpacity>
        </View>
        <Text style={[styles.sectionSub, { color: t.soft }]}>we picked these just for your vibe</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.picksScroll}>
          {CALM_PICKS.map(pick => {
            const isActive  = activePick === pick.label;
            const isPlaying = isActive && pickAudio.state === 'playing';
            const isLoading = isActive && pickAudio.state === 'loading';
            return (
              <TouchableOpacity
                key={pick.label}
                style={[styles.pickCard, { backgroundColor: t.card, borderColor: isActive ? t.accent : t.accent + '55' }]}
                onPress={() => handlePickPlay(pick.label, pick.uri)}
                activeOpacity={0.75}
              >
                <View style={[styles.pickPlayCircle, isActive && { backgroundColor: t.accent + '44' }]}>
                  <Text style={styles.pickPlayIcon}>{isLoading ? '⏳' : isPlaying ? '⏸' : '▶'}</Text>
                </View>
                {isActive && pickAudio.durationMs > 0 && (
                  <View style={styles.pickProgress}>
                    <View style={[styles.pickProgressFill, { width: `${pickAudio.progress * 100}%` as any, backgroundColor: t.accent }]} />
                  </View>
                )}
                <Text style={[styles.pickLabel, { color: '#fff' }]}>{pick.label}</Text>
                <Text style={[styles.pickDur, { color: t.soft }]}>{pick.duration}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Character says ── */}
        <Text style={[styles.sectionTitle, { color: t.accent }]}>{charLabel} says {charEmoji}</Text>
        <View style={[styles.sekretSaysCard, { backgroundColor: t.card, borderColor: t.accent, shadowColor: moodGlow }]}>
          <Text style={[styles.sekretSaysText, { color: '#E2E8F0' }]}>
            {COMFORT_MESSAGES[comfortIdx].text}
          </Text>
          <View style={styles.sekretSaysRow}>
            <TouchableOpacity onPress={() => setComfortIdx(i => (i + 1) % COMFORT_MESSAGES.length)}>
              <Text style={styles.sekretSaysHeart}>{charEmoji}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigate to calm tools */}
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.accent, shadowColor: moodGlow }]}
          onPress={() => setScreen('mindReset')}
        >
          <Text style={styles.btnText}>🌙 7-Min Mind Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.accent, shadowColor: moodGlow }]}
          onPress={() => setScreen('bodyReset')}
        >
          <Text style={styles.btnText}>🫧 7-Min Body Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: t.accent, shadowColor: moodGlow }]}
          onPress={() => setScreen('comfort')}
        >
          <Text style={styles.btnText}>🚨 Comfort Mode</Text>
        </TouchableOpacity>

      </ScrollView>
      {BottomNav}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:              { flex: 1 },
  scroll:            { paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  // Hero
  heroWrap:          { width: '100%', height: Platform.OS === 'web' ? 190 : 260, position: 'relative', marginBottom: 0, overflow: 'hidden' },
  heroImage:         { width: '100%', height: '100%' },
  heroMoodScrim:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  heroGradient:      { position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 },
  heroOverlay:       { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16 },
  heroTitle:         { fontSize: 26, fontWeight: '900', marginBottom: 4, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
  heroLines:         { fontSize: 13, lineHeight: 20 },
  timeBadge:         { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 36, left: 14, backgroundColor: 'rgba(13,9,20,0.65)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  timeBadgeText:     { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  privateBadge:      { position: 'absolute', top: Platform.OS === 'ios' ? 52 : 36, right: 14, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  privateBadgeText:  { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  presencePill:      {
    position: 'absolute', top: Platform.OS === 'ios' ? 88 : 72, right: 14,
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderColor: 'rgba(168,85,247,0.45)', borderWidth: 1,
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  presenceText:      { color: '#e9d5ff', fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  // Greeting
  greetRow:          {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 14, marginHorizontal: 16, borderRadius: 18,
    shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  greetTitle:        { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  greetSub:          { fontSize: 12 },
  checkInBtn:        { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 8 },
  checkInText:       { fontSize: 12, fontWeight: '600' },

  // Mood row
  sectionTitle:      { fontSize: 18, fontWeight: '800', marginHorizontal: 16, marginTop: 16, marginBottom: 10 },
  sectionSub:        { fontSize: 12, marginHorizontal: 16, marginTop: -6, marginBottom: 10 },
  moodRow:           { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 8 },
  moodChip:          { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', minWidth: 70 },
  moodEmoji:         { fontSize: 22, marginBottom: 3 },
  moodLabel:         { fontSize: 11, fontWeight: '600' },

  // Calm tools
  toolsHeader:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 10 },
  seeAll:            { fontSize: 13, fontWeight: '600' },
  toolsScroll:       { paddingLeft: 16, marginBottom: 14 },
  toolCard:          { borderWidth: 1, borderRadius: 18, padding: 14, marginRight: 10, width: 110, alignItems: 'center' },
  toolEmoji:         { fontSize: 28, marginBottom: 6 },
  toolLabel:         { fontSize: 12, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  toolSub:           { fontSize: 10, textAlign: 'center' },

  // Today's plan
  planCard:          { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 12, marginBottom: 16 },
  planRow:           { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  planCheck:         { width: 20, height: 20, borderRadius: 10, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  planCheckMark:     { color: '#fff', fontSize: 11, fontWeight: '900' },
  planLabel:         { flex: 1, fontSize: 13 },
  planTime:          { fontSize: 11 },

  // Breathing circle
  circleWrap:        { alignItems: 'center', marginVertical: 20 },
  circle:            { width: 170, height: 170, borderRadius: 85, justifyContent: 'center', alignItems: 'center', shadowOffset: { width: 0, height: 0 } },
  circleImg:         { width: 90, height: 90 },
  circleTextSmall:   { color: '#fff', fontSize: 16, marginTop: 6, fontWeight: 'bold' },
  circleHint:        { fontSize: 12, marginTop: 10 },

  // Calm picks
  picksScroll:       { paddingLeft: 16, marginBottom: 16 },
  pickCard:          { borderWidth: 1, borderRadius: 18, padding: 12, marginRight: 10, width: 110, alignItems: 'center' },
  pickPlayCircle:    { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  pickPlayIcon:      { color: '#fff', fontSize: 16 },
  pickLabel:         { fontSize: 11, fontWeight: '700', textAlign: 'center', marginBottom: 3 },
  pickDur:           { fontSize: 10, textAlign: 'center' },
  pickProgress:      { height: 3, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden', width: '90%', marginBottom: 4 },
  pickProgressFill:  { height: 3, borderRadius: 2 },

  // Se'kret says
  sekretSaysCard:    {
    marginHorizontal: 16, borderRadius: 18, borderWidth: 1, padding: 18, marginBottom: 16,
    shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  sekretSaysText:    { fontSize: 15, lineHeight: 24, marginBottom: 14, fontStyle: 'italic' },
  sekretSaysRow:     { flexDirection: 'row', justifyContent: 'flex-end' },
  sekretSaysHeart:   { fontSize: 22 },

  // Nav buttons
  btn:               {
    padding: 16, borderRadius: 18, marginHorizontal: 16, marginBottom: 12, alignItems: 'center',
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 0 },
  },
  btnText:           { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Breathe sub-screen
  breatheHeader:     { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 60 : 36, paddingBottom: 12, gap: 12 },
  backArrow:         { fontSize: 22, fontWeight: '300', paddingRight: 4 },
  breatheTitle:      { fontSize: 22, fontWeight: '800' },
  breatheSub:        { fontSize: 13 },
  boxCard:           {
    margin: 16, borderRadius: 20, borderWidth: 1, padding: 20,
    shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
  },
  boxTitle:          { fontSize: 20, fontWeight: '800', marginBottom: 4 },
  boxSub:            { fontSize: 12, marginBottom: 20 },
  boxDiagram:        { alignItems: 'center' },
  boxTop:            { textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 12 },
  boxMiddleRow:      { flexDirection: 'row', alignItems: 'center', gap: 20 },
  boxSide:           { textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '700', width: 50 },
  breatheCircleSm:   { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center' },
  boxCloudImg:       { width: 70, height: 70 },
  boxBottom:         { textAlign: 'center', color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 12 },
  pauseBtn:          { borderRadius: 24, paddingVertical: 12, paddingHorizontal: 32, alignSelf: 'center', marginTop: 20 },
  pauseBtnText:      { fontSize: 16, fontWeight: '700' },
  listRow:           { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 8, borderRadius: 14, borderWidth: 1, padding: 12, gap: 10 },
  listRowIcon:       { width: 36, height: 36, borderRadius: 18 },
  listRowTitle:      { fontSize: 14, fontWeight: '700' },
  listRowSub:        { fontSize: 11, marginTop: 2 },
  listRowDur:        { fontSize: 12, marginRight: 6 },
  playlistEmoji:     { fontSize: 32, width: 40, textAlign: 'center' },
  reminderCard:      { margin: 16, borderRadius: 18, borderWidth: 1, padding: 18 },
  reminderTitle:     { fontSize: 16, fontWeight: '800', marginBottom: 4 },
  reminderSub:       { fontSize: 12, marginBottom: 14 },
  addReminderBtn:    { borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  addReminderText:   { fontSize: 14, fontWeight: '600' },
  quoteStrip:        { margin: 16, borderWidth: 1, borderRadius: 14, padding: 18 },
  quoteOpen:         { color: '#7c6899', fontSize: 32, lineHeight: 28, marginBottom: 4 },
  quoteText:         { color: '#fff', fontSize: 15, lineHeight: 24, textAlign: 'center' },
});

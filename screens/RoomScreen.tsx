import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
  Easing,
  ImageSourcePropType,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IMAGES, AVATARS as THEME_AVATARS, THEME_PACKS, getRoomPhase, getRoomScene, type Character, type RoomPhase, type VibeKey } from '../constants/theme';
import type { CompanionState } from '../types/sekretCompanion';
import type { OracleProfile } from '../services/oracleDiscovery';

const { width, height } = Dimensions.get('window');

const DEBUG_HOTSPOTS = false;

// ─── Types ────────────────────────────────────────────────────────────────────

// Character type imported from constants/theme (raylene | rylane | cloud | night)
type TimeOfDay  = 'morning' | 'day' | 'evening' | 'night';
type Pose       = 'neutral' | 'happy' | 'thinking' | 'writing' | 'window' | 'fullbody';
type Mood       = 'Happy' | 'Sad' | 'Angry' | 'Tired' | 'Neutral' | string;

// RoomTarget kept as internal type for hotspot definitions.
// setScreen prop is widened to string to match index.tsx.
type RoomTarget =
  | 'home' | 'pages' | 'circle' | 'bippin2' | 'comfort' | 'calm'
  | 'voiceBip' | 'sekret' | 'cloudThoughts' | 'bridge' | 'parentBridge' | 's2tell'
  | 'settings' | 'more' | 'mindReset' | 'bodyReset' | 'periodCalendar' | 'dashboard';

type Hotspot = {
  id: string;
  label: string;
  target: RoomTarget;
  style: ViewStyle;
  hint?: string;
  pulse?: boolean;
};

type AssetMap  = Record<TimeOfDay, ImageSourcePropType>;
type AvatarMap = Record<Pose, ImageSourcePropType>;

// ─── Room / Avatar assets ─────────────────────────────────────────────────────

const ROOM_PHASE_OVERLAYS: Record<RoomPhase, string> = {
  day:       'rgba(255,225,180,0.08)',
  evening:   'rgba(91,45,120,0.18)',
  rain:      'rgba(35,85,125,0.30)',
  night:     'rgba(20,10,55,0.28)',
  deepNight: 'rgba(5,3,24,0.48)',
};

// Character-specific atmosphere tints layered on top of phase overlay
const CHARACTER_OVERLAYS: Record<Character, string> = {
  raylene: 'transparent',
  rylane:  'transparent',
  cloud:   'rgba(155,185,255,0.20)',  // soft sky-blue floating tint
  night:   'rgba(6,2,22,0.45)',       // deep-violet midnight tint
};

const AVATARS: Record<Character, AvatarMap> = THEME_AVATARS as Record<Character, AvatarMap>;

const FALLBACK_AVATAR: Record<Character, ImageSourcePropType> = {
  raylene: IMAGES.rayleneNeutral,
  rylane:  IMAGES.rylaneNeutral,
  cloud:   IMAGES.cloudAvatarNeutral,
  night:   IMAGES.nightAvatarNeutral,
};

// ─── Hotspot maps ─────────────────────────────────────────────────────────────
// Fixed: cloudThoughts hotspots now target 'cloudThoughts' (was incorrectly 'calm')
// Fixed: Se'kret apostrophe in hint strings — use escaped version

const RAYLENE_HOTSPOTS: Hotspot[] = [
  {
    id: 'pages',
    label: 'Journal 📖',
    target: 'pages',
    hint: 'tap the journal',
    pulse: true,
    style: { bottom: '10%', left: '14%', width: '36%', height: '18%' },
  },
  {
    id: 'voiceBip',
    label: 'Headphones 🎙️',
    target: 'voiceBip',
    hint: 'tap headphones',
    style: { bottom: '14%', left: '2%', width: '18%', height: '12%' },
  },
  {
    id: 'cloudThoughts',
    label: 'Cloud Lamp ☁️',
    target: 'cloudThoughts',
    hint: 'tap the cloud',
    pulse: true,
    style: { top: '38%', left: '26%', width: '14%', height: '12%' },
  },
  {
    id: 'comfort',
    label: 'Bed 🌙',
    target: 'comfort',
    hint: 'tap the bed',
    style: { top: '38%', right: '6%', width: '34%', height: '34%' },
  },
  {
    id: 'bippin2',
    label: 'Growth Board ⭐',
    target: 'bippin2',
    hint: 'tap the board',
    style: { top: '4%', left: '22%', width: '24%', height: '26%' },
  },
  {
    id: 'circle',
    label: 'Photo Wall 🌐',
    target: 'circle',
    hint: 'tap the wall',
    style: { top: '4%', right: '0%', width: '18%', height: '55%' },
  },
  {
    id: 'moodCheckIn',
    label: 'Mood Check-In 🌤️',
    target: 'dashboard',
    hint: 'tap the window',
    pulse: true,
    style: { top: '4%', left: '0%', width: '18%', height: '50%' },
  },
  {
    id: 'bridge',
    label: 'Bridge 🌉',
    target: 'bridge',
    hint: 'tap the bridge object',
    style: { bottom: '24%', right: '36%', width: '16%', height: '12%' },
  },
  {
    id: 'summon',
    label: "Se’kret 💜",
    target: 'sekret',
    hint: "call Se’kret",
    style: { top: '38%', left: '4%', width: '20%', height: '30%' },
  },
];

const RYLANE_HOTSPOTS: Hotspot[] = [
  {
    id: 'pages',
    label: 'Journal 📖',
    target: 'pages',
    hint: 'tap the journal',
    pulse: true,
    style: { bottom: '8%', left: '18%', width: '38%', height: '20%' },
  },
  {
    id: 'voiceBip',
    label: 'Headphones 🎙️',
    target: 'voiceBip',
    hint: 'tap headphones',
    style: { top: '40%', left: '28%', width: '14%', height: '10%' },
  },
  {
    id: 'cloudThoughts',
    label: 'Cloud Neon ☁️',
    target: 'cloudThoughts',
    hint: 'tap the cloud',
    pulse: true,
    style: { top: '26%', left: '36%', width: '14%', height: '12%' },
  },
  {
    id: 'comfort',
    label: 'Bed 🌙',
    target: 'comfort',
    hint: 'tap the bed',
    style: { top: '36%', right: '6%', width: '36%', height: '36%' },
  },
  {
    id: 'bippin2',
    label: 'Growth Board ⭐',
    target: 'bippin2',
    hint: 'tap the board',
    style: { top: '2%', left: '26%', width: '24%', height: '28%' },
  },
  {
    id: 'circle',
    label: 'Photo Wall 🌐',
    target: 'circle',
    hint: 'tap the wall',
    style: { top: '2%', right: '0%', width: '20%', height: '50%' },
  },
  {
    id: 'moodCheckIn',
    label: 'Mood Check-In 🌤️',
    target: 'dashboard',
    hint: 'tap the window',
    pulse: true,
    style: { top: '2%', left: '0%', width: '20%', height: '55%' },
  },
  {
    id: 'bridge',
    label: 'Bridge 🌉',
    target: 'bridge',
    hint: 'tap the bridge object',
    style: { bottom: '24%', right: '36%', width: '16%', height: '12%' },
  },
  {
    id: 'summon',
    label: "Se’kret ⚡",
    target: 'sekret',
    hint: "call Se’kret",
    style: { top: '30%', left: '2%', width: '24%', height: '36%' },
  },
];

// Cloud Room: floating thought-space — no walls, cloud islands, headphones, journal drifting
const CLOUD_HOTSPOTS: Hotspot[] = [
  {
    id: 'headphones',
    label: 'Headphones 🎧',
    target: 'calm',
    hint: 'tap headphones',
    pulse: true,
    style: { top: '28%', left: '8%', width: '24%', height: '18%' },
  },
  {
    id: 'pages',
    label: 'Floating Journal 📖',
    target: 'pages',
    hint: 'tap the journal',
    pulse: true,
    style: { top: '44%', left: '32%', width: '36%', height: '20%' },
  },
  {
    id: 'voiceBip',
    label: 'Cloud Mic 🎤',
    target: 'voiceBip',
    hint: 'tap the mic',
    style: { top: '22%', right: '10%', width: '20%', height: '16%' },
  },
  {
    id: 'cloudThoughts',
    label: 'Big Cloud ☁️',
    target: 'cloudThoughts',
    hint: 'float up here',
    pulse: true,
    style: { top: '8%', left: '22%', width: '56%', height: '20%' },
  },
  {
    id: 'summon',
    label: "Cloud Se'kret ☁️",
    target: 'sekret',
    hint: 'tap to float',
    style: { top: '62%', left: '18%', width: '64%', height: '22%' },
  },
];

// Night Room: midnight refuge — city skyline, huge window, 2AM watching energy
const NIGHT_HOTSPOTS: Hotspot[] = [
  {
    id: 'window',
    label: 'Window 🪟',
    target: 'cloudThoughts',
    hint: 'look out',
    pulse: true,
    style: { top: '8%', left: '12%', width: '62%', height: '42%' },
  },
  {
    id: 'pages',
    label: 'Journal 📖',
    target: 'pages',
    hint: 'tap the journal',
    pulse: true,
    style: { bottom: '18%', left: '8%', width: '32%', height: '18%' },
  },
  {
    id: 'voiceBip',
    label: 'Mic 🎤',
    target: 'voiceBip',
    hint: 'speak it',
    style: { bottom: '18%', right: '10%', width: '18%', height: '14%' },
  },
  {
    id: 'dreamCloud',
    label: 'Dream Cloud ☁️',
    target: 'cloudThoughts',
    hint: 'tap the cloud',
    style: { top: '10%', right: '6%', width: '18%', height: '14%' },
  },
  {
    id: 'bridge',
    label: 'Tiny Bridge 🌉',
    target: 'bridge',
    hint: 'reach out',
    style: { bottom: '34%', left: '38%', width: '24%', height: '12%' },
  },
  {
    id: 'summon',
    label: "Night Se'kret 🌙",
    target: 'sekret',
    hint: 'tap to wake',
    style: { top: '52%', left: '6%', width: '28%', height: '30%' },
  },
];

// ─── Pure helpers (defined outside component — no recreation per render) ──────

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

const getPresenceLine = (character: Character, timeOfDay: TimeOfDay, oracleProfile?: OracleProfile | null): string => {
  const sessions = oracleProfile?.sessionCount ?? 0;
  if (sessions > 0) {
    if (character === 'night') {
      if (sessions >= 3) return timeOfDay === 'night'
        ? 'Night is here. feels different when someone actually knows you.'
        : 'Night is watching. still thinking about what you said.';
      return 'Night is here. learning how you carry things.';
    }
    if (character === 'cloud' && sessions >= 2) return 'Cloud is drifting. thinking about what you shared.';
    if (character === 'raylene' && sessions >= 2) return 'Raylene is nearby. she remembers.';
  }
  if (character === 'cloud') return 'Cloud is drifting nearby.';
  if (character === 'night') return timeOfDay === 'night' ? 'Night is here. Just us awake.' : 'Night is watching over.';
  if (timeOfDay === 'night') return 'Cloud is floating around.';
  if (character === 'raylene') return 'Raylene is nearby.';
  return 'Rylane is posted up.';
};

const getRoomCopy = (character: Character, timeOfDay: TimeOfDay): string => {
  const map: Record<Character, Record<TimeOfDay, string>> = {
    raylene: {
      morning: 'Soft light. Quiet thoughts. Come sit.',
      day:     'Room open. Energy low-key alive.',
      evening: 'Golden hour got the room feeling honest.',
      night:   "Heavy night. The room's still here with you.",
    },
    rylane: {
      morning: 'Early light, late thoughts. We move gentle.',
      day:     "Room's awake. Let's get into it.",
      evening: 'Evening\u2019s here. That means real talk time.',
      night:   'Late night mode. Keep it low and real.',
    },
    cloud: {
      morning: 'Floating above the noise. Start here.',
      day:     'Thoughts drift. Let them land where they want.',
      evening: 'Quieter now. The cloud has space for you.',
      night:   'Up here the world is very far down.',
    },
    night: {
      morning: 'The world is waking. You stayed up.',
      day:     'Day is loud. But this window stays open.',
      evening: 'Getting late. Good. This is our time.',
      night:   'Everybody asleep. Only us awake.',
    },
  };
  return map[character][timeOfDay];
};

const getPose = (mood: Mood, timeOfDay: TimeOfDay, isFirstVisit: boolean, isSekretVisible: boolean): Pose => {
  if (isFirstVisit && isSekretVisible) return 'fullbody';
  if (timeOfDay === 'night' || mood === 'Sad' || mood === 'Tired') return 'window';
  if (mood === 'Happy') return 'happy';
  if (mood === 'Angry') return 'thinking';
  return 'neutral';
};

const getGreeting = (character: Character, mood: Mood, timeOfDay: TimeOfDay, isVisible: boolean): string => {
  const moodKey = String(mood).toLowerCase();

  // Cloud \u2014 floats, observes, rarely pushes
  if (character === 'cloud') {
    if (moodKey.includes('sad'))   return 'Something feels heavy. You don\u2019t have to explain it.';
    if (moodKey.includes('tired')) return 'Tired. Yeah. Float here for a bit.';
    if (moodKey.includes('angry')) return 'It\u2019s loud in there. Up here it\u2019s quiet.';
    if (moodKey.includes('happy')) return 'Something light is happening. I noticed.';
    if (timeOfDay === 'night')     return 'Late and drifting. That\u2019s okay.';
    return 'Brain loud? Float it up here.';
  }

  // Night \u2014 2AM energy, presence over conversation
  if (character === 'night') {
    if (moodKey.includes('sad'))   return 'Still up because of it. I know.';
    if (moodKey.includes('tired')) return 'Exhausted but can\u2019t sleep. This window stays open.';
    if (moodKey.includes('angry')) return 'Something\u2019s burning. Let it sit here.';
    if (moodKey.includes('happy')) return 'You\u2019re up late and smiling. That\u2019s rare. Good.';
    if (timeOfDay === 'night')     return 'Just us. No performance required.';
    return 'The world is asleep. You found your way here.';
  }

  if (isVisible && timeOfDay === 'night') {
    return character === 'raylene'
      ? 'Come sit. We not doing the most tonight.'
      : 'Aight, you here now. Let\u2019s keep it real.';
  }

  if (moodKey.includes('sad')) {
    return character === 'raylene'
      ? 'Come sit. I already know it\u2019s been a lot.'
      : 'Nah, I can tell something hit you. Talk to me.';
  }

  if (moodKey.includes('angry')) {
    return character === 'raylene'
      ? 'Hold on. Who got you like this?'
      : 'Okay, who irritated us today? \uD83D\uDE12';
  }

  if (moodKey.includes('tired')) {
    return character === 'raylene'
      ? 'You look tired-tired. Sit down.'
      : 'You been running on fumes huh. Rest your head.';
  }

  if (moodKey.includes('happy')) {
    return character === 'raylene'
      ? 'Look at you. Something good happened.'
      : 'Aye, that face says good news.';
  }

  if (timeOfDay === 'morning') {
    return character === 'raylene'
      ? 'Morning. Tell me the real version of today.'
      : 'Morning check-in. What we on?';
  }

  if (timeOfDay === 'evening') {
    return character === 'raylene'
      ? 'Evening got truth in it. Start wherever.'
      : 'You made it to evening. That counts.';
  }

  if (timeOfDay === 'night') {
    return character === 'raylene'
      ? 'Heavy night huh. You don\u2019t gotta carry it alone.'
      : 'Late night thoughts? Yeah, I figured.';
  }

  return character === 'raylene'
    ? 'Come sit. Tell me the real version.'
    : 'Aight. What we bippin about?';
};

const safeImage = (
  source: ImageSourcePropType | undefined,
  fallback: ImageSourcePropType
): ImageSourcePropType => source ?? fallback;

// ─── Props ────────────────────────────────────────────────────────────────────

interface RoomScreenProps {
  mood: Mood;
  selectedSekret: string;           // sekret key: 'soft' | 'rylane' | 'cloud' | 'night'
  setSelectedSekret: (value: string) => void;
  setScreen: (screen: string) => void;
  t: Record<string, any>;
  updateRoomMemory?: (patch: Record<string, any>) => void;
  vibe: VibeKey;
  BottomNav: React.ReactNode;
  companion?: CompanionState;
  sekretMode?: string;
  oracleProfile?: OracleProfile | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RoomScreen({
  mood,
  selectedSekret,
  setSelectedSekret,
  setScreen,
  t,
  updateRoomMemory,
  vibe,
  BottomNav,
  companion,
  sekretMode,
  oracleProfile,
}: RoomScreenProps) {

  // ─── Derived ────────────────────────────────────────────────────────────
  const character: Character =
    selectedSekret === 'rylane' ? 'rylane' :
    selectedSekret === 'cloud'  ? 'cloud'  :
    selectedSekret === 'night'  ? 'night'  :
    'raylene';

  // Resolve the room once for the current visit. Always use the selected
  // character's room at the current time of day — rain vibe overrides time.
  const now = useMemo(() => new Date(), []);
  const timeOfDay = useMemo<TimeOfDay>(() => getTimeOfDay(), [now]);
  const roomPhase = useMemo(() => getRoomPhase(now, vibe === 'rain' ? 'rain' : undefined), [now, vibe]);
  const vibePack = THEME_PACKS[vibe];
  // Room background is always the character's own room at current phase,
  // keeping the world consistent regardless of cosmetic vibe choice.
  const roomImage = getRoomScene(character, roomPhase);

  const hotspots = useMemo(() => {
    if (character === 'rylane') return RYLANE_HOTSPOTS;
    if (character === 'cloud')  return CLOUD_HOTSPOTS;
    if (character === 'night')  return NIGHT_HOTSPOTS;
    return RAYLENE_HOTSPOTS;
  }, [character]);

  // ─── State ──────────────────────────────────────────────────────────────
  const [isSekretVisible, setIsSekretVisible] = useState(false);
  const [isFirstVisit, setIsFirstVisit]       = useState(true);  // persisted below
  const [showGuide, setShowGuide]             = useState(false);
  const [hintSpot, setHintSpot]               = useState<string | null>(null);
  const [greeting, setGreeting]               = useState(
    () => getGreeting(character, mood, timeOfDay, false)
  );

  const pose = getPose(mood, timeOfDay, isFirstVisit, isSekretVisible);

  const rememberedLine = useMemo(() => {
    if (!companion) return null;

    const repeatedMood = companion.checkIn?.id.includes('repeated-emotion');
    const moodKey = String(mood).toLowerCase();
    if (repeatedMood && moodKey.includes('tired')) {
      return "You've been calling a lot of things tired lately. I peeped that.";
    }
    if (repeatedMood && moodKey) {
      return `${mood} keeps pulling up lately. I remember.`;
    }

    const topic = companion.memorySummary.commonTopics[0];
    if (topic && companion.memorySummary.journalsWritten >= 2) {
      return `You keep circling back to ${topic}. We can stay with that part.`;
    }
    if (companion.memorySummary.streakDays >= 3) {
      return `You came back ${companion.memorySummary.streakDays} days straight. Lowkey proud of you.`;
    }
    if (companion.memorySummary.conversations >= 3) {
      return companion.presenceMessage;
    }
    return null;
  }, [companion, mood]);

  // ─── AsyncStorage: first-visit persistence ───────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem('sekretbip_first_visit_done').then(done => {
      if (done === 'true') setIsFirstVisit(false);
    });
  }, []);

  // ─── Animations ─────────────────────────────────────────────────────────
  const fadeAnim    = useRef(new Animated.Value(0)).current;
  const greetAnim   = useRef(new Animated.Value(0)).current;
  const avatarAnim  = useRef(new Animated.Value(0)).current;
  const avatarSlide = useRef(new Animated.Value(14)).current;
  const avatarScale = useRef(new Animated.Value(0.96)).current;
  const glowAnim    = useRef(new Animated.Value(0.2)).current;
  const breathAnim  = useRef(new Animated.Value(1)).current;
  const guideAnim   = useRef(new Animated.Value(0)).current;
  const hintAnim    = useRef(new Animated.Value(0)).current;
  const pulseAnim   = useRef(new Animated.Value(0)).current;

  // Loop refs for cleanup
  const glowLoopRef  = useRef<Animated.CompositeAnimation | null>(null);
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  // Mount animations + loops
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 850, useNativeDriver: true }).start(() => {
      Animated.timing(greetAnim, { toValue: 1, duration: 450, useNativeDriver: true }).start();
    });

    glowLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 1600, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.2, duration: 1600, useNativeDriver: true }),
      ])
    );
    glowLoopRef.current.start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.04, duration: 2200, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1,    duration: 2200, useNativeDriver: true }),
      ])
    ).start();

    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
      ])
    );
    pulseLoopRef.current.start();

    // Auto hint on first load
    const guideTimer = setTimeout(() => {
      setHintSpot('pages');
      setTimeout(() => setHintSpot(null), 1800);
    }, 700);

    return () => {
      clearTimeout(guideTimer);
      glowLoopRef.current?.stop();
      pulseLoopRef.current?.stop();
    };
  }, []);

  // ─── hintAnim drives hint opacity — now actually wired ──────────────────
  // FIXED: hintAnim was never started; hint was permanently invisible
  useEffect(() => {
    if (hintSpot) {
      Animated.timing(hintAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    } else {
      Animated.timing(hintAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    }
  }, [hintSpot]);

  // Greeting updates on mood/character/time change
  useEffect(() => {
    setGreeting(getGreeting(character, mood, timeOfDay, isSekretVisible));
  }, [character, mood, timeOfDay, isSekretVisible]);

  // Guide overlay fade
  useEffect(() => {
    if (showGuide) {
      Animated.timing(guideAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const timer = setTimeout(() => {
        setShowGuide(false);
        Animated.timing(guideAnim, { toValue: 0, duration: 240, useNativeDriver: true }).start();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [showGuide]);

  // Avatar entrance / exit
  useEffect(() => {
    Animated.parallel([
      Animated.timing(avatarAnim, {
        toValue: isSekretVisible ? 1 : 0,
        duration: isSekretVisible ? 420 : 220,
        easing: isSekretVisible ? Easing.out(Easing.cubic) : Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(avatarSlide, {
        toValue: isSekretVisible ? 0 : 14,
        tension: 55, friction: 8, useNativeDriver: true,
      }),
      Animated.spring(avatarScale, {
        toValue: isSekretVisible ? 1 : 0.96,
        tension: 60, friction: 9, useNativeDriver: true,
      }),
    ]).start();
  }, [isSekretVisible]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleHotspot = (target: RoomTarget) => {
    if (target === 'sekret') {
      setIsSekretVisible(v => {
        const next = !v;
        // First time summoning — mark first visit done
        if (next && isFirstVisit) {
          setIsFirstVisit(false);
          AsyncStorage.setItem('sekretbip_first_visit_done', 'true');
        }
        updateRoomMemory?.({ lastSummon: new Date().toISOString(), character });
        return next;
      });
      setHintSpot('summon');
      setTimeout(() => setHintSpot(null), 1200);
      return;
    }
    updateRoomMemory?.({ lastHotspot: target, lastVisit: new Date().toISOString() });
    setScreen(target);
  };

  // sekretKey maps Character → the key used in selectedSekret / SEKRET_PROFILES
  const sekretKey = (char: Character): string =>
    char === 'raylene' ? 'soft' : char;

  const handleCharacterSwitch = (char: Character) => {
    setSelectedSekret(sekretKey(char));
    setIsSekretVisible(false);
    setHintSpot('summon');
    setTimeout(() => setHintSpot(null), 1500);
    updateRoomMemory?.({ character: char });
  };

  // ─── Derived display ──────────────────────────────────────────────────────

  const getPresence = () => {
    if (sekretMode === 'cloud') return 'Cloud is drifting through.';
    if (sekretMode === 'night') return 'Night mode is on.';
    if (isSekretVisible) return character === 'raylene' ? 'Raylene is nearby' : 'Rylane is posted up';
    if (isSekretVisible) {
      if (character === 'raylene') return 'Raylene is nearby';
      if (character === 'rylane')  return 'Rylane is posted up';
      if (character === 'cloud')   return 'Cloud is floating';
      return 'Night is here with you';
    }
    return getPresenceLine(character, timeOfDay, oracleProfile);
  };

  const timeBadge = `${vibePack.emoji} ${vibePack.feeling}`;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar style="light" />

      {/* ── Room background ─────────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
        <Image
          source={roomImage}
          style={styles.bg}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
          onError={() => undefined}
        />
        <View style={[styles.overlay, { backgroundColor: ROOM_PHASE_OVERLAYS[roomPhase] }]} />
        <View style={[styles.overlay, { backgroundColor: vibePack.background + '22' }]} />
        {/* Character-specific atmosphere tint */}
        {CHARACTER_OVERLAYS[character] !== 'transparent' && (
          <View style={[styles.overlay, { backgroundColor: CHARACTER_OVERLAYS[character] }]} />
        )}
      </Animated.View>

      {/* ── Cloud atmospheric floaters ─────────────────────────────────── */}
      {character === 'cloud' && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Text style={[styles.floatCloud, { top: '12%', left: '5%', opacity: 0.55, fontSize: 26 }]}>☁️</Text>
          <Text style={[styles.floatCloud, { top: '32%', right: '8%', opacity: 0.38, fontSize: 18 }]}>☁️</Text>
          <Text style={[styles.floatCloud, { top: '58%', left: '62%', opacity: 0.28, fontSize: 14 }]}>☁️</Text>
          <Text style={[styles.floatCloud, { top: '20%', left: '42%', opacity: 0.45, fontSize: 22 }]}>☁️</Text>
        </View>
      )}

      {/* ── Night atmosphere — time badge ─────────────────────────────── */}
      {character === 'night' && (
        <View style={styles.nightTimeWrap} pointerEvents="none">
          <Text style={styles.nightTimeText}>
            {(() => {
              const now2 = new Date();
              const h = now2.getHours();
              const m = now2.getMinutes();
              const h12 = h % 12 || 12;
              const ampm = h >= 12 ? 'PM' : 'AM';
              return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
            })()}
          </Text>
          <Text style={styles.nightStars}>✦ ✧ ✦</Text>
        </View>
      )}

      {/* ── Hotspots ────────────────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: fadeAnim }]}>
        {hotspots.map((spot) => {
          const isHinted    = hintSpot === spot.id;
          const showTapHint = isHinted || (spot.pulse && showGuide);

          return (
            <TouchableOpacity
              key={spot.id}
              style={[
                styles.hotspot,
                spot.style,
                DEBUG_HOTSPOTS && styles.hotspotDebug,
                showTapHint && styles.hotspotGlow,
              ]}
              onPress={() => handleHotspot(spot.target)}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={spot.label}
            >
              {/* Pulse ring for pulse hotspots */}
              {spot.pulse && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.pulseRing,
                    {
                      opacity: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                      transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
                      borderColor: t.accent,
                    },
                  ]}
                />
              )}

              {/* Tap hint label — FIXED: now actually visible via hintAnim useEffect */}
              {showTapHint && !DEBUG_HOTSPOTS && (
                <Animated.View
                  style={[
                    styles.tapHintWrap,
                    {
                      opacity: hintAnim,
                      transform: [{ translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
                    },
                  ]}
                >
                  <Text style={styles.tapHint}>{spot.hint ?? 'Tap'}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── Avatar ──────────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.avatarWrap,
          {
            opacity: avatarAnim,
            transform: [{ translateY: avatarSlide }, { scale: avatarScale }],
          },
        ]}
        pointerEvents="none"
      >
        <Image
          source={safeImage(AVATARS[character]?.[pose], FALLBACK_AVATAR[character])}
          style={styles.avatar}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      </Animated.View>

      {/* Cloud mascot shortcut — only shown when not in Cloud identity mode */}
      {character !== 'cloud' && (
        <TouchableOpacity
          style={[styles.cloudPresence, { borderColor: vibePack.accent + '88' }]}
          onPress={() => setScreen('cloudThoughts')}
          accessibilityRole="button"
          accessibilityLabel="Cloud is here. Open Cloud Thoughts"
        >
          <Image source={IMAGES.cloudHappy} style={styles.cloudPresenceImage} resizeMode="contain" />
          <Text style={styles.cloudPresenceText}>Cloud's here</Text>
        </TouchableOpacity>
      )}

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <Animated.View style={[styles.topBar, { opacity: fadeAnim }]}>
        <View style={styles.topLeft}>
          <View style={styles.timeBadge}>
            <Text style={styles.timeBadgeText}>{timeBadge}</Text>
          </View>
          {(sekretMode === 'cloud' || sekretMode === 'night') && (
            <View style={[styles.modeBadge, { backgroundColor: sekretMode === 'cloud' ? 'rgba(155,216,229,0.18)' : 'rgba(99,66,155,0.22)', borderColor: sekretMode === 'cloud' ? '#9bd8e5' : '#8b7bb8' }]}>
              <Text style={[styles.modeBadgeText, { color: sekretMode === 'cloud' ? '#9bd8e5' : '#c4b5fd' }]}>
                {sekretMode === 'cloud' ? "☁️ Cloud mode" : "🌙 Night mode"}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.characterToggle}>
          {(
            [
              { char: 'raylene' as Character, label: '💜 Raylene', active: styles.toggleBtnActivePink },
              { char: 'rylane'  as Character, label: '⚡ Rylane',  active: styles.toggleBtnActivePurple },
              { char: 'cloud'   as Character, label: '☁️ Cloud',   active: styles.toggleBtnActiveCloud },
              { char: 'night'   as Character, label: '🌙 Night',   active: styles.toggleBtnActiveNight },
            ] as const
          ).map(({ char, label, active }) => (
            <TouchableOpacity
              key={char}
              style={[styles.toggleBtn, character === char && active]}
              onPress={() => handleCharacterSwitch(char)}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${char}`}
            >
              <Text style={styles.toggleText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── Presence pill ───────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.presencePill,
          {
            opacity: Animated.multiply(
              fadeAnim,
              breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })
            ),
            transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] }) }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.presenceDot,
            {
              opacity: glowAnim,
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1.1] }) }],
            },
          ]}
        />
        <Text style={styles.presenceText}>{getPresence()}</Text>
      </Animated.View>

      {/* ── Bottom content ──────────────────────────────────────────────── */}
      <Animated.View style={[styles.bottomContent, { opacity: greetAnim }]}>

        {/* Greeting bubble */}
        <TouchableOpacity
          style={styles.greetingBubble}
          onPress={() => {
            setIsSekretVisible(v => !v);
            setHintSpot('summon');
            setTimeout(() => setHintSpot(null), 1200);
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isSekretVisible ? "Hide Se\u2019kret" : "Call Se\u2019kret"}
        >
          <Text style={styles.greetingChar}>
            {character === ‘raylene’ ? ‘💜 Raylene’ :
             character === ‘rylane’  ? ‘⚡ Rylane’  :
             character === ‘cloud’   ? "☁️ Cloud Se’kret" :
                                       "🌙 Night Se’kret"}
          </Text>
          <Text style={styles.roomCopy}>{getRoomCopy(character, timeOfDay)}</Text>
          {!!rememberedLine && (
            <View style={styles.memoryTag}>
              <Text style={styles.memoryTagLabel}>I REMEMBER</Text>
              <Text style={styles.memoryTagText}>{rememberedLine}</Text>
            </View>
          )}
          <Text style={styles.greetingText}>"{rememberedLine || greeting}"</Text>
          <Text style={[styles.greetingTap, { color: t.soft }]}>
            {isSekretVisible ? 'tap to dismiss' : "tap to call Se\u2019kret"}
          </Text>
        </TouchableOpacity>

        {BottomNav}
      </Animated.View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:                  { flex: 1, backgroundColor: '#0d0014' },
  bg:                    { width, height },
  overlay:               { ...StyleSheet.absoluteFillObject },
  cloudPresence:         { position: 'absolute', top: Platform.OS === 'ios' ? 116 : 94, right: 18, width: 76, height: 76, borderRadius: 24, borderWidth: 1, backgroundColor: 'rgba(22,12,42,0.58)', alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  cloudPresenceImage:    { width: 47, height: 40 },
  cloudPresenceText:     { color: '#f3edff', fontSize: 9, fontWeight: '700', marginTop: -2 },

  hotspot:               { position: 'absolute' },
  hotspotGlow:           {
    borderRadius: 16,
    backgroundColor: 'rgba(244,114,182,0.08)',
    shadowColor: '#f472b6',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  hotspotDebug:          { borderWidth: 2, borderColor: '#f472b6', backgroundColor: 'rgba(244,114,182,0.15)' },

  pulseRing:             {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 16,
    borderWidth: 1.5,
  },

  // Softer scrapbook-style hint card — warm cream sticky-note with a slight tilt
  tapHintWrap:           {
    position: 'absolute',
    top: -26,
    left: -2,
    backgroundColor: 'rgba(253,247,236,0.94)',
    borderColor: 'rgba(124,58,237,0.45)',
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#7c3aed',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  tapHint:               {
    color: '#3b0764',
    fontSize: 10,
    fontWeight: '600',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },

  avatarWrap:            {
    position: 'absolute',
    bottom: '21%',
    alignSelf: 'center',
    width: width * 0.56,
    height: height * 0.46,
    zIndex: 10,
  },
  avatar:                { width: '100%', height: '100%' },

  topBar:                {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 32,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topLeft:               { flexDirection: 'column', gap: 6 },
  timeBadge:             {
    backgroundColor: 'rgba(13,0,20,0.68)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  timeBadgeText:         { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },
  modeBadge:             {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  modeBadgeText:         { fontSize: 11, fontWeight: '700' },

  characterToggle:       { flexDirection: 'row', gap: 8 },
  toggleBtn:             {
    borderWidth: 1,
    borderColor: 'rgba(167,114,192,0.35)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(13,0,20,0.55)',
  },
  toggleBtnActivePink:   { backgroundColor: 'rgba(217,70,239,0.24)', borderColor: '#d946ef' },
  toggleBtnActivePurple: { backgroundColor: 'rgba(124,58,237,0.24)', borderColor: '#7c3aed' },
  toggleBtnActiveCloud:  { backgroundColor: 'rgba(155,185,255,0.28)', borderColor: '#9bb9ff' },
  toggleBtnActiveNight:  { backgroundColor: 'rgba(47,31,91,0.50)', borderColor: '#bbb7ef' },
  toggleText:            { color: '#f5f0ff', fontSize: 11, fontWeight: '700' },

  floatCloud:            { position: 'absolute' },

  nightTimeWrap:         {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 94,
    left: 18,
    alignItems: 'flex-start',
  },
  nightTimeText:         { color: 'rgba(187,183,239,0.75)', fontSize: 13, fontWeight: '300', letterSpacing: 1.5 },
  nightStars:            { color: 'rgba(187,183,239,0.45)', fontSize: 10, marginTop: 2, letterSpacing: 4 },

  presencePill:          {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 96 : 74,
    left: 16,
    backgroundColor: 'rgba(13,0,20,0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  presenceDot:           { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d946ef' },
  presenceText:          { color: '#e9d5ff', fontSize: 11, fontWeight: '700' },

  bottomContent:         {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 18 : 10,
    paddingHorizontal: 16,
  },
  greetingBubble:        {
    backgroundColor: 'rgba(13,0,20,0.84)',
    borderWidth: 1,
    borderColor: 'rgba(217,70,239,0.3)',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  greetingChar:          { color: '#c4b5fd', fontSize: 11, fontWeight: '700', marginBottom: 5 },
  memoryTag:             { borderLeftWidth: 2, borderLeftColor: '#d8b4fe', paddingLeft: 9, marginTop: 8, marginBottom: 9 },
  memoryTagLabel:        { color: '#bca7d5', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 3 },
  memoryTagText:         { color: '#f4eaff', fontSize: 12, lineHeight: 17, fontWeight: '600' },
  roomCopy:              { color: '#f5f0ff', fontSize: 12, fontWeight: '700', opacity: 0.9, marginBottom: 6 },
  greetingText:          { color: '#f5f0ff', fontSize: 15, fontWeight: '600', lineHeight: 22, fontStyle: 'italic', marginBottom: 6 },
  greetingTap:           { fontSize: 10, fontStyle: 'italic' },

  mainBtn:               {
    borderWidth: 1.5,
    borderRadius: 50,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(13,0,20,0.75)',
    marginBottom: 10,
    shadowColor: '#d946ef',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  mainBtnText:           { fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },

  controlRow:            { flexDirection: 'row', gap: 8, marginBottom: 10 },
  guideBtn:              {
    flex: 1,
    backgroundColor: 'rgba(13,0,20,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(167,114,192,0.25)',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
  },
  guideBtnText:          { color: '#f5f0ff', fontSize: 11, fontWeight: '800' },

  quickRow:              { flexDirection: 'row', gap: 6, marginBottom: 10 },
  quickBtn:              {
    flex: 1,
    backgroundColor: 'rgba(13,0,20,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(167,114,192,0.25)',
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  quickEmoji:            { fontSize: 16, marginBottom: 2 },
  quickLabel:            { color: '#E2E8F0', fontSize: 9, fontWeight: '700' },

  tagline:               { color: '#c4b5fd', fontSize: 12, textAlign: 'center', fontStyle: 'italic', opacity: 0.8 },
});

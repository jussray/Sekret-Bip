import React, { useRef, useEffect, useMemo, useState } from 'react';
import { IMAGES } from '../constants/theme';
import { MOOD_GLOW } from '../constants/moodGlow';
import { SekretCompanionCard } from '../components/SekretCompanionCard';
import { SyncBadge, type SyncStatus } from '../components/SyncBadge';
import type { CompanionCheckIn } from '../types/sekretCompanion';
import {
  Text, TouchableOpacity,
  View, Animated, Image, StyleSheet, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';

// ─── Assets ───────────────────────────────────────────────────────────────────

const CLOUD_ASSETS: Record<string, any> = {
  raylene: IMAGES.cloud,
  rylane:  IMAGES.cloud,
};

const ART: Record<string, Record<string, any>> = {
  raylene: {
    neutral:  IMAGES.rayleneNeutral,
    thinking: IMAGES.rayleneThinking,
    window:   IMAGES.rayleneWindow,
  },
  rylane: {
    neutral:  IMAGES.rylaneNeutral,
    thinking: IMAGES.rylaneThinking,
    window:   IMAGES.rylaneWindow,
  },
};

// Time-of-day ambient room background per vision:
// morning → bright room · afternoon → sunny room · night → purple cozy room
// (late-night rainy city is owned by ComfortScreen — Home stays softer)
const AMBIENT_BG: Record<string, Record<TimeOfDay, any>> = {
  raylene: {
    morning: IMAGES.bgRayleneRoomDay,
    day:     IMAGES.bgRayleneRoomDay,
    evening: IMAGES.bgRayleneRoomEvening,
    night:   IMAGES.bgRayleneRoomNight,
  },
  rylane: {
    morning: IMAGES.bgRylaneRoomDay,
    day:     IMAGES.bgRylaneRoomDay,
    evening: IMAGES.bgRylaneRoomEvening,
    night:   IMAGES.bgRylaneRoomNight,
  },
};

// ─── Static data ──────────────────────────────────────────────────────────────

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

// ─── Mood system — 3 categories + fun moods ──────────────────────────────────

type MoodCat = 'heavy' | 'steady' | 'winning' | 'fun';

const MOOD_CATS: { id: MoodCat; label: string; emoji: string; glow: string }[] = [
  { id: 'heavy',   label: 'Heavy',   emoji: '🌧️', glow: '#7dd3fc' },
  { id: 'steady',  label: 'Steady',  emoji: '☁️',  glow: '#c4b5fd' },
  { id: 'winning', label: 'Winning', emoji: '🌟', glow: '#fbbf24' },
  { id: 'fun',     label: 'Fun',     emoji: '✨',  glow: '#fb7185' },
];

const MOODS_BY_CAT: Record<MoodCat, { id: string; emoji: string; label: string }[]> = {
  heavy: [
    { id: 'sad',          emoji: '😔', label: 'sad' },
    { id: 'anxious',      emoji: '😰', label: 'anxious' },
    { id: 'frustrated',   emoji: '😤', label: 'frustrated' },
    { id: 'angry',        emoji: '😡', label: 'angry' },
    { id: 'lonely',       emoji: '🥺', label: 'lonely' },
    { id: 'overwhelmed',  emoji: '🌪️', label: 'overwhelmed' },
    { id: 'hurt',         emoji: '💔', label: 'hurt' },
    { id: 'disappointed', emoji: '😞', label: 'disappointed' },
  ],
  steady: [
    { id: 'calm',        emoji: '😌', label: 'calm' },
    { id: 'reflective',  emoji: '☁️', label: 'reflective' },
    { id: 'tired',       emoji: '😴', label: 'tired' },
    { id: 'okay',        emoji: '🙂', label: 'okay' },
    { id: 'content',     emoji: '🌱', label: 'content' },
    { id: 'thoughtful',  emoji: '💭', label: 'thoughtful' },
    { id: 'hopeful',     emoji: '🌈', label: 'hopeful' },
    { id: 'grateful',    emoji: '🙏', label: 'grateful' },
  ],
  winning: [
    { id: 'proud',        emoji: '🌟', label: 'proud' },
    { id: 'motivated',    emoji: '🔥', label: 'motivated' },
    { id: 'confident',    emoji: '😎', label: 'confident' },
    { id: 'excited',      emoji: '🥳', label: 'excited' },
    { id: 'accomplished', emoji: '✨', label: 'accomplished' },
    { id: 'loved',        emoji: '💜', label: 'loved' },
    { id: 'connected',    emoji: '🤝', label: 'connected' },
    { id: 'celebrating',  emoji: '🎉', label: 'celebrating' },
  ],
  fun: [
    { id: 'crushing',      emoji: '😭',    label: 'crushing' },
    { id: 'unbothered',    emoji: '💅',    label: 'unbothered' },
    { id: 'curious',       emoji: '👀',    label: 'curious' },
    { id: 'relieved',      emoji: '😮‍💨',  label: 'relieved' },
    { id: 'feeling-seen',  emoji: '🫶',    label: 'feeling seen' },
    { id: 'glow-up',       emoji: '📈',    label: 'glow up' },
  ],
};

// Tiny wins — shown in the Bip Wins card
const BIP_WINS = [
  { emoji: '🛏️', win: 'Got out of bed' },
  { emoji: '💧', win: 'Drank water' },
  { emoji: '📚', win: 'Finished homework' },
  { emoji: '🧹', win: 'Cleaned my space' },
  { emoji: '🏃', win: 'Went outside' },
  { emoji: '🤝', win: 'Asked for help' },
  { emoji: '📝', win: 'Reached a goal' },
  { emoji: '💪', win: 'Showed up anyway' },
];

const HOME_MESSAGES = [
  "How you bippin today?",
  'You showed up. That already counts.',
  'Heavy days do not define you.',
  'Wins and hard days both belong here.',
  "You're building something real.",
  'The room remembers how far you have come.',
  'Good days deserve celebrating too.',
  'Still here. Still Bippin.',
];

// Vision quick actions: Write It Out, Voice Bip, Calm Me, Circle, Comfort Mode.
// Bridge kept as a 6th since it's a real existing feature.
const QUICK_ACTIONS: { emoji: string; label: string; to: string }[] = [
  { emoji: '✍️',  label: 'Write It Out', to: 'pages'      },
  { emoji: '🎙️', label: 'Voice Bip',    to: 'voiceBip'   },
  { emoji: '🌙',  label: 'Calm Me',      to: 'calm'       },
  { emoji: '☁️',  label: 'Comfort',      to: 'comfort'    },
  { emoji: '🌐',  label: 'Circle',       to: 'circle'     },
  { emoji: '💌',  label: 'S2 Tell',      to: 's2tell'    },
];

// Hero greeting — mood + time-of-day
const getHeroText = (mood: string, tod: TimeOfDay) => {
  const timeWord = tod === 'morning' ? 'this morning' : tod === 'day' ? 'today' : 'tonight';
  const timeEmoji = tod === 'morning' ? '☀️' : tod === 'day' ? '🌤️' : tod === 'evening' ? '🌆' : '🌙';
  const m = mood.toLowerCase();
  // Heavy
  if (m === 'sad' || m === 'hurt')       return `I'm here with\nyou ${timeWord} ☁️`;
  if (m === 'angry' || m === 'frustrated') return `Let it out,\nyou're safe here 🔥`;
  if (m === 'anxious' || m === 'overwhelmed') return `One thing\nat a time ${timeWord} 💙`;
  if (m === 'lonely')                    return `You reached out.\nThat took something 💜`;
  if (m === 'disappointed')              return `I see you.\nIt's okay to feel this ☁️`;
  // Steady
  if (m === 'tired')                     return `Rest your heart\n${timeWord} 🌙`;
  if (m === 'calm')                      return `Calm and grounded\n${timeWord} ${timeEmoji}`;
  if (m === 'content')                   return `Peace found\n${timeWord} 🌱`;
  if (m === 'hopeful')                   return `Eyes on tomorrow\n${timeWord} 🌈`;
  if (m === 'grateful')                  return `Counting the good\n${timeWord} 🙏`;
  if (m === 'okay')                      return `Present and okay\n${timeWord} ${timeEmoji}`;
  // Winning
  if (m === 'proud')                     return `AS YOU SHOULD\nBE ${timeEmoji} 🌟`;
  if (m === 'motivated')                 return `Let's not waste\nthis momentum 🔥`;
  if (m === 'excited')                   return `That excitement\nis REAL ${timeEmoji}`;
  if (m === 'accomplished')              return `You actually\ndid that. Look. ✨`;
  if (m === 'confident')                 return `Walk in that.\nAll day ${timeEmoji}`;
  if (m === 'celebrating')               return `We celebrating\ntoday ${timeEmoji} 🎉`;
  if (m === 'loved')                     return `Feeling loved.\nSit in it 💜`;
  // Fun
  if (m === 'crushing')                  return `Oh we're\nbippin today 😭`;
  if (m === 'glow-up')                   return `I see it.\nKeep going 📈`;
  if (m === 'unbothered')                return `Protective\npeace. Respect 💅`;
  // Legacy
  if (m === 'happy')  return `I'm glad\nyou're smiling\n${timeWord} ${timeEmoji}`;
  if (m === 'neutral') return `However you feel\n${timeWord} is okay ${timeEmoji}`;
  return `Welcome back ${timeEmoji}`;
};

const getMoodResponse = (mood: string, selectedSekret: string) => {
  const m = mood.toLowerCase();
  if (selectedSekret === 'rylane') {
    if (m === 'sad' || m === 'hurt')     return "nah, you not carrying this alone. i'm right here.";
    if (m === 'angry' || m === 'frustrated') return "your feelings make sense. let it out. i got you.";
    if (m === 'tired')                   return "you gave everything today. rest is part of the work.";
    if (m === 'anxious' || m === 'overwhelmed') return "let's shrink it. not everything needs solving tonight.";
    if (m === 'proud')                   return "real talk? that's you. you built that. own it.";
    if (m === 'motivated')               return "bet. let's not waste the momentum.";
    if (m === 'confident')               return "walk in that. no apologies.";
    if (m === 'excited')                 return "BRO 😭 say it. what's happening??";
    if (m === 'accomplished')            return "nah don't act like it's normal. you worked for that.";
    if (m === 'celebrating')             return "we celebrating. say it out loud.";
    if (m === 'grateful')                return "look at you noticing the good. that's growth.";
    if (m === 'unbothered')              return "protective peace energy. not everyone deserves your attention.";
    if (m === 'glow-up')                 return "bro I see the shift. what changed?";
    return "i see you. you doing better than you think.";
  }
  if (selectedSekret === 'cloud') {
    if (m === 'sad' || m === 'hurt')     return "That sounds heavy. We can just sit with it for a minute.";
    if (m === 'angry' || m === 'frustrated') return "That sounds frustrating. You don't have to solve everything right now.";
    if (m === 'tired')                   return "Long day? You can rest here.";
    if (m === 'overwhelmed')             return "Everything feels loud right now. Let's shrink the problem before we solve it.";
    if (m === 'grateful')                return "I like this version of today. Let's remember it.";
    if (m === 'proud')                   return "That growth landed somewhere real, didn't it.";
    if (m === 'content')                 return "This is peace. It's quieter than people expect.";
    if (m === 'hopeful')                 return "Hope is soft but it's strong. Hold it.";
    if (m === 'feeling-seen')            return "Being fully seen is rare. Today it happened.";
    return "You can be quiet here. No pressure.";
  }
  if (selectedSekret === 'night') {
    if (m === 'sad' || m === 'hurt')     return "Still awake with it? You don't have to sit with this alone.";
    if (m === 'angry')                   return "Long day? We can keep tonight simple.";
    if (m === 'tired')                   return "You don't have to explain it perfectly. Just be here.";
    if (m === 'proud')                   return "Go to sleep proud. You earned it.";
    if (m === 'hopeful')                 return "Tomorrow gets to be something new. You already believe it.";
    if (m === 'relieved')                return "That weight finally lifted. Rest now.";
    return "It's okay to be quiet tonight.";
  }
  // Raylene (default)
  if (m === 'sad' || m === 'hurt')       return "Aight, come here. Tell me what happened.";
  if (m === 'angry' || m === 'frustrated') return "That would've hurt my feelings too. You okay?";
  if (m === 'tired')                     return "Be nice to yourself today, okay?";
  if (m === 'lonely')                    return "You came here. That took something. I see you.";
  if (m === 'overwhelmed')               return "Put something down, baby. You cannot carry all of this.";
  if (m === 'proud')                     return "AS YOU SHOULD BE. 😭💜 Tell me what happened.";
  if (m === 'motivated')                 return "Yes. Channel this somewhere real, love.";
  if (m === 'excited')                   return "TELL ME EVERYTHING 😭💜";
  if (m === 'accomplished')              return "LOOK AT YOU. Baby, look at what you built.";
  if (m === 'grateful')                  return "I love this version of today too. Hold onto it.";
  if (m === 'celebrating')               return "🎉 YES BABY YES. Tell me everything.";
  if (m === 'glow-up')                   return "Okay I SEE YOU. What's shifting?";
  if (m === 'content')                   return "Calm is a whole skill. Enjoy it.";
  if (m === 'hopeful')                   return "Hope means you can still see ahead. That's not small.";
  return "I read your energy. You're doing better than you think.";
};

// Streak language per vision: "we see you" — never punishing
const getStreakCopy = (days: number, isRylane: boolean, justReset?: boolean) => {
  if (days === 1 && justReset) {
    return isRylane ? "missed a few. you're back. that's what counts." : "missed a few days? all good — you picked it back up. 💜";
  }
  if (days <= 0)  return isRylane ? "first day. let's lock in." : "first day. we got this.";
  if (days === 1) return isRylane ? "day 1 bip. you here. that counts." : "day 1 bip. you showed up.";
  if (days < 7)   return isRylane ? `${days} days bippin. keep going.` : `${days} days bippin. we see you.`;
  if (days < 30)  return isRylane ? `${days} day bip. that's consistent.` : `${days} day bip. that's real.`;
  if (days < 100) return isRylane ? `${days} day bip. you locked in.` : `${days} day bip. proud of you.`;
  return isRylane ? `${days} day bip. legend energy.` : `${days} day bip. we see every one.`;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface HomeScreenProps {
  mood: string;
  selectMood: (mood: string) => void;
  t: Record<string, any>;
  currentSekret: Record<string, any>;
  selectedSekret: string;           // character identity key
  homeMessageIndex: number;
  userSide: string;
  setScreen: (screen: string) => void;
  onMoodSelect?: (mood: string) => void;  // Supabase/RoomMemory hook
  BottomNav: React.ReactNode;
  streakDays?: number;              // vision: streak lives on the dashboard
  streakJustReset?: boolean;        // missed-day reset — soften, don't shame
  companion?: {
    greeting: string;
    presenceMessage: string;
    memorySummary?: { commonTopics?: string[] };
    checkIn?: CompanionCheckIn | null;
    companionLevel?: any;
    personality: string;
  };
  syncStatus?: SyncStatus;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomeScreen({
  mood, selectMood, t, currentSekret, selectedSekret,
  homeMessageIndex, userSide, setScreen, onMoodSelect, BottomNav,
  streakDays = 0, streakJustReset, companion, syncStatus,
}: HomeScreenProps) {

  const isRylane  = selectedSekret === 'rylane';
  const charKey   = isRylane ? 'rylane' : 'raylene';
  const art       = ART[charKey];
  const cloudImg  = CLOUD_ASSETS[charKey];
  const timeOfDay = useMemo<TimeOfDay>(() => getTimeOfDay(), []);
  const ambientBg = AMBIENT_BG[charKey]?.[timeOfDay];
  const moodGlow  = MOOD_GLOW[mood.toLowerCase()] ?? MOOD_GLOW[mood] ?? t.accent;

  // Mood category picker state — defaults to the category that matches current mood
  const defaultCat = useMemo<MoodCat>(() => {
    const m = mood.toLowerCase();
    const h = MOODS_BY_CAT.heavy.some(x => x.id === m);
    const s = MOODS_BY_CAT.steady.some(x => x.id === m);
    const w = MOODS_BY_CAT.winning.some(x => x.id === m);
    return h ? 'heavy' : s ? 'steady' : w ? 'winning' : 'steady';
  }, []);
  const [moodCat, setMoodCat] = useState<MoodCat>(defaultCat);
  const [showWins, setShowWins] = useState(false);

  // ─── Animations ─────────────────────────────────────────────────────────
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const fadeIn      = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0.4)).current;

  // Staggered card entrance — scrapbook opening page by page
  const card1Anim = useRef(new Animated.Value(0)).current;  // streak
  const card2Anim = useRef(new Animated.Value(0)).current;  // hero
  const card3Anim = useRef(new Animated.Value(0)).current;  // reminder
  const card4Anim = useRef(new Animated.Value(0)).current;  // mood + sees-you
  const card5Anim = useRef(new Animated.Value(0)).current;  // quick actions

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.stagger(140, [
      Animated.timing(card1Anim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(card2Anim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(card3Anim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(card4Anim, { toValue: 1, duration: 380, useNativeDriver: true }),
      Animated.timing(card5Anim, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]).start();

    const breathe = Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, { toValue: 1.12, duration: 3000, useNativeDriver: true }),
        Animated.timing(breatheAnim, { toValue: 1,    duration: 3000, useNativeDriver: true }),
      ])
    );
    breathe.start();

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2800, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 2800, useNativeDriver: true }),
      ])
    );
    glow.start();

    return () => { breathe.stop(); glow.stop(); };
  }, []);

  const glowOpacity = glowAnim.interpolate({ inputRange: [0.4, 1], outputRange: [0.18, 0.42] });

  // Per-card animated style helper
  const cardAnim = (anim: Animated.Value) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
  });

  // ─── Style helpers ───────────────────────────────────────────────────────
  const card = (extra?: object) => [
    styles.card, { backgroundColor: t.card, borderColor: t.accent + '55' }, extra,
  ] as any;

  // ─── Mood select handler (also fires Supabase hook) ───────────────────────
  const handleMoodSelect = (m: string) => {
    selectMood(m);
    onMoodSelect?.(m);
  };

  // ─── Reminder message (bounds-guarded) ───────────────────────────────────
  const reminder = HOME_MESSAGES[homeMessageIndex] ?? HOME_MESSAGES[0];
  const memoryMessage = companion?.presenceMessage
    || "You've been showing up for yourself. I'm noticing it.";

  const handleCompanionAction = (action: 'write' | 'voice' | 'comfort' | 'checkIn') => {
    if (action === 'write') setScreen('pages');
    else if (action === 'voice') setScreen('voiceBip');
    else if (action === 'comfort') setScreen('comfort');
    else setScreen('sekret');
  };

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <StatusBar style="light" />

      {/* ── Ambient room background — time-of-day aware per vision ───────── */}
      {ambientBg && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { opacity: fadeIn }]}
        >
          <Image
            source={ambientBg}
            style={styles.ambientImg}
            resizeMode="cover"
            blurRadius={6}
          />
          <View style={styles.ambientScrim} />
        </Animated.View>
      )}

      {/* ── Mood-tinted background glow ─────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bgGlow, { backgroundColor: moodGlow, opacity: glowOpacity }]}
      />

      <View pointerEvents="none" style={styles.environmentLayer}>
        <Image
          source={selectedSekret === 'night' ? IMAGES.rayleneWindow : (isRylane ? IMAGES.rylaneWindow : IMAGES.rayleneWindow)}
          style={styles.environmentArt}
          resizeMode="cover"
        />
      </View>

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ━━━ PARENT BADGE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {userSide === 'parent' && (
          <View style={styles.parentBadge}>
            <Text style={styles.parentBadgeText}>🌿 PARENT SIDE</Text>
          </View>
        )}

        {/* ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Text style={[styles.logo, { color: t.soft }]}>
          Se'kret Bip {currentSekret.emoji}
        </Text>
        <Text style={styles.subtitle}>your space. your voice. always you.</Text>
        <SyncBadge status={syncStatus ?? 'idle'} />

        {/* ━━━ STREAK PILL — "we see you" per vision ━━━━━━━━━━━━━━━━━━━━━ */}
        <Animated.View style={[styles.streakPill, cardAnim(card1Anim), { borderColor: moodGlow + '88' }]}>
          <Text style={styles.streakFlame}>🔥</Text>
          <Text style={styles.streakText}>{getStreakCopy(streakDays, isRylane, streakJustReset)}</Text>
        </Animated.View>

        {/* ━━━ BREATHING CLOUD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Animated.View style={[styles.cloudWrap, { transform: [{ scale: breatheAnim }] }]}>
          <Image source={cloudImg} style={styles.cloudImg} resizeMode="contain" />
        </Animated.View>

        {/* ━━━ HERO MESSAGE CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Animated.View style={[card(), cardAnim(card2Anim)]}>
          <View style={styles.heroCardTop}>
            <View style={styles.heroArtGlow} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.heroCardBy, { color: t.soft }]}>
                {currentSekret.name} says…
              </Text>
              <Text style={[styles.heroText, { color: '#fff' }]}>
                {getHeroText(mood, timeOfDay)}
              </Text>
            </View>
          </View>
          <Text style={styles.entryText}>
            Your Se'kret is {currentSekret.name} energy.
          </Text>
        </Animated.View>

        {/* ━━━ QUICK ACTIONS — above the fold per Chromebook layout ━━━━━━━━━ */}
        <Animated.View style={[cardAnim(card3Anim), { marginBottom: 6 }]}>
          <Text style={[styles.sectionTitle, { color: t.soft, marginTop: 0, marginBottom: 10 }]}>Quick Actions ⚡</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map(action => {
              const route = action.to === '__bridge__'
                ? (userSide === 'parent' ? 'parentBridge' : 'bridge')
                : action.to;
              return (
                <TouchableOpacity
                  key={action.label}
                  style={[styles.quickCard, { backgroundColor: t.card, borderColor: t.accent + '55' }]}
                  onPress={() => setScreen(route)}
                  accessibilityRole="button"
                  accessibilityLabel={action.label}
                >
                  <Text style={styles.quickEmoji}>{action.emoji}</Text>
                  <Text style={styles.quickLabel}>{action.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>

        {/* ━━━ GENTLE REMINDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Animated.View style={[card(), cardAnim(card4Anim)]}>
          <Text style={styles.cardText}>
            {timeOfDay === 'morning' ? 'Morning Reminder ✨'
              : timeOfDay === 'day'   ? 'A Note for Today ✨'
              : timeOfDay === 'evening' ? 'Evening Reminder ✨'
                                        : "Tonight's Reminder ✨"}
          </Text>
          <Text style={styles.entryText}>{reminder}</Text>
        </Animated.View>

        {/* ━━━ MOOD SELECTOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Animated.View style={cardAnim(card4Anim)}>
          <Text style={[styles.sectionTitle, { color: t.soft }]}>
            How you bippin today?
          </Text>

          {/* Category tabs */}
          <View style={styles.moodCatRow}>
            {MOOD_CATS.map(cat => {
              const active = moodCat === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setMoodCat(cat.id)}
                  style={[
                    styles.moodCatTab,
                    {
                      borderColor: active ? cat.glow : 'rgba(150,120,200,0.25)',
                      backgroundColor: active ? cat.glow + '28' : 'rgba(15,8,35,0.6)',
                    },
                  ]}
                >
                  <Text style={styles.moodCatEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.moodCatLabel, { color: active ? cat.glow : '#9b8ec4' }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Mood grid for selected category */}
          <View style={styles.moodGrid}>
            {MOODS_BY_CAT[moodCat].map(m => {
              const active = mood.toLowerCase() === m.id;
              const tint   = MOOD_GLOW[m.id] ?? t.accent;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.moodGridItem,
                    active && {
                      backgroundColor: tint + '30',
                      borderColor: tint,
                      shadowColor: tint,
                      shadowOpacity: 0.6,
                      shadowRadius: 8,
                      elevation: 6,
                    },
                  ]}
                  onPress={() => handleMoodSelect(m.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Mood: ${m.label}`}
                  accessibilityState={{ selected: active }}
                >
                  <Text style={styles.moodGridEmoji}>{m.emoji}</Text>
                  <Text style={[styles.moodGridLabel, { color: active ? tint : '#9b8ec4' }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* SE'KRET SEES YOU — mood-aware, character-aware */}
          <View style={card()}>
            <Text style={styles.cardText}>
              {currentSekret.name} sees you {currentSekret.emoji}
            </Text>
            <Text style={styles.entryText}>
              {getMoodResponse(mood, selectedSekret)}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: moodGlow, shadowColor: moodGlow }]}
                onPress={() => setScreen('sekret')}
                accessibilityRole="button"
                accessibilityLabel="Talk more"
              >
                <Text style={styles.actionBtnText}>💬 Talk more</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: t.card, borderWidth: 1, borderColor: t.accent + '66' }]}
                onPress={() => setScreen(moodCat === 'winning' ? 'growth' : 'calm')}
                accessibilityRole="button"
                accessibilityLabel={moodCat === 'winning' ? 'My growth' : 'Calm me'}
              >
                <Text style={styles.actionBtnText}>{moodCat === 'winning' ? '🌟 My growth' : '🌙 Calm me'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BIP WINS — positive growth section */}
          <TouchableOpacity
            style={[card(), { borderColor: '#fbbf2444', marginTop: -4 }]}
            onPress={() => setShowWins(v => !v)}
            activeOpacity={0.85}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.cardText}>Bip Wins 🏆</Text>
              <Text style={{ color: '#fbbf24', fontSize: 13 }}>{showWins ? 'less ↑' : 'log a win →'}</Text>
            </View>
            <Text style={[styles.entryText, { marginBottom: showWins ? 12 : 0 }]}>
              {showWins ? 'Tap a win to log it. Every one counts.' : 'Your small wins build something real.'}
            </Text>
            {showWins && (
              <View style={styles.winsGrid}>
                {BIP_WINS.map(w => (
                  <TouchableOpacity
                    key={w.win}
                    style={styles.winChip}
                    onPress={() => handleMoodSelect('accomplished')}
                  >
                    <Text style={{ fontSize: 18 }}>{w.emoji}</Text>
                    <Text style={styles.winChipLabel}>{w.win}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {companion ? (
          <Animated.View style={cardAnim(card5Anim)}>
            <SekretCompanionCard
              personality={companion.personality}
              greeting={companion.greeting}
              memoryMessage={memoryMessage}
              level={companion.companionLevel || { level: 1, title: 'First hello', progress: 0, nextLevel: 8, unlockedGreetings: ['Hey'], unlockedDepth: ['check-in'], encouragements: ["You're doing enough."], personalityResponses: ['gentle comfort'] }}
              checkIn={companion.checkIn}
              onAction={handleCompanionAction}
            />
          </Animated.View>
        ) : null}

        <View style={{ height: 36 }} />
      </Animated.ScrollView>

      {/* BottomNav always pinned outside ScrollView */}
      {BottomNav}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:           { flex: 1 },

  // Ambient time-of-day room background (blurred, dimmed) behind the dashboard
  ambientImg:     { width: '100%', height: '100%' },
  ambientScrim:   { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(13,0,20,0.72)' },

  bgGlow:         {
    position: 'absolute', top: -80, alignSelf: 'center',
    width: 320, height: 320, borderRadius: 160,
  },
  environmentLayer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 16,
    paddingBottom: 80,
  },
  environmentArt: {
    width: '88%',
    height: '58%',
    opacity: 0.16,
    tintColor: '#fff',
  },
  container:      { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  parentBadge:    { backgroundColor: '#065F46', borderRadius: 10, padding: 6, alignSelf: 'center', marginBottom: 10 },
  parentBadgeText:{ color: '#6EE7B7', fontSize: 12, fontWeight: '700' },

  logo:           { fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 6 },
  subtitle:       { fontSize: 15, color: '#CBD5E1', textAlign: 'center', marginBottom: 12 },

  // "X day Bip" streak pill — "we see you" energy per vision
  streakPill:     {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 8,
    backgroundColor: 'rgba(13,0,20,0.72)',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 14,
  },
  streakFlame:    { fontSize: 14 },
  streakText:     { color: '#f5f0ff', fontSize: 12, fontWeight: '700', letterSpacing: 0.2 },

  cloudWrap:      { alignItems: 'center', marginVertical: Platform.OS === 'web' ? 6 : 14 },
  cloudImg:       { width: Platform.OS === 'web' ? 64 : 100, height: Platform.OS === 'web' ? 64 : 100 },

  card:           {
    padding: 16, borderRadius: 22, marginBottom: Platform.OS === 'web' ? 10 : 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22, shadowRadius: 8, elevation: 4,
  },
  heroCardTop:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  heroArtGlow:    {
    width: 14, height: 54, borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.16)',
    marginRight: 2,
  },
  heroCardBy:     { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  heroText:       { fontSize: 22, fontWeight: 'bold', lineHeight: 30 },
  cardText:       { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 8 },
  entryText:      { color: '#E2E8F0', fontSize: 14, marginBottom: 6, lineHeight: 20 },

  sectionTitle:   { fontSize: 20, fontWeight: 'bold', marginBottom: 12, marginTop: 8 },

  // ── Mood category tabs ──────────────────────────────────────────────────
  moodCatRow:     { flexDirection: 'row', gap: 8, marginBottom: 14 },
  moodCatTab:     {
    flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, borderWidth: 1, gap: 2,
  },
  moodCatEmoji:   { fontSize: 16 },
  moodCatLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },

  // ── Mood grid ────────────────────────────────────────────────────────────
  moodGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  moodGridItem:   {
    width: '22%', alignItems: 'center', paddingVertical: 10, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(150,120,200,0.25)',
    backgroundColor: 'rgba(15,8,35,0.55)',
  },
  moodGridEmoji:  { fontSize: 22, marginBottom: 3 },
  moodGridLabel:  { fontSize: 9, fontWeight: '600', textAlign: 'center' },

  // ── Bip Wins ─────────────────────────────────────────────────────────────
  winsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  winChip:        {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20,
    backgroundColor: 'rgba(251,191,36,0.12)', borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)',
  },
  winChipLabel:   { fontSize: 11, color: '#fde68a', fontWeight: '600' },

  actionRow:      { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn:      {
    flex: 1, padding: 12, borderRadius: 16, alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  actionBtnText:  { color: '#fff', fontWeight: '700', fontSize: 13 },

  actionsGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  quickCard:      {
    width: '30%', flexGrow: 1, padding: 14, borderRadius: 18,
    alignItems: 'center', borderWidth: 1, gap: 5,
  },
  quickEmoji:     { fontSize: 24 },
  quickLabel:     { color: '#CBD5E1', fontWeight: '600', fontSize: 12, textAlign: 'center' },
});

import React, { useRef, useEffect, useState } from 'react';
import {
  Text, TouchableOpacity,
  View, Animated, Image, StyleSheet, Platform, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomBg } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';

function timeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const h = new Date().getHours();
  if (h >= 5  && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
}

// ─── Local assets ─────────────────────────────────────────────────────────────
// assets/images/cloud-headphones.png  — mind reset circle art
// assets/images/cloud.png             — body reset circle art
// assets/images/raylene-neutral.png   — Raylene presence (swap raylene-avatar.png when available)
// assets/images/rylane-profile.png    — Rylane presence
const CLOUD_HEADPHONES = IMAGES.cloudHeadphones;
const CLOUD            = IMAGES.cloud;

// Avatar map — character-aware hero presence
const AVATAR_ASSETS: Record<string, any> = {
  soft:   IMAGES.rayleneNeutral,
  rylane: IMAGES.rylaneProfile,
  cloud:  IMAGES.rayleneNeutral,
  night:  IMAGES.rayleneNeutral,
};

// ─── Static data ──────────────────────────────────────────────────────────────

const MIND_STEPS = [
  { icon: '☁️', text: 'Unclench your jaw.' },
  { icon: '🌙', text: 'Relax your shoulders.' },
  { icon: '🫧', text: 'Take one slow breath in.' },
  { icon: '💭', text: 'Let one thought pass without chasing it.' },
  { icon: '🕯️', text: "Your mind doesn't have to solve everything tonight." },
];

const BODY_STEPS = [
  { icon: '🫧', text: 'Roll your shoulders slowly.' },
  { icon: '🌿', text: 'Stretch your neck gently.' },
  { icon: '💧', text: 'Drink a little water.' },
  { icon: '🧍🏾', text: 'Unclench your hands.' },
  { icon: '🌙', text: 'Let your body soften for a second.' },
];

const MIND_TOOLS = [
  { emoji: '🎵', label: 'Calm Sounds' },
  { emoji: '🧠', label: 'Brain Dump' },
  { emoji: '💜', label: '+Reminders' },
  { emoji: '🌙', label: 'Night Mode' },
];

const BODY_TOOLS = [
  { emoji: '🤸🏾', label: 'Stretch' },
  { emoji: '💧', label: 'Water Check' },
  { emoji: '🌿', label: 'Release' },
  { emoji: '😴', label: 'Rest Mode' },
];

const MOOD_CHIPS = [
  { label: 'Overwhelmed', emoji: '🌊' },
  { label: 'Anxious',     emoji: '💨' },
  { label: 'Numb',        emoji: '🫥' },
  { label: 'Tired',       emoji: '🌙' },
  { label: 'Okay',        emoji: '☁️' },
  { label: 'Good',        emoji: '💜' },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MindBodyResetScreenProps {
  screen: 'mindReset' | 'bodyReset';
  t: Record<string, any>;
  selectedSekret?: string;
  setScreen: (screen: string) => void;
  onComplete?: () => void;
  BottomNav: React.ReactNode;
  mood?: string;
}

export function MindBodyResetScreen({
  screen, t, selectedSekret = 'soft', setScreen, onComplete, BottomNav, mood,
}: MindBodyResetScreenProps) {

  const isMind    = screen === 'mindReset';
  const isRylane  = selectedSekret === 'rylane';
  const charName  = isRylane ? 'Rylane' : "Se'kret";
  const charEmoji = isRylane ? '⚡' : '💜';

  // Mood glow + character-aware backdrop
  const moodGlow = glowFor(mood);
  const charKey  = isRylane ? 'rylane' : 'raylene';
  const bgSource = getRoomBg(charKey, timeOfDay());

  // ─── Breathe animation ───────────────────────────────────────────────────
  const breatheAnim  = useRef(new Animated.Value(1)).current;
  const glowAnim     = useRef(new Animated.Value(0.5)).current;
  const fadeIn       = useRef(new Animated.Value(0)).current;
  const [breathing, setBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'inhale' | 'hold' | 'exhale' | 'rest'>('inhale');
  const breathLoopRef = useRef<any>(null);

  // Page fade-in
  useEffect(() => {
    Animated.timing(fadeIn, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();
  }, []);

  // Ambient glow pulse (always running)
  useEffect(() => {
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1,   duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.5, duration: 2200, useNativeDriver: true }),
      ])
    );
    glow.start();
    return () => glow.stop();
  }, []);

  // Breathe circle — only runs when user taps Start
  const startBreathing = () => {
    setBreathing(true);
    setBreathPhase('inhale');

    const cycle = () => {
      setBreathPhase('inhale');
      Animated.timing(breatheAnim, { toValue: 1.22, duration: 4000, useNativeDriver: true }).start(() => {
        setBreathPhase('hold');
        setTimeout(() => {
          setBreathPhase('exhale');
          Animated.timing(breatheAnim, { toValue: 1, duration: 4000, useNativeDriver: true }).start(() => {
            setBreathPhase('rest');
            setTimeout(() => {
              cycle(); // loop
            }, 1500);
          });
        }, 2000);
      });
    };

    cycle();
  };

  const stopBreathing = () => {
    setBreathing(false);
    setBreathPhase('inhale');
    breatheAnim.stopAnimation();
    Animated.timing(breatheAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  };

  // ─── Mood state ──────────────────────────────────────────────────────────
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // ─── Tool stub alerts ────────────────────────────────────────────────────
  const handleTool = (label: string) => {
    const dest: Record<string, string> = {
      'Brain Dump':  'pages',
      'Calm Sounds': 'calm',
    };
    const target = dest[label];
    if (target) setScreen(target);
  };

  // ─── onComplete hook ─────────────────────────────────────────────────────
  useEffect(() => {
    onComplete?.();
  }, []);

  // ─── Style helpers ────────────────────────────────────────────────────────
  const scrapCard = (extra?: object) => [
    styles.scrapCard,
    { backgroundColor: t.card, borderColor: t.accent + '55' },
    extra,
  ] as any;

  // ─── Character quote ──────────────────────────────────────────────────────
  const quote = isRylane
    ? "Aight. Drop your shoulders. We not fighting the whole day at once."
    : "You don't have to carry everything today. Reset. Breathe. You're still becoming.";

  // ─── Breath phase label ───────────────────────────────────────────────────
  const phaseLabel: Record<string, string> = {
    inhale: 'inhale slowly…',
    hold:   'hold…',
    exhale: 'let it go…',
    rest:   'rest…',
  };

  const glowOpacity = glowAnim.interpolate({ inputRange: [0.5, 1], outputRange: [0.25, 0.55] });

  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Ambient background glow ──────────────────────────────────────── */}
      <Animated.View
        pointerEvents="none"
        style={[styles.bgGlow, { backgroundColor: moodGlow, opacity: glowOpacity }]}
      />

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >

        {/* ━━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setScreen('home')}>
            <Text style={styles.backChipText}>← Room</Text>
          </TouchableOpacity>
          <View style={[styles.cloudBadge, { backgroundColor: t.card, borderColor: t.accent + '88' }]}>
            <Text style={styles.cloudBadgeText}>☁️ Cloud is here</Text>
          </View>
        </View>

        <Text style={[styles.logo, { color: t.soft }]}>
          {isMind ? 'Mind Reset ♡' : 'Body Reset 🫧'}
        </Text>
        <Text style={styles.subtitle}>
          {isMind ? 'Quiet the noise. Just for a minute.' : 'Your body carries a lot. Give it a moment.'}
        </Text>

        {/* ━━━ HERO — character presence ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={styles.heroRow}>
          <Image
            source={AVATAR_ASSETS[selectedSekret] ?? AVATAR_ASSETS.soft}
            style={styles.heroAvatar}
            resizeMode="contain"
          />
          <View style={[styles.speechBubble, { backgroundColor: t.card, borderColor: t.accent + '66' }]}>
            <Text style={styles.speechText}>
              {isMind
                ? isRylane
                  ? "yo. brain off for a sec. you got this 🤝"
                  : "Hey. I'm right here. Let's breathe together 💜"
                : isRylane
                  ? "real talk — your body needs this break rn 🌿"
                  : "Your body works so hard for you. Let it rest 🫧"
              }
            </Text>
            <View style={[styles.bubbleTail, { borderTopColor: t.card }]} />
          </View>
        </View>

        {/* ━━━ BREATHE CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={scrapCard()}>
          <Text style={styles.cardLabel}>Breathe with me ♡</Text>

          {/* Glowing breathe circle */}
          <View style={styles.circleWrap}>
            {/* Outer glow ring */}
            <Animated.View
              pointerEvents="none"
              style={[
                styles.glowRing,
                {
                  borderColor: t.accent,
                  transform: [{ scale: breatheAnim }],
                  opacity: breathing ? 0.45 : 0.18,
                },
              ]}
            />
            <Animated.View
              style={[
                styles.circle,
                {
                  transform: [{ scale: breatheAnim }],
                  backgroundColor: t.accent,
                  shadowColor: t.accent,
                },
              ]}
            >
              <Image
                source={isMind ? CLOUD_HEADPHONES : CLOUD}
                style={styles.circleImg}
                resizeMode="contain"
              />
              <Text style={styles.circlePhase}>
                {breathing ? phaseLabel[breathPhase] : 'inhale • exhale'}
              </Text>
            </Animated.View>
          </View>

          {/* Inhale / hold / exhale guide row */}
          <View style={styles.breatheGuide}>
            {(['inhale', 'hold', 'exhale', 'rest'] as const).map(phase => (
              <View
                key={phase}
                style={[
                  styles.guideChip,
                  {
                    backgroundColor: breathing && breathPhase === phase
                      ? t.accent
                      : t.background,
                    borderColor: t.accent + '55',
                  },
                ]}
              >
                <Text style={[
                  styles.guideChipText,
                  { color: breathing && breathPhase === phase ? '#fff' : t.soft },
                ]}>
                  {phase}
                </Text>
              </View>
            ))}
          </View>

          {breathing ? (
            <TouchableOpacity
              style={[styles.breatheBtn, { backgroundColor: '#334155' }]}
              onPress={stopBreathing}
            >
              <Text style={styles.breatheBtnText}>Stop ✕</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.breatheBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
              onPress={startBreathing}
            >
              <Text style={styles.breatheBtnText}>Start Breathing 🫧</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ━━━ RESET STEPS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={scrapCard()}>
          <Text style={styles.cardLabel}>
            {isMind ? 'Mind Reset Steps' : 'Body Reset Steps'}
          </Text>
          {(isMind ? MIND_STEPS : BODY_STEPS).map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <Text style={styles.stepIcon}>{step.icon}</Text>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        {/* ━━━ RESET TOOLS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <Text style={[styles.sectionTitle, { color: t.soft }]}>
          {isMind ? 'Mind Tools' : 'Body Tools'}
        </Text>
        <View style={styles.toolsGrid}>
          {(isMind ? MIND_TOOLS : BODY_TOOLS).map(tool => (
            <TouchableOpacity
              key={tool.label}
              style={[styles.toolCard, { backgroundColor: t.card, borderColor: t.accent + '55' }]}
              onPress={() => handleTool(tool.label)}
            >
              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              <Text style={[styles.toolLabel, { color: t.soft }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ━━━ MOOD CHECK-IN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={scrapCard()}>
          <Text style={styles.cardLabel}>How are you feeling rn?</Text>
          <View style={styles.chipRow}>
            {MOOD_CHIPS.map(chip => {
              const active = selectedMood === chip.label;
              return (
                <TouchableOpacity
                  key={chip.label}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: active ? t.accent : t.background,
                      borderColor: active ? t.accent : t.accent + '44',
                    },
                  ]}
                  onPress={() => setSelectedMood(active ? null : chip.label)}
                >
                  <Text style={styles.moodChipEmoji}>{chip.emoji}</Text>
                  <Text style={[styles.moodChipText, { color: active ? '#fff' : t.soft }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedMood && (
            <Text style={[styles.moodAck, { color: t.soft }]}>
              {charEmoji} {charName} sees you. That's valid.
            </Text>
          )}
        </View>

        {/* ━━━ SE'KRET QUOTE CARD ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <View style={[scrapCard(), styles.quoteCard]}>
          <Text style={styles.quoteEmoji}>{charEmoji}</Text>
          <Text style={[styles.quoteText, { color: t.soft }]}>"{quote}"</Text>
          <Text style={[styles.quoteSig, { color: t.accent }]}>— {charName}</Text>
        </View>

        {/* ━━━ NAV BUTTONS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <TouchableOpacity
          style={[styles.mainBtn, { backgroundColor: t.accent, shadowColor: t.accent }]}
          onPress={() => setScreen('comfort')}
        >
          <Text style={styles.mainBtnText}>Open Comfort Mode 💙</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => setScreen('calm')}
        >
          <Text style={styles.ghostBtnText}>← Back to Calm 🌙</Text>
        </TouchableOpacity>

        <View style={{ height: 36 }} />
      </Animated.ScrollView>

      {/* BottomNav always pinned — never scrolls away */}
      {BottomNav}
    </ImageBackground>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root:            { flex: 1 },
  bgGlow:          {
    position: 'absolute', top: -120, alignSelf: 'center',
    width: 340, height: 340, borderRadius: 170,
  },
  container:       { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  // Header
  headerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backChip:        { backgroundColor: '#1E1035', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  backChipText:    { color: '#CBD5E1', fontSize: 13, fontWeight: '600' },
  cloudBadge:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  cloudBadgeText:  { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },

  logo:            { fontSize: 30, fontWeight: 'bold', textAlign: 'center', marginBottom: 6, letterSpacing: 0.4 },
  subtitle:        { fontSize: 14, color: '#CBD5E1', textAlign: 'center', marginBottom: 22, lineHeight: 20 },

  // Hero
  heroRow:         { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20, gap: 12 },
  heroAvatar:      { width: 90, height: 110, borderRadius: 16 },
  speechBubble:    {
    flex: 1, padding: 14, borderRadius: 18, borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  speechText:      { color: '#E2E8F0', fontSize: 14, lineHeight: 21 },
  bubbleTail:      {
    position: 'absolute', left: -10, bottom: 14,
    width: 0, height: 0,
    borderStyle: 'solid',
    borderTopWidth: 10, borderRightWidth: 10, borderBottomWidth: 0, borderLeftWidth: 0,
    borderTopColor: 'transparent', borderRightColor: 'transparent',
  },

  // Scrap cards
  scrapCard:       {
    padding: 18, borderRadius: 22, marginBottom: 18, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  cardLabel:       { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 14, letterSpacing: 0.2 },

  // Breathe circle
  circleWrap:      { alignItems: 'center', justifyContent: 'center', marginVertical: 16, height: 200 },
  glowRing:        {
    position: 'absolute',
    width: 200, height: 200, borderRadius: 100,
    borderWidth: 2,
  },
  circle:          {
    width: 160, height: 160, borderRadius: 80,
    justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 28, elevation: 14,
  },
  circleImg:       { width: 72, height: 72 },
  circlePhase:     { color: '#fff', fontSize: 13, marginTop: 6, fontWeight: '600', opacity: 0.9 },

  breatheGuide:    { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 16 },
  guideChip:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  guideChipText:   { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  breatheBtn:      {
    padding: 14, borderRadius: 16, alignItems: 'center',
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  breatheBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  // Steps
  stepRow:         { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  stepIcon:        { fontSize: 18, marginTop: 1 },
  stepText:        { color: '#E2E8F0', fontSize: 14, lineHeight: 22, flex: 1 },

  // Tools grid
  sectionTitle:    { fontSize: 17, fontWeight: '700', marginBottom: 12, marginTop: 4 },
  toolsGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  toolCard:        {
    width: '47%', padding: 16, borderRadius: 18, borderWidth: 1,
    alignItems: 'center', gap: 6,
  },
  toolEmoji:       { fontSize: 28 },
  toolLabel:       { fontSize: 13, fontWeight: '600', textAlign: 'center' },

  // Mood chips
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  moodChip:        {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
  },
  moodChipEmoji:   { fontSize: 15 },
  moodChipText:    { fontSize: 13, fontWeight: '600' },
  moodAck:         { fontSize: 13, marginTop: 8, fontStyle: 'italic', textAlign: 'center' },

  // Quote
  quoteCard:       { alignItems: 'center', paddingVertical: 22 },
  quoteEmoji:      { fontSize: 30, marginBottom: 10 },
  quoteText:       { fontSize: 16, fontStyle: 'italic', textAlign: 'center', lineHeight: 26, marginBottom: 10 },
  quoteSig:        { fontSize: 13, fontWeight: '700', letterSpacing: 0.4 },

  // Nav
  mainBtn:         {
    padding: 16, borderRadius: 18, alignItems: 'center', marginBottom: 12,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  mainBtnText:     { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ghostBtn:        { backgroundColor: '#1E1035', padding: 13, borderRadius: 16, alignItems: 'center', marginBottom: 8 },
  ghostBtnText:    { color: '#CBD5E1', fontWeight: '600', fontSize: 14 },
});

// screens/ComfortScreen.tsx
// Se'kret Bip — Comfort Mode
// A non-clinical pause-and-grounding surface with explicit user control.

import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { MOOD_GLOW } from '../constants/moodGlow';
import { MiniReactionSticker, type MiniStickerCharacter } from '../components/MiniReactionSticker';
import { SyncBadge, type SyncStatus } from '../components/SyncBadge';
import { getVisibleSekretName, normalizeSekretCharacter } from '../utils/api';
import { COMFORT_MOTION } from '../src/motion/comfortMotion';
import {
  AccessibilityInfo,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const RAINY_BG = IMAGES.bgComfort;

const CLOUD_ROTATION = [
  IMAGES.cloudStormy,
  IMAGES.cloudHappy,
  IMAGES.cloudHeadphones,
  IMAGES.cloudSleepy,
  IMAGES.cloud,
  IMAGES.cloudHeadphonesV2,
];

const CLOUD_PHASES = ['rain', 'day', 'afternoon', 'night', 'midday', 'evening'] as const;
const { width: SCREEN_W } = Dimensions.get('window');

const COMFORT_MESSAGES = [
  { emoji: '🌙', text: 'You can take this one small step at a time.' },
  { emoji: '☁️', text: 'A pause can make room for your next choice.' },
  { emoji: '💙', text: 'Notice what feels steady around you right now.' },
  { emoji: '🌧️', text: 'A difficult moment does not have to decide the whole day.' },
  { emoji: '✨', text: 'You do not have to solve everything at once.' },
  { emoji: '🫶', text: 'Your feelings can be noticed without rushing them.' },
  { emoji: '🕯️', text: 'Slow down and choose the next step that fits you.' },
];

const GROUNDING_STEPS = [
  { id: 1, text: 'Put both feet on the floor.' },
  { id: 2, text: 'Name 3 things you can see.' },
  { id: 3, text: 'Take one slow breath.' },
  { id: 4, text: 'Open Calm Space for another breathing option.', action: 'calm' },
];

interface ComfortScreenProps {
  t: Record<string, any>;
  setScreen: (screen: string) => void;
  onComplete?: () => void;
  BottomNav: React.ReactNode;
  selectedSekret?: string;
  character?: MiniStickerCharacter;
  mood?: string;
  companion?: {
    presenceMessage: string;
  };
  syncStatus?: SyncStatus;
}

export function ComfortScreen({
  t,
  setScreen,
  onComplete,
  BottomNav,
  selectedSekret = 'soft',
  character,
  mood,
  companion,
  syncStatus,
}: ComfortScreenProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const [msgIdx, setMsgIdx] = useState(0);
  const [cloudIdx, setCloudIdx] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const completedRef = useRef(false);

  const cloudFadeAnim = useRef(new Animated.Value(1)).current;
  const cloudFloat = useRef(new Animated.Value(0)).current;
  const cloudBreath = useRef(new Animated.Value(0)).current;
  const pillBreath = useRef(new Animated.Value(0)).current;

  const characterId = normalizeSekretCharacter(selectedSekret);
  const characterName = getVisibleSekretName(characterId);
  const isSy = characterId === 'sy';
  const characterEmoji = isSy ? '⚡' : characterId === 'cloud' ? '☁️' : characterId === 'night' ? '🌙' : '💜';
  const moodKey = mood?.toLowerCase?.() ?? mood ?? '';
  const moodGlow = MOOD_GLOW[moodKey] ?? MOOD_GLOW[mood ?? ''] ?? MOOD_GLOW.Tired;

  const heroCopy = isSy
    ? { title: 'Comfort Mode', sub: 'A heavy moment can be handled one step at a time.' }
    : { title: 'Comfort Mode', sub: 'Pause here and choose the next small step that fits.' };

  const supportCopy = isSy
    ? { title: 'Take this at your pace.', sub: 'No fixing performance. Just a few optional grounding steps.' }
    : { title: 'Take your time.', sub: 'These optional steps can help you pause and notice what is around you.' };

  const allDoneCopy = `${characterEmoji} You completed these grounding steps. Choose what you want to do next.`;
  const calmBtnCopy = '🌙 Open Calm Space';
  const doneCopy = 'Done for now ›';

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (active) setReduceMotion(enabled);
      })
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => setReduceMotion(enabled),
    );

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      cloudFloat.stopAnimation();
      cloudBreath.stopAnimation();
      pillBreath.stopAnimation();
      cloudFloat.setValue(0);
      cloudBreath.setValue(0);
      pillBreath.setValue(0);
      return undefined;
    }

    const loops = [
      Animated.loop(
        Animated.sequence([
          Animated.timing(cloudFloat, {
            toValue: 1,
            duration: COMFORT_MOTION.cloudFloatDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(cloudFloat, {
            toValue: 0,
            duration: COMFORT_MOTION.cloudFloatDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(cloudBreath, {
            toValue: 1,
            duration: COMFORT_MOTION.cloudBreathDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(cloudBreath, {
            toValue: 0,
            duration: COMFORT_MOTION.cloudBreathDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pillBreath, {
            toValue: 1,
            duration: COMFORT_MOTION.presenceBreathDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pillBreath, {
            toValue: 0,
            duration: COMFORT_MOTION.presenceBreathDurationMs,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ),
    ];

    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [cloudBreath, cloudFloat, pillBreath, reduceMotion]);

  const rainDrops = useRef(
    Array.from({ length: 10 }, (_, index) => ({
      anim: new Animated.Value(0),
      left: (index / 10) * SCREEN_W + ((index * 17) % 24),
      duration: 1500 + ((index * 137) % 900),
      delay: index * 180 + ((index * 83) % 360),
    })),
  ).current;

  useEffect(() => {
    let active = true;
    const timers: ReturnType<typeof setTimeout>[] = [];

    if (reduceMotion) {
      rainDrops.forEach(drop => {
        drop.anim.stopAnimation();
        drop.anim.setValue(0);
      });
      return () => {
        active = false;
      };
    }

    const runDrop = (drop: (typeof rainDrops)[number]) => {
      if (!active) return;
      drop.anim.setValue(0);
      Animated.timing(drop.anim, {
        toValue: 1,
        duration: drop.duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished && active) runDrop(drop);
      });
    };

    rainDrops.forEach(drop => {
      timers.push(setTimeout(() => runDrop(drop), drop.delay));
    });

    return () => {
      active = false;
      timers.forEach(timer => clearTimeout(timer));
      rainDrops.forEach(drop => drop.anim.stopAnimation());
    };
  }, [rainDrops, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) {
      cloudFadeAnim.stopAnimation();
      cloudFadeAnim.setValue(1);
      setCloudIdx(0);
      return undefined;
    }

    const interval = setInterval(() => {
      Animated.timing(cloudFadeAnim, {
        toValue: 0,
        duration: COMFORT_MOTION.cloudCrossfadeOutMs,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished) return;
        setCloudIdx(index => (index + 1) % CLOUD_ROTATION.length);
        Animated.timing(cloudFadeAnim, {
          toValue: 1,
          duration: COMFORT_MOTION.cloudCrossfadeInMs,
          useNativeDriver: true,
        }).start();
      });
    }, COMFORT_MOTION.cloudRotationIntervalMs);

    return () => {
      clearInterval(interval);
      cloudFadeAnim.stopAnimation();
    };
  }, [cloudFadeAnim, reduceMotion]);

  const cloudStyle = reduceMotion
    ? { transform: [{ translateY: 0 }, { scale: 1 }], opacity: 1 }
    : {
        transform: [
          { translateY: cloudFloat.interpolate({ inputRange: [0, 1], outputRange: COMFORT_MOTION.cloudTranslateY }) },
          { scale: cloudBreath.interpolate({ inputRange: [0, 1], outputRange: COMFORT_MOTION.cloudScale }) },
        ],
        opacity: cloudBreath.interpolate({ inputRange: [0, 1], outputRange: COMFORT_MOTION.cloudOpacity }),
      };

  const pillStyle = reduceMotion
    ? { opacity: 1, transform: [{ scale: 1 }] }
    : {
        opacity: pillBreath.interpolate({ inputRange: [0, 1], outputRange: COMFORT_MOTION.presenceOpacity }),
        transform: [{ scale: pillBreath.interpolate({ inputRange: [0, 1], outputRange: COMFORT_MOTION.presenceScale }) }],
      };

  const finishComfort = (target: string) => {
    if (!completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
    setScreen(target);
  };

  const toggleStep = (id: number, action?: string) => {
    setChecked(previous => (
      previous.includes(id)
        ? previous.filter(value => value !== id)
        : [...previous, id]
    ));
    if (action === 'calm') finishComfort('calm');
  };

  const allDone = checked.length === GROUNDING_STEPS.length;
  const card = (extra?: object) => [
    styles.card,
    { backgroundColor: t.card, borderColor: t.accent },
    extra,
  ] as any;

  return (
    <View style={[styles.root, { backgroundColor: t.background }]}>
      <AmbientWeatherOverlay phase={reduceMotion ? 'rain' : CLOUD_PHASES[cloudIdx]} />

      <View style={styles.bgWrap} pointerEvents="none">
        <Image source={RAINY_BG} style={styles.bgImage} resizeMode="cover" blurRadius={3} />
        <View style={[styles.bgMoodScrim, { backgroundColor: moodGlow + '10' }]} />
        <LinearGradient
          colors={['rgba(13,0,20,0.65)', 'rgba(13,0,20,0.55)', 'rgba(13,0,20,0.85)']}
          style={StyleSheet.absoluteFill}
        />
        {!reduceMotion && rainDrops.map((drop, index) => (
          <Animated.View
            key={index}
            style={[
              styles.rainStreak,
              {
                left: drop.left,
                opacity: drop.anim.interpolate({
                  inputRange: [0, 0.1, 0.9, 1],
                  outputRange: [0, 0.45, 0.45, 0],
                }),
                transform: [{
                  translateY: drop.anim.interpolate({ inputRange: [0, 1], outputRange: [-40, 700] }),
                }],
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.presencePill, pillStyle]} pointerEvents="none">
          <Text style={styles.presenceText}>{companion?.presenceMessage || 'Cloud is here · rainy room'}</Text>
        </Animated.View>

        <Text style={[styles.logo, { textShadowColor: moodGlow + '99' }]}>{heroCopy.title}</Text>
        <Text style={styles.subtitle}>{heroCopy.sub}</Text>
        <SyncBadge status={syncStatus ?? 'idle'} />

        <Animated.View style={[styles.cloudWrap, cloudStyle]}>
          <Animated.Image
            source={CLOUD_ROTATION[cloudIdx]}
            style={[styles.artworkMedium, { opacity: reduceMotion ? 1 : cloudFadeAnim }]}
            resizeMode="contain"
            accessibilityLabel="Cloud companion"
          />
        </Animated.View>

        <View style={[card({ shadowColor: moodGlow }), styles.cardGlow]}>
          <Text style={styles.cardEmoji}>💙</Text>
          <Text style={[styles.cardText, { color: '#fff' }]}>{supportCopy.title}</Text>
          <Text style={[styles.entryText, { color: t.soft }]}>{supportCopy.sub}</Text>
          <MiniReactionSticker character={character ?? null} screenContext="comfort" size={40} />
        </View>

        <Text style={[styles.sectionTitle, { color: t.accent }]}>Grounding Steps</Text>
        <View style={card()}>
          {GROUNDING_STEPS.map(step => {
            const done = checked.includes(step.id);
            return (
              <TouchableOpacity
                key={step.id}
                testID={`comfort-step-${step.id}`}
                style={styles.stepRow}
                onPress={() => toggleStep(step.id, step.action)}
                activeOpacity={0.7}
                accessibilityRole="checkbox"
                accessibilityLabel={`${step.text}${step.action === 'calm' ? ' Opens Calm Space.' : ''}`}
                accessibilityState={{ checked: done }}
              >
                <View
                  importantForAccessibility="no-hide-descendants"
                  style={[
                    styles.stepCheck,
                    { borderColor: t.accent, backgroundColor: done ? t.accent : 'transparent' },
                  ]}
                >
                  {done && <Text style={styles.stepCheckMark}>✓</Text>}
                </View>
                <Text style={[
                  styles.stepText,
                  {
                    color: done ? t.soft : '#fff',
                    textDecorationLine: done ? 'line-through' : 'none',
                  },
                ]}>
                  {step.id}. {step.text}
                </Text>
                {step.action === 'calm' && !done && (
                  <Text style={[styles.stepAction, { color: t.accent }]}>→ Calm</Text>
                )}
              </TouchableOpacity>
            );
          })}

          {allDone && (
            <View
              testID="comfort-steps-complete"
              style={[styles.allDoneBadge, {
                backgroundColor: 'rgba(13,0,20,0.6)',
                borderColor: t.accent,
              }]}
              accessibilityLiveRegion="polite"
            >
              <Text style={[styles.allDoneText, { color: t.soft }]}>{allDoneCopy}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.sectionTitle, { color: t.accent }]}>{characterName} says {characterEmoji}</Text>
        <View style={[card({ shadowColor: moodGlow }), styles.cardGlow]}>
          <Text style={styles.cardEmoji}>{COMFORT_MESSAGES[msgIdx].emoji}</Text>
          <Text style={[styles.cardText, { color: '#fff' }]}>{COMFORT_MESSAGES[msgIdx].text}</Text>
          <TouchableOpacity
            style={[styles.anotherBtn, { backgroundColor: '#334155' }]}
            onPress={() => setMsgIdx(index => (index + 1) % COMFORT_MESSAGES.length)}
            accessibilityRole="button"
            accessibilityLabel="Show another grounding thought"
          >
            <Text style={styles.anotherBtnText}>Another Grounding Thought ✨</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          testID="comfort-open-calm"
          style={[styles.calmBtn, { backgroundColor: t.accent, shadowColor: moodGlow }]}
          onPress={() => finishComfort('calm')}
          accessibilityRole="button"
          accessibilityLabel="Open Calm Space and finish this Comfort visit"
        >
          <Text style={styles.calmBtnText}>{calmBtnCopy}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          testID="comfort-done"
          style={[styles.betterBtn, { borderColor: t.accent }]}
          onPress={() => finishComfort('home')}
          accessibilityRole="button"
          accessibilityLabel="Finish this Comfort visit and return home"
        >
          <Text style={[styles.betterBtnText, { color: t.soft }]}>{doneCopy}</Text>
        </TouchableOpacity>
      </ScrollView>

      {BottomNav}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bgWrap: StyleSheet.absoluteFill,
  bgImage: { width: '100%', height: '100%' },
  bgMoodScrim: StyleSheet.absoluteFill,
  rainStreak: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: 22,
    backgroundColor: 'rgba(180,210,255,0.55)',
    borderRadius: 1,
  },
  scroll: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
    ...(Platform.OS === 'web'
      ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const }
      : {}),
  },
  presencePill: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(168,85,247,0.22)',
    borderColor: 'rgba(168,85,247,0.5)',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  presenceText: {
    color: '#e9d5ff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logo: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  subtitle: {
    fontSize: 15,
    color: '#CBD5E1',
    textAlign: 'center',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  cloudWrap: { alignItems: 'center' },
  artworkMedium: { width: '100%', height: 200, marginBottom: 16, borderRadius: 16 },
  card: { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1 },
  cardGlow: { shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardText: { fontSize: 17, fontWeight: '600', marginBottom: 8 },
  entryText: { fontSize: 14, marginBottom: 6, lineHeight: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 10, marginTop: 4 },
  stepRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    gap: 12,
  },
  stepCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  stepCheckMark: { color: '#fff', fontSize: 12, fontWeight: '900' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
  stepAction: { fontSize: 12, fontWeight: '700' },
  allDoneBadge: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  allDoneText: { fontSize: 13, textAlign: 'center', fontWeight: '600' },
  anotherBtn: { minHeight: 48, padding: 11, borderRadius: 14, marginTop: 8, justifyContent: 'center' },
  anotherBtnText: { color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 13 },
  calmBtn: {
    minHeight: 52,
    padding: 16,
    borderRadius: 18,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  calmBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  betterBtn: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  betterBtnText: { fontSize: 15, fontWeight: '600' },
});
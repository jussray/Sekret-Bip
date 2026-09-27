// app/(teen)/sekret.tsx
// Entry point for the teen's safe space.
//
// The canonical theme helper currently returns a room color rather than an
// ImageSource. Keep the same time-aware world treatment without pretending a
// color string is an ImageBackground asset.

import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { PERSONALITY_CONFIG } from '@/services/ai';
import { TEEN_ROUTES } from '@/teen/routes';
import { useAppContext } from '@/context/AppContext';
import {
  getRoomBg,
  getRoomPhase,
  normalizeCharacterKey,
} from '@/constants/theme';
import type { PersonalityId } from '@/types';

const PERSONALITY_ORDER: PersonalityId[] = ['raylene', 'rylane', 'cloud', 'night', 'oracle'];

const TEEN_SHORTCUTS = [
  { label: 'Write It Out', emoji: '✏️', route: TEEN_ROUTES.pages },
  { label: 'Voice Bip', emoji: '🎙️', route: TEEN_ROUTES.voiceBip },
  { label: 'Calm Me', emoji: '☁️', route: TEEN_ROUTES.calm },
  { label: 'Circle', emoji: '👥', route: TEEN_ROUTES.circle },
] as const;

export default function TeenSekretRoute() {
  const { selectedSekret } = useAppContext();
  const charKey = useMemo(
    () => normalizeCharacterKey(selectedSekret ?? 'raylene'),
    [selectedSekret],
  );
  const roomPhase = useMemo(() => getRoomPhase(new Date().getHours()), []);
  const backgroundColor = useMemo(() => getRoomBg(charKey), [charKey]);

  const [pickerVisible, setPickerVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function openPicker() {
    setPickerVisible(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 320,
      useNativeDriver: true,
    }).start();
  }

  function closePicker() {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => setPickerVisible(false));
  }

  function handleCompanionSelect(id: PersonalityId) {
    closePicker();
    router.push({
      pathname: TEEN_ROUTES.pages,
      params: { companion: id },
    } as never);
  }

  return (
    <View style={[s.root, { backgroundColor }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <View style={[StyleSheet.absoluteFill, { backgroundColor }]}>
        <LinearGradient
          colors={
            roomPhase === 'day'
              ? ['rgba(255,255,255,0.05)', 'rgba(10,5,25,0.72)']
              : roomPhase === 'evening'
                ? ['rgba(91,51,122,0.22)', 'rgba(10,5,25,0.80)']
                : ['rgba(20,10,40,0.30)', 'rgba(10,5,25,0.88)']
          }
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
        <View style={s.flex}>
          <View style={s.spacer} />

          <View style={s.ctaBlock}>
            <Text style={s.ctaLabel}>Press Se'kret Bip</Text>
            <Text style={s.ctaSub}>to enter your safe space</Text>
            <TouchableOpacity style={s.ctaButton} onPress={openPicker} activeOpacity={0.85}>
              <Text style={s.ctaButtonText}>Se'kret Bip 🩷</Text>
            </TouchableOpacity>
          </View>

          <View style={s.shortcutBar}>
            {TEEN_SHORTCUTS.map(item => (
              <TouchableOpacity
                key={item.label}
                style={s.shortcutItem}
                onPress={() => router.push(item.route as never)}
                activeOpacity={0.8}
              >
                <Text style={s.shortcutEmoji}>{item.emoji}</Text>
                <Text style={s.shortcutLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={s.tagline}>your space. your voice. always you. 🩷</Text>
        </View>
      </SafeAreaView>

      {pickerVisible ? (
        <Animated.View style={[s.pickerOverlay, { opacity: fadeAnim }]}>
          <SafeAreaView style={s.pickerSafe} edges={['top', 'left', 'right', 'bottom']}>
            <ScrollView
              contentContainerStyle={s.pickerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={s.pickerHeader}>
                <Text style={s.pickerHeading}>Se'kret 💜</Text>
                <TouchableOpacity
                  onPress={closePicker}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={s.pickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={s.pickerSub}>Choose who you want to talk to.</Text>

              {PERSONALITY_ORDER.map(id => {
                const personality = PERSONALITY_CONFIG[id];
                return (
                  <TouchableOpacity
                    key={id}
                    style={[s.card, { borderColor: `${personality.accentColor}40` }]}
                    onPress={() => handleCompanionSelect(id)}
                    activeOpacity={0.85}
                  >
                    <Text style={s.emoji}>{personality.emoji}</Text>
                    <View style={s.cardBody}>
                      <Text style={[s.name, { color: personality.accentColor }]}>
                        {personality.name}
                      </Text>
                      <Text style={s.personalityTitle}>{personality.title}</Text>
                      <Text style={s.vibe}>{personality.vibe}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0015' },
  safe: { flex: 1 },
  flex: { flex: 1, justifyContent: 'flex-end' },
  spacer: { flex: 1 },
  ctaBlock: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 20,
  },
  ctaLabel: {
    color: 'rgba(255,255,255,0.90)',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    marginBottom: 18,
    textAlign: 'center',
  },
  ctaButton: {
    borderWidth: 2,
    borderColor: '#f040b0',
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 48,
    backgroundColor: 'rgba(240,64,176,0.15)',
    shadowColor: '#f040b0',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  },
  ctaButtonText: {
    color: '#f9a8d4',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  shortcutBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  shortcutItem: { alignItems: 'center', gap: 4, minWidth: 64 },
  shortcutEmoji: { fontSize: 22 },
  shortcutLabel: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  tagline: {
    color: 'rgba(255,255,255,0.30)',
    fontSize: 11,
    textAlign: 'center',
    paddingBottom: 12,
    letterSpacing: 0.3,
  },
  pickerOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(8,4,20,0.95)',
    zIndex: 99,
  },
  pickerSafe: { flex: 1 },
  pickerContent: { padding: 24, paddingBottom: 48 },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  pickerHeading: { color: '#fff', fontSize: 26, fontWeight: '800' },
  pickerClose: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 20,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pickerSub: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 14,
    marginBottom: 28,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
  },
  emoji: { fontSize: 36 },
  cardBody: { flex: 1, gap: 3 },
  name: { fontSize: 18, fontWeight: '700' },
  personalityTitle: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    fontWeight: '500',
  },
  vibe: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
});

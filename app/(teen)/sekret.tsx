import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  SafeAreaView, ImageBackground, Animated, StatusBar,
} from 'react-native';
import { router } from 'expo-router';
import { PERSONALITY_CONFIG } from '@/services/ai';
import { TEEN_ROUTES } from '@/teen/routes';
import { TEEN_SPLASH } from '@/teen/assets';
import type { PersonalityId } from '@/types';

const PERSONALITY_ORDER: PersonalityId[] = ['raylene', 'rylane', 'cloud', 'night', 'ja'];

const TEEN_SHORTCUTS = [
  { label: 'Write It Out', emoji: '✏️', route: TEEN_ROUTES.pages    },
  { label: 'Voice Bip',   emoji: '🎙️', route: TEEN_ROUTES.voiceBip },
  { label: 'Calm Me',     emoji: '☁️', route: TEEN_ROUTES.calm      },
  { label: 'Circle',      emoji: '👥', route: TEEN_ROUTES.circle     },
] as const;

export default function TeenSekretRoute() {
  const [pickerVisible, setPickerVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  function openPicker() {
    setPickerVisible(true);
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }

  function closePicker() {
    Animated.timing(fadeAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
      setPickerVisible(false),
    );
  }

  function handleShortcut(route: string) {
    router.push(route as any);
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <ImageBackground source={TEEN_SPLASH} style={styles.splash} resizeMode="cover">
        <SafeAreaView style={styles.splashInner}>
          <View style={styles.ctaBlock}>
            <Text style={styles.ctaLabel}>Press Se'kret Bip</Text>
            <Text style={styles.ctaSub}>to enter your safe space</Text>
            <TouchableOpacity style={styles.ctaButton} onPress={openPicker} activeOpacity={0.85}>
              <Text style={styles.ctaButtonText}>Se'kret Bip 🩷</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.shortcutBar}>
            {TEEN_SHORTCUTS.map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.shortcutItem}
                onPress={() => handleShortcut(item.route)}
                activeOpacity={0.8}
              >
                <Text style={styles.shortcutEmoji}>{item.emoji}</Text>
                <Text style={styles.shortcutLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.tagline}>your space. your voice. always you. 🩷</Text>
        </SafeAreaView>
      </ImageBackground>

      {pickerVisible && (
        <Animated.View style={[styles.pickerOverlay, { opacity: fadeAnim }]}>
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              contentContainerStyle={styles.pickerContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.pickerHeader}>
                <Text style={styles.pickerHeading}>Se'kret 💜</Text>
                <TouchableOpacity onPress={closePicker}>
                  <Text style={styles.pickerClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.pickerSub}>Choose who you want to talk to.</Text>

              {PERSONALITY_ORDER.map(id => {
                const p = PERSONALITY_CONFIG[id];
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.card, { borderColor: p.accentColor + '40' }]}
                    onPress={() => router.push(`/(teen)/chat/${id}` as any)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.emoji}>{p.emoji}</Text>
                    <View style={styles.cardBody}>
                      <Text style={[styles.name, { color: p.accentColor }]}>{p.name}</Text>
                      <Text style={styles.title}>{p.title}</Text>
                      <Text style={styles.vibe}>{p.vibe}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#0d0015' },
  splash:         { flex: 1 },
  splashInner:    { flex: 1, justifyContent: 'flex-end' },

  ctaBlock:       { alignItems: 'center', paddingHorizontal: 32, paddingBottom: 16 },
  ctaLabel:       { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  ctaSub:         { color: '#ddd', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  ctaButton: {
    borderWidth: 2, borderColor: '#f040b0', borderRadius: 50,
    paddingVertical: 14, paddingHorizontal: 48,
    backgroundColor: 'rgba(240,64,176,0.15)',
    shadowColor: '#f040b0', shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 12,
  },
  ctaButtonText:  { color: '#f9a8d4', fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },

  shortcutBar: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 12, paddingVertical: 12,
    backgroundColor: 'rgba(10,0,20,0.72)', marginTop: 8,
  },
  shortcutItem:   { alignItems: 'center', flex: 1 },
  shortcutEmoji:  { fontSize: 22, marginBottom: 4 },
  shortcutLabel:  { color: '#f9a8d4', fontSize: 10, fontWeight: '600', textAlign: 'center' },

  tagline:        { color: '#c084fc', fontSize: 11, textAlign: 'center', paddingBottom: 8 },

  pickerOverlay:  { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0d0015', zIndex: 10 },
  pickerContent:  { padding: 24, paddingTop: 16, paddingBottom: 40 },
  pickerHeader:   {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 4,
  },
  pickerHeading:  { color: '#fff', fontSize: 24, fontWeight: '800' },
  pickerClose:    { color: '#888', fontSize: 20, padding: 4 },
  pickerSub:      { color: '#666', fontSize: 14, marginBottom: 28 },

  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#111827', borderRadius: 20,
    padding: 18, marginBottom: 14, borderWidth: 1,
  },
  emoji:    { fontSize: 32, marginTop: 2, marginRight: 14 },
  cardBody: { flex: 1 },
  name:     { fontSize: 17, fontWeight: '700', marginBottom: 2 },
  title:    { color: '#888', fontSize: 12, marginBottom: 6 },
  vibe:     { color: '#555', fontSize: 13, lineHeight: 18 },
});

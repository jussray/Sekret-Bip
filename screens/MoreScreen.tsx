// screens/MoreScreen.tsx
// Se'kret Bip — More (utility hub)
// Light polish: backdrop + gradient overlay + mood-tinted accents.
// Functionality preserved — only adds optional mood/selectedSekret props.

import React from 'react';
import {
  Text, TouchableOpacity, ScrollView,
  View, StyleSheet, Platform, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg } from '../constants/theme';

interface MoreScreenProps {
  t: Record<string, any>;
  userSide: string;
  setUserSide: (side: string) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  mood?: string;
  selectedSekret?: string;
}

function glowFor(mood?: string): string {
  const m = (mood || '').toLowerCase();
  if (m.includes('happy'))       return '#fbbf24';
  if (m.includes('sad') || m.includes('anx'))    return '#7dd3fc';
  if (m.includes('angry') || m.includes('over') || m.includes('stress')) return '#f472b6';
  if (m.includes('tired'))       return '#6d28d9';
  if (m.includes('calm'))        return '#c4b5fd';
  return '#c4b5fd';
}

export function MoreScreen({
  t, userSide, setUserSide, setScreen, BottomNav,
  mood, selectedSekret,
}: MoreScreenProps) {
  const glow = glowFor(mood);
  const card = () => [styles.card, { backgroundColor: 'rgba(30,18,55,0.88)', borderColor: glow + '88', shadowColor: glow }] as any;
  const btn  = () => [styles.button, { backgroundColor: glow, shadowColor: glow }] as any;
  const character: 'raylene' | 'rylane' = selectedSekret === 'rylane' ? 'rylane' : 'raylene';
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'evening' : 'night';
  const roomBg = getRoomBg(character, timeOfDay as any);

  return (
    <ImageBackground source={roomBg} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(36,16,56,0.65)', 'rgba(22,11,43,0.80)', 'rgba(13,9,20,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>More ✨</Text>
        <Text style={styles.subtitle}>Settings, growth tools, and extra Bip spaces.</Text>

        <View style={card()}>
          <Text style={styles.cardEmoji}>{userSide === 'parent' ? '🌿' : '💜'}</Text>
          <Text style={styles.cardText}>Current Side: {userSide === 'parent' ? 'Parent Side' : 'Teen Side'}</Text>
          <TouchableOpacity
            style={btn()}
            onPress={() => setUserSide(userSide === 'parent' ? 'teen' : 'parent')}
          >
            <Text style={styles.buttonText}>
              Switch to {userSide === 'parent' ? 'Teen Side' : 'Parent Side'}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={btn()} onPress={() => setScreen('settings')}>
          <Text style={styles.buttonText}>⚙️ Vibe Lab</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('cloudThoughts')}>
          <Text style={styles.buttonText}>☁️ Cloud Thoughts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('voiceBip')}>
          <Text style={styles.buttonText}>🎙️ Voice Bip · private reflection</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('bippin2')}>
          <Text style={styles.buttonText}>✨ Bippin2 / Insights</Text>
        </TouchableOpacity>
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('womanhood')}>
            <Text style={styles.buttonText}>🌸 Womanhood · growing at your pace</Text>
          </TouchableOpacity>
        )}
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('manhood')}>
            <Text style={styles.buttonText}>⚡ Manhood · building yourself</Text>
          </TouchableOpacity>
        )}
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('periodCalendar')}>
            <Text style={styles.buttonText}>🌙 Period Calendar · private tracker</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={btn()} onPress={() => setScreen('growth')}>
          <Text style={styles.buttonText}>🌱 Growth / Life Skills</Text>
        </TouchableOpacity>
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('history')}>
            <Text style={styles.buttonText}>📈 History · doing better</Text>
          </TouchableOpacity>
        )}
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('comfortStreaks')}>
            <Text style={styles.buttonText}>✨ Comfort Streaks</Text>
          </TouchableOpacity>
        )}
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('crew')}>
            <Text style={styles.buttonText}>🤝 Bip Crew · invite-only</Text>
          </TouchableOpacity>
        )}
        {userSide !== 'parent' && (
          <TouchableOpacity style={btn()} onPress={() => setScreen('points')}>
            <Text style={styles.buttonText}>⭐ Bip Points · soft receipts</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={btn()}
          onPress={() => setScreen(userSide === 'parent' ? 'parentBridge' : 'bridge')}
        >
          <Text style={styles.buttonText}>
            {userSide === 'parent' ? '🌉 Parent Bridge' : '🌉 Bridge'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#0d0914' },
  container:  { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  logo:       { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle:   { fontSize: 15, color: '#CBD5E1', textAlign: 'center', marginBottom: 20 },
  card:       { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  cardEmoji:  { fontSize: 32, marginBottom: 8, textAlign: 'center' },
  cardText:   { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  button:     { padding: 16, borderRadius: 18, marginBottom: 12, alignItems: 'center', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});

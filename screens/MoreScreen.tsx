// screens/MoreScreen.tsx
// Se'kret Bip — More (feature hub)
// Side switching routes directly to the correct home route (no splash bounce).

import React from 'react';
import {
  Text, TouchableOpacity, ScrollView,
  View, StyleSheet, Platform, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';

interface MoreScreenProps {
  t: Record<string, any>;
  userSide: string;
  setUserSide: (side: string) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  mood?: string;
  selectedSekret?: string;
  onSideChanged?: () => void;
}

export function MoreScreen({
  t, userSide, setUserSide, setScreen, BottomNav,
  mood, selectedSekret,
}: MoreScreenProps) {
  const glow = glowFor(mood);
  const card = () => [styles.card, { backgroundColor: 'rgba(30,18,55,0.88)', borderColor: glow + '88', shadowColor: glow }] as any;
  const btn  = () => [styles.button, { backgroundColor: glow, shadowColor: glow }] as any;

  const character = (
    selectedSekret === 'rylane' ? 'rylane' :
    selectedSekret === 'cloud'  ? 'cloud'  :
    selectedSekret === 'night'  ? 'night'  :
    'raylene'
  ) as 'raylene' | 'rylane' | 'cloud' | 'night';
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'evening' : 'night';
  const roomBg = getRoomBg(character, timeOfDay as any);

  function handleSideSwitch() {
    if (userSide === 'parent') {
      setUserSide('teen');
      setScreen('home');           // ← direct route, no splash bounce
    } else {
      setUserSide('parent');
      setScreen('parent-room');    // ← direct route, no splash bounce
    }
  }

  return (
    <ImageBackground source={roomBg} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(36,16,56,0.65)', 'rgba(22,11,43,0.80)', 'rgba(13,9,20,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.logo}>More ✨</Text>
        <Text style={styles.subtitle}>Settings, growth tools, and extra Bip spaces.</Text>

        {/* ── Side switch card ── */}
        <View style={card()}>
          <Text style={styles.cardEmoji}>{userSide === 'parent' ? '🌿' : '💜'}</Text>
          <Text style={styles.cardText}>
            {userSide === 'parent' ? 'Parent Mode' : 'Teen Mode'}
          </Text>
          <TouchableOpacity style={btn()} onPress={handleSideSwitch}>
            <Text style={styles.buttonText}>
              Switch to {userSide === 'parent' ? 'Teen Side 💜' : 'Parent Side 🌿'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Parent family plan info */}
        {userSide === 'parent' ? (
          <View style={card()}>
            <Text style={styles.futureLabel}>FAMILY ACCOUNT · COMING LATER</Text>
            <Text style={styles.cardText}>Premium family setup</Text>
            <Text style={styles.futureBody}>
              Parent-created plans will manage consent, subscriptions, upgrades, and intentionally shared Bridge features—without opening teen Pages.
            </Text>
            <View style={styles.futureSteps}>
              <Text style={styles.futureStep}>1  Parent account</Text>
              <Text style={styles.futureStep}>2  Invite + permissions</Text>
              <Text style={styles.futureStep}>3  Premium family tools</Text>
            </View>
          </View>
        ) : null}

        {/* ── Feature links ── */}
        <TouchableOpacity style={btn()} onPress={() => setScreen('settings')}>
          <Text style={styles.buttonText}>⚙️ Vibe Lab</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('points')}>
          <Text style={styles.buttonText}>⭐ Bip Points</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('crew')}>
          <Text style={styles.buttonText}>🤝 Bip Crew</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('profile')}>
          <Text style={styles.buttonText}>👤 Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('cloud')}>
          <Text style={styles.buttonText}>☁️ Cloud Thoughts</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={btn()}
          onPress={() => setScreen(userSide === 'parent' ? 'parent-bridge' : 'bridge')}
        >
          <Text style={styles.buttonText}>
            {userSide === 'parent' ? '🌉 Parent Bridge' : '🌉 Bridge'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('comfort')}>
          <Text style={styles.buttonText}>✨ Comfort</Text>
        </TouchableOpacity>
        <TouchableOpacity style={btn()} onPress={() => setScreen('meaning')}>
          <Text style={styles.buttonText}>🌟 Meaning</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0d0914' },
  container:   { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 100, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  logo:        { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle:    { fontSize: 15, color: '#CBD5E1', textAlign: 'center', marginBottom: 20 },
  card:        { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 0 } },
  cardEmoji:   { fontSize: 32, marginBottom: 8, textAlign: 'center' },
  cardText:    { color: '#fff', fontSize: 17, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
  button:      { padding: 16, borderRadius: 18, marginBottom: 12, alignItems: 'center', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  buttonText:  { color: '#fff', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  futureLabel: { color: '#d8b9ef', fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  futureBody:  { color: '#d7cfdf', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 12 },
  futureSteps: { gap: 7, alignSelf: 'stretch' },
  futureStep:  { color: '#eee7f4', fontSize: 12, padding: 9, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
});

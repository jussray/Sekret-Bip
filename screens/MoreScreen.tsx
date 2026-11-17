// screens/MoreScreen.tsx
// Se'kret Bip — More is a feature drawer, not a second home.

import React from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  View,
  StyleSheet,
  Platform,
  ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomBg } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import { TEEN_MORE_GROUPS } from '@/constants/screenPurpose';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { isDevTestFamilyEnabled } from '@/features/testing/devTestFamily';
import { ControlRoomEntry } from '@/components/ControlRoomEntry';

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
  userSide,
  setUserSide,
  setScreen,
  BottomNav,
  mood,
  selectedSekret,
  onSideChanged,
}: MoreScreenProps) {
  const glow = glowFor(mood);
  const founderPreview = isFounderPreviewEnabled();
  const allowSideSwitch = process.env.EXPO_PUBLIC_ENABLE_SIDE_SWITCH === 'true' || isDevTestFamilyEnabled();
  const character = (
    selectedSekret === 'rylane' ? 'rylane' :
    selectedSekret === 'cloud' ? 'cloud' :
    selectedSekret === 'night' ? 'night' :
    'raylene'
  ) as 'raylene' | 'rylane' | 'cloud' | 'night';
  const hour = new Date().getHours();
  const timeOfDay = hour >= 5 && hour < 11 ? 'morning' : hour >= 11 && hour < 17 ? 'day' : hour >= 17 && hour < 21 ? 'evening' : 'night';
  const roomBg = getRoomBg(character, timeOfDay as any);

  function handleSideSwitch() {
    setUserSide('parent');
    onSideChanged?.();
    setScreen('parent-room');
  }

  return (
    <ImageBackground source={roomBg} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(36,16,56,0.70)', 'rgba(22,11,43,0.86)', 'rgba(13,9,20,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>FEATURE DRAWER</Text>
        <Text style={styles.logo}>More</Text>
        <Text style={styles.subtitle}>The extra tools live here. Room, Pages, Calm, Voice Bip, and Circle keep their own jobs.</Text>

        {founderPreview ? (
          <TouchableOpacity
            style={styles.previewHero}
            onPress={() => setScreen('dev-feature-preview')}
            activeOpacity={0.86}
            accessibilityRole="button"
            accessibilityLabel="Open every feature in Founder Preview"
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.previewKicker}>EXPO GO · FOUNDER PREVIEW</Text>
              <Text style={styles.previewTitle}>Open every Bip feature</Text>
              <Text style={styles.previewBody}>Teen, parent, hidden routes, point-gated companions, setup-dependent flows, and honest prototypes.</Text>
            </View>
            <Text style={styles.previewArrow}>›</Text>
          </TouchableOpacity>
        ) : null}

        <ControlRoomEntry />

        {TEEN_MORE_GROUPS.map(group => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map(item => (
              <TouchableOpacity
                key={item.route}
                style={[styles.row, { borderColor: `${glow}44` }]}
                onPress={() => setScreen(item.route)}
                activeOpacity={0.82}
              >
                <Text style={styles.emoji}>{item.emoji}</Text>
                <View style={styles.rowText}>
                  <Text style={styles.label}>{item.label}</Text>
                  <Text style={styles.description}>{item.description}</Text>
                </View>
                <Text style={[styles.arrow, { color: glow }]}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {allowSideSwitch ? (
          <View style={styles.sideCard}>
            <Text style={styles.sideTitle}>Founder tools</Text>
            <Text style={styles.sideBody}>Development-only shortcuts. The Control Room still checks your founder, admin, or developer profile before opening.</Text>
            <TouchableOpacity style={[styles.sideButton, { backgroundColor: glow }]} onPress={() => setScreen('dev-control-room')}>
              <Text style={styles.sideButtonText}>Open Control Room</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sideButton, styles.secondaryButton]} onPress={() => setScreen('dev-split-view')}>
              <Text style={styles.sideButtonText}>Open Split View (both sides)</Text>
            </TouchableOpacity>
            {userSide !== 'parent' ? (
              <TouchableOpacity style={[styles.sideButton, styles.secondaryButton]} onPress={handleSideSwitch}>
                <Text style={styles.sideButtonText}>Go to Parent Side</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      {BottomNav}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0d0914' },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 110,
    ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}),
  },
  kicker: { color: '#d8b9ef', fontSize: 10, fontWeight: '900', letterSpacing: 2.3, marginBottom: 8 },
  logo: { fontSize: 34, fontWeight: '900', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#c9bfd1', marginBottom: 24, lineHeight: 21 },
  previewHero: { minHeight: 118, flexDirection: 'row', alignItems: 'center', borderRadius: 22, borderWidth: 1, borderColor: '#f59e0b66', backgroundColor: 'rgba(74,35,10,0.92)', padding: 17, marginBottom: 16 },
  previewKicker: { color: '#fde68a', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginBottom: 5 },
  previewTitle: { color: '#fff', fontSize: 18, fontWeight: '900' },
  previewBody: { color: '#dbc9a8', fontSize: 11, lineHeight: 17, marginTop: 5 },
  previewArrow: { color: '#fde68a', fontSize: 34, marginLeft: 10 },
  group: { marginBottom: 22 },
  groupTitle: { color: '#9d8cac', fontSize: 10, fontWeight: '900', letterSpacing: 1.8, marginBottom: 10 },
  row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 18, backgroundColor: 'rgba(24,16,40,0.90)', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  emoji: { width: 38, fontSize: 21 },
  rowText: { flex: 1 },
  label: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 3 },
  description: { color: '#9e92aa', fontSize: 12, lineHeight: 17 },
  arrow: { fontSize: 28, paddingLeft: 8 },
  sideCard: { borderRadius: 20, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: 'rgba(30,18,55,0.90)', padding: 18, marginTop: 4 },
  sideTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 6 },
  sideBody: { color: '#bfb4c8', fontSize: 12, lineHeight: 18, marginBottom: 14 },
  sideButton: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  secondaryButton: { backgroundColor: '#4338CA' },
  sideButtonText: { color: '#fff', fontSize: 14, fontWeight: '900' },
});

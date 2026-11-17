// app/(teen)/pages/new.tsx
// SE'KRET PAGES — New Entry Chooser
// 4 entry modes: Write It Out / Voice Bip / Video Bip / Photo Scrap

import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

const ENTRY_MODES = [
  {
    key: 'write',
    icon: '✏️',
    title: 'Write It Out',
    subtitle: 'private journal entry',
    accent: '#f08bc5',
    description: 'Type out what\'s on your mind. Your companion is listening.',
  },
  {
    key: 'voice',
    icon: '🎙️',
    title: 'Voice Bip',
    subtitle: '30–60 sec',
    accent: '#76a7ff',
    description: 'Sometimes it\'s easier to just say it out loud.',
  },
  {
    key: 'video',
    icon: '📹',
    title: 'Video Bip',
    subtitle: '30–60 sec',
    accent: '#9a8ee8',
    description: 'Record a moment. Let your face say what words can\'t.',
  },
  {
    key: 'scrap',
    icon: '🖼️',
    title: 'Photo Scrap',
    subtitle: 'image + caption',
    accent: '#8ed9e7',
    description: 'Add a photo to your pages. Caption it or leave it.',
  },
] as const;

type ModeKey = (typeof ENTRY_MODES)[number]['key'];

export default function NewEntryRoute() {
  async function handleSelect(key: ModeKey) {
    if (key === 'write') {
      router.replace('/(teen)/pages' as any);
      return;
    }

    if (key === 'voice') {
      router.replace('/(teen)/voicebip' as any);
      return;
    }

    if (key === 'video') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 60,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        // Navigate to pages with video uri as param for pre-fill
        router.replace({
          pathname: '/(teen)/pages' as any,
          params: { preloadVideoUri: result.assets[0].uri },
        });
      }
      return;
    }

    if (key === 'scrap') {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        router.replace({
          pathname: '/(teen)/pages' as any,
          params: { preloadImageUri: result.assets[0].uri },
        });
      }
    }
  }

  return (
    <View style={s.root}>
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={s.headerText}>
            <Text style={s.kicker}>SE'KRET PAGES</Text>
            <Text style={s.title}>New Entry</Text>
            <Text style={s.subtitle}>how do you want to start?</Text>
          </View>
        </View>

        {/* Mode cards */}
        <View style={s.cardGrid}>
          {ENTRY_MODES.map(mode => (
            <TouchableOpacity
              key={mode.key}
              style={[s.modeCard, { borderColor: `${mode.accent}30` }]}
              onPress={() => handleSelect(mode.key)}
              activeOpacity={0.75}
            >
              <View style={[s.modeIconWrap, { backgroundColor: `${mode.accent}15` }]}>
                <Text style={s.modeIcon}>{mode.icon}</Text>
              </View>
              <Text style={[s.modeTitle, { color: mode.accent }]}>{mode.title}</Text>
              <Text style={s.modeSubtitle}>{mode.subtitle}</Text>
              <Text style={s.modeDesc}>{mode.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Footer affirmation */}
        <Text style={s.footer}>
          whatever you choose, it's the right one. ♡
        </Text>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  backBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  headerText: { flex: 1 },
  kicker: { color: '#c7b87a', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', marginTop: 2 },
  subtitle: { color: '#6b607a', fontSize: 13, marginTop: 4 },

  cardGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },

  modeCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    borderWidth: 1,
    padding: 18,
    gap: 8,
  },
  modeIconWrap: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modeIcon: { fontSize: 22 },
  modeTitle: { fontSize: 16, fontWeight: '900' },
  modeSubtitle: { color: '#7a6e83', fontSize: 10, fontWeight: '700' },
  modeDesc: { color: '#6b607a', fontSize: 12, lineHeight: 18 },

  footer: { color: '#504660', fontSize: 12, textAlign: 'center', paddingVertical: 20 },
});

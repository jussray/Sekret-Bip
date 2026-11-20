import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ImageBackground, Animated, StyleSheet, Platform, Easing,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../../../components/AmbientWeatherOverlay';
import { useAppContext } from '@/context/AppContext';
import { IMAGES } from '../../../constants/theme';

const PATHS = [
  {
    id: 'womanhood',
    emoji: '🫆',
    title: 'Womanhood Guide',
    sub: 'periods, body changes, mood, comfort & questions',
    accent: '#c084fc',
    bg: '#1e0a3c',
    route: '/(teen)/bippin2/womanhood',
    cta: 'enter womanhood guide ->',
  },
  {
    id: 'manhood',
    emoji: '🌊',
    title: 'Manhood Guide',
    sub: 'voice changes, growth, emotions, confidence & questions',
    accent: '#38bdf8',
    bg: '#0a1e2e',
    route: '/(teen)/bippin2/manhood',
    cta: 'enter manhood guide ->',
  },
] as const;

export default function Bippin2Index() {
  const { mood } = useAppContext();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const float  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fadeIn, float]);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  void mood;

  return (
    <View style={s.root}>
      <AmbientWeatherOverlay />
      <ImageBackground source={IMAGES.bgCircle} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,8,40,0.65)', 'rgba(10,6,20,0.82)', 'rgba(5,3,12,0.96)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>{'<- Growth'}</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <Text style={s.kicker}>BIPPIN 2</Text>
          <Text style={s.title}>{'Growing Up 🌱'}</Text>
          <Text style={s.sub}>
            {'real talk about your body, your feelings, and who you\'re becoming. no rush. no pressure.'}
          </Text>
        </Animated.View>

        <View style={s.cards}>
          {PATHS.map((path) => (
            <TouchableOpacity
              key={path.id}
              style={[s.card, { borderColor: path.accent + '55', backgroundColor: path.bg + 'cc' }]}
              onPress={() => router.push(path.route as any)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[path.accent + '18', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <Text style={s.cardEmoji}>{path.emoji}</Text>
              <Text style={[s.cardTitle, { color: path.accent }]}>{path.title}</Text>
              <Text style={[s.cardSub, { color: path.accent + 'bb' }]}>{path.sub}</Text>
              <View style={[s.ctaRow, { borderColor: path.accent + '44' }]}>
                <Text style={[s.ctaText, { color: path.accent }]}>{path.cta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.noteCard}>
          <Text style={s.noteTitle}>{'This space is yours 🔒'}</Text>
          <Text style={s.noteBody}>
            {'Everything here stays private. Your companions know. No one else sees this unless you share it.'}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1, backgroundColor: '#08051a' },
  scroll:    { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 38, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  back:      { marginBottom: 16 },
  backText:  { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  kicker:    { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 2.4, marginBottom: 6 },
  title:     { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub:       { fontSize: 14, color: '#c4b5fd', lineHeight: 22, fontStyle: 'italic', marginBottom: 32 },
  cards:     { gap: 16, marginBottom: 24 },
  card:      { borderWidth: 1, borderRadius: 24, padding: 22, overflow: 'hidden' },
  cardEmoji: { fontSize: 36, marginBottom: 10 },
  cardTitle: { fontSize: 22, fontWeight: '900', marginBottom: 6 },
  cardSub:   { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  ctaRow:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  ctaText:   { fontSize: 13, fontWeight: '700' },
  noteCard:  { borderRadius: 20, borderWidth: 1, borderColor: '#a78bfa33', backgroundColor: 'rgba(20,10,40,0.88)', padding: 18 },
  noteTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 6 },
  noteBody:  { color: '#a78bfa99', fontSize: 13, lineHeight: 20 },
});

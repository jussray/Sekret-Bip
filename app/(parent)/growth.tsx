import React, { useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  ImageBackground, Animated, StyleSheet, Platform, Easing,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '@/context/AppContext';
import { IMAGES } from '@/constants/theme';
import { routeForSide } from '@/shared/routes';

const SECTIONS = [
  {
    id: 'repair',
    emoji: '🔧',
    title: 'Repair',
    sub: 'guided tools to reconnect after hard moments',
    accent: '#34d399',
    route: 'repair',
    cta: 'start a repair ->',
    note: 'No blame. No scripts. Just a way back to each other.',
  },
  {
    id: 'growth',
    emoji: '🌱',
    title: 'Parenting Growth',
    sub: "milestones, insights, and what's coming next for your teen",
    accent: '#a3e635',
    route: 'growth',
    cta: 'view growth insights ->',
    note: 'Understand the developmental stage your teen is in right now.',
  },
  {
    id: 'voicereflect',
    emoji: '🎙️',
    title: 'Voice Reflect',
    sub: 'a private voice journal just for you',
    accent: '#c084fc',
    route: 'voicereflect',
    cta: 'open voice journal ->',
    note: 'Parenting is hard. You deserve a space to process it too.',
  },
  {
    id: 'period-calendar',
    emoji: '🩸',
    title: 'Cycle Awareness',
    sub: "understand your teen's cycle to show up better",
    accent: '#fb7185',
    route: 'period-calendar',
    cta: 'view cycle calendar ->',
    note: 'Only shown with teen permission. Helps you be prepared, not intrusive.',
  },
  {
    id: 's2tell',
    emoji: '💬',
    title: 'Something to Tell',
    sub: 'how to start conversations that actually work',
    accent: '#38bdf8',
    route: 's2tell',
    cta: 'browse conversation guides ->',
    note: 'Teens want to talk. They just need the door to feel safe.',
  },
  {
    id: 'approvals',
    emoji: '✅',
    title: 'Approvals',
    sub: 'review chores your teen submitted and rewards they requested',
    accent: '#34d399',
    route: 'approvals',
    cta: 'open approvals ->',
    note: 'Only tasks you set up and rewards your teen asked for — nothing else.',
  },
] as const;

export default function ParentGrowthHub() {
  const { setUserSide } = useAppContext();
  const fadeIn = useRef(new Animated.Value(0)).current;
  const float  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(float, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fadeIn, float]);

  const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  void setUserSide;

  function open(route: string) {
    router.push(routeForSide('parent', route) as any);
  }

  return (
    <View style={s.root}>
      <ImageBackground source={IMAGES.parentHomeBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(36,16,56,0.70)', 'rgba(22,11,43,0.86)', 'rgba(13,9,20,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>{'<- More'}</Text>
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ translateY: floatY }] }}>
          <Text style={s.kicker}>PARENT GROWTH</Text>
          <Text style={s.title}>{'Your Tools 🌿'}</Text>
          <Text style={s.sub}>
            {'repair, reflect, and stay connected. everything here is about the relationship, not control.'}
          </Text>
        </Animated.View>

        <View style={s.cards}>
          {SECTIONS.map((sec) => (
            <TouchableOpacity
              key={sec.id}
              style={[s.card, { borderColor: sec.accent + '44' }]}
              onPress={() => open(sec.route)}
              activeOpacity={0.82}
            >
              <LinearGradient
                colors={[sec.accent + '14', 'transparent']}
                style={StyleSheet.absoluteFill}
              />
              <View style={s.cardTop}>
                <Text style={s.cardEmoji}>{sec.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.cardTitle, { color: sec.accent }]}>{sec.title}</Text>
                  <Text style={[s.cardSub, { color: sec.accent + 'bb' }]}>{sec.sub}</Text>
                </View>
                <Text style={[s.arrow, { color: sec.accent }]}>›</Text>
              </View>
              <View style={[s.noteBox, { borderColor: sec.accent + '33', backgroundColor: sec.accent + '0d' }]}>
                <Text style={[s.noteText, { color: sec.accent + 'cc' }]}>{sec.note}</Text>
              </View>
              <View style={[s.ctaRow, { borderColor: sec.accent + '44' }]}>
                <Text style={[s.ctaText, { color: sec.accent }]}>{sec.cta}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.promiseCard}>
          <Text style={s.promiseTitle}>{'Support without surveillance 🔒'}</Text>
          <Text style={s.promiseBody}>
            {"These tools help you show up better. They don't give you access to your teen's private journals, voice notes, or companion conversations. That boundary is intentional."}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#0d0914' },
  scroll:      { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 38, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  back:        { marginBottom: 16 },
  backText:    { color: '#a7f3d0', fontSize: 14, fontWeight: '600' },
  kicker:      { color: '#a7f3d0', fontSize: 10, fontWeight: '900', letterSpacing: 2.4, marginBottom: 6 },
  title:       { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 8 },
  sub:         { fontSize: 14, color: '#c6d5cc', lineHeight: 22, fontStyle: 'italic', marginBottom: 32 },
  cards:       { gap: 14, marginBottom: 24 },
  card:        { borderWidth: 1, borderRadius: 22, padding: 18, overflow: 'hidden', backgroundColor: 'rgba(17,37,28,0.88)' },
  cardTop:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  cardEmoji:   { fontSize: 28, paddingTop: 2 },
  cardTitle:   { fontSize: 17, fontWeight: '900', marginBottom: 3 },
  cardSub:     { fontSize: 12, lineHeight: 18 },
  arrow:       { fontSize: 26, paddingTop: 2 },
  noteBox:     { borderWidth: 1, borderRadius: 12, padding: 10, marginBottom: 12 },
  noteText:    { fontSize: 12, lineHeight: 18 },
  ctaRow:      { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  ctaText:     { fontSize: 12, fontWeight: '700' },
  promiseCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d02e', backgroundColor: 'rgba(17,37,28,0.92)', padding: 18 },
  promiseTitle:{ color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 6 },
  promiseBody: { color: '#9bb0a2', fontSize: 12, lineHeight: 18 },
});

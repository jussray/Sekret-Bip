import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Image, ImageBackground, Animated, StyleSheet, Platform, Easing,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../../../components/AmbientWeatherOverlay';
import { useAppContext } from '@/context/AppContext';
import { IMAGES, getRoomBg } from '../../../constants/theme';
import { routeForSide } from '@/shared/routes';

const SECTIONS = [
  {
    id:    'puberty',
    emoji: '🪱',
    title: 'Puberty Guide',
    body: [
      "Puberty for guys usually starts between 9-14 and takes several years. You're not behind.",
      "Expect: voice changes, growth spurts, body and facial hair, increased sweating, and more.",
      "Erections and wet dreams are normal parts of puberty -- your body is working correctly.",
      "Your skin may get oilier. Washing your face twice a day and staying hydrated helps.",
    ],
    tip: "Growth spurts can cause growing pains in your legs -- that's real and normal.",
    route: null,
    routeLabel: null,
  },
  {
    id:    'hygiene',
    emoji: '🌻',
    title: 'Hygiene + Self-Care',
    body: [
      "Shower daily, especially after physical activity. Puberty means more sweat, more odour.",
      "Use deodorant or antiperspirant -- find one that works for your body.",
      "Brush and floss twice a day. Fresh breath is part of confidence.",
      "Skincare: wash your face gently, moisturise, and use SPF when you're outside.",
    ],
    tip: "A simple 5-minute routine beats doing nothing. Start small and build it in.",
    route: null,
    routeLabel: null,
  },
  {
    id:    'emotions',
    emoji: '🧠',
    title: 'Emotions + Mental Space',
    body: [
      "Testosterone makes emotions feel louder -- anger, frustration, intensity. That's real.",
      'The "don\'t show feelings" thing is outdated. Naming what you feel is strength, not weakness.',
      "Anxiety and stress during puberty are common. Movement, sleep, and breathing help.",
      "If you feel low for weeks or start withdrawing from things you loved -- tell someone.",
    ],
    tip: 'Sy keeps it real: "feel it, name it, move it through. that\'s the way."',
    route: 'calm',
    routeLabel: 'calm space ->',
  },
  {
    id:    'confidence',
    emoji: '🕊️',
    title: 'Confidence + Identity',
    body: [
      "Confidence isn't having everything figured out. It's moving anyway.",
      "Your voice, body, and face are changing. That discomfort is temporary.",
      "Comparing yourself to other guys your age is a losing game -- everyone's on their own timeline.",
      "What you do consistently matters more than what you look like. Build your habits.",
    ],
    tip: "One small win every day builds the version of you that you're working toward.",
    route: 'bippin2',
    routeLabel: 'view goal tracker ->',
  },
  {
    id:    'questions',
    emoji: '💬',
    title: 'Questions You Might Have',
    body: [
      '"Is it normal if one side is bigger?" -- Yes, bodies are asymmetrical. Very common.',
      '"What if I get an erection at a bad time?" -- Happens to everyone. It passes.',
      '"My voice cracked, is that it?" -- Voice changes can take 1-2 years to settle.',
      '"How do I talk to someone about this stuff?" -- Start with Sy. No judgement.',
    ],
    tip: "No question is too embarrassing. You deserve real answers.",
    route: 'sekret',
    routeLabel: 'ask Sy ->',
  },
] as const;

export default function ManhoodGuide() {
  const { mood } = useAppContext();
  const [openId, setOpenId] = useState<string | null>('puberty');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fadeIn, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const bg = getRoomBg('rylane', 'day');
  const accent = '#4DA3FF';
  const soft   = '#B6DCFF';

  void mood;

  return (
    <View style={s.root}>
      <AmbientWeatherOverlay />
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(10,20,50,0.6)', 'rgba(20,40,80,0.75)', 'rgba(5,10,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.ScrollView
        style={{ opacity: fadeIn }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity style={s.back} onPress={() => router.back()}>
          <Text style={s.backText}>{'<- Bippin 2'}</Text>
        </TouchableOpacity>

        <View style={s.heroRow}>
          <View style={{ flex: 1 }}>
            <Text style={[s.title, { color: accent }]}>{'Manhood Guide 🪱'}</Text>
            <Text style={[s.sub, { color: soft }]}>
              growing at your pace. no comparison. just you.
            </Text>
          </View>
          <Animated.Image
            source={IMAGES.rylaneFullbody}
            style={[s.heroArt, { transform: [{ scale: breathScale }] }]}
            resizeMode="contain"
          />
        </View>

        {SECTIONS.map((sec) => {
          const open = openId === sec.id;
          return (
            <View key={sec.id} style={[s.card, { borderColor: open ? accent + '88' : accent + '33' }]}>
              <TouchableOpacity
                style={s.cardHeader}
                onPress={() => setOpenId(open ? null : sec.id)}
                activeOpacity={0.75}
              >
                <Text style={s.cardEmoji}>{sec.emoji}</Text>
                <Text style={[s.cardTitle, { color: open ? accent : soft }]}>{sec.title}</Text>
                <Text style={[s.chevron, { color: accent }]}>{open ? '^' : 'v'}</Text>
              </TouchableOpacity>

              {open && (
                <View style={s.cardBody}>
                  {sec.body.map((line, i) => (
                    <Text key={i} style={[s.bodyLine, { color: soft }]}>{'• '}{line}</Text>
                  ))}
                  <View style={[s.tipBox, { borderColor: accent + '55', backgroundColor: accent + '12' }]}>
                    <Text style={[s.tipText, { color: soft }]}>{'🪱 '}{sec.tip}</Text>
                  </View>
                  {sec.route != null && (
                    <TouchableOpacity
                      style={[s.linkBtn, { borderColor: accent }]}
                      onPress={() => router.push(routeForSide('teen', sec.route as string) as any)}
                    >
                      <Text style={[s.linkBtnText, { color: accent }]}>{sec.routeLabel}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        <View style={[s.quoteCard, { borderColor: accent + '44' }]}>
          <Image source={IMAGES.rylaneNeutral} style={s.quoteArt} resizeMode="contain" />
          <Text style={[s.quoteText, { color: soft }]}>
            "you don't gotta have it all figured out. just keep going. that's enough."
          </Text>
          <Text style={[s.quoteSig, { color: accent }]}>{'-- Sy 🪱'}</Text>
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: accent }]}
          onPress={() => router.push(routeForSide('teen', 'sekret') as any)}
        >
          <Text style={s.primaryBtnText}>{'talk to Sy 🪱'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.ghostBtn} onPress={() => router.back()}>
          <Text style={[s.ghostBtnText, { color: soft }]}>{'<- back to Bippin 2'}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:       { flex: 1, backgroundColor: '#060d1f' },
  scroll:     { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 38, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  back:       { marginBottom: 14 },
  backText:   { color: '#93c5fd', fontSize: 14, fontWeight: '600' },
  heroRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  heroArt:    { width: 90, height: 130, borderRadius: 14 },
  title:      { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  sub:        { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  card:       { backgroundColor: 'rgba(10,20,50,0.82)', borderWidth: 1, borderRadius: 20, marginBottom: 12, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  cardEmoji:  { fontSize: 22 },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: '700' },
  chevron:    { fontSize: 11 },
  cardBody:   { paddingHorizontal: 16, paddingBottom: 16 },
  bodyLine:   { fontSize: 13, lineHeight: 22, marginBottom: 4 },
  tipBox:     { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 10, marginBottom: 10 },
  tipText:    { fontSize: 13, lineHeight: 20 },
  linkBtn:    { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 7, marginTop: 4 },
  linkBtnText: { fontSize: 13, fontWeight: '700' },
  quoteCard:  { backgroundColor: 'rgba(10,20,50,0.75)', borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 14 },
  quoteArt:   { width: 70, height: 70, marginBottom: 12 },
  quoteText:  { fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  quoteSig:   { fontSize: 13, fontWeight: '700' },
  primaryBtn: { padding: 16, borderRadius: 18, alignItems: 'center', marginBottom: 12, shadowOpacity: 0.4, shadowRadius: 8 },
  primaryBtnText: { color: '#0d1b38', fontSize: 15, fontWeight: 'bold' },
  ghostBtn:   { padding: 14, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(10,20,50,0.6)', marginBottom: 8 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },
});

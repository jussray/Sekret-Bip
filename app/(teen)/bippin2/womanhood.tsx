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
    id:    'period',
    emoji: '🩸',
    title: 'First Period Support',
    body: [
      "Your period is your body doing exactly what it's supposed to do. It's not gross -- it's growth.",
      "It usually starts between ages 10-16. Cycles last 3-7 days and happen roughly every 21-35 days.",
      "Cramps, bloating, and mood shifts are all normal. Rest, warmth, and water help.",
      "You can use pads, tampons, period underwear, or a menstrual cup -- whatever feels right for you.",
    ],
    tip: "Heat on your lower belly relieves cramps. So does gentle movement.",
    route: 'periodCalendar',
    routeLabel: 'track my cycle ->',
  },
  {
    id:    'body',
    emoji: '🫆',
    title: 'Body Changes',
    body: [
      "Breasts, hips, height, skin, and body hair -- all of it is puberty. It happens at your own pace.",
      "Some changes come early, some late. Neither is wrong. Your body is on its own schedule.",
      "Vaginal discharge (clear/white fluid) is your body's way of staying healthy -- totally normal.",
      "Sweating more? Skin getting oilier? That's hormones. A simple routine helps.",
    ],
    tip: "Talk to a trusted adult if anything feels off or painful -- your body deserves care.",
    route: null,
    routeLabel: null,
  },
  {
    id:    'mood',
    emoji: '🌙',
    title: 'Mood + Emotions',
    body: [
      "Hormones affect your mood -- more than people talk about. Feeling everything at once is real.",
      "Anxiety, irritability, crying for no reason, or feeling numb during your cycle: all common.",
      "Journaling, breathing, and moving your body can help regulate it.",
      "If your mood swings feel severe or affect your daily life, talk to a doctor. PMDD is real.",
    ],
    tip: "Track your mood alongside your cycle -- patterns tell you a lot.",
    route: 'calm',
    routeLabel: 'go to calm ->',
  },
  {
    id:    'comfort',
    emoji: '🌷',
    title: 'Comfort + Self-Care',
    body: [
      "Your menstrual kit: heating pad, your favourite pyjamas, water, snacks, something comforting.",
      "Sleep more when you can. Your body is working hard.",
      "Food cravings are real -- chocolate cravings are linked to magnesium. Eat what you need.",
      "Be gentler with yourself during the week before your period. You're not being dramatic.",
    ],
    tip: 'Make a "period kit" ahead of time so you\'re always ready.',
    route: 'comfort',
    routeLabel: 'comfort mode ->',
  },
  {
    id:    'questions',
    emoji: '💬',
    title: 'Questions You Might Have',
    body: [
      '"Is it normal if my period is late?" -- Yes. Stress, exercise, and diet can all affect your cycle.',
      '"Can I swim/exercise during my period?" -- Yes, with the right protection.',
      '"What if it hurts a lot?" -- Some cramping is normal, but severe pain deserves medical attention.',
      '"Do I have to tell anyone?" -- No. But having one trusted person who knows can help.',
    ],
    tip: "Suhana has answered thousands of questions just like yours. You can always ask.",
    route: 'sekret',
    routeLabel: 'ask Suhana ->',
  },
] as const;

export default function WomanhoodGuide() {
  const { mood } = useAppContext();
  const [openId, setOpenId] = useState<string | null>('period');

  const fadeIn = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fadeIn, breath]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const bg = getRoomBg('raylene', 'day');
  const accent = '#c084fc';
  const soft   = '#f3e8ff';

  void mood;

  return (
    <View style={s.root}>
      <AmbientWeatherOverlay />
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(30,10,60,0.6)', 'rgba(55,20,90,0.75)', 'rgba(15,5,30,0.92)']}
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
            <Text style={[s.title, { color: accent }]}>{'Womanhood Guide 🫆'}</Text>
            <Text style={[s.sub, { color: soft }]}>
              growing into yourself. at your own pace. no rush.
            </Text>
          </View>
          <Animated.Image
            source={IMAGES.rayleneFullbody}
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
                    <Text style={[s.tipText, { color: soft }]}>{'💜 '}{sec.tip}</Text>
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
          <Image source={IMAGES.rayleneNeutral} style={s.quoteArt} resizeMode="contain" />
          <Text style={[s.quoteText, { color: soft }]}>
            "you are not behind. you are not too much. you are exactly where you need to be."
          </Text>
          <Text style={[s.quoteSig, { color: accent }]}>{'-- Suhana 🫆'}</Text>
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, { backgroundColor: accent }]}
          onPress={() => router.push(routeForSide('teen', 'sekret') as any)}
        >
          <Text style={s.primaryBtnText}>{'talk to Suhana 🫆'}</Text>
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
  root:       { flex: 1, backgroundColor: '#0e0820' },
  scroll:     { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 58 : 38, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  back:       { marginBottom: 14 },
  backText:   { color: '#c4b5fd', fontSize: 14, fontWeight: '600' },
  heroRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 20, gap: 12 },
  heroArt:    { width: 90, height: 130, borderRadius: 14 },
  title:      { fontSize: 26, fontWeight: '800', marginBottom: 6 },
  sub:        { fontSize: 13, lineHeight: 20, fontStyle: 'italic' },
  card:       { backgroundColor: 'rgba(30,10,55,0.82)', borderWidth: 1, borderRadius: 20, marginBottom: 12, overflow: 'hidden' },
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
  quoteCard:  { backgroundColor: 'rgba(30,10,55,0.75)', borderWidth: 1, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 14 },
  quoteArt:   { width: 70, height: 70, marginBottom: 12 },
  quoteText:  { fontSize: 14, fontStyle: 'italic', textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  quoteSig:   { fontSize: 13, fontWeight: '700' },
  primaryBtn: { padding: 16, borderRadius: 18, alignItems: 'center', marginBottom: 12, shadowOpacity: 0.4, shadowRadius: 8 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  ghostBtn:   { padding: 14, borderRadius: 18, alignItems: 'center', backgroundColor: 'rgba(30,10,55,0.6)', marginBottom: 8 },
  ghostBtnText: { fontSize: 14, fontWeight: '600' },
});

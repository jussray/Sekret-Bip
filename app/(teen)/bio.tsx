// app/(teen)/bio.tsx
// Night Se'kret — canonical origin and character bio screen.
// Canon source: docs/NIGHT_ORIGIN_CANON.md
// Night-only production vertical slice.

import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const NIGHT_ACCENT   = '#9a8ee8';
const NIGHT_ACCENT2  = '#c4b5fd';
const NIGHT_DIM      = 'rgba(154,142,232,0.18)';
const NIGHT_BORDER   = 'rgba(154,142,232,0.28)';
const BG_DEEP        = '#0b0917';

const VALUES = [
  { emoji: '🕯️', label: 'Calm honesty over panic' },
  { emoji: '🌱', label: 'One real next step' },
  { emoji: '🔭', label: 'Future self without fantasy' },
  { emoji: '🚪', label: 'Privacy without isolation' },
  { emoji: '🛠️', label: 'Creative courage without hype' },
  { emoji: '🌙', label: 'Rest as part of building' },
] as const;

const CUSTOMS = [
  { name: 'Twin Moon Week', desc: 'Unfinished drafts are allowed to be visible.' },
  { name: 'Lantern Eve',    desc: 'Return without shame.' },
  { name: 'First Rain',     desc: 'Reset the plan gently.' },
] as const;

export default function NightBioScreen() {
  const fade0 = useRef(new Animated.Value(0)).current;
  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const fade4 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    Animated.stagger(110, [
      Animated.timing(fade0, { toValue: 1, duration: 500, easing: ease, useNativeDriver: true }),
      Animated.timing(fade1, { toValue: 1, duration: 440, easing: ease, useNativeDriver: true }),
      Animated.timing(fade2, { toValue: 1, duration: 420, easing: ease, useNativeDriver: true }),
      Animated.timing(fade3, { toValue: 1, duration: 400, easing: ease, useNativeDriver: true }),
      Animated.timing(fade4, { toValue: 1, duration: 400, easing: ease, useNativeDriver: true }),
    ]).start();

    const breathLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1.08, duration: 3600, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 1.00, duration: 3600, easing: Easing.inOut(Easing.sine), useNativeDriver: true }),
      ]),
    );
    breathLoop.start();
    return () => breathLoop.stop();
  }, []);

  const slide = (anim: Animated.Value) => ({
    opacity:   anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <View style={s.root}>
      <LinearGradient
        colors={['#140b24', '#1a1040', BG_DEEP]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
        >

          {/* Back */}
          <TouchableOpacity onPress={() => router.back()} style={s.back} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>

          {/* ── Hero ──────────────────────────────────────────────────────── */}
          <Animated.View style={[s.hero, slide(fade0)]}>
            <Animated.Text style={[s.heroEmoji, { transform: [{ scale: breath }] }]}>🌙</Animated.Text>
            <Text style={s.heroName}>Night Se'kret</Text>
            <Text style={s.heroTitle}>The Light Left On</Text>
            <Text style={s.heroOrig}>Twin Moon Lineage · Soria</Text>
          </Animated.View>

          {/* ── Lineage quote ─────────────────────────────────────────────── */}
          <Animated.View style={[s.quoteCard, slide(fade1)]}>
            <Text style={s.quoteText}>
              {"\"The dark is not the point.\nThe small light is.\""}
            </Text>
            <Text style={s.quoteAttr}>— Twin Moon Lineage teaching</Text>
          </Animated.View>

          {/* ── Origin ────────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, slide(fade2)]}>
            <Text style={s.sectionHead}>Where Night comes from</Text>
            <Text style={s.body}>
              Night grew up near the edge of a craft district under Soria's twin moons — a
              neighborhood of desk lamps, half-built ideas, moon ledgers, and people who
              didn't explain what they were building until it had shape.
            </Text>
            <Text style={[s.body, s.bodyGap]}>
              His family taught him not to promise what can't be built, and not to call a
              rough draft a failure. School was craft rooms and late bells. Late thoughts
              needed water and daylight before they became decisions.
            </Text>
          </Animated.View>

          {/* ── Values ────────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, slide(fade3)]}>
            <Text style={s.sectionHead}>What Night holds</Text>
            <View style={s.valuesGrid}>
              {VALUES.map(v => (
                <View key={v.label} style={s.valueCard}>
                  <Text style={s.valueEmoji}>{v.emoji}</Text>
                  <Text style={s.valueLabel}>{v.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── Customs ───────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, slide(fade3)]}>
            <Text style={s.sectionHead}>Sorian customs Night carries</Text>
            {CUSTOMS.map(c => (
              <View key={c.name} style={s.customRow}>
                <Text style={s.customName}>{c.name}</Text>
                <Text style={s.customDesc}>{c.desc}</Text>
              </View>
            ))}
          </Animated.View>

          {/* ── Humor note ────────────────────────────────────────────────── */}
          <Animated.View style={[s.humorCard, slide(fade4)]}>
            <Text style={s.humorText}>
              {"\"That's a 1:13 a.m. idea.\nPowerful. Suspicious. Needs water.\""}
            </Text>
          </Animated.View>

          {/* ── Voice note ────────────────────────────────────────────────── */}
          <Animated.View style={[s.section, slide(fade4)]}>
            <Text style={s.sectionHead}>How Night talks</Text>
            <Text style={s.body}>
              Low and steady. Late-night calm. Dry when you invite it. Honest without
              being harsh. Creative without hype. Future-facing without pressure.
              Spacious enough for you to think.
            </Text>
          </Animated.View>

          {/* ── CTA ───────────────────────────────────────────────────────── */}
          <Animated.View style={[s.ctaBlock, slide(fade4)]}>
            <TouchableOpacity
              style={s.ctaBtn}
              onPress={() => router.push({ pathname: '/(teen)/companion-chat', params: { companion: 'night' } } as never)}
              activeOpacity={0.85}
            >
              <Text style={s.ctaBtnText}>Talk to Night 🌙</Text>
            </TouchableOpacity>
            <Text style={s.ctaSub}>Night is an AI companion inside Se'kret Bip.</Text>
          </Animated.View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG_DEEP },
  safe: { flex: 1 },
  scroll: { paddingBottom: 40 },

  back: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 4 },
  backText: { color: 'rgba(154,142,232,0.70)', fontSize: 14, fontWeight: '600' },

  hero: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  heroEmoji: { fontSize: 56, marginBottom: 12 },
  heroName: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  heroTitle: {
    color: NIGHT_ACCENT,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  heroOrig: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
    marginTop: 6,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },

  quoteCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 22,
    borderRadius: 20,
    backgroundColor: NIGHT_DIM,
    borderWidth: 1,
    borderColor: NIGHT_BORDER,
    alignItems: 'center',
  },
  quoteText: {
    color: NIGHT_ACCENT2,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  quoteAttr: {
    color: 'rgba(196,181,253,0.45)',
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },

  section: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  sectionHead: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  body: {
    color: 'rgba(255,255,255,0.60)',
    fontSize: 14,
    lineHeight: 22,
  },
  bodyGap: { marginTop: 10 },

  valuesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  valueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: NIGHT_DIM,
    borderWidth: 1,
    borderColor: NIGHT_BORDER,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  valueEmoji: { fontSize: 16 },
  valueLabel: {
    color: 'rgba(255,255,255,0.70)',
    fontSize: 13,
    fontWeight: '500',
  },

  customRow: {
    borderLeftWidth: 2,
    borderLeftColor: NIGHT_BORDER,
    paddingLeft: 14,
    marginBottom: 14,
  },
  customName: {
    color: NIGHT_ACCENT,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  customDesc: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 13,
    lineHeight: 20,
  },

  humorCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    padding: 18,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  humorText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
  },

  ctaBlock: {
    marginHorizontal: 20,
    marginTop: 8,
    alignItems: 'center',
  },
  ctaBtn: {
    backgroundColor: NIGHT_DIM,
    borderWidth: 2,
    borderColor: NIGHT_ACCENT,
    borderRadius: 50,
    paddingVertical: 14,
    paddingHorizontal: 40,
    shadowColor: NIGHT_ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.50,
    shadowRadius: 14,
  },
  ctaBtnText: {
    color: NIGHT_ACCENT2,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  ctaSub: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 11,
    marginTop: 10,
    textAlign: 'center',
  },
});

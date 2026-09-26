import React, { useEffect } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useVerificationContext } from '@/context/VerificationContext';

const AVAILABLE = [
  ['📖', 'Pages',     'Write privately and keep your thoughts yours.',   '/(teen)/pages'],
  ['🎤', 'Voice Bip', 'Talk it out without posting anywhere.',           '/(teen)/voicebip'],
  ['🌙', 'Calm',      'Use breathing and comfort tools anytime.',         '/(teen)/calm'],
  ['💜', 'Companion', 'Talk with your Se’kret companion.',              '/(teen)/sekret'],
] as const;

const LOCKED = [
  ['🌐', 'Circle'],
  ['🤝', 'Crew'],
  ['✨', 'Discovery'],
] as const;

export default function LimitedModeScreen() {
  const { verificationState, isVerificationLoading } = useVerificationContext();
  const waiting = verificationState === 'PENDING_PARENT' || verificationState === 'PENDING_TRUSTED_ADULT';

  useEffect(() => {
    if (!isVerificationLoading && verificationState === 'UNVERIFIED') {
      router.replace('/(auth)/parent-link-verify');
    }
  }, [isVerificationLoading, verificationState]);

  return (
    <View style={styles.root}>
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>LIMITED MODE</Text>
        <Text style={styles.title}>
          {waiting ? 'Waiting on approval.' : 'Your space is open.'}
        </Text>
        <Text style={styles.body}>
          You can keep journaling, talking, and using comfort tools while account verification finishes.
        </Text>

        {/* Available features */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Available now</Text>
          {AVAILABLE.map(([emoji, title, description, href]) => (
            <TouchableOpacity
              key={title}
              style={styles.featureRow}
              onPress={() => router.push(href)}
              activeOpacity={0.82}
            >
              <Text style={styles.emoji}>{emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureBody}>{description}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Locked features */}
        <View style={[styles.card, styles.cardLocked]}>
          <Text style={styles.sectionTitle}>Unlocks after approval</Text>
          {LOCKED.map(([emoji, title]) => (
            <View key={title} style={styles.lockedRow}>
              <Text style={styles.emoji}>{emoji}</Text>
              <Text style={styles.lockedTitle}>{title}</Text>
              <Text style={styles.lockIcon}>🔒</Text>
            </View>
          ))}
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.push('/(auth)/parent-link-verify')}
          activeOpacity={0.86}
        >
          <Text style={styles.btnText}>
            {waiting ? 'View code or check approval' : 'Set up parent or trusted adult'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(teen)/room')}
        >
          <Text style={styles.secondaryText}>Go to my room</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Safety and support tools stay available in every verification state.
        </Text>
      </ScrollView>
    </View>
  );
}

const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const BORDER     = '#1e1e2a';
const TEXT       = '#f3f3f5';
const MUTED      = '#888';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bgDot1: {
    position: 'absolute', width: 340, height: 340,
    borderRadius: 170, backgroundColor: '#4c1d9520',
    top: -40, right: -100,
  },
  bgDot2: {
    position: 'absolute', width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#7c3aed12',
    bottom: 80, left: -80,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
    paddingHorizontal: 22,
    paddingBottom: 48,
  },
  kicker: {
    color: '#a78bfa', fontSize: 10, fontWeight: '900',
    letterSpacing: 2.4, marginBottom: 12,
  },
  title: {
    color: TEXT, fontSize: 28, lineHeight: 34,
    fontWeight: '900', marginBottom: 12,
  },
  body: {
    color: MUTED, fontSize: 14, lineHeight: 21, marginBottom: 22,
  },
  card: {
    backgroundColor: '#16161e',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 18, padding: 16, marginBottom: 14,
  },
  cardLocked: { opacity: 0.7 },
  sectionTitle: {
    color: TEXT, fontSize: 14, fontWeight: '800', marginBottom: 10,
  },
  featureRow: {
    minHeight: 66, flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: BORDER, paddingVertical: 12,
  },
  lockedRow: {
    minHeight: 50, flexDirection: 'row', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: BORDER,
  },
  emoji:        { width: 34, fontSize: 20 },
  featureText:  { flex: 1 },
  featureTitle: { color: TEXT, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  featureBody:  { color: MUTED, fontSize: 12, lineHeight: 17 },
  arrow:        { color: '#a78bfa', fontSize: 26, paddingLeft: 8 },
  lockedTitle:  { flex: 1, color: MUTED, fontSize: 14, fontWeight: '700' },
  lockIcon:     { fontSize: 14 },
  btn: {
    backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 6, marginBottom: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnText:       { color: '#fff', fontSize: 15, fontWeight: '700', textAlign: 'center', paddingHorizontal: 12 },
  secondaryBtn:  { alignItems: 'center', paddingVertical: 12 },
  secondaryText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  note: {
    color: '#444', fontSize: 11, lineHeight: 16,
    textAlign: 'center', marginTop: 10,
  },
});

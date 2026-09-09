import React, { useEffect, useRef, useState } from 'react';
import { Animated, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { IMAGES } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import { useVerificationContext } from '@/context/VerificationContext';
import {
  saveAccountProfile,
  type AgeRange,
  type ProfileGender,
} from '@/features/identity/accountProfile';
import {
  migratePersistedCompanionId,
  toLegacyPersistedCompanionId,
} from '@/features/identity/legacyCompanionIdMigration';
import { fetchPostAuthBootstrap } from '@/services/auth/postAuthBootstrap';
import { advanceStage, markActivated } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

const QUESTIONS: Record<string, string> = {
  '13-15': 'What do you wish somebody understood about you?',
  '16-17': 'What is taking up the most space in your head right now?',
  '18-19': 'What are you figuring out right now?',
  default: 'What are you carrying right now?',
};

function isAgeRange(value: string): value is AgeRange {
  return value === '13-15' || value === '16-17' || value === '18-19';
}
function isGender(value: string | null): value is ProfileGender {
  return value === 'girl' || value === 'boy' || value === 'other';
}

const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const TEXT       = '#f3f3f5';
const MUTED      = '#8b7fa0';

const STEPS    = 4;
const STEP_IDX = 3; // final step

export default function ReflectionScreen() {
  const { setSelectedSekret, setUserSide } = useAppContext();
  const { verificationState, refreshVerification } = useVerificationContext();
  const [question, setQuestion] = useState(QUESTIONS.default);
  const [name, setName] = useState('');
  const [answer, setAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fade    = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.multiGet(['bip_onboarding_age', 'bip_onboarding_name']).then(pairs => {
      const age  = pairs[0][1] ?? 'default';
      const nick = pairs[1][1] ?? '';
      setQuestion(QUESTIONS[age] ?? QUESTIONS.default);
      setName(nick);
    });
    Animated.timing(fade, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breathe, { toValue: 1.04, duration: 2800, useNativeDriver: true }),
      Animated.timing(breathe, { toValue: 1, duration: 2800, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [fade, breathe]);

  async function handleEnter() {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const bootstrap = await fetchPostAuthBootstrap('teen');
      if (!bootstrap.requiredConsentsComplete) {
        router.replace(bootstrap.nextRoute as never);
        return;
      }

      const trimmed = answer.trim();
      const values = await AsyncStorage.multiGet([
        'bip_onboarding_age',
        'bip_onboarding_gender',
        'bip_onboarding_companion',
      ]);
      const age             = values[0][1] ?? '';
      const gender          = values[1][1];
      const canonicalChoice = migratePersistedCompanionId(values[2][1] ?? 'suhana');

      if (!name.trim() || !isAgeRange(age) || !isGender(gender) || !canonicalChoice) {
        throw new Error('Your onboarding profile is incomplete. Go back and finish each step.');
      }

      // Durable profile/runtime storage still uses the legacy IDs. Keep that
      // translation explicit at this boundary until the persistence contract
      // is migrated in the follow-up canonical Room/profile cutover.
      const persistedChoice = toLegacyPersistedCompanionId(canonicalChoice);

      await saveAccountProfile({
        accountSide: 'teen',
        privateDisplayName: name.trim(),
        onboardingComplete: true,
        ageRange: age,
        gender,
        selectedCompanion: persistedChoice,
        circleNickname: 'anonymous bip',
      });

      await AsyncStorage.multiSet([
        ['bip_onboarding_reflection', trimmed],
        ['sekret_self_discovery_profile', JSON.stringify({ reflection: trimmed, updatedAt: new Date().toISOString() })],
      ]);

      getSupabase()?.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        advanceStage(data.user.id, 'reflection_complete').catch(() => null);
        markActivated(data.user.id, 'onboarding_complete').catch(() => null);
      });

      setUserSide('teen');
      setSelectedSekret(persistedChoice);
      await refreshVerification();
      router.replace(
        verificationState === 'VERIFIED_TEEN'
          ? '/(teen)/room'
          : '/(auth)/limited-mode',
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your Bip profile.');
    } finally {
      setSaving(false);
    }
  }

  const canEnter = answer.trim().length > 0 && !saving;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === STEP_IDX && styles.dotActive]} />
          ))}
        </View>

        <Animated.View style={[styles.avatarWrap, { transform: [{ scale: breathe }] }]}>
          <Image source={IMAGES.cloudAvatarNeutral} style={styles.avatar} resizeMode="contain" />
        </Animated.View>

        <Animated.View style={{ opacity: fade }}>
          <Text style={styles.companionLabel}>Se'kret</Text>
          <Text style={styles.question}>{question}</Text>
          <View style={styles.answerWrap}>
            <TextInput
              value={answer}
              onChangeText={text => { setAnswer(text); setError(null); }}
              placeholder="say it exactly how it feels…"
              placeholderTextColor="#4a4357"
              style={styles.answerInput}
              multiline
              textAlignVertical="top"
              maxLength={500}
              accessibilityLabel="Your reflection"
            />
          </View>
          {name ? <Text style={styles.nameHint}>We'll remember this for you, {name}.</Text> : null}
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!canEnter}
          onPress={handleEnter}
          style={[styles.btn, !canEnter && styles.btnDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={saving ? 'Entering Se\'kret Bip' : 'Enter Se\'kret Bip'}
        >
          <Text style={styles.btnText}>{saving ? 'entering…' : "Enter Se'kret Bip 💜"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={saving}
          onPress={handleEnter}
          style={styles.skipLink}
          accessibilityRole="button"
          accessibilityLabel="Skip for now"
        >
          <Text style={styles.skipText}>skip for now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: BG },
  bgDot1:         { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#4c1d9520', top: -80, right: -100 },
  bgDot2:         { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7c3aed12', bottom: 60, left: -80 },
  scroll:         { paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 28, paddingBottom: 24 },
  back:           { marginBottom: 20 },
  backText:       { color: MUTED, fontSize: 22 },
  stepDots:       { flexDirection: 'row', gap: 6, marginBottom: 20 },
  dot:            { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive:      { backgroundColor: PURPLE, width: 18, borderRadius: 3 },
  avatarWrap:     { alignSelf: 'center', marginBottom: 16 },
  avatar:         { width: 110, height: 110 },
  companionLabel: { color: '#8ed9e7', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 14, textAlign: 'center' },
  question:       { color: TEXT, fontSize: 22, fontWeight: '800', lineHeight: 32, marginBottom: 28, textAlign: 'center' },
  answerWrap:     { borderRadius: 20, borderWidth: 1.5, borderColor: '#1e1e2a', backgroundColor: '#16161e', padding: 16, minHeight: 130, marginBottom: 16 },
  answerInput:    { color: TEXT, fontSize: 16, lineHeight: 26, minHeight: 100 },
  nameHint:       { color: '#5a5167', fontSize: 12, textAlign: 'center' },
  error:          { color: '#f87171', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 14 },
  footer:         { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 52 : 36 },
  btn:            { height: 58, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 10, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnDisabled:    { opacity: 0.35, shadowOpacity: 0 },
  btnText:        { color: '#fff', fontSize: 17, fontWeight: '900' },
  skipLink:       { alignItems: 'center', paddingVertical: 8 },
  skipText:       { color: '#4a4357', fontSize: 13 },
});

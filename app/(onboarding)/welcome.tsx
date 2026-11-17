import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { useAppContext } from '@/context/AppContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { ONBOARDING_SIDE_KEY } from '@/services/auth/postAuthBootstrap';
import {
  AGE_ASSURANCE_STORAGE_KEYS,
  AGE_OPTIONS,
  decideAgeAssurance,
  type AgeBucket,
} from '@/features/onboarding/ageAssurance';

const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const TEXT       = '#f3f3f5';
const MUTED      = '#8b7fa0';
const ACCENT     = '#a78bfa';
const WARNING    = '#facc15';

export default function Welcome() {
  const { setUserSide } = useAppContext();
  const { advance } = useOnboarding();
  const [selected, setSelected] = useState<AgeBucket | null>(null);

  const decision = useMemo(
    () => (selected ? decideAgeAssurance(selected) : null),
    [selected],
  );

  async function persistDecision(ageDecision: NonNullable<typeof decision>) {
    await AsyncStorage.multiSet([
      [AGE_ASSURANCE_STORAGE_KEYS.bucket, ageDecision.ageBucket],
      [AGE_ASSURANCE_STORAGE_KEYS.status, ageDecision.status],
      [AGE_ASSURANCE_STORAGE_KEYS.method, ageDecision.method],
      [AGE_ASSURANCE_STORAGE_KEYS.guardianRequired, String(ageDecision.guardianRequired)],
      [AGE_ASSURANCE_STORAGE_KEYS.rawEvidenceStored, 'false'],
      [ONBOARDING_SIDE_KEY, ageDecision.nextSide],
    ]);
  }

  async function handleContinue() {
    if (!decision) return;

    await persistDecision(decision);
    setUserSide(decision.nextSide);

    if (decision.allowed) {
      await advance('age_verified', {
        age_bucket: decision.ageBucket,
        age_verification_status: decision.status,
        age_verification_method: decision.method,
        guardian_required: decision.guardianRequired,
        raw_evidence_stored: false,
      });
    }

    router.push(decision.nextRoute as never);
  }

  async function handleParent() {
    await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, 'parent');
    setUserSide('parent');
    await advance('role_selected', { role: 'parent' });
    router.push('/(onboarding)/parent-splash');
  }

  return (
    <View style={styles.root}>
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.logoWrap}>
          <Text style={styles.logoMark}>Bip</Text>
          <Text style={styles.logoHeart}>💜</Text>
        </View>
        <Text style={styles.wordmark}>Se'kret Bip</Text>

        <Text style={styles.title}>One page.{`\n`}Clear path.</Text>
        <Text style={styles.body}>
          Pick your age bucket, see the protection path, then create the right account. No raw ID, selfie, video, or full birth date is collected here.
        </Text>

        <View style={styles.promiseCard}>
          <Text style={styles.promiseTitle}>Private by default. Guarded on purpose.</Text>
          <Text style={styles.promiseText}>
            Bip keeps onboarding lightweight while still recording the safety checkpoints the app needs: age bucket, assurance status, guardian requirement, and account side.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>How old are you?</Text>
        <View style={styles.options}>
          {AGE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.84}
              onPress={() => setSelected(opt.id)}
              style={[styles.option, selected === opt.id && styles.optionActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === opt.id }}
            >
              <Text style={[styles.optionText, selected === opt.id && styles.optionTextActive]}>{opt.label}</Text>
              <Text style={styles.optionHelper}>{opt.helper}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {decision ? (
          <View style={[styles.decisionCard, !decision.allowed && styles.blockedCard]}>
            <Text style={[styles.decisionTitle, !decision.allowed && styles.blockedTitle]}>
              {decision.allowed ? 'Your path is ready' : 'Parent path needed'}
            </Text>
            <Text style={styles.decisionText}>{decision.message}</Text>
          </View>
        ) : null}

        <View style={styles.companionRow}>
          {['💜 Suhana', '💙 Sy', '☁️ Cloud', '🌙 Night'].map(label => (
            <View key={label} style={styles.companionChip}>
              <Text style={styles.companionText}>{label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!decision}
          style={[styles.btn, !decision && styles.btnDisabled]}
          activeOpacity={0.85}
          onPress={handleContinue}
          accessibilityRole="button"
          accessibilityLabel={decision?.actionLabel ?? 'Choose an age bucket'}
        >
          <Text style={styles.btnText}>{decision?.actionLabel ?? 'Choose an age bucket'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleParent} style={styles.parentLink} accessibilityRole="link" accessibilityLabel="I'm a parent">
          <Text style={styles.parentLinkText}>I'm a parent →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: BG, overflow: 'hidden' },
  bgDot1:        { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#4c1d9520', top: -80, right: -100 },
  bgDot2:        { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7c3aed12', bottom: 60, left: -80 },
  content:       { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 72 : 52, paddingHorizontal: 28, paddingBottom: 170, alignItems: 'flex-start' },
  logoWrap:      { width: 64, height: 64, borderRadius: 20, backgroundColor: PURPLE_DIM, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.45, shadowRadius: 18, elevation: 12 },
  logoMark:      { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  logoHeart:     { fontSize: 11, position: 'absolute', bottom: 8, right: 9 },
  wordmark:      { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 28 },
  title:         { color: TEXT, fontSize: 44, fontWeight: '900', lineHeight: 50, marginBottom: 16 },
  body:          { color: '#c5bbcf', fontSize: 15, lineHeight: 24, marginBottom: 18 },
  promiseCard:   { width: '100%', borderRadius: 20, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: '#ffffff08', padding: 16, marginBottom: 22 },
  promiseTitle:  { color: TEXT, fontSize: 14, fontWeight: '900', marginBottom: 6 },
  promiseText:   { color: '#a89daf', fontSize: 12, lineHeight: 18 },
  sectionTitle:  { color: ACCENT, fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 12 },
  options:       { width: '100%', gap: 10 },
  option:        { minHeight: 70, borderRadius: 18, borderWidth: 1.5, borderColor: '#ffffff14', backgroundColor: '#16161e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  optionActive:  { borderColor: PURPLE, backgroundColor: 'rgba(124,58,237,0.18)' },
  optionText:    { color: ACCENT, fontSize: 19, fontWeight: '900' },
  optionTextActive: { color: TEXT },
  optionHelper:  { color: MUTED, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 3 },
  decisionCard:  { width: '100%', borderRadius: 18, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#ffffff08', padding: 14, marginTop: 16 },
  blockedCard:   { borderColor: '#facc1540', backgroundColor: '#facc1512' },
  decisionTitle: { color: ACCENT, fontSize: 13, fontWeight: '900', marginBottom: 4 },
  blockedTitle:  { color: WARNING },
  decisionText:  { color: '#b9afc5', fontSize: 12, lineHeight: 18 },
  companionRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  companionChip: { borderRadius: 999, borderWidth: 1, borderColor: '#ffffff15', paddingHorizontal: 12, paddingVertical: 7 },
  companionText: { color: ACCENT, fontSize: 12, fontWeight: '700' },
  footer:        { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 28, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 48 : 30, backgroundColor: 'rgba(10,10,10,0.96)' },
  btn:           { height: 58, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8 },
  btnDisabled:   { opacity: 0.35 },
  btnText:       { color: '#fff', fontSize: 16, fontWeight: '900' },
  parentLink:    { alignItems: 'center', paddingVertical: 8 },
  parentLinkText: { color: ACCENT, fontSize: 13, fontWeight: '700' },
});

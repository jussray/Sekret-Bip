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
import { ONBOARDING_SIDE_KEY } from '@/services/auth/postAuthBootstrap';
import { useOnboarding } from '@/context/OnboardingContext';
import type { AccountSide } from '@/features/identity/accountProfile';
import {
  AGE_ASSURANCE_STORAGE_KEYS,
  AGE_OPTIONS,
  decideAgeAssurance,
  type AgeBucket,
} from '@/features/onboarding/ageAssurance';
import { consentService } from '../../services/consentService';
import { getSupabase } from '@/utils/supabase';

const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const TEXT       = '#f3f3f5';
const MUTED      = '#8b7fa0';
const ACCENT     = '#a78bfa';
const WARNING    = '#facc15';

const STEPS = 4;

type PermanentConsentGate = 'preauth' | 'missing_consent' | 'complete';

async function getPermanentConsentGate(side: AccountSide): Promise<PermanentConsentGate> {
  const supabase = getSupabase();
  if (!supabase) return 'preauth';

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user || data.user.is_anonymous) return 'preauth';

    await consentService.load(data.user.id);
    return consentService.hasCompletedOnboarding() ? 'complete' : 'missing_consent';
  } catch {
    return 'preauth';
  }
}

export default function AgeScreen() {
  const { setUserSide } = useAppContext();
  const { advance } = useOnboarding();
  const [selected, setSelected] = useState<AgeBucket | null>(null);

  const decision = useMemo(
    () => (selected ? decideAgeAssurance(selected) : null),
    [selected],
  );

  async function persistAgeDecision(ageDecision: NonNullable<typeof decision>) {
    await AsyncStorage.multiSet([
      [AGE_ASSURANCE_STORAGE_KEYS.bucket, ageDecision.ageBucket],
      [AGE_ASSURANCE_STORAGE_KEYS.status, ageDecision.status],
      [AGE_ASSURANCE_STORAGE_KEYS.method, ageDecision.method],
      [AGE_ASSURANCE_STORAGE_KEYS.guardianRequired, String(ageDecision.guardianRequired)],
      [AGE_ASSURANCE_STORAGE_KEYS.rawEvidenceStored, 'false'],
      [ONBOARDING_SIDE_KEY, ageDecision.nextSide],
    ]);
  }

  async function handleNext() {
    if (!decision) return;

    await persistAgeDecision(decision);

    const consentGate = await getPermanentConsentGate(decision.nextSide);
    if (consentGate === 'missing_consent') {
      setUserSide(decision.nextSide);
      router.replace(`/(onboarding)/consent?side=${decision.nextSide}` as never);
      return;
    }

    if (!decision.allowed) {
      setUserSide('parent');
      router.push(decision.nextRoute as never);
      return;
    }

    setUserSide('teen');
    if (consentGate === 'complete') {
      await advance('age_verified', {
        age_bucket: decision.ageBucket,
        age_verification_status: decision.status,
        age_verification_method: decision.method,
        guardian_required: decision.guardianRequired,
        raw_evidence_stored: false,
      });
      router.push('/(onboarding)/name');
      return;
    }

    router.push(decision.nextRoute as never);
  }

  async function handleParent() {
    await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, 'parent');
    setUserSide('parent');

    const consentGate = await getPermanentConsentGate('parent');
    if (consentGate === 'missing_consent') {
      router.replace('/(onboarding)/consent?side=parent' as never);
      return;
    }

    if (consentGate === 'complete') {
      await advance('role_selected', { role: 'parent' });
    }
    router.push('/(onboarding)/parent-splash');
  }

  return (
    <View style={styles.root}>
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        {/* Step dots */}
        <View style={styles.stepDots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[styles.dot, i === 0 && styles.dotActive]} />
          ))}
        </View>

        <Text style={styles.title}>How old are you?</Text>
        <Text style={styles.sub}>
          We only use an age bucket here, then add more protection when the bucket needs it.
        </Text>

        <View style={styles.privacyCard}>
          <Text style={styles.privacyTitle}>Age check, not a data grab.</Text>
          <Text style={styles.privacyText}>
            This step stores the bucket, status, and whether guardian review is needed. No ID image, selfie, video, or raw proof is stored.
          </Text>
        </View>

        <View style={styles.options}>
          {AGE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              activeOpacity={0.8}
              onPress={() => setSelected(opt.id)}
              style={[styles.option, selected === opt.id && styles.optionActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === opt.id }}
            >
              <Text style={[styles.optionText, selected === opt.id && styles.optionTextActive]}>
                {opt.label}
              </Text>
              <Text style={styles.optionHelper}>{opt.helper}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {decision ? (
          <View style={[styles.decisionCard, !decision.allowed && styles.blockedCard]}>
            <Text style={[styles.decisionTitle, !decision.allowed && styles.blockedTitle]}>
              {decision.allowed ? 'Protection path selected' : 'Parent path needed'}
            </Text>
            <Text style={styles.decisionText}>{decision.message}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          disabled={!decision}
          onPress={handleNext}
          style={[styles.btn, !decision && styles.btnDisabled]}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={decision?.actionLabel ?? 'Continue'}
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
  root:             { flex: 1, backgroundColor: BG },
  bgDot1:           { position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: '#4c1d9520', top: -80, right: -100 },
  bgDot2:           { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: '#7c3aed12', bottom: 60, left: -80 },
  content:          { flexGrow: 1, paddingTop: Platform.OS === 'ios' ? 64 : 44, paddingHorizontal: 28, paddingBottom: 170 },
  back:             { marginBottom: 28 },
  backText:         { color: MUTED, fontSize: 22 },
  stepDots:         { flexDirection: 'row', gap: 6, marginBottom: 28 },
  dot:              { width: 6, height: 6, borderRadius: 3, backgroundColor: '#333' },
  dotActive:        { backgroundColor: PURPLE, width: 18, borderRadius: 3 },
  title:            { color: TEXT, fontSize: 34, fontWeight: '900', marginBottom: 10 },
  sub:              { color: MUTED, fontSize: 14, lineHeight: 22, marginBottom: 18 },
  privacyCard:      { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#ffffff08', padding: 15, marginBottom: 20 },
  privacyTitle:     { color: TEXT, fontSize: 13, fontWeight: '900', marginBottom: 5 },
  privacyText:      { color: '#a89daf', fontSize: 12, lineHeight: 18 },
  options:          { gap: 12 },
  option:           { minHeight: 76, borderRadius: 20, borderWidth: 1.5, borderColor: '#ffffff14', backgroundColor: '#16161e', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  optionActive:     { borderColor: PURPLE, backgroundColor: 'rgba(124,58,237,0.18)' },
  optionText:       { color: ACCENT, fontSize: 20, fontWeight: '800' },
  optionTextActive: { color: TEXT },
  optionHelper:     { color: MUTED, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
  decisionCard:     { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#ffffff08', padding: 14, marginTop: 16 },
  blockedCard:      { borderColor: '#facc1540', backgroundColor: '#facc1512' },
  decisionTitle:    { color: TEXT, fontSize: 13, fontWeight: '900', marginBottom: 5 },
  blockedTitle:     { color: WARNING },
  decisionText:     { color: '#b9afc5', fontSize: 12, lineHeight: 18 },
  footer:           { paddingHorizontal: 28, paddingBottom: Platform.OS === 'ios' ? 52 : 36, paddingTop: 10 },
  btn:              { minHeight: 58, borderRadius: 20, backgroundColor: PURPLE, alignItems: 'center', justifyContent: 'center', marginBottom: 14, paddingHorizontal: 14 },
  btnDisabled:      { opacity: 0.35 },
  btnText:          { color: '#fff', fontSize: 16, fontWeight: '900', textAlign: 'center' },
  parentLink:       { alignItems: 'center', paddingVertical: 8 },
  parentLinkText:   { color: PURPLE_DIM, fontSize: 13, fontWeight: '700' },
});

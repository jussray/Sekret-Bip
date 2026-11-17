/**
 * app/(auth)/consent.tsx
 *
 * Terms / Privacy / Voice-biometric consent screen.
 * Reached from:
 *   • age-gate  (first launch)  — params: { dob, accountType }
 *   • index.tsx (ToS/PP update) — params: { dob, accountType, reConsent: 'true' }
 *
 * On completion:
 *   1. Writes compliance keys to AsyncStorage (offline-first gate).
 *   2. Calls record_initial_consent() RPC to persist to Supabase when online.
 *   3. Routes to the normal onboarding flow (index → profile).
 *
 * Version strings live in src/utils/compliance.ts — bump there to re-prompt everyone.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import { getSupabase } from '@/utils/supabase';
import { TOS_VERSION, PRIVACY_VERSION } from '@utils/compliance';

interface CheckRowProps {
  checked: boolean;
  onToggle: () => void;
  title: string;
  body: string;
  required?: boolean;
}

function CheckRow({ checked, onToggle, title, body, required }: CheckRowProps) {
  return (
    <TouchableOpacity style={s.checkRow} onPress={onToggle} activeOpacity={0.82}>
      <View style={[s.checkbox, checked && s.checkboxChecked]}>
        {checked && <Text style={s.checkMark}>✓</Text>}
      </View>
      <View style={s.checkBody}>
        <Text style={s.checkTitle}>
          {title}{required ? <Text style={s.required}> *</Text> : null}
        </Text>
        <Text style={s.checkDesc}>{body}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function ConsentScreen() {
  const { dob, accountType, reConsent } = useLocalSearchParams<{
    dob: string; accountType: string; reConsent?: string;
  }>();
  const isReConsent = reConsent === 'true';

  const [tosChecked,     setTos]     = useState(false);
  const [privacyChecked, setPrivacy] = useState(false);
  const [voiceChecked,   setVoice]   = useState(false);
  const [submitting,     setSub]     = useState(false);
  const [error,          setError]   = useState<string | null>(null);

  const ready = tosChecked && privacyChecked;

  async function handleAgree() {
    if (!ready || submitting) return;
    setSub(true);
    setError(null);

    // Step 1: Write local gate — fatal if this fails
    try {
      await AsyncStorage.multiSet([
        ['compliance_v1_done',         'true'],
        ['compliance_account_type',    accountType ?? 'teen'],
        ['compliance_dob',             dob ?? ''],
        ['compliance_tos_version',     TOS_VERSION],
        ['compliance_privacy_version', PRIVACY_VERSION],
        ['compliance_voice_consent',   voiceChecked ? 'true' : 'false'],
        ['compliance_completed_at',    new Date().toISOString()],
      ]);
    } catch {
      setError('Could not save your preferences. Please try again.');
      setSub(false);
      return;
    }

    // Step 2: Persist to Supabase — best-effort, tolerated if offline or session missing
    try {
      const sb = getSupabase();
      if (sb && dob) {
        await sb.rpc('record_initial_consent', {
          p_date_of_birth:   dob,
          p_account_type:    accountType ?? 'teen',
          p_terms_version:   TOS_VERSION,
          p_privacy_version: PRIVACY_VERSION,
          p_voice_consent:   voiceChecked,
          p_platform:        Platform.OS,
          p_app_version:     '1.0.0-beta',
        });
      }
    } catch { /* non-fatal — local consent already saved */ }

    // Step 3: Enter app
    router.replace('/');
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <Text style={s.kicker}>{isReConsent ? 'WE UPDATED OUR TERMS' : 'ALMOST THERE'}</Text>
        <Text style={s.title}>
          {isReConsent ? 'A few things changed' : 'A few things before you go in'}
        </Text>
        <Text style={s.sub}>
          {isReConsent
            ? "We've updated our Terms or Privacy Policy. Please review and re-confirm — it'll only take a moment."
            : "Se'kret Bip stores personal conversations and voice notes. Read these and check each one — they're short."
          }
        </Text>

        <CheckRow
          checked={tosChecked}
          onToggle={() => setTos(v => !v)}
          required
          title="Terms of Service"
          body={
            `I agree to the Se'kret Bip Terms of Service (${TOS_VERSION}). ` +
            'This includes community rules, acceptable use, and how disputes are handled.'
          }
        />

        <CheckRow
          checked={privacyChecked}
          onToggle={() => setPrivacy(v => !v)}
          required
          title="Privacy Policy"
          body={
            `I understand how Se'kret Bip collects, uses, and stores my data — ` +
            `including journal entries, mood history, and AI conversation logs (${PRIVACY_VERSION}). ` +
            'I can request deletion at any time in Settings.'
          }
        />

        <CheckRow
          checked={voiceChecked}
          onToggle={() => setVoice(v => !v)}
          title="Voice & Audio Data"
          body={
            'I agree that Se\'kret Bip may store audio recordings I create (Voice Bip, ' +
            'Voice Reflect). If I am in Illinois, Texas, or Washington, I specifically ' +
            'consent to biometric voice data processing as required by state law. ' +
            'Voice data is deleted when I delete my account.'
          }
        />

        <View style={s.noticeBox}>
          <Text style={s.noticeTitle}>Your data rights</Text>
          <Text style={s.noticeBody}>
            • You can delete your account and all data in Settings → Delete my data.{'\n'}
            • You can request a copy of your data in Settings → Download my data.{'\n'}
            • We never sell your data. Ever.{'\n'}
            • AI conversations may be reviewed to improve safety. Content is not used to train models.
          </Text>
        </View>

        {error ? <Text style={s.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[s.cta, (!ready || submitting) && s.ctaDisabled]}
          disabled={!ready || submitting}
          onPress={handleAgree}
          activeOpacity={0.82}
        >
          {submitting
            ? <ActivityIndicator color="#160b24" />
            : <Text style={s.ctaText}>I agree — let me in</Text>
          }
        </TouchableOpacity>

        <Text style={s.legalNote}>
          * Required. You must accept Terms and Privacy to use Se'kret Bip.{'\n'}
          Voice consent is optional but required to use Voice Bip features.
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#0d0820' },
  content: { padding: 24, paddingTop: Platform.OS === 'android' ? 48 : 24, paddingBottom: 60 },

  kicker: { color: '#c4b5fd', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  title:  { color: '#fff', fontSize: 26, fontWeight: '900', marginBottom: 10 },
  sub:    { color: '#a99fb1', fontSize: 13, lineHeight: 20, marginBottom: 24 },

  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ffffff12',
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#4a4158',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#c4b5fd', borderColor: '#c4b5fd' },
  checkMark:       { color: '#160b24', fontSize: 14, fontWeight: '900' },
  checkBody:       { flex: 1 },
  checkTitle:      { color: '#eee7f2', fontSize: 14, fontWeight: '800', marginBottom: 4 },
  checkDesc:       { color: '#887ba0', fontSize: 12, lineHeight: 18 },
  required:        { color: '#c4b5fd' },

  noticeBox: {
    backgroundColor: 'rgba(196,181,253,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.2)',
    padding: 16,
    marginVertical: 20,
  },
  noticeTitle: { color: '#c4b5fd', fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginBottom: 8 },
  noticeBody:  { color: '#a99fb1', fontSize: 12, lineHeight: 20 },

  errorText: { color: '#f87171', fontSize: 13, textAlign: 'center', marginBottom: 12 },

  cta:        { height: 54, borderRadius: 18, backgroundColor: '#c4b5fd', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaDisabled:{ opacity: 0.35 },
  ctaText:    { color: '#160b24', fontSize: 16, fontWeight: '900' },

  legalNote: { color: '#4a4158', fontSize: 11, lineHeight: 16, marginTop: 20 },
});

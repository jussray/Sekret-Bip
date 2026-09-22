import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  generateInviteCodeWithDeliveryResult,
  PARENT_INVITE_CODE_LENGTH,
  type ParentInviteEmailStatus,
} from '@/utils/parentLink';
import { fetchPendingInviteCodeResult } from '@/utils/pendingParentInvite';
import { useVerificationContext } from '@/context/VerificationContext';
import { confirmOwnAdultTeenAgeAssurance } from '@/services/teenAgeAssurance';
import { getSupabase } from '@/utils/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmailInput(value: string): string {
  return value.trim().toLowerCase();
}

export default function ParentLinkVerifyScreen() {
  const {
    verificationSnapshot,
    verificationState,
    isVerificationLoading,
    refreshVerification,
  } = useVerificationContext();
  const parentLinkState = verificationSnapshot.parentLinkState;
  const [code, setCode] = useState<string | null>(null);
  const [parentEmail, setParentEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<ParentInviteEmailStatus | 'idle'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [error, setError] = useState('');
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  useEffect(() => {
    if (verificationState === 'VERIFIED_TEEN') router.replace('/(teen)/room');
  }, [verificationState]);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const supabase = getSupabase();
      if (!supabase) {
        if (mounted) setProfileChecked(true);
        return;
      }

      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userError || !userData.user) return;
        const { data, error: profileError } = await supabase
          .from('app_profiles')
          .select('age_range')
          .eq('user_id', userData.user.id)
          .maybeSingle();
        if (!profileError && mounted) setAgeRange(typeof data?.age_range === 'string' ? data.age_range : null);
      } finally {
        if (mounted) setProfileChecked(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const createInvite = useCallback(async (parentEmailOverride?: string): Promise<boolean> => {
    const result = await generateInviteCodeWithDeliveryResult({
      parentEmail: parentEmailOverride,
    });

    if (!result.ok) {
      setError(result.message);
      setEmailStatus('idle');
      setEmailMessage('');
      return false;
    }

    setCode(result.value.code);
    setEmailStatus(result.value.email.status);

    if (result.value.email.status === 'sent') {
      setEmailMessage('Invite email sent. Keep this code visible in case they need to enter it manually.');
    } else if (result.value.email.status === 'failed') {
      setEmailMessage('Code created, but email did not send. Copy or share the code directly for now.');
    } else {
      setEmailMessage('');
    }

    await refreshVerification();
    return true;
  }, [refreshVerification]);

  useEffect(() => {
    if (isVerificationLoading) return;
    if (parentLinkState === 'active') {
      setCode(null);
      setLookupFailed(false);
      setCheckingExisting(false);
      return;
    }

    let mounted = true;
    setCheckingExisting(true);
    void (async () => {
      const lookup = await fetchPendingInviteCodeResult();
      if (!mounted) return;
      if (!lookup.ok) {
        setLookupFailed(true);
        setError(lookup.message);
        setCheckingExisting(false);
        return;
      }
      if (lookup.value) {
        setCode(lookup.value);
        setCheckingExisting(false);
        return;
      }
      const created = await createInvite();
      if (!mounted) return;
      if (!created) setEmailStatus('idle');
      setCheckingExisting(false);
    })();
    return () => { mounted = false; };
  }, [createInvite, isVerificationLoading, parentLinkState]);

  async function retryExistingCodeLookup() {
    if (parentLinkState === 'active') return;
    setLoading(true);
    setError('');
    setEmailMessage('');
    const lookup = await fetchPendingInviteCodeResult();
    if (!lookup.ok) {
      setLookupFailed(true);
      setError(lookup.message);
      setLoading(false);
      return;
    }
    setLookupFailed(false);
    if (lookup.value) {
      setCode(lookup.value);
      setLoading(false);
      return;
    }
    await createInvite();
    setLoading(false);
  }

  async function createCode() {
    if (parentLinkState === 'active') return;
    if (lookupFailed) {
      await retryExistingCodeLookup();
      return;
    }
    setLoading(true);
    setError('');
    setEmailMessage('');
    await createInvite();
    setLoading(false);
  }

  async function sendInviteEmail() {
    if (parentLinkState === 'active') return;
    const email = normalizeEmailInput(parentEmail);
    if (!EMAIL_PATTERN.test(email)) {
      setError('Enter a valid parent or trusted-adult email first.');
      return;
    }

    setLoading(true);
    setError('');
    setEmailMessage('');
    await createInvite(email);
    setLoading(false);
  }

  async function checkStatus() {
    setLoading(true);
    setError('');
    try {
      await refreshVerification();
    } catch {
      setError('Could not check connection or verification status. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function confirmAdultAgeRange() {
    setLoading(true);
    setError('');
    try {
      await confirmOwnAdultTeenAgeAssurance();
      await refreshVerification();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not confirm your age range.');
    } finally {
      setLoading(false);
    }
  }

  const connectionActive = parentLinkState === 'active';
  const adultSelfAssuranceEligible = profileChecked && ageRange === '18-19';
  const displayCode = code ?? '•'.repeat(PARENT_INVITE_CODE_LENGTH);
  const canSendEmail = !connectionActive
    && Boolean(normalizeEmailInput(parentEmail))
    && !loading
    && !checkingExisting;

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

        <Text style={styles.kicker}>TRUSTED CONNECTION</Text>
        <Text style={styles.title}>Bring in a parent or trusted adult.</Text>
        <Text style={styles.body}>
          A private code connects your accounts for Bridge. It does not give the adult access to your private Teen space, and linking alone does not verify your account.
        </Text>

        {connectionActive ? (
          <View style={styles.connectedCard}>
            <Text style={styles.connectedTitle}>Connection active</Text>
            <Text style={styles.connectedBody}>
              Your trusted connection is active. You still choose what moves through Bridge. If you are 13–17, a verified guardian can separately confirm your age assurance from Parent Side without gaining access to your private account.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.codeCard}>
              <Text style={styles.codeLabel}>
                {code
                  ? 'YOUR PRIVATE CODE'
                  : lookupFailed
                    ? 'CODE CHECK NEEDED'
                    : 'CREATING YOUR CODE…'}
              </Text>
              {checkingExisting ? (
                <ActivityIndicator color="#a78bfa" style={styles.codeLoader} />
              ) : (
                <Text selectable={Boolean(code)} style={styles.code}>
                  {displayCode}
                </Text>
              )}
              <Text style={styles.codeNote}>
                Codes expire after 48 hours. Only share yours with the adult you trust.
              </Text>
            </View>

            <View style={styles.emailCard}>
              <Text style={styles.emailLabel}>EMAIL INVITE OPTIONAL</Text>
              <TextInput
                value={parentEmail}
                onChangeText={text => {
                  setParentEmail(text);
                  setError('');
                  setEmailMessage('');
                  if (emailStatus !== 'idle') setEmailStatus('idle');
                }}
                placeholder="parent@example.com"
                placeholderTextColor="#555"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                style={styles.emailInput}
                accessibilityLabel="Parent or trusted adult email"
              />
              <TouchableOpacity
                style={[styles.emailButton, !canSendEmail && styles.emailButtonDim]}
                onPress={sendInviteEmail}
                disabled={!canSendEmail}
                activeOpacity={0.86}
              >
                {loading && canSendEmail ? (
                  <ActivityIndicator color="#0a0a0a" size="small" />
                ) : (
                  <Text style={styles.emailButtonText}>Send invite email</Text>
                )}
              </TouchableOpacity>
              {emailMessage ? (
                <Text
                  style={[
                    styles.emailStatus,
                    emailStatus === 'sent' ? styles.emailStatusSent : styles.emailStatusFailed,
                  ]}
                >
                  {emailMessage}
                </Text>
              ) : null}
            </View>

            <TouchableOpacity
              style={[styles.btn, (loading || checkingExisting) && styles.btnDim]}
              onPress={createCode}
              disabled={loading || checkingExisting}
              activeOpacity={0.86}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>
                  {lookupFailed ? 'Retry existing code check' : code ? 'Create a new code' : 'Try creating code again'}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {adultSelfAssuranceEligible ? (
          <View style={styles.assuranceCard}>
            <Text style={styles.assuranceTitle}>18–19 age assurance</Text>
            <Text style={styles.assuranceBody}>
              Your profile says 18–19. You can explicitly confirm that age range yourself. This verification action is separate from Parent Link and Bridge and stores no ID image, selfie, or full birth date.
            </Text>
            <TouchableOpacity
              style={[styles.assuranceButton, loading && styles.outlineBtnDim]}
              onPress={confirmAdultAgeRange}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Confirm my 18 to 19 age range"
            >
              <Text style={styles.assuranceButtonText}>Confirm my 18–19 age range</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {error ? (
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.outlineBtn, (loading || checkingExisting) && styles.outlineBtnDim]}
          onPress={checkStatus}
          disabled={loading || checkingExisting}
        >
          <Text style={styles.outlineBtnText}>Check connection and verification status</Text>
        </TouchableOpacity>

        <View style={styles.hintCard}>
          <Text style={styles.hintTitle}>For your parent or trusted adult</Text>
          <Text style={styles.hintBody}>
            They can use your code to create the trusted connection. If you are 13–17, a verified guardian can then choose the separate Teen Verification action. Bridge stays under your sharing controls either way.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.linkBtn}
          onPress={() => router.replace('/(auth)/limited-mode')}
        >
          <Text style={styles.linkText}>Keep using Limited Mode</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const PURPLE = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG = '#0a0a0a';
const BORDER = '#1e1e2a';
const TEXT = '#f3f3f5';
const MUTED = '#888';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  bgDot1: {
    position: 'absolute', width: 340, height: 340,
    borderRadius: 170, backgroundColor: '#4c1d9520',
    top: -80, right: -100,
  },
  bgDot2: {
    position: 'absolute', width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#7c3aed12',
    bottom: 60, left: -80,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 72 : 52,
    paddingHorizontal: 24,
    paddingBottom: 48,
    alignItems: 'center',
  },
  logoWrap: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: PURPLE_DIM,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
  },
  logoMark: { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  logoHeart: { fontSize: 10, position: 'absolute', bottom: 6, right: 7 },
  wordmark: { color: TEXT, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 28 },
  kicker: {
    color: '#a78bfa', fontSize: 10, fontWeight: '900',
    letterSpacing: 2.2, marginBottom: 10, alignSelf: 'flex-start',
  },
  title: {
    color: TEXT, fontSize: 24, lineHeight: 30, fontWeight: '900',
    marginBottom: 12, alignSelf: 'flex-start',
  },
  body: {
    color: MUTED, fontSize: 14, lineHeight: 21,
    marginBottom: 24, alignSelf: 'flex-start',
  },
  connectedCard: {
    width: '100%', borderRadius: 18, borderWidth: 1,
    borderColor: '#6ee7b755', backgroundColor: '#123525',
    padding: 16, marginBottom: 18,
  },
  connectedTitle: { color: '#d1fae5', fontSize: 15, fontWeight: '900', marginBottom: 6 },
  connectedBody: { color: '#a7cbbb', fontSize: 12, lineHeight: 19 },
  codeCard: {
    width: '100%',
    backgroundColor: '#16161e',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 20, padding: 24,
    alignItems: 'center', marginBottom: 18,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
  codeLabel: {
    color: MUTED, fontSize: 9, fontWeight: '900',
    letterSpacing: 2, marginBottom: 12,
  },
  code: {
    color: TEXT, fontSize: 30, fontWeight: '900',
    letterSpacing: 7, marginBottom: 16,
    fontVariant: ['tabular-nums'],
  },
  codeLoader: { marginVertical: 22 },
  codeNote: {
    color: '#555', fontSize: 11, lineHeight: 16, textAlign: 'center',
  },
  emailCard: {
    width: '100%',
    backgroundColor: '#111118',
    borderWidth: 1,
    borderColor: '#6d28d933',
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
  },
  emailLabel: {
    color: '#a78bfa',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.6,
    marginBottom: 10,
  },
  emailInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  emailButton: {
    width: '100%',
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: '#c4b5fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailButtonDim: { opacity: 0.45 },
  emailButtonText: { color: '#0a0a0a', fontSize: 14, fontWeight: '800' },
  emailStatus: { marginTop: 10, fontSize: 12, lineHeight: 17 },
  emailStatusSent: { color: '#86efac' },
  emailStatusFailed: { color: '#fbbf24' },
  assuranceCard: {
    width: '100%', borderRadius: 18, borderWidth: 1,
    borderColor: '#a78bfa44', backgroundColor: '#171126',
    padding: 16, marginBottom: 16,
  },
  assuranceTitle: { color: '#ddd6fe', fontSize: 14, fontWeight: '900', marginBottom: 6 },
  assuranceBody: { color: '#aaa0bd', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  assuranceButton: {
    minHeight: 48, borderRadius: 13, borderWidth: 1,
    borderColor: '#a78bfa88', alignItems: 'center', justifyContent: 'center',
  },
  assuranceButtonText: { color: '#c4b5fd', fontSize: 13, fontWeight: '800' },
  errorText: {
    color: '#f87171', fontSize: 12, alignSelf: 'flex-start',
    marginBottom: 10,
  },
  btn: {
    width: '100%', backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    marginBottom: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnDim: { backgroundColor: PURPLE_DIM, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2, textAlign: 'center' },
  outlineBtn: {
    width: '100%', borderRadius: 12,
    borderWidth: 1, borderColor: '#6d28d966',
    paddingVertical: 15, alignItems: 'center',
    marginBottom: 20,
  },
  outlineBtnDim: { opacity: 0.4 },
  outlineBtnText: { color: '#a78bfa', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  hintCard: {
    width: '100%',
    backgroundColor: '#16161e',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  hintTitle: { color: TEXT, fontSize: 13, fontWeight: '800', marginBottom: 6 },
  hintBody: { color: MUTED, fontSize: 12, lineHeight: 18 },
  linkBtn: { paddingVertical: 14 },
  linkText: { color: '#555', fontSize: 13, fontWeight: '700' },
});

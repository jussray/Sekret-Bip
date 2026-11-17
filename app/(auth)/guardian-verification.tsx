import React, { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useVerificationContext } from '@/context/VerificationContext';
import { submitGuardianVerification } from '@/features/identity/accountProfile';

const COPY: Record<string, { title: string; body: string }> = {
  PENDING_GUARDIAN_REVIEW: {
    title: 'Guardian review is pending.',
    body: 'Your Parent space stays locked until the account is reviewed. Teen sharing and parent-link consent are separate steps.',
  },
  GUARDIAN_REJECTED: {
    title: 'We could not verify this account yet.',
    body: 'Review your Parent profile and resubmit. No teen data is visible while guardian verification is incomplete.',
  },
  GUARDIAN_SUSPENDED: {
    title: 'This guardian account is suspended.',
    body: 'Parent and guardian-only areas remain unavailable while the account is suspended.',
  },
  UNVERIFIED: {
    title: 'Guardian verification required.',
    body: 'Completing a Parent profile starts the review. Linking to a teen is a separate consent step and does not verify an adult account.',
  },
};

export default function GuardianVerificationScreen() {
  const { verificationState, refreshVerification, verificationError } = useVerificationContext();
  const [busy, setBusy]             = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (verificationState === 'VERIFIED_GUARDIAN') router.replace('/(parent)/room');
    else if (verificationState === 'GUARDIAN_SUSPENDED') router.replace('/(auth)/suspended');
  }, [verificationState]);

  const copy      = COPY[verificationState] ?? COPY.UNVERIFIED;
  const canSubmit = verificationState === 'UNVERIFIED' || verificationState === 'GUARDIAN_REJECTED';

  async function handlePrimary() {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      if (canSubmit) await submitGuardianVerification();
      await refreshVerification();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to update guardian review.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoMark}>Bip</Text>
          <Text style={styles.logoHeart}>💜</Text>
        </View>
        <Text style={styles.wordmark}>Se'kret Bip</Text>

        <Text style={styles.kicker}>GUARDIAN ACCESS</Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>

        {/* Info card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What stays separate</Text>
          <View style={styles.cardRow}>
            <Text style={styles.cardCheck}>✓</Text>
            <Text style={styles.cardItem}>Guardian identity review unlocks Parent surfaces.</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardCheck}>✓</Text>
            <Text style={styles.cardItem}>A teen chooses whether to create a parent link.</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardCheck}>✓</Text>
            <Text style={styles.cardItem}>No journal, voice note, or private source is shared automatically.</Text>
          </View>
        </View>

        {(actionError || verificationError) ? (
          <Text style={styles.errorText} accessibilityRole="alert">
            {actionError ?? verificationError}
          </Text>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, busy && styles.btnDim]}
          onPress={handlePrimary}
          disabled={busy}
          activeOpacity={0.86}
          accessibilityRole="button"
        >
          <Text style={styles.btnText}>
            {busy ? 'Checking…' : canSubmit ? 'Submit for guardian review' : 'Check review status'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(onboarding)/parent-setup')}
          accessibilityRole="link"
        >
          <Text style={styles.secondaryText}>Review Parent profile</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Parent access fails closed until Supabase reports VERIFIED_GUARDIAN.
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
    top: -80, right: -100,
  },
  bgDot2: {
    position: 'absolute', width: 260, height: 260,
    borderRadius: 130, backgroundColor: '#7c3aed12',
    bottom: 60, left: -80,
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 72 : 48,
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
  logoMark:  { color: '#fff', fontSize: 17, fontWeight: '900', letterSpacing: -0.5 },
  logoHeart: { fontSize: 10, position: 'absolute', bottom: 6, right: 7 },
  wordmark:  { color: TEXT, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 28 },
  kicker: {
    color: '#a78bfa', fontSize: 10, fontWeight: '900',
    letterSpacing: 2.2, marginBottom: 10, alignSelf: 'flex-start',
  },
  title: {
    color: TEXT, fontSize: 26, lineHeight: 32, fontWeight: '900',
    marginBottom: 12, alignSelf: 'flex-start',
  },
  body: {
    color: MUTED, fontSize: 14, lineHeight: 21,
    marginBottom: 22, alignSelf: 'flex-start',
  },
  card: {
    width: '100%',
    backgroundColor: '#16161e',
    borderWidth: 1, borderColor: BORDER,
    borderRadius: 18, padding: 18, marginBottom: 18,
  },
  cardTitle: { color: TEXT, fontSize: 14, fontWeight: '800', marginBottom: 12 },
  cardRow:   { flexDirection: 'row', marginBottom: 8 },
  cardCheck: { color: '#a78bfa', fontSize: 13, fontWeight: '900', marginRight: 8, marginTop: 1 },
  cardItem:  { color: MUTED, fontSize: 13, lineHeight: 19, flex: 1 },
  errorText: {
    color: '#f87171', fontSize: 12,
    alignSelf: 'flex-start', marginBottom: 10,
  },
  btn: {
    width: '100%', backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    marginBottom: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnDim:       { backgroundColor: PURPLE_DIM, shadowOpacity: 0 },
  btnText:      { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
  secondaryBtn: { paddingVertical: 10 },
  secondaryText:{ color: '#a78bfa', fontSize: 14, fontWeight: '600' },
  note: {
    color: '#444', fontSize: 11, lineHeight: 16,
    textAlign: 'center', marginTop: 18,
  },
});

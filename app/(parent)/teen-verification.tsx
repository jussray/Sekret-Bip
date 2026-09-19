import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useVerificationContext } from '@/context/VerificationContext';
import { confirmLinkedTeenAgeAssurance } from '@/services/teenAgeAssurance';
import { fetchLinkedTeenId } from '@/utils/parentLink';

function messageForError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const lower = raw.toLowerCase();
  if (lower.includes('verified guardian required')) {
    return 'Finish Parent guardian verification before confirming Teen age assurance.';
  }
  if (lower.includes('active teen relationship required')) {
    return 'Connect to the Teen with their private code first. Bridge sharing stays separate from this confirmation.';
  }
  if (lower.includes('completed minor teen profiles')) {
    return 'This confirmation is only for a completed Teen profile in the 13–17 age range.';
  }
  return raw || 'Teen age assurance could not be completed.';
}

export default function ParentTeenVerificationScreen() {
  const { verificationState } = useVerificationContext();
  const [linkedTeenId, setLinkedTeenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedAgeBucket, setConfirmedAgeBucket] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const teenId = await fetchLinkedTeenId();
        if (active) setLinkedTeenId(teenId);
      } catch (cause) {
        if (active) setError(messageForError(cause));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  async function confirmAgeAssurance() {
    if (!linkedTeenId) {
      setError('Connect to the Teen with their private code first.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const result = await confirmLinkedTeenAgeAssurance(linkedTeenId);
      setConfirmed(true);
      setConfirmedAgeBucket(result.age_bucket);
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setSaving(false);
    }
  }

  const guardianVerified = verificationState === 'VERIFIED_GUARDIAN';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#071410', '#12271d', '#120d1c']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>TEEN AGE ASSURANCE</Text>
        <Text style={styles.title}>Confirm age.{`\n`}Not access.</Text>
        <Text style={styles.body}>
          This is a separate verification action. Your Teen keeps ownership of their private account and Bridge sharing controls.
        </Text>

        <View style={styles.boundaryCard}>
          <Text style={styles.boundaryTitle}>What this can do</Text>
          <Text style={styles.boundaryText}>• confirm the age range already declared by your linked Teen</Text>
          <Text style={styles.boundaryText}>• create a minimal assurance receipt</Text>
          <Text style={styles.boundaryText}>• unlock Teen verification when the account is otherwise eligible</Text>
          <Text style={[styles.boundaryTitle, styles.boundaryGap]}>What this cannot do</Text>
          <Text style={styles.boundaryText}>• read their journal, companion conversations, or private account data</Text>
          <Text style={styles.boundaryText}>• turn Bridge into monitoring</Text>
          <Text style={styles.boundaryText}>• create, revoke, or expand what they share through Bridge</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="small" />
        ) : !linkedTeenId ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>No active Teen connection</Text>
            <Text style={styles.statusBody}>Use Parent Link first. Linking creates the trusted relationship only; it does not verify the Teen.</Text>
          </View>
        ) : !guardianVerified ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Guardian verification required</Text>
            <Text style={styles.statusBody}>Your Parent account must be verified before it can confirm a Teen age-assurance receipt.</Text>
          </View>
        ) : confirmed ? (
          <View style={styles.successCard}>
            <Text style={styles.successTitle}>Age assurance confirmed</Text>
            <Text style={styles.successBody}>
              Confirmed age range: {confirmedAgeBucket}. The Teen verification receipt is separate from the Bridge relationship.
            </Text>
          </View>
        ) : (
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Explicit confirmation</Text>
            <Text style={styles.confirmBody}>
              By continuing, you confirm that the age range your linked Teen selected is accurate to the best of your knowledge. No ID image, selfie, full birth date, or Bridge content is collected by this action.
            </Text>
            {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
            <TouchableOpacity
              style={[styles.button, saving && styles.buttonDisabled]}
              disabled={saving}
              onPress={() => void confirmAgeAssurance()}
              accessibilityRole="button"
              accessibilityLabel="Confirm linked Teen age assurance"
            >
              {saving ? <ActivityIndicator size="small" color="#052014" /> : <Text style={styles.buttonText}>Confirm Teen age assurance</Text>}
            </TouchableOpacity>
          </View>
        )}

        {error && (loading || !linkedTeenId || !guardianVerified || confirmed) ? (
          <Text style={styles.error} accessibilityRole="alert">{error}</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071410' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 62 : 42,
    paddingBottom: 120,
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 620, alignSelf: 'center' as const } : {}),
  },
  kicker: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginBottom: 12 },
  title: { color: '#fff', fontSize: 38, lineHeight: 43, fontWeight: '900', marginBottom: 14 },
  body: { color: '#b7c9bf', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  boundaryCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d033', backgroundColor: 'rgba(17,37,28,0.90)', padding: 17, marginBottom: 18 },
  boundaryTitle: { color: '#d1fae5', fontSize: 14, fontWeight: '900', marginBottom: 7 },
  boundaryGap: { marginTop: 14 },
  boundaryText: { color: '#93aa9d', fontSize: 12, lineHeight: 19 },
  statusCard: { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: '#ffffff08', padding: 16 },
  statusTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 6 },
  statusBody: { color: '#91a89b', fontSize: 12, lineHeight: 19 },
  confirmCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d033', backgroundColor: 'rgba(8,25,18,0.94)', padding: 18 },
  confirmTitle: { color: '#d1fae5', fontSize: 15, fontWeight: '900', marginBottom: 8 },
  confirmBody: { color: '#a5baae', fontSize: 12, lineHeight: 19, marginBottom: 16 },
  successCard: { borderRadius: 20, borderWidth: 1, borderColor: '#6ee7b755', backgroundColor: '#123525', padding: 18 },
  successTitle: { color: '#d1fae5', fontSize: 16, fontWeight: '900', marginBottom: 7 },
  successBody: { color: '#a7cbbb', fontSize: 12, lineHeight: 19 },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 18, marginTop: 12, marginBottom: 12 },
  button: { minHeight: 54, borderRadius: 16, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#052014', fontSize: 14, fontWeight: '900' },
});

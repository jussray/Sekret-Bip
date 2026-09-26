import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { ONBOARDING_SIDE_KEY } from '@/services/auth/postAuthBootstrap';

const PARENTAL_CONSENT_EMAIL_KEY = 'bip_parental_consent_parent_email';
const PARENTAL_CONSENT_REQUESTED_AT_KEY = 'bip_parental_consent_requested_at';

const BG = '#0a0a0a';
const TEXT = '#f3f3f5';
const MUTED = '#9b8fac';
const PURPLE = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const WARNING = '#facc15';

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function ParentalConsentRequest() {
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    const email = parentEmail.trim().toLowerCase();
    setError('');

    if (!isValidEmail(email)) {
      setError('Enter a parent or guardian email.');
      return;
    }

    await AsyncStorage.multiSet([
      [PARENTAL_CONSENT_EMAIL_KEY, email],
      [PARENTAL_CONSENT_REQUESTED_AT_KEY, new Date().toISOString()],
      [ONBOARDING_SIDE_KEY, 'parent'],
    ]);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📬</Text>
          <Text style={styles.title}>Parent step saved</Text>
          <Text style={styles.body}>
            No child account was created. A parent or guardian needs to continue from the Parent Space before this path can move forward.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={() => router.replace('/(onboarding)/parent-welcome')}
            accessibilityRole="button"
            accessibilityLabel="Continue to Parent Space"
          >
            <Text style={styles.btnText}>Continue to Parent Space →</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondary}
            onPress={() => router.replace('/(onboarding)/welcome')}
            accessibilityRole="button"
            accessibilityLabel="Back to age screen"
          >
            <Text style={styles.secondaryText}>Back to age screen</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>PARENT OR GUARDIAN REQUIRED</Text>
        <Text style={styles.title}>A grown-up has to start this path.</Text>
        <Text style={styles.body}>
          Bip is for ages 13 and up unless a parent or guardian gives verifiable consent first. We will collect only a parent or guardian email here. No child account, username, password, profile, or private content is collected on this screen.
        </Text>

        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>No child account yet.</Text>
          <Text style={styles.warningText}>
            This request just records the parent contact step on this device so the parent flow can continue. Production launch still needs the approved consent provider/server send wired behind it.
          </Text>
        </View>

        <Text style={styles.label}>Parent or guardian email</Text>
        <TextInput
          style={styles.input}
          placeholder="parent@example.com"
          placeholderTextColor="#6f647d"
          autoCapitalize="none"
          autoComplete="email"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="emailAddress"
          value={parentEmail}
          onChangeText={(value) => {
            setParentEmail(value);
            setError('');
          }}
          accessibilityLabel="Parent or guardian email"
        />
        {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

        <TouchableOpacity
          style={[styles.btn, !parentEmail.trim() && styles.btnDim]}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel="Save parent consent request"
        >
          <Text style={styles.btnText}>Save parent request →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => router.replace('/(onboarding)/welcome')}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.secondaryText}>← Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: Platform.OS === 'ios' ? 70 : 48,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  kicker: {
    color: WARNING,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  emoji: { fontSize: 38, marginBottom: 14 },
  title: {
    color: TEXT,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: 14,
  },
  body: {
    color: MUTED,
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 18,
  },
  warningCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#facc1540',
    backgroundColor: '#facc1512',
    padding: 16,
    marginBottom: 22,
  },
  warningTitle: { color: WARNING, fontSize: 13, fontWeight: '900', marginBottom: 5 },
  warningText: { color: '#d7c783', fontSize: 12, lineHeight: 18 },
  label: { color: TEXT, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ffffff18',
    borderRadius: 12,
    backgroundColor: '#111118',
    color: TEXT,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 8,
  },
  error: { color: '#f87171', fontSize: 12, marginBottom: 8 },
  btn: {
    minHeight: 56,
    borderRadius: 18,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
  },
  btnDim: { backgroundColor: PURPLE_DIM },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '900', textAlign: 'center' },
  secondary: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
  secondaryText: { color: MUTED, fontSize: 13, fontWeight: '800' },
});

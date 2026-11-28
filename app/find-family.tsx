// app/find-family.tsx
//
// Dedicated conversational doorway discovery route.
// Complies with docs/contracts/web-gateway-parent-link.md:
// - Safety & Privacy: Do not collect or require names, contact details, or private family information.
// - Recommendation: Analyzes visitor input to recommend 'parent' (Bip Jr. + Family), 'teen' (Teen space), or 'signin'.
// - Disclaimers: Prominently explains suggestions do not verify age or grant access.

import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { trackAnalyticsEvent } from '@/utils/telemetry';

type Destination = 'teen' | 'parent' | 'signin';

interface Recommendation {
  destination: Destination;
  title: string;
  reason: string;
  targetRoute: string;
  actionLabel: string;
}

export function recommendDestination(description: string): Recommendation {
  const normalized = description.toLowerCase().trim();

  // Explicit sign-in or existing account intent
  if (
    normalized.includes('sign in')
    || normalized.includes('log in')
    || normalized.includes('login')
    || normalized.includes('existing account')
    || normalized.includes('already have')
    || normalized.includes('password')
  ) {
    return {
      destination: 'signin',
      title: 'Sign In to Your Space',
      reason: 'It looks like you already have a Se’kret Bip account. Head over to sign in.',
      targetRoute: '/(auth)/login',
      actionLabel: 'Go to Sign In →',
    };
  }

  // Parent, guardian, young children, or family circle intent
  if (
    normalized.includes('parent')
    || normalized.includes('mom')
    || normalized.includes('dad')
    || normalized.includes('guardian')
    || normalized.includes('child')
    || normalized.includes('kid')
    || normalized.includes('under 13')
    || normalized.includes('family')
    || normalized.includes('bip jr')
    || normalized.includes('jr')
    || normalized.includes('supervise')
    || normalized.includes('monitor')
  ) {
    return {
      destination: 'parent',
      title: 'Bip Jr. + Family',
      reason: 'Designed for parents, guardians, and younger children building a protected family circle with mutual consent.',
      targetRoute: '/(onboarding)/parent-splash',
      actionLabel: 'Continue to Family Setup →',
    };
  }

  // Default: Teen space
  return {
    destination: 'teen',
    title: 'Teen Space',
    reason: 'Designed for teens (13+) looking for private expression, mood tracking, and authentic peer connection.',
    targetRoute: '/(onboarding)/welcome',
    actionLabel: 'Continue to Teen Setup →',
  };
}

export default function FindFamilyRoute() {
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Recommendation | null>(null);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const trimmed = description.trim();
    if (trimmed.length < 5) {
      setError('Please describe what you are looking for in at least 5 characters.');
      return;
    }
    setError('');
    setBusy(true);

    try {
      const rec = recommendDestination(trimmed);
      setResult(rec);
      void trackAnalyticsEvent('gateway_recommendation_requested', {
        destination: rec.destination,
        char_length: trimmed.length,
      });
    } catch {
      setError('Suggestions are unavailable right now. Choose an entry path below.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header / Nav */}
        <View style={styles.header}>
          <Pressable
            testID="find-family-back-button"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back to front door"
          >
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
          <Text style={styles.logoMark}>Se'kret Bip</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title} testID="find-family-title">Find your doorway</Text>
          <Text style={styles.disclaimer} testID="find-family-disclaimer">
            Say what kind of space you need. Don’t include names, contact details, or private family information. Suggestions don’t verify age or grant access.
          </Text>

          <View style={styles.inputWrap}>
            <Text style={styles.inputLabel}>What are you looking for?</Text>
            <TextInput
              testID="find-family-input"
              style={styles.textarea}
              placeholder="e.g. I’m a parent looking for a space for my younger child"
              placeholderTextColor="#6b7280"
              multiline
              numberOfLines={4}
              maxLength={600}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                if (error) setError('');
              }}
              textAlignVertical="top"
            />
          </View>

          {error ? (
            <Text style={styles.errorText} testID="find-family-error" accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <TouchableOpacity
            testID="find-family-submit"
            style={[styles.submitButton, busy && styles.buttonDisabled]}
            disabled={busy}
            onPress={handleSubmit}
            accessibilityRole="button"
            accessibilityLabel="Suggest an entry path"
          >
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.submitButtonText}>Suggest an entry path</Text>
            )}
          </TouchableOpacity>

          {result ? (
            <View style={styles.resultBox} testID="find-family-result" accessibilityLiveRegion="polite">
              <Text style={styles.resultBadge}>Recommended doorway</Text>
              <Text style={styles.resultTitle}>{result.title}</Text>
              <Text style={styles.resultReason}>{result.reason}</Text>
              <TouchableOpacity
                testID="find-family-continue-cta"
                style={styles.resultCta}
                onPress={() => router.push(result.targetRoute as never)}
                accessibilityRole="button"
                accessibilityLabel={result.actionLabel}
              >
                <Text style={styles.resultCtaText}>{result.actionLabel}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.quickLinks}>
            <Text style={styles.quickLinksHeader}>Or choose a setup path directly:</Text>
            <View style={styles.linksRow}>
              <Pressable
                testID="find-family-teen-link"
                onPress={() => router.push('/(onboarding)/welcome')}
                style={({ pressed }) => [styles.pillLink, pressed && styles.pressed]}
              >
                <Text style={styles.pillLinkText}>Teen setup</Text>
              </Pressable>
              <Pressable
                testID="find-family-family-link"
                onPress={() => router.push('/(onboarding)/parent-splash')}
                style={({ pressed }) => [styles.pillLink, pressed && styles.pressed]}
              >
                <Text style={styles.pillLinkText}>Family setup</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 32,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#171717',
  },
  pressed: {
    opacity: 0.7,
  },
  backText: {
    color: '#a78bfa',
    fontSize: 14,
    fontWeight: '600',
  },
  logoMark: {
    color: '#f3f3f5',
    fontSize: 18,
    fontWeight: '800',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#121214',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#26262a',
  },
  title: {
    color: '#f3f3f5',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 8,
  },
  disclaimer: {
    color: '#9ca3af',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  inputWrap: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#e5e7eb',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  textarea: {
    backgroundColor: '#1c1c20',
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 12,
    padding: 12,
    color: '#f3f3f5',
    fontSize: 14,
    minHeight: 96,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  resultBox: {
    backgroundColor: '#1a1829',
    borderColor: '#7c3aed',
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  resultBadge: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  resultTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  resultReason: {
    color: '#d1d5db',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  resultCta: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resultCtaText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickLinks: {
    borderTopWidth: 1,
    borderTopColor: '#26262a',
    paddingTop: 16,
  },
  quickLinksHeader: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 10,
  },
  linksRow: {
    flexDirection: 'row',
    gap: 12,
  },
  pillLink: {
    flex: 1,
    backgroundColor: '#1f1f23',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  pillLinkText: {
    color: '#c4b5fd',
    fontSize: 13,
    fontWeight: '600',
  },
});

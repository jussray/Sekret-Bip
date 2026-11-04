/**
 * Deferred Sign in with Apple surface.
 *
 * The full native implementation is preserved at:
 * `docs/archive/code-snapshots/AppleSignInButton.pre-capability.md`.
 *
 * Do not import `expo-apple-authentication` until the native dependency,
 * Apple capability, Supabase provider, EAS/App Store impact, and device proof
 * are explicitly approved. This inactive component stays compile-safe and
 * fails closed instead of pretending the provider is configured.
 */
import React from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from 'react-native';
import type { Session } from '@supabase/supabase-js';

interface Props {
  onSuccess?: (session: Session) => void;
  onError?: (error: Error) => void;
}

export default function AppleSignInButton(_props: Props) {
  if (Platform.OS !== 'ios') return null;

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: true }}
      accessibilityLabel="Sign in with Apple is not enabled in this build"
      disabled
      style={styles.button}
    >
      <Text style={styles.text}>Sign in with Apple unavailable</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f1f1f',
    opacity: 0.55,
    paddingHorizontal: 16,
  },
  text: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

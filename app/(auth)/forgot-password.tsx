import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import {
  PASSWORD_RECOVERY_PATH,
  buildRecoveryRedirectUrl,
  normalizeRecoveryEmail,
  validateRecoveryEmail,
} from '@/features/auth/passwordRecovery';
import { getSupabase } from '@/utils/supabase';

function recoveryRedirectUrl(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return buildRecoveryRedirectUrl({ webOrigin: window.location.origin });
  }
  return buildRecoveryRedirectUrl({ nativeUrl: Linking.createURL(PASSWORD_RECOVERY_PATH) });
}

function authErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '').toLowerCase();
  }
  return typeof error === 'string' ? error.toLowerCase() : '';
}

function authErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : null;
}

function isRecoveryTimeout(error: unknown): boolean {
  const message = authErrorMessage(error);
  const status = authErrorStatus(error);
  return (
    status === 504 ||
    message.includes('request_timeout') ||
    message.includes('request timeout') ||
    message.includes('request timed out') ||
    message.includes('processing this request timed out') ||
    message.includes('context deadline exceeded') ||
    message.includes('gateway timeout')
  );
}

function readableAuthError(error: unknown): string {
  const message = authErrorMessage(error);
  if (message.includes('rate') || message.includes('too many')) {
    return 'Too many reset requests. Wait a little, then try again.';
  }
  if (isRecoveryTimeout(error)) {
    return 'We could not confirm the reset request. Check your connection and try again.';
  }
  if (message.includes('failed to fetch')) {
    return 'Could not reach the account server. Check your connection and try again.';
  }
  return 'Could not request a reset email right now. Please try again.';
}

export default function ForgotPasswordScreen() {
  const [email, setEmail]     = useState('');
  const [error, setError]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const shakeAnim             = useRef(new Animated.Value(0)).current;

  function shakeCard() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 30, useNativeDriver: true }),
    ]).start();
  }

  function returnToSignIn() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(auth)/login');
  }

  async function handleResetRequest() {
    setError('');
    const validationError = validateRecoveryEmail(email);
    if (validationError) {
      setError(validationError);
      shakeCard();
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError('Auth unavailable. Check the Supabase app configuration.');
      shakeCard();
      return;
    }

    setLoading(true);
    try {
      const { error: resetError } = await sb.auth.resetPasswordForEmail(
        normalizeRecoveryEmail(email),
        { redirectTo: recoveryRedirectUrl() },
      );
      if (resetError) {
        setError(readableAuthError(resetError));
        shakeCard();
        return;
      }
      setSent(true);
    } catch (caught) {
      setError(readableAuthError(caught));
      shakeCard();
    } finally {
      setLoading(false);
    }
  }

  // ─ Sent state ─────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={styles.root}>
        <View style={styles.bgDot1} pointerEvents="none" />
        <View style={styles.bgDot2} pointerEvents="none" />
        <View style={styles.inner}>
          <Text style={styles.sentEmoji}>📬</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            If an account matches that email, a secure reset link is on the way.{'\n'}
            Check spam or junk too.
          </Text>
          <TouchableOpacity
            style={styles.btn}
            onPress={returnToSignIn}
            accessibilityRole="button"
            accessibilityLabel="Back to Sign In"
          >
            <Text style={styles.btnText}>Back to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => { setSent(false); setError(''); }}
            style={styles.linkBtn}
            accessibilityRole="link"
            accessibilityLabel="Try another email or resend"
          >
            <Text style={styles.linkText}>Try another email or resend</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─ Form ───────────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.bgDot1} pointerEvents="none" />
      <View style={styles.bgDot2} pointerEvents="none" />

      <Animated.View style={[styles.inner, { transform: [{ translateX: shakeAnim }] }]}>
        {/* Logo */}
        <View style={styles.logoWrap}>
          <Text style={styles.logoMark}>Bip</Text>
          <Text style={styles.logoHeart}>💜</Text>
        </View>
        <Text style={styles.wordmark}>Se'kret Bip</Text>

        <Text style={styles.title}>Forgot password?</Text>
        <Text style={styles.body}>
          Enter the email connected to your account and we'll send a secure reset link.
        </Text>

        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Email address"
            placeholderTextColor="#666"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            editable={!loading}
            onChangeText={v => { setEmail(v); setError(''); }}
            onSubmitEditing={handleResetRequest}
            returnKeyType="send"
            accessibilityLabel="Account email"
          />
        </View>

        {error ? (
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, (loading || !email) && styles.btnDim]}
          onPress={handleResetRequest}
          disabled={loading}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Send password reset email"
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Send Reset Link</Text>
          }
        </TouchableOpacity>

        <TouchableOpacity
          onPress={returnToSignIn}
          style={styles.linkBtn}
          accessibilityRole="link"
          accessibilityLabel="Back to Sign In"
        >
          <Text style={styles.linkText}>← Back to Sign In</Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const BORDER     = '#1e1e2a';
const TEXT       = '#f3f3f5';
const MUTED      = '#888';

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: BG,
    alignItems: 'center', justifyContent: 'center',
  },
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
  inner: {
    width: '100%', maxWidth: 380,
    paddingHorizontal: 32, paddingVertical: 48,
    alignItems: 'center',
  },
  logoWrap: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: PURPLE_DIM,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 18, elevation: 12,
  },
  logoMark:  { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  logoHeart: { fontSize: 11, position: 'absolute', bottom: 8, right: 9 },
  wordmark:  { color: TEXT, fontSize: 22, fontWeight: '800', letterSpacing: -0.3, marginBottom: 24 },
  sentEmoji: { fontSize: 52, marginBottom: 16 },
  title:     { color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  body:      { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 24 },
  inputWrap: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    backgroundColor: '#16161e', marginBottom: 8, overflow: 'hidden',
  },
  input: {
    flex: 1, paddingVertical: 15, paddingHorizontal: 16,
    color: TEXT, fontSize: 15,
  },
  errorText: {
    color: '#f87171', fontSize: 12,
    alignSelf: 'flex-start', marginBottom: 8, marginLeft: 2,
  },
  btn: {
    width: '100%', backgroundColor: PURPLE, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
    marginTop: 6, marginBottom: 18,
    shadowColor: PURPLE, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  btnDim:   { backgroundColor: PURPLE_DIM, shadowOpacity: 0 },
  btnText:  { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  linkBtn:  { paddingVertical: 8 },
  linkText: { color: '#a78bfa', fontSize: 14, fontWeight: '600' },
});
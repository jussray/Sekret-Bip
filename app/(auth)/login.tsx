// app/(auth)/login.tsx
//
// Instagram-model login screen.
// ─ Wordmark-only logo (no icon box, no glow blobs)
// ─ Clean thin-border inputs, solid CTA, OR divider, Sign up switch
// ─ All Supabase auth logic, shake animation, and error handling preserved.

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Animated,
  Pressable,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { useVerificationContext } from '@/context/VerificationContext';
import type { AccountSide } from '@/features/identity/accountProfile';
import {
  clearEmailConfirmationUrl,
  parseEmailConfirmationUrl,
} from '@/features/auth/emailConfirmation';
import { fetchPostAuthBootstrap } from '@/services/auth/postAuthBootstrap';
import { getSupabase } from '@/utils/supabase';

function authErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}

function isAuthTransportError(error: unknown): boolean {
  const message = authErrorMessage(error).toLowerCase();
  return (
    message.includes('failed to fetch')
    || message.includes('network request failed')
    || message.includes('load failed')
    || message.includes('request timeout')
    || message.includes('request timed out')
    || message.includes('context deadline exceeded')
    || message.includes('gateway timeout')
  );
}

function readableAuthError(error: unknown): string {
  if (isAuthTransportError(error)) {
    return 'Could not reach the account server. Check your connection and try again.';
  }
  const message = authErrorMessage(error);
  if (message) return message;
  return 'Something went wrong while signing in. Please try again.';
}

function normalizeSide(value: string | undefined): AccountSide | undefined {
  return value === 'parent' || value === 'teen' ? value : undefined;
}

function authRoute(path: '/(auth)/signup' | '/(auth)/login', side?: AccountSide): string {
  return side ? `${path}?side=${side}` : path;
}

export default function LoginScreen() {
  const params = useLocalSearchParams<{ passwordReset?: string; emailConfirmed?: string; side?: string }>();
  const passwordReset = params.passwordReset === '1';
  const emailConfirmed = params.emailConfirmed === '1';
  const preferredSide = normalizeSide(params.side);
  const { refreshVerification } = useVerificationContext();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [pwVisible, setPwVisible] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const confirmationHandled = useRef(false);

  function shakeCard() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   6, duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -6, duration: 40,  useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 30,  useNativeDriver: true }),
    ]).start();
  }

  useEffect(() => {
    if (!emailConfirmed || confirmationHandled.current) return;
    confirmationHandled.current = true;

    const sb = getSupabase();
    if (!sb) return;
    const supabase = sb;

    let active = true;
    let routed = false;

    async function restoreConfirmedSession(url: string | null) {
      if (!active || routed) return;

      try {
        if (Platform.OS !== 'web') {
          const parsed = parseEmailConfirmationUrl(url);
          if (parsed.kind === 'error') {
            setError(parsed.message);
            return;
          }

          if (parsed.kind === 'tokens') {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: parsed.accessToken,
              refresh_token: parsed.refreshToken,
            });
            if (sessionError) return;
          }
        }

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!active || !session?.user || session.user.is_anonymous) return;

        const bootstrap = await fetchPostAuthBootstrap(preferredSide);
        await refreshVerification();
        if (!active || routed) return;

        routed = true;
        clearEmailConfirmationUrl();
        router.replace(bootstrap.nextRoute as never);
      } catch {
        if (active) {
          setError('We could not finish confirming your email. You can sign in manually or request a new confirmation link.');
        }
      }
    }

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void restoreConfirmedSession(url);
    });

    void (async () => {
      const initialUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.href
        : await Linking.getInitialURL();
      await restoreConfirmedSession(initialUrl);
    })();

    return () => {
      active = false;
      linkSubscription.remove();
    };
  }, [emailConfirmed, preferredSide, refreshVerification]);

  async function handleSignIn() {
    setError('');
    const e = email.trim();
    const p = password;
    if (!e || !p) {
      setError('Email and password are required.');
      shakeCard();
      return;
    }

    setLoading(true);
    const sb = getSupabase();
    if (!sb) {
      setError('Auth unavailable. Check the Supabase app configuration.');
      setLoading(false);
      return;
    }

    try {
      const { error: authErr } = await sb.auth.signInWithPassword({ email: e, password: p });
      if (authErr) {
        setError(readableAuthError(authErr));
        shakeCard();
        return;
      }
      const bootstrap = await fetchPostAuthBootstrap(preferredSide);
      await refreshVerification();
      router.replace(bootstrap.nextRoute as never);
    } catch (caught) {
      setError(readableAuthError(caught));
      shakeCard();
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={[s.card, { transform: [{ translateX: shakeAnim }] }]}>

        {/* ── Wordmark logo — no icon box, no glow ── */}
        <View style={s.logoArea}>
          <Text style={s.wordmark}>Se'kret Bip</Text>
          <Text style={s.heart}>♡</Text>
        </View>

        <Text style={s.tagline}>sign in to continue</Text>

        {/* Password-reset success banner */}
        {passwordReset ? (
          <View style={s.successBanner}>
            <Text style={s.successBannerText}>
              Password updated — sign in with your new password.
            </Text>
          </View>
        ) : null}

        {/* Email */}
        <View style={[s.inputWrap, error && !email ? s.inputError : null]}>
          <TextInput
            style={s.input}
            placeholder="Phone number, username or email"
            placeholderTextColor={MUTED}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            editable={!loading}
            onChangeText={t => { setEmail(t); setError(''); }}
            accessibilityLabel="Email"
          />
        </View>

        {/* Password */}
        <View style={[s.inputWrap, { marginBottom: 6 }]}>
          <TextInput
            style={[s.input, { paddingRight: 52 }]}
            placeholder="Password"
            placeholderTextColor={MUTED}
            secureTextEntry={!pwVisible}
            autoComplete="current-password"
            textContentType="password"
            value={password}
            editable={!loading}
            onChangeText={t => { setPassword(t); setError(''); }}
            onSubmitEditing={handleSignIn}
            returnKeyType="go"
            accessibilityLabel="Password"
          />
          <Pressable
            style={s.eyeBtn}
            onPress={() => setPwVisible(v => !v)}
            accessibilityLabel={pwVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={s.eyeText}>{pwVisible ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Inline error */}
        {error ? (
          <Text style={s.errorText} accessibilityRole="alert">{error}</Text>
        ) : null}

        {/* Forgot password */}
        <TouchableOpacity
          onPress={() => router.push('/(auth)/forgot-password')}
          style={s.forgotRow}
          accessibilityRole="link"
          accessibilityLabel="Forgot password"
        >
          <Text style={s.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        {/* Primary CTA — solid fill, no glow shadow */}
        <TouchableOpacity
          style={[s.btn, (loading || !email || !password) && s.btnDim]}
          onPress={handleSignIn}
          disabled={loading}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Log in"
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={s.btnText}>Log in</Text>
          }
        </TouchableOpacity>

        {/* OR divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>OR</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Switch to signup */}
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Don't have an account?</Text>
          <TouchableOpacity
            onPress={() => router.push(authRoute('/(auth)/signup', preferredSide) as never)}
            accessibilityRole="link"
            accessibilityLabel="Sign up"
          >
            <Text style={s.switchCta}>{' '}Sign up.</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─── Design tokens ────────────────────────────────────────────────────────
const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const BORDER     = '#2a2a35';   // slightly lighter than old — clean, not muddy
const TEXT       = '#f3f3f5';
const MUTED      = '#666';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    // No decorative blobs — background is clean, flat dark.
  },

  card: {
    width: '100%',
    maxWidth: 380,
    paddingHorizontal: 32,
    paddingTop: 52,
    paddingBottom: 32,
    alignItems: 'center',
  },

  // ── Wordmark-only logo area — Instagram puts its logotype here, no box ──
  logoArea: {
    alignItems: 'center',
    marginBottom: 28,
  },
  wordmark: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 36,
  },
  heart: {
    color: PURPLE,
    fontSize: 18,
    marginTop: 2,
  },

  tagline: {
    color: MUTED,
    fontSize: 13,
    marginBottom: 28,
    letterSpacing: 0.2,
  },

  successBanner: {
    width: '100%',
    backgroundColor: '#12101a',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  successBannerText: {
    color: '#c4b5fd',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  // ── Inputs: thin border, transparent background, Instagram-clean ──────
  inputWrap: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#111118',
    marginBottom: 12,
    overflow: 'hidden',
  },
  inputError: { borderColor: '#ef4444' },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { fontSize: 16 },

  errorText: {
    color: '#f87171',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 6,
    marginLeft: 2,
  },

  forgotRow: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },

  // ── CTA button: solid fill, no glow shadow ─────────────────────────────
  btn: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 20,
    // No shadowColor / shadowOpacity — solid, not glowing.
  },
  btnDim: { backgroundColor: PURPLE_DIM },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },

  // ── OR divider ─────────────────────────────────────────────────────────
  dividerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: BORDER },
  dividerText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: '600',
    marginHorizontal: 12,
    letterSpacing: 1.2,
  },

  // ── Switch to signup ──────────────────────────────────────────────────
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: MUTED, fontSize: 14 },
  switchCta: { color: '#a78bfa', fontSize: 14, fontWeight: '700' },
});

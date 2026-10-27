// app/(auth)/signup.tsx
//
// Instagram-model signup screen — 3-step progressive card.
// ─ Wordmark-only logo (no icon box, no glow blobs)
// ─ Clean thin-border inputs, solid CTA, step progress dots
// ─ Step 0: email + password  |  Step 1: username  |  Step 2: review + submit
// ─ All Supabase auth logic, anonymous upgrade, ambiguous-error recovery preserved.

import React, { useState, useRef, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useVerificationContext } from '@/context/VerificationContext';
import type { AccountSide } from '@/features/identity/accountProfile';
import { buildEmailConfirmationRedirectUrl } from '@/features/auth/emailConfirmation';
import {
  fetchPostAuthBootstrap,
  ONBOARDING_SIDE_KEY,
} from '@/services/auth/postAuthBootstrap';
import { getSupabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Error helpers ────────────────────────────────────────────────────────
function authErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
}

function authErrorStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object' || !('status' in error)) return null;
  const status = Number((error as { status?: unknown }).status);
  return Number.isFinite(status) ? status : null;
}

function isAmbiguousSignupError(error: unknown): boolean {
  if (authErrorStatus(error) === 504) return true;
  const msg = authErrorMessage(error).toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('request timeout') ||
    msg.includes('request timed out') ||
    msg.includes('processing this request timed out') ||
    msg.includes('context deadline exceeded') ||
    msg.includes('gateway timeout') ||
    msg.includes('504')
  );
}

function isConfirmationPendingError(error: unknown): boolean {
  const msg = authErrorMessage(error).toLowerCase();
  return (
    msg.includes('email not confirmed') ||
    msg.includes('email_not_confirmed') ||
    (msg.includes('confirmation') && msg.includes('pending'))
  );
}

function hasAuthServerResponse(error: unknown): boolean {
  const status = authErrorStatus(error);
  return status !== null && status >= 400;
}

function readableAuthError(error: unknown): string {
  if (isAmbiguousSignupError(error)) {
    if (hasAuthServerResponse(error)) {
      return 'The account server took too long to answer. Your account may still have been created, so check your email before trying again.';
    }
    return 'We could not reach the account server. Check your connection and try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return 'Something went wrong while creating your account. Please try again.';
}

function normalizeSide(value: string | undefined): AccountSide {
  return value === 'parent' ? 'parent' : 'teen';
}

type SignupMetadata = Readonly<{
  account_side: AccountSide;
  username: string;
  signup_source: 'sekret-bip';
}>;

function buildSignupMetadata(side: AccountSide, username: string): SignupMetadata {
  return {
    account_side: side,
    username: username.trim(),
    signup_source: 'sekret-bip',
  };
}

function loginRoute(side: AccountSide): string {
  return `/(auth)/login?side=${side}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SIGNUP_RECOVERY_DELAY_MS = 750;
const STEPS = 3; // 0: email+pw  1: username  2: review

export default function SignupScreen() {
  const params = useLocalSearchParams<{ side?: string }>();
  const preferredSide = normalizeSide(params.side);
  const { refreshVerification } = useVerificationContext();

  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [username, setUsername]   = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [cfVisible, setCfVisible] = useState(false);

  const [step, setStep]           = useState(0);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const SCREEN_W  = 380;

  function animateToStep(nextStep: number) {
    const direction = nextStep > step ? 1 : -1;
    slideAnim.setValue(direction * SCREEN_W);
    Animated.spring(slideAnim, {
      toValue: 0,
      damping: 22,
      stiffness: 220,
      useNativeDriver: true,
    }).start();
    setStep(nextStep);
    setError('');
  }

  function shakeCard() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue:  10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:  -6, duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue:   0, duration: 30, useNativeDriver: true }),
    ]).start();
  }

  // ─── Auth helpers ───────────────────────────────────────────────────────
  const finishAuthenticatedSignup = useCallback(async (_userId: string) => {
    await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, preferredSide);
    const bootstrap = await fetchPostAuthBootstrap(preferredSide);
    await refreshVerification();
    router.replace(bootstrap.nextRoute as never);
  }, [preferredSide, refreshVerification]);

  function showConfirmationSuccess(message?: string) {
    setSuccessMessage(
      message ?? `We sent a confirmation link to ${email.trim()}.\nOpen it, then come back and sign in.`,
    );
    setSuccess(true);
  }

  async function recoverAmbiguousSignup(
    sb: NonNullable<ReturnType<typeof getSupabase>>,
    signupEmail: string,
    signupPassword: string,
    metadata: SignupMetadata,
    redirectTo: string,
    initialError: unknown,
  ): Promise<boolean> {
    await delay(SIGNUP_RECOVERY_DELAY_MS);
    const initialSignupReachedAuth = hasAuthServerResponse(initialError);
    try {
      const { data: signInData, error: signInError } =
        await sb.auth.signInWithPassword({ email: signupEmail, password: signupPassword });
      if (signInData.session?.user) {
        await finishAuthenticatedSignup(signInData.session.user.id);
        return true;
      }
      if (isConfirmationPendingError(signInError)) {
        showConfirmationSuccess(
          `Your account was created, but email confirmation is still pending for ${signupEmail}.\nCheck your inbox, then come back and sign in.`,
        );
        return true;
      }
    } catch (probeError) {
      if (!isAmbiguousSignupError(probeError)) return false;
    }

    // A real HTTP response means Auth received the first signup. Never submit
    // signUp again here: duplicate submissions can emit duplicate confirmation
    // emails and consume the project-wide email-send quota.
    if (initialSignupReachedAuth) {
      showConfirmationSuccess(
        `The account server received your signup request, but confirmation is delayed for ${signupEmail}.\nCheck your inbox before trying again.`,
      );
      return true;
    }

    // Only a transport failure with no Auth response may retry signup once.
    let retryThrown: unknown = null;
    try {
      const { data: retryData, error: retryError } = await sb.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: { emailRedirectTo: redirectTo, data: metadata },
      });
      if (!retryError) {
        if (retryData.session?.user) {
          await finishAuthenticatedSignup(retryData.session.user.id);
        } else {
          showConfirmationSuccess();
        }
        return true;
      }
      if (isConfirmationPendingError(retryError)) {
        showConfirmationSuccess(
          `Your account was created, but email confirmation is still pending for ${signupEmail}.\nCheck your inbox, then come back and sign in.`,
        );
        return true;
      }
      if (isAmbiguousSignupError(retryError) && hasAuthServerResponse(retryError)) {
        showConfirmationSuccess(
          `The account server received your signup request, but confirmation is delayed for ${signupEmail}.\nCheck your inbox before trying again.`,
        );
        return true;
      }
    } catch (retryError) {
      retryThrown = retryError;
      console.warn('[signup] retry failed after ambiguous transport response');
    }

    if (isAmbiguousSignupError(retryThrown) && hasAuthServerResponse(retryThrown)) {
      showConfirmationSuccess(
        `The account server received your signup request, but confirmation is delayed for ${signupEmail}.\nCheck your inbox before trying again.`,
      );
      return true;
    }
    return false;
  }

  function handleNextStep0() {
    setError('');
    const e = email.trim();
    const p = password;
    if (!e) { setError('Enter your email address.'); shakeCard(); return; }
    if (p.length < 8) { setError('Password must be at least 8 characters.'); shakeCard(); return; }
    if (p !== confirm) { setError("Passwords don't match."); shakeCard(); return; }
    animateToStep(1);
  }

  function handleNextStep1() {
    setError('');
    const u = username.trim();
    if (!u) { setError('Pick a username.'); shakeCard(); return; }
    if (u.length < 3) { setError('Username must be at least 3 characters.'); shakeCard(); return; }
    if (!/^[a-zA-Z0-9_.]+$/.test(u)) {
      setError('Letters, numbers, . and _ only.');
      shakeCard();
      return;
    }
    animateToStep(2);
  }

  async function handleSignUp() {
    setError('');
    const e = email.trim();
    const p = password;
    const metadata = buildSignupMetadata(preferredSide, username);

    setLoading(true);
    const sb = getSupabase();

    if (__DEV__) {
      console.log('[signup] sb=', sb ? 'ok' : 'NULL — check EXPO_PUBLIC_SUPABASE_URL/ANON_KEY');
    }

    if (!sb) {
      setError('Auth unavailable. Check the Supabase app configuration.');
      setLoading(false);
      return;
    }

    const redirectTo = buildEmailConfirmationRedirectUrl(preferredSide);

    try {
      await AsyncStorage.setItem(ONBOARDING_SIDE_KEY, preferredSide);
      const { data: sessionData, error: sessionError } = await sb.auth.getSession();
      if (sessionError) { setError(sessionError.message); return; }

      const currentUser = sessionData.session?.user;
      const isAnonymous = Boolean(currentUser?.is_anonymous);

      if (isAnonymous) {
        const { data: refreshed0, error: refreshErr0 } = await sb.auth.getUser();
        if (refreshErr0 || !refreshed0.user?.is_anonymous) {
          await sb.auth.signOut();
        } else {
          const { error: upgradeError } = await sb.auth.updateUser(
            {
              email: e,
              password: p,
              data: metadata,
            },
            { emailRedirectTo: redirectTo },
          );
          if (upgradeError) {
            if (isAmbiguousSignupError(upgradeError)) {
              const recovered = await recoverAmbiguousSignup(sb, e, p, metadata, redirectTo, upgradeError);
              if (recovered) return;
            }
            const msg = upgradeError.message.toLowerCase();
            const emailExists =
              msg.includes('already registered') || msg.includes('already exists') ||
              msg.includes('duplicate') || msg.includes('email address is already');
            if (emailExists) {
              setError('That email already has a Bip account. Sign in instead.');
              return;
            }
            setError(readableAuthError(upgradeError));
            return;
          }
          const { data: refreshed, error: refreshError } = await sb.auth.getSession();
          if (
            !refreshError
            && refreshed.session?.user
            && !refreshed.session.user.is_anonymous
            && Boolean(refreshed.session.user.email_confirmed_at)
          ) {
            await finishAuthenticatedSignup(refreshed.session.user.id);
          } else {
            showConfirmationSuccess();
          }
          return;
        }
      }

      const { data: signUpData, error: authErr } = await sb.auth.signUp({
        email: e,
        password: p,
        options: { emailRedirectTo: redirectTo, data: metadata },
      });
      if (authErr) {
        if (isAmbiguousSignupError(authErr)) {
          const recovered = await recoverAmbiguousSignup(sb, e, p, metadata, redirectTo, authErr);
          if (recovered) return;
        }
        setError(readableAuthError(authErr));
        shakeCard();
        return;
      }

      if (signUpData.session) {
        await finishAuthenticatedSignup(signUpData.session.user.id);
      } else {
        showConfirmationSuccess();
      }
    } catch (caught) {
      if (isAmbiguousSignupError(caught)) {
        const sb2 = getSupabase();
        if (sb2) {
          const recovered = await recoverAmbiguousSignup(sb2, e, p, metadata, redirectTo, caught);
          if (recovered) return;
        }
      }
      setError(readableAuthError(caught));
      shakeCard();
    } finally {
      setLoading(false);
    }
  }

  // ─── Success screen ───────────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.root}>
        <View style={s.successCard}>
          <Text style={s.successEmoji}>📬</Text>
          <Text style={s.successTitle}>Check your email</Text>
          <Text style={s.successBody}>{successMessage}</Text>
          <TouchableOpacity
            style={s.btn}
            onPress={() => router.replace(loginRoute(preferredSide) as never)}
            accessibilityRole="button"
            accessibilityLabel="Go to Sign In"
          >
            <Text style={s.btnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const STEP_LABELS = ['Account', 'Username', 'Done'];

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Wordmark-only logo — no icon box, no glow blobs ── */}
        <View style={s.logoArea}>
          <Text style={s.wordmark}>Se'kret Bip</Text>
          <Text style={s.heart}>♡</Text>
        </View>

        <Text style={s.tagline}>
          {preferredSide === 'parent' ? 'create your Parent Space' : 'create your space'}
        </Text>

        {/* Step progress dots */}
        <View style={s.dotsRow}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View key={i} style={[s.dot, i === step && s.dotActive]} />
          ))}
        </View>
        <Text style={s.stepLabel}>{STEP_LABELS[step]}</Text>

        {/* Animated step content */}
        <Animated.View style={[
          s.stepContent,
          { transform: [{ translateX: slideAnim }, { translateX: shakeAnim }] },
        ]}>

          {/* ── Step 0: email + password ── */}
          {step === 0 && (
            <View style={s.stepInner}>
              <View style={s.inputWrap}>
                <TextInput
                  style={s.input}
                  placeholder="Email address"
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
              <View style={[s.inputWrap, { marginBottom: 12 }]}>
                <TextInput
                  style={[s.input, { paddingRight: 52 }]}
                  placeholder="Password (8+ characters)"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!pwVisible}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={password}
                  editable={!loading}
                  onChangeText={t => { setPassword(t); setError(''); }}
                  accessibilityLabel="Password"
                />
                <Pressable
                  style={s.eyeBtn}
                  onPress={() => setPwVisible(v => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={pwVisible ? 'Hide password' : 'Show password'}
                >
                  <Text style={s.eyeText}>{pwVisible ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>
              <View style={[s.inputWrap, { marginBottom: 4 }]}>
                <TextInput
                  style={[s.input, { paddingRight: 52 }]}
                  placeholder="Confirm password"
                  placeholderTextColor={MUTED}
                  secureTextEntry={!cfVisible}
                  autoComplete="new-password"
                  textContentType="newPassword"
                  value={confirm}
                  editable={!loading}
                  onChangeText={t => { setConfirm(t); setError(''); }}
                  onSubmitEditing={handleNextStep0}
                  returnKeyType="next"
                  accessibilityLabel="Confirm password"
                />
                <Pressable
                  style={s.eyeBtn}
                  onPress={() => setCfVisible(v => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={cfVisible ? 'Hide password confirmation' : 'Show password confirmation'}
                >
                  <Text style={s.eyeText}>{cfVisible ? '🙈' : '👁'}</Text>
                </Pressable>
              </View>

              {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}

              <TouchableOpacity
                style={[s.btn, (!email || password.length < 8) && s.btnDim]}
                onPress={handleNextStep0}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Next"
              >
                <Text style={s.btnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 1: username ── */}
          {step === 1 && (
            <View style={s.stepInner}>
              <Text style={s.stepHint}>Choose a username people will know you by.</Text>
              <View style={[s.inputWrap, { marginBottom: 4 }]}>
                <Text style={s.atSign}>@</Text>
                <TextInput
                  style={[s.input, { paddingLeft: 4 }]}
                  placeholder="username"
                  placeholderTextColor={MUTED}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  value={username}
                  editable={!loading}
                  onChangeText={t => { setUsername(t.toLowerCase().replace(/[^a-z0-9_.]/g, '')); setError(''); }}
                  onSubmitEditing={handleNextStep1}
                  returnKeyType="next"
                  accessibilityLabel="Username"
                />
              </View>

              {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}

              <TouchableOpacity
                style={[s.btn, username.length < 3 && s.btnDim]}
                onPress={handleNextStep1}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Next"
              >
                <Text style={s.btnText}>Next</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.backBtn}
                onPress={() => animateToStep(0)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Step 2: review + submit ── */}
          {step === 2 && (
            <View style={s.stepInner}>
              <Text style={s.stepHint}>You're almost in 🎉</Text>

              <View style={s.reviewCard}>
                <ReviewRow label="Email"    value={email.trim()} />
                <ReviewRow label="Username" value={`@${username.trim()}`} />
                <ReviewRow label="Account"  value={preferredSide === 'parent' ? 'Parent Space' : 'Teen Space'} />
              </View>

              {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}

              <TouchableOpacity
                style={[s.btn, loading && s.btnDim]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="Create Account"
              >
                {loading
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={s.btnText}>Create account</Text>
                }
              </TouchableOpacity>

              <TouchableOpacity
                style={s.backBtn}
                onPress={() => animateToStep(1)}
                disabled={loading}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Text style={s.backText}>← Back</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Switch to login */}
        <View style={s.switchRow}>
          <Text style={s.switchLabel}>Have an account?</Text>
          <TouchableOpacity
            onPress={() => router.replace(loginRoute(preferredSide) as never)}
            accessibilityRole="link"
            accessibilityLabel="Sign in"
          >
            <Text style={s.switchCta}>{' '}Log in.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={rr.row}>
      <Text style={rr.label}>{label}</Text>
      <Text style={rr.value}>{value}</Text>
    </View>
  );
}

const rr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a35',
  },
  label: { color: '#666', fontSize: 13 },
  value: { color: '#f3f3f5', fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});

// ─── Design tokens ────────────────────────────────────────────────────────
const PURPLE     = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG         = '#0a0a0a';
const BORDER     = '#2a2a35';
const TEXT       = '#f3f3f5';
const MUTED      = '#666';

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },

  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
    // No decorative blobs — background is clean flat dark.
  },

  // ── Wordmark-only logo area ────────────────────────────────────────────
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
    marginBottom: 20,
    letterSpacing: 0.2,
  },

  // ── Step progress dots ─────────────────────────────────────────────────
  dotsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  dot: {
    width: 7, height: 7,
    borderRadius: 4,
    backgroundColor: '#2a2a3a',
  },
  dotActive: { backgroundColor: PURPLE, width: 22 },
  stepLabel: {
    color: MUTED,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 24,
  },

  stepContent: { width: '100%' },
  stepInner:   { width: '100%' },

  stepHint: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },

  // ── Inputs ─────────────────────────────────────────────────────────────
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
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
  },
  atSign: {
    color: MUTED,
    fontSize: 18,
    paddingLeft: 14,
    paddingRight: 2,
    fontWeight: '600',
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 14 },
  eyeText: { fontSize: 16 },

  errorText: {
    color: '#f87171',
    fontSize: 12,
    alignSelf: 'flex-start',
    marginBottom: 8,
    marginLeft: 2,
  },

  // ── CTA button — solid fill, no glow ──────────────────────────────────
  btn: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 14,
    // No shadowColor / shadowOpacity.
  },
  btnDim: { backgroundColor: PURPLE_DIM },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },

  backBtn: { alignSelf: 'center', paddingVertical: 8 },
  backText: { color: MUTED, fontSize: 13 },

  reviewCard: {
    width: '100%',
    backgroundColor: '#111118',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },

  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  switchLabel: { color: MUTED, fontSize: 14 },
  switchCta: { color: '#a78bfa', fontSize: 14, fontWeight: '700' },

  // Success
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  successEmoji: { fontSize: 52, marginBottom: 16 },
  successTitle: { color: TEXT, fontSize: 22, fontWeight: '700', marginBottom: 12 },
  successBody: {
    color: MUTED,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 36,
  },
});
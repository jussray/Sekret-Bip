import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
  isRecoveryCredential,
  parseRecoveryUrl,
  validateNewPassword,
} from '@/features/auth/passwordRecovery';
import { getSupabase } from '@/utils/supabase';

type RecoveryState = 'checking' | 'ready' | 'invalid';

function readableAuthError(error: unknown): string {
  if (error instanceof TypeError && error.message.toLowerCase().includes('failed to fetch')) {
    return 'Could not reach the account server. Check your connection and try again.';
  }
  return 'Could not update your password. Please request a new reset link.';
}

function scrubRecoveryUrl() {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.history.replaceState({}, document.title, PASSWORD_RECOVERY_PATH);
}

export default function ResetPasswordScreen() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [error, setError]         = useState('');
  const [recoveryState, setRecoveryState] = useState<RecoveryState>('checking');
  const [loading, setLoading]     = useState(false);
  const [pwVisible, setPwVisible] = useState(false);
  const [cfVisible, setCfVisible] = useState(false);
  const shakeAnim                 = useRef(new Animated.Value(0)).current;

  function shakeCard() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6,   duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6,  duration: 40, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0,   duration: 30, useNativeDriver: true }),
    ]).start();
  }

  // ─ Recovery link acceptance (unchanged logic) ──────────────────────────────
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) {
      setRecoveryState('invalid');
      setError('Auth unavailable. Check the Supabase app configuration.');
      return;
    }
    const supabase = sb;

    let active = true;
    let recoveryAccepted = false;

    function markReady() {
      if (!active) return;
      recoveryAccepted = true;
      setError('');
      setRecoveryState('ready');
      scrubRecoveryUrl();
    }

    function markInvalid(message: string) {
      if (!active || recoveryAccepted) return;
      setRecoveryState('invalid');
      setError(message);
    }

    async function acceptRecoveryUrl(url: string | null) {
      const parsed = parseRecoveryUrl(url);
      if (parsed.kind === 'error') { markInvalid(parsed.message); return; }
      if (parsed.kind === 'missing') { markInvalid('This reset link is missing or expired. Request a new one.'); return; }
      if (!isRecoveryCredential(parsed)) { markInvalid('This link is not a password-recovery link. Request a new one.'); return; }

      try {
        if (parsed.kind === 'tokens') {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: parsed.accessToken,
            refresh_token: parsed.refreshToken,
          });
          if (sessionError) { markInvalid('This reset link is invalid or expired. Request a new one.'); return; }
          markReady();
          return;
        }
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(parsed.code);
        if (exchangeError) { markInvalid('This reset link is invalid or expired. Request a new one.'); return; }
        markReady();
      } catch (caught) {
        markInvalid(readableAuthError(caught));
      }
    }

    const authSubscription = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') markReady();
    }).data.subscription;

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void acceptRecoveryUrl(url);
    });

    void (async () => {
      const initialUrl = Platform.OS === 'web' && typeof window !== 'undefined'
        ? window.location.href
        : await Linking.getInitialURL();
      await acceptRecoveryUrl(initialUrl);
    })();

    return () => {
      active = false;
      authSubscription.unsubscribe();
      linkSubscription.remove();
    };
  }, []);

  // ─ Submit ──────────────────────────────────────────────────────────────────
  async function handleUpdatePassword() {
    setError('');
    if (recoveryState !== 'ready') {
      setError('This reset link is missing or expired. Request a new one.');
      shakeCard();
      return;
    }

    const validationError = validateNewPassword(password, confirm);
    if (validationError) {
      setError(validationError);
      shakeCard();
      return;
    }

    const sb = getSupabase();
    if (!sb) {
      setError('Auth unavailable. Check the Supabase app configuration.');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await sb.auth.updateUser({ password });
      if (updateError) { setError(readableAuthError(updateError)); return; }

      const { error: signOutError } = await sb.auth.signOut();
      if (signOutError) {
        setError('Your password changed, but the recovery session could not close. Restart the app, then sign in with the new password.');
        return;
      }

      setPassword('');
      setConfirm('');
      router.replace('/(auth)/login?passwordReset=1');
    } catch (caught) {
      setError(readableAuthError(caught));
      shakeCard();
    } finally {
      setLoading(false);
    }
  }

  const ready    = recoveryState === 'ready';
  const checking = recoveryState === 'checking';

  // ─ Render ─────────────────────────────────────────────────────────────────
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

        <Text style={styles.title}>New password</Text>
        <Text style={styles.body}>
          {ready
            ? 'Use at least 8 characters. Your recovery session closes after the change.'
            : checking
              ? 'Opening your secure reset link…'
              : 'That reset link cannot be used.'}
        </Text>

        {checking ? (
          <ActivityIndicator color="#a78bfa" style={{ marginBottom: 20 }} />
        ) : null}

        {/* New password */}
        <View style={[styles.inputWrap, !ready && styles.inputDisabled]}>
          <TextInput
            style={[styles.input, { paddingRight: 52 }]}
            placeholder="New password"
            placeholderTextColor="#666"
            secureTextEntry={!pwVisible}
            autoComplete="new-password"
            textContentType="newPassword"
            value={password}
            editable={ready && !loading}
            onChangeText={v => { setPassword(v); setError(''); }}
            accessibilityLabel="New password"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setPwVisible(v => !v)}
            disabled={!ready}
            accessibilityLabel={pwVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.eyeText}>{pwVisible ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {/* Confirm password */}
        <View style={[styles.inputWrap, { marginBottom: 6 }, !ready && styles.inputDisabled]}>
          <TextInput
            style={[styles.input, { paddingRight: 52 }]}
            placeholder="Confirm new password"
            placeholderTextColor="#666"
            secureTextEntry={!cfVisible}
            autoComplete="new-password"
            textContentType="newPassword"
            value={confirm}
            editable={ready && !loading}
            onChangeText={v => { setConfirm(v); setError(''); }}
            onSubmitEditing={handleUpdatePassword}
            returnKeyType="go"
            accessibilityLabel="Confirm new password"
          />
          <Pressable
            style={styles.eyeBtn}
            onPress={() => setCfVisible(v => !v)}
            disabled={!ready}
            accessibilityLabel={cfVisible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.eyeText}>{cfVisible ? '🙈' : '👁'}</Text>
          </Pressable>
        </View>

        {error ? (
          <Text style={styles.errorText} accessibilityRole="alert">{error}</Text>
        ) : null}

        <TouchableOpacity
          style={[styles.btn, (!ready || loading) && styles.btnDim]}
          onPress={handleUpdatePassword}
          disabled={!ready || loading}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Update password"
        >
          {loading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnText}>Update Password</Text>
          }
        </TouchableOpacity>

        {!ready && !checking ? (
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={styles.linkBtn}
            accessibilityRole="link"
            accessibilityLabel="Request a new reset link"
          >
            <Text style={styles.linkText}>Request a new reset link</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={() => router.replace('/(auth)/login')}
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
  title:     { color: TEXT, fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  body:      { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center', marginBottom: 20, maxWidth: 300 },
  inputWrap: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, borderRadius: 12,
    backgroundColor: '#16161e', marginBottom: 12, overflow: 'hidden',
  },
  inputDisabled: { opacity: 0.4 },
  input: {
    flex: 1, paddingVertical: 15, paddingHorizontal: 16,
    color: TEXT, fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14, paddingVertical: 15 },
  eyeText: { fontSize: 16 },
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

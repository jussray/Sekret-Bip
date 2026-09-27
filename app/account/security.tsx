import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { validateNewPassword } from '@/features/auth/passwordRecovery';
import { getSupabase } from '@/utils/supabase';

export default function AccountSecurityScreen() {
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSession() {
      const sb = getSupabase();
      if (!sb) {
        if (!active) return;
        setError('Auth unavailable. Check the Supabase app configuration.');
        setChecking(false);
        return;
      }

      const { data, error: sessionError } = await sb.auth.getUser();
      if (!active) return;
      if (sessionError || !data.user) {
        router.replace('/(auth)/login' as never);
        return;
      }
      setEmail(data.user.email ?? 'Signed-in account');
      setChecking(false);
    }

    void loadSession();
    return () => { active = false; };
  }, []);

  async function updatePassword() {
    setError('');
    setStatus('');
    const validation = validateNewPassword(password, confirm);
    if (validation) {
      setError(validation);
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
      if (updateError) throw updateError;
      setPassword('');
      setConfirm('');
      setStatus('Password updated. Use the new password next time you sign in.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update password.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.card}>
        <Text style={s.wordmark}>Se'kret Bip</Text>
        <Text style={s.title}>Account security</Text>
        <Text style={s.body}>
          {checking ? 'Checking your session…' : `Signed in as ${email}. Change your password without sharing it with anyone.`}
        </Text>

        {checking ? <ActivityIndicator color={PURPLE} size="small" /> : (
          <>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="New password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={password}
                editable={!loading}
                onChangeText={(value) => { setPassword(value); setError(''); setStatus(''); }}
                accessibilityLabel="New password"
              />
            </View>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                placeholder="Confirm password"
                placeholderTextColor={MUTED}
                secureTextEntry
                autoComplete="new-password"
                textContentType="newPassword"
                value={confirm}
                editable={!loading}
                onChangeText={(value) => { setConfirm(value); setError(''); setStatus(''); }}
                onSubmitEditing={updatePassword}
                accessibilityLabel="Confirm password"
              />
            </View>

            {error ? <Text style={s.errorText} accessibilityRole="alert">{error}</Text> : null}
            {status ? <Text style={s.statusText} accessibilityLiveRegion="polite">{status}</Text> : null}

            <TouchableOpacity
              style={[s.btn, loading && s.btnDim]}
              onPress={updatePassword}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Update password"
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.btnText}>Update password</Text>}
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const PURPLE = '#7c3aed';
const PURPLE_DIM = '#4c1d95';
const BG = '#0a0a0a';
const BORDER = '#2a2a35';
const TEXT = '#f3f3f5';
const MUTED = '#777';

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  wordmark: {
    color: TEXT,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 24,
  },
  title: {
    color: TEXT,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    color: MUTED,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 18,
  },
  inputWrap: {
    width: '100%',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    backgroundColor: '#111118',
    marginBottom: 12,
  },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    color: TEXT,
    fontSize: 14,
  },
  errorText: {
    width: '100%',
    color: '#f87171',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  statusText: {
    width: '100%',
    color: '#c4b5fd',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
    textAlign: 'center',
  },
  btn: {
    width: '100%',
    backgroundColor: PURPLE,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDim: { backgroundColor: PURPLE_DIM },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { getSupabase } from '@/utils/supabase';
import { ensureAnonymousSession } from '@/utils/sync';

export default function SignupScreen() {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [confirm, setConfirm]       = useState('');
  const [birthMonth, setBirthMonth] = useState('');
  const [birthYear, setBirthYear]   = useState('');
  const [agreed, setAgreed]         = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);
  const [loading, setLoading]       = useState(false);

  async function handleSignUp() {
    setError('');
    const e  = email.trim();
    const p  = password.trim();
    const mm = parseInt(birthMonth, 10);
    const yy = parseInt(birthYear, 10);

    if (!e || !p)                          { setError('Email and password are required.');   return; }
    if (p.length < 8)                      { setError('Password must be at least 8 characters.'); return; }
    if (p !== confirm.trim())              { setError("Passwords don't match.");             return; }
    if (!birthMonth || !birthYear)         { setError('Please enter your birth month and year.'); return; }
    if (isNaN(mm) || mm < 1 || mm > 12)   { setError('Enter a valid birth month (1–12).'); return; }
    if (isNaN(yy) || birthYear.length !== 4) { setError('Enter a valid 4-digit birth year.'); return; }

    // Client-side age check (month-accurate) — mirrors server validation
    const now       = new Date();
    const ageMonths = (now.getFullYear() - yy) * 12 + ((now.getMonth() + 1) - mm);
    if (ageMonths < 13 * 12) {
      setError('You must be 13 or older to create an account.');
      return;
    }

    if (!agreed) {
      setError('Please agree to the Privacy Policy and Terms of Service.');
      return;
    }

    setLoading(true);
    const sb = getSupabase();
    if (!sb) { setError('Auth unavailable. Try skipping for now.'); setLoading(false); return; }

    const { data, error: fnErr } = await sb.functions.invoke('register', {
      body: { email: e, password: p, birth_month: mm, birth_year: yy, consent_at: new Date().toISOString() },
    });

    setLoading(false);

    if (fnErr) {
      setError('Something went wrong. Please try again.');
      return;
    }

    if (data?.error) {
      if (data.error === 'age_requirement') {
        setError('You must be 13 or older to create an account.');
      } else {
        setError(data.message ?? data.error);
      }
      return;
    }

    setSuccess(true);
  }

  async function handleSkip() {
    setLoading(true);
    const uid = await ensureAnonymousSession();
    setLoading(false);
    if (!uid) {
      setError('Could not start a session. Check your connection and try again.');
      return;
    }
    router.replace('/');
  }

  if (success) {
    return (
      <View style={styles.root}>
        <View style={styles.inner}>
          <Text style={styles.logo}>💜</Text>
          <Text style={styles.successTitle}>Check your email</Text>
          <Text style={styles.successBody}>
            We sent a confirmation link to {email.trim()}.{'\n'}
            Open it, then come back and sign in.
          </Text>
          <TouchableOpacity style={styles.btn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.btnText}>Go to Sign In</Text>
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
      <View style={styles.inner}>
        <Text style={styles.logo}>Se&#39;kret Bip 💜</Text>
        <Text style={styles.tagline}>create your space</Text>

        <TextInput
          style={styles.input}
          placeholder="email"
          placeholderTextColor="#555"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={t => { setEmail(t); setError(''); }}
        />
        <TextInput
          style={styles.input}
          placeholder="password (8+ characters)"
          placeholderTextColor="#555"
          secureTextEntry
          value={password}
          onChangeText={t => { setPassword(t); setError(''); }}
        />
        <TextInput
          style={styles.input}
          placeholder="confirm password"
          placeholderTextColor="#555"
          secureTextEntry
          value={confirm}
          onChangeText={t => { setConfirm(t); setError(''); }}
        />

        <Text style={styles.birthLabel}>Birthday (to verify your age)</Text>
        <View style={styles.birthRow}>
          <TextInput
            style={[styles.input, styles.birthMonthInput]}
            placeholder="MM"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={2}
            value={birthMonth}
            onChangeText={t => { setBirthMonth(t); setError(''); }}
          />
          <Text style={styles.birthSlash}>/</Text>
          <TextInput
            style={[styles.input, styles.birthYearInput]}
            placeholder="YYYY"
            placeholderTextColor="#555"
            keyboardType="number-pad"
            maxLength={4}
            value={birthYear}
            onChangeText={t => { setBirthYear(t); setError(''); }}
            returnKeyType="go"
            onSubmitEditing={handleSignUp}
          />
        </View>

        <View style={styles.consentRow}>
          <TouchableOpacity
            onPress={() => setAgreed(v => !v)}
            activeOpacity={0.7}
            style={styles.checkboxHit}
          >
            <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
              {agreed && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </TouchableOpacity>
          <Text style={styles.consentText}>
            {'I agree to the '}
            <Text style={styles.consentLink} onPress={() => router.push('/(auth)/privacy-policy' as any)}>
              Privacy Policy
            </Text>
            {' and '}
            <Text style={styles.consentLink} onPress={() => router.push('/(auth)/terms' as any)}>
              Terms of Service
            </Text>
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.btn} onPress={handleSignUp} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Create Account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/(auth)/login')} style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Sign in</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkip} style={styles.skip} disabled={loading}>
          <Text style={styles.skipText}>Skip — use without an account</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#0d0d0d' },
  inner:          { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  logo:           { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 6 },
  tagline:        { color: '#6d28d9', fontSize: 15, marginBottom: 40 },
  input: {
    width: '100%', borderWidth: 1, borderColor: '#2a2a2a', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 18, color: '#fff', fontSize: 15,
    backgroundColor: '#111', marginBottom: 12,
  },
  birthLabel:     { color: '#555', fontSize: 12, alignSelf: 'flex-start', marginBottom: 6, marginTop: 4 },
  birthRow:       { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 0 },
  birthMonthInput: { flex: 1, width: undefined },
  birthSlash:     { color: '#555', fontSize: 20, marginHorizontal: 8, marginBottom: 12 },
  birthYearInput: { flex: 2, width: undefined },
  consentRow:     { flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginTop: 12, marginBottom: 4 },
  checkboxHit:    { padding: 4, marginRight: 6, marginTop: -3 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#6d28d9',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: '#6d28d9' },
  checkmark:      { color: '#fff', fontSize: 12, fontWeight: '900', lineHeight: 14 },
  consentText:    { color: '#888', fontSize: 12, flex: 1, lineHeight: 18 },
  consentLink:    { color: '#c4b5fd', textDecorationLine: 'underline' },
  error:          { color: '#f87171', fontSize: 13, marginBottom: 10, textAlign: 'center' },
  btn: {
    width: '100%', backgroundColor: '#6d28d9', borderRadius: 16,
    paddingVertical: 17, alignItems: 'center', marginTop: 4, marginBottom: 18,
  },
  btnText:        { color: '#fff', fontWeight: '700', fontSize: 16 },
  link:           { marginBottom: 28 },
  linkText:       { color: '#c4b5fd', fontSize: 14 },
  skip:           { position: 'absolute', bottom: 40 },
  skipText:       { color: '#444', fontSize: 13 },
  successTitle:   { color: '#fff', fontSize: 22, fontWeight: '700', marginBottom: 14 },
  successBody:    { color: '#94a3b8', fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 36 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { getSupabase, isSupabaseConfigured } from '../utils/supabase';
import {
  getAuthenticatedProfile,
  getCurrentAccountUserId,
  generateBipId,
  normalizeAnonymousHandle,
  sendMagicLink,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  upsertPrivateProfile,
  type AccountSide,
  type PrivateAccountProfile,
} from '../utils/account';
import { clearPrivateLocalState } from '../utils/storage';
import type { AgeGateStatus } from './AgeGate';

interface AccountGateProps {
  ageGateStatus: AgeGateStatus | 'unknown';
  onReady: (profile: PrivateAccountProfile) => void;
  onSignedOut?: () => void;
  children: React.ReactNode;
}

const AVATAR_OPTIONS = ['soft', 'rylane', 'cloud', 'night'] as const;

export function AccountGate({ ageGateStatus, onReady, onSignedOut, children }: AccountGateProps) {
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<'create' | 'signin'>('create');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [anonymousHandle, setAnonymousHandle] = useState('');
  const [avatarKey, setAvatarKey] = useState<(typeof AVATAR_OPTIONS)[number]>('soft');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<PrivateAccountProfile | null>(null);
  const [needsProfile, setNeedsProfile] = useState(false);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const sb = getSupabase();
    const subscription = sb?.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        await clearPrivateLocalState();
        setProfile(null);
        setNeedsProfile(false);
        onSignedOut?.();
      }
    }).data.subscription;
    return () => subscription?.unsubscribe();
  }, [onSignedOut]);

  const side: AccountSide | null = useMemo(() => {
    if (ageGateStatus === 'teen') return 'teen';
    if (ageGateStatus === 'guardian') return 'guardian';
    return null;
  }, [ageGateStatus]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!side || !isSupabaseConfigured) {
        if (mounted) setLoading(false);
        return;
      }

      try {
        const existing = await getAuthenticatedProfile();
        if (!mounted) return;
        if (existing) {
          setProfile(existing);
          onReadyRef.current(existing);
        }
      } catch {
        // Stay on account screen and let the user sign in/create.
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [side]);

  const requireProfileFields = () => {
    if (!email.trim()) return 'Email is required.';
    if (!firstName.trim()) return 'First name is required for your private account.';
    if (!anonymousHandle.trim()) return 'Choose an anonymous handle for public spaces.';
    return '';
  };

  const completeProfileForSignedInUser = async () => {
    if (!side || ageGateStatus === 'unknown' || ageGateStatus === 'blocked') return;
    const validation = requireProfileFields();
    if (validation) { setMessage(validation); return; }
    setBusy(true);
    setMessage('');
    try {
      const id = await getCurrentAccountUserId();
      if (!id) throw new Error('Please sign in first, then finish profile setup.');
      const next = await upsertPrivateProfile(id, {
        email,
        firstName,
        side,
        ageGateStatus,
        anonymousHandle,
        avatarKey,
      });
      setProfile(next);
      onReadyRef.current(next);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!side || ageGateStatus === 'unknown' || ageGateStatus === 'blocked') return;
    if (!email.trim()) { setMessage('Email is required.'); return; }
    if (!password.trim()) { setMessage('Password is required.'); return; }
    setBusy(true);
    setMessage('');
    try {
      const next = mode === 'create'
        ? await signUpWithEmailPassword(password, {
          email,
          firstName,
          side,
          ageGateStatus,
          anonymousHandle,
          avatarKey,
        })
        : await signInWithEmailPassword(email, password);

      if (next) {
        setProfile(next);
        onReadyRef.current(next);
      } else {
        setNeedsProfile(true);
        setMessage('Signed in. Finish your private profile setup to continue.');
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Account request failed.');
    } finally {
      setBusy(false);
    }
  };

  const magic = async () => {
    if (!email.trim()) { setMessage('Enter your email first.'); return; }
    setBusy(true);
    setMessage('');
    try {
      await sendMagicLink(email);
      setMessage('Magic link sent. Open it on this device, then return here.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not send magic link.');
    } finally {
      setBusy(false);
    }
  };

  if (profile) return <>{children}</>;

  if (loading) {
    return <View style={styles.root}><ActivityIndicator color="#e9d5ff" /><Text style={styles.body}>Checking your private account…</Text></View>;
  }

  if (!isSupabaseConfigured) {
    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>🔐</Text>
        <Text style={styles.title}>Account setup is required</Text>
        <Text style={styles.body}>Add Supabase env vars to enable private email accounts before users enter Se'kret Bip.</Text>
      </View>
    );
  }

  const normalizedHandle = normalizeAnonymousHandle(anonymousHandle || firstName || 'bip');
  const previewBipId = generateBipId(normalizedHandle, email || 'bip');

  return (
    <View style={styles.root}>
      <Text style={styles.emoji}>🔐</Text>
      <Text style={styles.title}>{mode === 'create' ? 'Create your private account' : 'Sign in to your private account'}</Text>
      <Text style={styles.body}>Your real name/email stay private. Friends find you by Bip ID or QR — public spaces use your anonymous handle.</Text>

      <View style={styles.switchRow}>
        <TouchableOpacity style={[styles.switchBtn, mode === 'create' && styles.switchActive]} onPress={() => setMode('create')}>
          <Text style={styles.switchText}>Create</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.switchBtn, mode === 'signin' && styles.switchActive]} onPress={() => setMode('signin')}>
          <Text style={styles.switchText}>Sign in</Text>
        </TouchableOpacity>
      </View>

      <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8b7ca8" autoCapitalize="none" keyboardType="email-address" />
      <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8b7ca8" secureTextEntry />

      {mode === 'create' || needsProfile ? (
        <>
          <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="First name — private" placeholderTextColor="#8b7ca8" />
          <TextInput style={styles.input} value={anonymousHandle} onChangeText={setAnonymousHandle} placeholder="Anonymous handle" placeholderTextColor="#8b7ca8" autoCapitalize="none" />
          <Text style={styles.preview}>Public preview: @{normalizedHandle} · Bip ID {previewBipId}</Text>
          <View style={styles.avatarRow}>
            {AVATAR_OPTIONS.map(option => (
              <TouchableOpacity key={option} style={[styles.avatarBtn, avatarKey === option && styles.avatarActive]} onPress={() => setAvatarKey(option)}>
                <Text style={styles.avatarText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      ) : null}

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <TouchableOpacity style={[styles.primary, busy && styles.disabled]} onPress={submit} disabled={busy}>
        <Text style={styles.primaryText}>{busy ? 'Working…' : mode === 'create' ? 'Create account' : 'Sign in'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.linkBtn} onPress={magic} disabled={busy}>
        <Text style={styles.linkText}>Send magic link instead</Text>
      </TouchableOpacity>
      {mode === 'signin' && needsProfile ? (
        <TouchableOpacity style={styles.linkBtn} onPress={completeProfileForSignedInUser} disabled={busy}>
          <Text style={styles.linkText}>I signed in — finish private profile</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0820', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 38, marginBottom: 12 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 10 },
  body: { color: '#c4b5fd', fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 18 },
  switchRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  switchBtn: { borderColor: 'rgba(196,181,253,0.35)', borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 18 },
  switchActive: { backgroundColor: 'rgba(168,85,247,0.28)', borderColor: 'rgba(216,180,254,0.8)' },
  switchText: { color: '#f5f3ff', fontWeight: '700' },
  input: { width: '100%', maxWidth: 420, borderWidth: 1, borderColor: 'rgba(196,181,253,0.35)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 13, color: '#fff', marginBottom: 10, backgroundColor: 'rgba(255,255,255,0.06)' },
  preview: { color: '#a78bfa', fontSize: 13, marginBottom: 10 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 8 },
  avatarBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(196,181,253,0.3)' },
  avatarActive: { backgroundColor: 'rgba(168,85,247,0.26)', borderColor: '#d8b4fe' },
  avatarText: { color: '#e9d5ff', fontWeight: '700' },
  message: { color: '#fca5a5', textAlign: 'center', marginBottom: 10 },
  primary: { width: '100%', maxWidth: 420, backgroundColor: '#7c3aed', borderRadius: 18, paddingVertical: 15, alignItems: 'center', marginTop: 4 },
  disabled: { opacity: 0.6 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  linkBtn: { paddingVertical: 11 },
  linkText: { color: '#c4b5fd', textDecorationLine: 'underline', fontSize: 13 },
});

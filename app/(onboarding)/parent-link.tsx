import React, { useState } from 'react';
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
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import {
  PARENT_INVITE_CODE_LENGTH,
  normalizeParentInviteCode,
  redeemInviteCodeResult,
} from '@/utils/parentLink';
import { useAppContext } from '@/context/AppContext';
import {
  createDevTestFamily,
  isDevTestFamilyEnabled,
} from '@/features/testing/devTestFamily';
import {
  resolveParentEntryState,
  routeForParentEntryState,
} from '@/services/parentEntryState';
import { advanceStage } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

export default function ParentLinkOnboarding() {
  const { setUserSide } = useAppContext();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsCodeHelp, setNeedsCodeHelp] = useState(false);
  const showFounderTools = isDevTestFamilyEnabled();

  const normalized = normalizeParentInviteCode(code);
  const ready = normalized.length === PARENT_INVITE_CODE_LENGTH && !loading;

  async function completeVerifiedParentLink(linkedTeenId: string) {
    setUserSide('parent');
    await AsyncStorage.setItem('linked_teen_id', linkedTeenId);
    // Fire-and-forget — record the link milestone
    getSupabase()?.auth.getUser().then(({ data }) => {
      if (data.user) advanceStage(data.user.id, 'parent_linked').catch(() => null);
    });
    const parentEntry = await resolveParentEntryState();
    router.replace(routeForParentEntryState(parentEntry) as never);
  }

  async function handleLink() {
    if (!ready) {
      setError('Enter the full eight-character code from your teen.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await redeemInviteCodeResult(normalized);
      if (!result.ok) {
        await AsyncStorage.removeItem('linked_teen_id');
        setError(result.message);
        return;
      }

      await completeVerifiedParentLink(result.value.teenUserId);
    } catch {
      await AsyncStorage.removeItem('linked_teen_id');
      setError('Could not connect right now. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLinkLater() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      setUserSide('parent');
      await AsyncStorage.removeItem('linked_teen_id');
      // Fire-and-forget — parent chose to skip linking for now
      getSupabase()?.auth.getUser().then(({ data }) => {
        if (data.user) advanceStage(data.user.id, 'parent_link_skipped').catch(() => null);
      });
      router.replace('/(auth)/guardian-verification');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTestFamily() {
    setLoading(true);
    setError('');
    try {
      await createDevTestFamily();
      setUserSide('parent');
      router.replace('/(parent)/room');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not create the test family.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#071410', '#0d1f18', '#08140f']} style={StyleSheet.absoluteFill} />

      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.kicker}>LINK YOUR TEEN</Text>
        <Text style={styles.title}>Enter their private code.</Text>
        <Text style={styles.body}>
          Connect now with the eight-character code from your teen, or complete guardian verification first and link them afterward.
        </Text>

        <View style={styles.codeWrap}>
          <TextInput
            value={normalized}
            onChangeText={text => {
              setCode(text);
              setError('');
              setNeedsCodeHelp(false);
            }}
            placeholder="AB12CD34"
            placeholderTextColor="#355246"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={PARENT_INVITE_CODE_LENGTH}
            returnKeyType="go"
            onSubmitEditing={handleLink}
            style={styles.codeInput}
            accessibilityLabel="Teen private invite code"
          />
        </View>

        <Text style={styles.privacy}>
          This code only establishes the trusted teen-parent connection. You will only see what your teen intentionally sends through Bridge.
        </Text>

        {needsCodeHelp ? (
          <View style={styles.helpCard}>
            <Text style={styles.helpTitle}>Need a code?</Text>
            <Text style={styles.helpBody}>
              Ask your teen to open their account-verification screen and create a fresh eight-character code. Stay here and enter it when they share it with you.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          disabled={!ready}
          onPress={handleLink}
          activeOpacity={0.85}
          style={[styles.primary, !ready && styles.disabled]}
        >
          {loading && ready ? (
            <ActivityIndicator color="#062015" />
          ) : (
            <Text style={styles.primaryText}>Approve and connect</Text>
          )}
        </TouchableOpacity>

        {showFounderTools ? (
          <View style={styles.devCard}>
            <Text style={styles.devLabel}>FOUNDER TEST MODE</Text>
            <Text style={styles.devBody}>Create a local simulated teen-parent pair so you can enter Parent Side without a real invite code.</Text>
            <TouchableOpacity disabled={loading} onPress={handleCreateTestFamily} style={styles.devButton}>
              <Text style={styles.devButtonText}>Create Test Family</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity
          disabled={loading}
          onPress={() => {
            setNeedsCodeHelp(true);
            setError('');
          }}
          style={styles.help}
        >
          <Text style={styles.helpText}>I do not have a code yet</Text>
        </TouchableOpacity>

        <TouchableOpacity disabled={loading} onPress={handleLinkLater} style={styles.linkLater}>
          {loading && !ready ? (
            <ActivityIndicator color="#789082" />
          ) : (
            <Text style={styles.helpText}>Continue to guardian verification</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#08140f' },
  content: { flex: 1, paddingTop: Platform.OS === 'ios' ? 68 : 46, paddingHorizontal: 28 },
  back: { marginBottom: 28 },
  backText: { color: '#789082', fontSize: 22 },
  kicker: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 2.5, marginBottom: 12 },
  title: { color: '#fff', fontSize: 36, lineHeight: 42, fontWeight: '900', marginBottom: 14 },
  body: { color: '#b7c9bf', fontSize: 15, lineHeight: 23, marginBottom: 32 },
  codeWrap: { borderRadius: 22, borderWidth: 1.5, borderColor: '#a7f3d044', backgroundColor: '#ffffff08', paddingHorizontal: 20, marginBottom: 18 },
  codeInput: { height: 86, color: '#fff', fontSize: 30, fontWeight: '900', letterSpacing: 6, textAlign: 'center' },
  privacy: { color: '#789082', fontSize: 12, lineHeight: 18, marginBottom: 18 },
  helpCard: { borderRadius: 18, borderWidth: 1, borderColor: '#a7f3d033', backgroundColor: '#a7f3d010', padding: 14, marginBottom: 14 },
  helpTitle: { color: '#a7f3d0', fontSize: 13, fontWeight: '900', marginBottom: 6 },
  helpBody: { color: '#8aaf9c', fontSize: 12, lineHeight: 18 },
  error: { color: '#fca5a5', fontSize: 13, lineHeight: 19, textAlign: 'center', marginBottom: 14 },
  primary: { height: 60, borderRadius: 20, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.35 },
  primaryText: { color: '#062015', fontSize: 16, fontWeight: '900' },
  devCard: { marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#f59e0b55', backgroundColor: '#f59e0b12', padding: 16 },
  devLabel: { color: '#fbbf24', fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 6 },
  devBody: { color: '#d7c9a1', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  devButton: { minHeight: 50, borderRadius: 15, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center' },
  devButtonText: { color: '#2b1700', fontSize: 14, fontWeight: '900' },
  help: { alignItems: 'center', paddingTop: 20, paddingBottom: 8 },
  linkLater: { alignItems: 'center', paddingVertical: 12 },
  helpText: { color: '#789082', fontSize: 13, fontWeight: '700' },
});

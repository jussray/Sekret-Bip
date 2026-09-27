import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  archiveOwnBipJrProfile,
  createOwnBipJrProfile,
  listOwnBipJrProfiles,
  type BipJrAgeBand,
  type BipJrChildProfile,
} from '@/services/bipJr';

const AGE_BANDS: Array<{ value: BipJrAgeBand; label: string }> = [
  { value: '5-7', label: 'Ages 5–7' },
  { value: '8-10', label: 'Ages 8–10' },
  { value: '11-12', label: 'Ages 11–12' },
];

function messageForError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (raw.toLowerCase().includes('verified guardian required')) {
    return 'Your Parent account must finish guardian verification before you can create a Bip Jr profile.';
  }
  if (raw.toLowerCase().includes('completed parent profile required')) {
    return 'Finish your Parent setup first, then come back to Bip Jr.';
  }
  return raw || 'Bip Jr could not complete that request.';
}

export default function BipJrParentRoute() {
  const [profiles, setProfiles] = useState<BipJrChildProfile[]>([]);
  const [displayAlias, setDisplayAlias] = useState('');
  const [ageBand, setAgeBand] = useState<BipJrAgeBand>('5-7');
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setError('');
    try {
      setProfiles(await listOwnBipJrProfiles());
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createProfile() {
    const name = displayAlias.trim();
    if (!name) {
      setError('Enter the name or nickname your child uses in Bip Jr.');
      return;
    }
    if (!consent) {
      setError('Confirm parental or guardian consent before creating this managed profile.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await createOwnBipJrProfile(name, ageBand);
      setDisplayAlias('');
      setAgeBand('5-7');
      setConsent(false);
      await refresh();
    } catch (cause) {
      setError(messageForError(cause));
    } finally {
      setSaving(false);
    }
  }

  async function archiveProfile(profile: BipJrChildProfile) {
    const doArchive = async () => {
      setSaving(true);
      setError('');
      try {
        await archiveOwnBipJrProfile(profile.id);
        await refresh();
      } catch (cause) {
        setError(messageForError(cause));
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      await doArchive();
      return;
    }

    Alert.alert(
      'Archive Bip Jr profile?',
      `This removes ${profile.display_alias} from active Bip Jr profiles without deleting your Parent account.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => { void doArchive(); } },
      ],
    );
  }

  const activeProfiles = profiles.filter(profile => profile.status === 'active');

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#071410', '#12271d', '#120d1c']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>BIP JR · PARENT MANAGED</Text>
        <Text style={styles.title}>Their little space.{`\n`}Your supervision.</Text>
        <Text style={styles.body}>
          Create a Bip Jr profile for a child you parent or legally supervise. Bip Jr profiles are known to Se&apos;kret Bip, but they do not get a separate email, password, or Teen account.
        </Text>

        <View style={styles.truthCard}>
          <Text style={styles.truthTitle}>Different from Teen + Bridge</Text>
          <Text style={styles.truthBody}>
            A Teen account owns its own private space. Bridge only carries what that teen intentionally shares. A Bip Jr profile is supervised by its verified Parent account from the start.
          </Text>
        </View>

        <Text style={styles.section}>YOUR BIP JR PROFILES</Text>
        {loading ? (
          <ActivityIndicator size="small" />
        ) : activeProfiles.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No child profiles yet</Text>
            <Text style={styles.emptyBody}>Create the first managed profile below.</Text>
          </View>
        ) : (
          activeProfiles.map(profile => (
            <View key={profile.id} style={styles.profileCard}>
              <View style={styles.profileText}>
                <Text style={styles.profileName}>{profile.display_alias}</Text>
                <Text style={styles.profileMeta}>Bip Jr · ages {profile.age_band}</Text>
              </View>
              <TouchableOpacity
                style={styles.archiveButton}
                disabled={saving}
                onPress={() => void archiveProfile(profile)}
                accessibilityRole="button"
                accessibilityLabel={`Archive ${profile.display_alias} Bip Jr profile`}
              >
                <Text style={styles.archiveText}>Archive</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <Text style={styles.section}>CREATE A MANAGED PROFILE</Text>
        <View style={styles.formCard}>
          <Text style={styles.label}>Name or nickname</Text>
          <TextInput
            value={displayAlias}
            onChangeText={value => { setDisplayAlias(value); setError(''); }}
            maxLength={40}
            placeholder="Eve"
            placeholderTextColor="#688071"
            style={styles.input}
            accessibilityLabel="Bip Jr name or nickname"
          />

          <Text style={styles.label}>Age range</Text>
          <View style={styles.ageRow}>
            {AGE_BANDS.map(option => (
              <TouchableOpacity
                key={option.value}
                style={[styles.ageButton, ageBand === option.value && styles.ageButtonActive]}
                onPress={() => setAgeBand(option.value)}
                accessibilityRole="button"
                accessibilityState={{ selected: ageBand === option.value }}
              >
                <Text style={[styles.ageText, ageBand === option.value && styles.ageTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => { setConsent(value => !value); setError(''); }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              <Text style={styles.checkmark}>{consent ? '✓' : ''}</Text>
            </View>
            <Text style={styles.consentText}>
              I am this child&apos;s parent or legal guardian and I consent to creating a supervised Bip Jr profile.
            </Text>
          </TouchableOpacity>

          <Text style={styles.privacyNote}>
            This step stores a display name, age range, your Parent account relationship, and a consent receipt. It does not ask for a child email, password, full birth date, ID, selfie, or raw age document.
          </Text>

          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}

          <TouchableOpacity
            style={[styles.createButton, (!displayAlias.trim() || !consent || saving) && styles.createButtonDisabled]}
            disabled={!displayAlias.trim() || !consent || saving}
            onPress={() => void createProfile()}
            accessibilityRole="button"
            accessibilityLabel="Create Bip Jr profile"
          >
            {saving ? <ActivityIndicator size="small" color="#052014" /> : <Text style={styles.createText}>Create Bip Jr profile</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#071410' },
  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 62 : 42,
    paddingBottom: 120,
    ...(Platform.OS === 'web' ? { width: '100%', maxWidth: 620, alignSelf: 'center' as const } : {}),
  },
  kicker: { color: '#6ee7b7', fontSize: 10, fontWeight: '900', letterSpacing: 2.2, marginBottom: 12 },
  title: { color: '#fff', fontSize: 38, lineHeight: 43, fontWeight: '900', marginBottom: 14 },
  body: { color: '#b7c9bf', fontSize: 15, lineHeight: 23, marginBottom: 18 },
  truthCard: { borderRadius: 20, borderWidth: 1, borderColor: '#a7f3d033', backgroundColor: 'rgba(17,37,28,0.90)', padding: 17, marginBottom: 24 },
  truthTitle: { color: '#d1fae5', fontSize: 15, fontWeight: '900', marginBottom: 6 },
  truthBody: { color: '#93aa9d', fontSize: 12, lineHeight: 18 },
  section: { color: '#85aa96', fontSize: 10, fontWeight: '900', letterSpacing: 1.7, marginBottom: 10, marginTop: 8 },
  emptyCard: { borderRadius: 18, borderWidth: 1, borderColor: '#ffffff12', backgroundColor: '#ffffff08', padding: 16, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyBody: { color: '#83978b', fontSize: 12, marginTop: 4 },
  profileCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#a7f3d026', backgroundColor: 'rgba(17,37,28,0.90)', padding: 14, marginBottom: 10 },
  profileText: { flex: 1 },
  profileName: { color: '#fff', fontSize: 16, fontWeight: '900' },
  profileMeta: { color: '#85a091', fontSize: 11, marginTop: 3 },
  archiveButton: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff18' },
  archiveText: { color: '#a8b9af', fontSize: 11, fontWeight: '800' },
  formCard: { borderRadius: 22, borderWidth: 1, borderColor: '#a7f3d033', backgroundColor: 'rgba(8,25,18,0.94)', padding: 18 },
  label: { color: '#d1fae5', fontSize: 12, fontWeight: '800', marginBottom: 8, marginTop: 4 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#a7f3d033', borderRadius: 14, backgroundColor: '#0c1c14', color: '#fff', paddingHorizontal: 14, fontSize: 15, marginBottom: 16 },
  ageRow: { gap: 8, marginBottom: 18 },
  ageButton: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: '#a7f3d022', backgroundColor: '#0c1c14', justifyContent: 'center', paddingHorizontal: 14 },
  ageButtonActive: { borderColor: '#6ee7b7', backgroundColor: '#123525' },
  ageText: { color: '#799083', fontSize: 13, fontWeight: '800' },
  ageTextActive: { color: '#d1fae5' },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: '#6b8576', marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: '#6ee7b7', borderColor: '#6ee7b7' },
  checkmark: { color: '#052014', fontSize: 14, fontWeight: '900' },
  consentText: { flex: 1, color: '#b2c5ba', fontSize: 12, lineHeight: 18 },
  privacyNote: { color: '#708679', fontSize: 10, lineHeight: 16, marginBottom: 14 },
  error: { color: '#fca5a5', fontSize: 12, lineHeight: 18, marginBottom: 12 },
  createButton: { minHeight: 54, borderRadius: 16, backgroundColor: '#a7f3d0', alignItems: 'center', justifyContent: 'center' },
  createButtonDisabled: { opacity: 0.4 },
  createText: { color: '#052014', fontSize: 14, fontWeight: '900' },
});

import React, { useCallback, useState } from 'react';
import {
  Alert,
  Clipboard,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppContext } from '@/context/AppContext';
import { BIP_SURFACE } from '../../constants/vibeColors';
import { THEME_PACKS } from '@constants/theme';
import {
  cancelDailyReminder,
  requestNotificationPermissions,
  scheduleDailyReminder,
} from '@/utils/notifications';
import { createParentLink, redeemParentLink } from '@/utils/parentBridgeCompat';
import { useSleepGuard, type SleepWindow } from '../../hooks/useSleepGuard';
import { AccountDeletionControls } from '@/components/settings/AccountDeletionControls';
import { ParentLinkStatusCard } from '@/components/settings/ParentLinkStatusCard';
import { advanceStage } from '@/services/onboarding';
import { getSupabase } from '@/utils/supabase';

const THEME_ORDER = Object.keys(THEME_PACKS) as (keyof typeof THEME_PACKS)[];

// Compatibility keys remain unchanged so persisted selections keep working.
// Only user-facing names use the current Se'kret Bip canon.
const COMPANIONS = [
  { key: 'soft', name: 'Suhana', emoji: '💜', title: 'Big Sis', tagline: 'warm · protective · emotionally real' },
  { key: 'rylane', name: 'Sy', emoji: '⚡', title: 'Loyal Bro', tagline: 'street smart · down to earth · no cap' },
];

const SEKRET_MODES = [
  { key: 'soft', emoji: '🌙', label: 'Soft' },
  { key: 'realTalk', emoji: '🧠', label: 'Real Talk' },
  { key: 'distract', emoji: '😂', label: 'Distract' },
  { key: 'listen', emoji: '☁️', label: 'Just Listen' },
  { key: 'push', emoji: '🔥', label: 'Push Me' },
];

const SLEEP_OPTIONS: Array<{ label: string; value: SleepWindow | null }> = [
  { label: 'Off', value: null },
  { label: '10pm – 7am', value: { start: '22:00', end: '07:00' } },
  { label: '11pm – 8am', value: { start: '23:00', end: '08:00' } },
];

type RedeemStatus = 'idle' | 'pending' | 'not_found' | 'error';

function themeLabel(key: keyof typeof THEME_PACKS): string {
  const label = (THEME_PACKS[key] as { label?: unknown }).label;
  return typeof label === 'string' ? label : String(key);
}

export default function SettingsScreen() {
  const {
    theme,
    setTheme,
    userSide,
    setUserSide,
    selectedSekret,
    setSelectedSekret,
    sekretMode,
    setSekretMode,
    notificationsEnabled,
    setNotificationsEnabled,
    resetApp,
    colorScheme,
    setColorScheme,
  } = useAppContext();

  const cs = BIP_SURFACE[colorScheme];

  const { sleepWindow, setSleepWindow } = useSleepGuard();

  const [inviteCode, setInviteCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [redeemStatus, setRedeemStatus] = useState<RedeemStatus>('idle');
  const [linkStatusVersion, setLinkStatusVersion] = useState(0);

  async function handleNotificationToggle(enabled: boolean) {
    if (enabled) {
      const granted = await requestNotificationPermissions();
      if (granted) {
        await scheduleDailyReminder();
        setNotificationsEnabled(true);
      } else {
        Alert.alert(
          'Notifications blocked',
          "To get daily check-in reminders, enable notifications for Se'kret Bip in your phone settings.",
        );
      }
    } else {
      await cancelDailyReminder();
      setNotificationsEnabled(false);
    }
  }

  function handleDeleteData() {
    Alert.alert(
      'Delete local data?',
      'This clears data saved on this device only. It does not delete your account or server data.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete local data',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            resetApp();
            router.replace('/(onboarding)/welcome' as any);
          },
        },
      ],
    );
  }

  const handleGenerateCode = useCallback(async () => {
    setIsGenerating(true);
    const code = await createParentLink();
    setIsGenerating(false);
    if (code) {
      setInviteCode(code);
      setLinkStatusVersion((value) => value + 1);
      getSupabase()
        ?.auth.getUser()
        .then(({ data }) => {
          if (data.user) {
            advanceStage(data.user.id, 'parent_link_sent').catch(() => null);
          }
        });
    } else {
      Alert.alert('Not signed in', 'Sign in to your account first, then generate a link code.');
    }
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', `Share this code with your parent:\n\n${inviteCode}\n\nIt expires in 48 hours.`);
  }, [inviteCode]);

  const handleRedeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setIsRedeeming(true);
    const raw = await redeemParentLink(codeInput);
    setIsRedeeming(false);
    const valid: RedeemStatus[] = ['idle', 'pending', 'not_found', 'error'];
    const result = valid.includes(raw as RedeemStatus) ? (raw as RedeemStatus) : 'error';
    setRedeemStatus(result);
    if (result === 'pending') setLinkStatusVersion((value) => value + 1);
  }, [codeInput]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: cs.root }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: cs.textPrimary }]}>Settings</Text>

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Appearance</Text>
        <View style={[styles.row, { backgroundColor: cs.row }]}>
          <Text style={[styles.label, { color: cs.textPrimary }]}>Dark mode</Text>
          <Switch
            value={colorScheme === 'dark'}
            onValueChange={(v) => setColorScheme(v ? 'dark' : 'light')}
            trackColor={{ false: cs.inputBorder, true: cs.accent }}
            thumbColor="#fff"
          />
        </View>

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Side</Text>
        <View style={[styles.row, { backgroundColor: cs.row }]}>
          <Text style={[styles.label, { color: cs.textPrimary }]}>Teen side</Text>
          <Switch value={userSide === 'teen'} onValueChange={(value) => setUserSide(value ? 'teen' : 'parent')} />
        </View>

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Theme</Text>
        {THEME_ORDER.map((key) => (
          <TouchableOpacity key={String(key)} style={[styles.option, { backgroundColor: cs.row }]} onPress={() => setTheme(key)}>
            <Text style={[styles.optionText, { color: cs.textPrimary }]}>{themeLabel(key)}</Text>
            {theme === key && <Text style={[styles.check, { color: cs.accent }]}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Companion</Text>
        {COMPANIONS.map((companion) => (
          <TouchableOpacity
            key={companion.key}
            style={[styles.option, { backgroundColor: cs.row }]}
            onPress={() => setSelectedSekret(companion.key)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${companion.name}, ${companion.title}`}
            accessibilityState={{ selected: selectedSekret === companion.key }}
          >
            <Text style={[styles.optionText, { color: cs.textPrimary }]}>{companion.emoji} {companion.name} — {companion.title}</Text>
            {selectedSekret === companion.key && <Text style={[styles.check, { color: cs.accent }]}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Se&apos;kret mode</Text>
        {SEKRET_MODES.map((mode) => (
          <TouchableOpacity key={mode.key} style={[styles.option, { backgroundColor: cs.row }]} onPress={() => setSekretMode(mode.key)}>
            <Text style={[styles.optionText, { color: cs.textPrimary }]}>{mode.emoji} {mode.label}</Text>
            {sekretMode === mode.key && <Text style={[styles.check, { color: cs.accent }]}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Notifications</Text>
        <View style={[styles.row, { backgroundColor: cs.row }]}>
          <Text style={[styles.label, { color: cs.textPrimary }]}>Daily reminder</Text>
          <Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} />
        </View>

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Sleep guard</Text>
        {SLEEP_OPTIONS.map((option) => (
          <TouchableOpacity key={option.label} style={[styles.option, { backgroundColor: cs.row }]} onPress={() => setSleepWindow(option.value)}>
            <Text style={[styles.optionText, { color: cs.textPrimary }]}>{option.label}</Text>
            {JSON.stringify(sleepWindow) === JSON.stringify(option.value) && <Text style={[styles.check, { color: cs.accent }]}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Parent link</Text>
        <ParentLinkStatusCard
          accountSide="teen"
          refreshKey={linkStatusVersion}
          onRevoked={() => {
            setInviteCode('');
            setLinkStatusVersion((value) => value + 1);
          }}
        />
        <TouchableOpacity style={styles.button} onPress={handleGenerateCode} disabled={isGenerating}>
          <Text style={styles.buttonText}>{isGenerating ? 'Generating…' : 'Generate parent code'}</Text>
        </TouchableOpacity>
        {!!inviteCode && (
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.hint}>tap to copy</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={[styles.input, { color: cs.textPrimary, borderColor: cs.inputBorder }]}
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="Enter teen code"
          placeholderTextColor={cs.textMuted}
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={handleRedeemCode} disabled={isRedeeming}>
          <Text style={styles.buttonText}>{isRedeeming ? 'Connecting…' : 'Redeem code'}</Text>
        </TouchableOpacity>
        {redeemStatus === 'pending' && <Text style={[styles.hint, { color: cs.textSecond }]}>Request sent. Teen approval is required before Bridge sharing.</Text>}
        {redeemStatus !== 'idle' && redeemStatus !== 'pending' && <Text style={[styles.hint, { color: cs.textSecond }]}>Status: {redeemStatus}</Text>}

        <Text style={[styles.sectionTitle, { color: cs.section }]}>Danger zone</Text>
        <AccountDeletionControls />
        <TouchableOpacity style={[styles.button, styles.danger]} onPress={handleDeleteData}>
          <Text style={styles.buttonText}>Delete local device data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 80 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 20 },
  sectionTitle: { fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8 },
  label: { fontWeight: '700' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 8 },
  optionText: { flex: 1 },
  check: { fontWeight: '900', fontSize: 18 },
  button: { padding: 14, borderRadius: 16, backgroundColor: '#a78bfa', alignItems: 'center', marginBottom: 10 },
  danger: { backgroundColor: '#ef4444' },
  buttonText: { color: '#fff', fontWeight: '800' },
  codeBox: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#a78bfa', alignItems: 'center', marginBottom: 10 },
  codeText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  hint: { textAlign: 'center', marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
});

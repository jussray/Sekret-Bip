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

type RedeemStatus = 'idle' | 'ok' | 'not_found' | 'error';

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
  } = useAppContext();

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
            router.replace('/(onboarding)/parent-welcome' as any);
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
    } else {
      Alert.alert('Not signed in', 'Sign in to your account first, then generate a link code.');
    }
  }, []);

  const handleCopyCode = useCallback(() => {
    if (!inviteCode) return;
    Clipboard.setString(inviteCode);
    Alert.alert('Copied!', `Share this code with your teen:\n\n${inviteCode}\n\nIt expires in 48 hours.`);
  }, [inviteCode]);

  const handleRedeemCode = useCallback(async () => {
    if (!codeInput.trim()) return;
    setIsRedeeming(true);
    const raw = await redeemParentLink(codeInput);
    setIsRedeeming(false);
    const valid: RedeemStatus[] = ['idle', 'ok', 'not_found', 'error'];
    const result = valid.includes(raw as RedeemStatus) ? (raw as RedeemStatus) : 'error';
    setRedeemStatus(result);
    if (result === 'ok') setLinkStatusVersion((value) => value + 1);
  }, [codeInput]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionTitle}>Side</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Parent side</Text>
          <Switch value={userSide === 'parent'} onValueChange={(value) => setUserSide(value ? 'parent' : 'teen')} />
        </View>

        <Text style={styles.sectionTitle}>Theme</Text>
        {THEME_ORDER.map((key) => (
          <TouchableOpacity key={String(key)} style={styles.option} onPress={() => setTheme(key)}>
            <Text style={styles.optionText}>{themeLabel(key)}</Text>
            {theme === key && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Companion</Text>
        {COMPANIONS.map((companion) => (
          <TouchableOpacity
            key={companion.key}
            style={styles.option}
            onPress={() => setSelectedSekret(companion.key)}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${companion.name}, ${companion.title}`}
            accessibilityState={{ selected: selectedSekret === companion.key }}
          >
            <Text style={styles.optionText}>{companion.emoji} {companion.name} — {companion.title}</Text>
            {selectedSekret === companion.key && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Se&apos;kret mode</Text>
        {SEKRET_MODES.map((mode) => (
          <TouchableOpacity key={mode.key} style={styles.option} onPress={() => setSekretMode(mode.key)}>
            <Text style={styles.optionText}>{mode.emoji} {mode.label}</Text>
            {sekretMode === mode.key && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Daily reminder</Text>
          <Switch value={notificationsEnabled} onValueChange={handleNotificationToggle} />
        </View>

        <Text style={styles.sectionTitle}>Sleep guard</Text>
        {SLEEP_OPTIONS.map((option) => (
          <TouchableOpacity key={option.label} style={styles.option} onPress={() => setSleepWindow(option.value)}>
            <Text style={styles.optionText}>{option.label}</Text>
            {JSON.stringify(sleepWindow) === JSON.stringify(option.value) && <Text style={styles.check}>✓</Text>}
          </TouchableOpacity>
        ))}

        <Text style={styles.sectionTitle}>Parent link</Text>
        <ParentLinkStatusCard
          accountSide="parent"
          refreshKey={linkStatusVersion}
          onRevoked={() => {
            setInviteCode('');
            setLinkStatusVersion((value) => value + 1);
          }}
        />
        <TouchableOpacity style={styles.button} onPress={handleGenerateCode} disabled={isGenerating}>
          <Text style={styles.buttonText}>{isGenerating ? 'Generating…' : 'Generate link code'}</Text>
        </TouchableOpacity>
        {!!inviteCode && (
          <TouchableOpacity style={styles.codeBox} onPress={handleCopyCode}>
            <Text style={styles.codeText}>{inviteCode}</Text>
            <Text style={styles.hint}>tap to copy</Text>
          </TouchableOpacity>
        )}
        <TextInput
          style={styles.input}
          value={codeInput}
          onChangeText={setCodeInput}
          placeholder="Enter teen code"
          placeholderTextColor="#999"
          autoCapitalize="characters"
        />
        <TouchableOpacity style={styles.button} onPress={handleRedeemCode} disabled={isRedeeming}>
          <Text style={styles.buttonText}>{isRedeeming ? 'Connecting…' : 'Redeem code'}</Text>
        </TouchableOpacity>
        {redeemStatus !== 'idle' && <Text style={styles.hint}>Status: {redeemStatus}</Text>}

        <Text style={styles.sectionTitle}>Danger zone</Text>
        <AccountDeletionControls />
        <TouchableOpacity style={[styles.button, styles.danger]} onPress={handleDeleteData}>
          <Text style={styles.buttonText}>Delete local device data</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#130b24' },
  content: { padding: 20, paddingBottom: 80 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 20 },
  sectionTitle: { color: '#c4b5fd', fontWeight: '800', fontSize: 16, marginTop: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  label: { color: '#fff', fontWeight: '700' },
  option: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginBottom: 8 },
  optionText: { color: '#fff', flex: 1 },
  check: { color: '#a78bfa', fontWeight: '900', fontSize: 18 },
  button: { padding: 14, borderRadius: 16, backgroundColor: '#a78bfa', alignItems: 'center', marginBottom: 10 },
  danger: { backgroundColor: '#ef4444' },
  buttonText: { color: '#1e1236', fontWeight: '800' },
  codeBox: { padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#a78bfa', alignItems: 'center', marginBottom: 10 },
  codeText: { color: '#fff', fontSize: 24, fontWeight: '900', letterSpacing: 3 },
  hint: { color: '#c4b5fd', textAlign: 'center', marginBottom: 10 },
  input: { color: '#fff', borderWidth: 1, borderColor: '#6d5aa5', borderRadius: 14, padding: 12, marginBottom: 10 },
});

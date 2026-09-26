import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSleepGuard } from '../../hooks/useSleepGuard';
import { createReopenReminder } from '@/features/reminders/privateReopenRemindersRepository';

function reopenLabel(value: string | null): string {
  if (!value) return 'later';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'later';
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function QuietBipScreen() {
  const { sleepActive, sleepLoaded, reopensAt } = useSleepGuard();
  const [reminder, setReminder] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const until = useMemo(() => reopenLabel(reopensAt), [reopensAt]);

  if (!sleepLoaded) {
    return <View style={styles.loading} />;
  }

  if (!sleepActive) {
    return <Redirect href="/(teen)/room" />;
  }

  const saveReminder = () => {
    const label = reminder.trim();
    if (!label || !reopensAt || saving) return;

    setSaving(true);
    setSavedMessage(null);
    createReopenReminder(label, reopensAt)
      .then(() => {
        setReminder('');
        setSavedMessage(`Got it. I'll hold that until Bip reopens at ${until}.`);
      })
      .catch(() => {
        setSavedMessage("I couldn't save that one. Try again.");
      })
      .finally(() => setSaving(false));
  };

  return (
    <View style={styles.root} testID="quiet-bip-screen">
      <LinearGradient
        colors={['#090514', '#160725', '#0d0618']}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>QUIET BIP</Text>
        <Text style={styles.moon}>🌙</Text>
        <Text style={styles.title}>The rest of Bip is resting.</Text>
        <Text style={styles.subtitle}>Your quiet hours are on until {until}.</Text>

        <View style={styles.openRow}>
          <TouchableOpacity
            style={styles.openCard}
            onPress={() => router.push({ pathname: '/(teen)/companion-chat', params: { companion: 'night' } })}
            accessibilityRole="button"
            accessibilityLabel="Open Night"
            testID="quiet-open-night"
          >
            <Text style={styles.openEmoji}>🌙</Text>
            <Text style={styles.openTitle}>Night</Text>
            <Text style={styles.openCopy}>Still here.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openCard}
            onPress={() => router.push('/(teen)/pages' as never)}
            accessibilityRole="button"
            accessibilityLabel="Open Pages"
            testID="quiet-open-pages"
          >
            <Text style={styles.openEmoji}>📖</Text>
            <Text style={styles.openTitle}>Pages</Text>
            <Text style={styles.openCopy}>Write it down.</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.openCard}
            onPress={() => router.push('/(teen)/bridge' as never)}
            accessibilityRole="button"
            accessibilityLabel="Open Bridge"
            testID="quiet-open-bridge"
          >
            <Text style={styles.openEmoji}>🌉</Text>
            <Text style={styles.openTitle}>Bridge</Text>
            <Text style={styles.openCopy}>Reach your person.</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.reminderCard}>
          <Text style={styles.reminderEyebrow}>HOLD THIS FOR FUTURE ME</Text>
          <Text style={styles.reminderTitle}>Don't want to forget something?</Text>
          <TextInput
            value={reminder}
            onChangeText={setReminder}
            placeholder="Remind me when Bip reopens..."
            placeholderTextColor="#786b8e"
            maxLength={160}
            multiline
            style={styles.input}
            accessibilityLabel="Reminder for when Bip reopens"
            testID="quiet-reminder-input"
          />
          <TouchableOpacity
            style={[styles.saveButton, (!reminder.trim() || !reopensAt || saving) && styles.saveButtonDisabled]}
            onPress={saveReminder}
            disabled={!reminder.trim() || !reopensAt || saving}
            accessibilityRole="button"
            accessibilityLabel="Hold reminder until Bip reopens"
            testID="quiet-reminder-save"
          >
            {saving ? (
              <ActivityIndicator color="#171022" />
            ) : (
              <Text style={styles.saveButtonText}>Hold this for me</Text>
            )}
          </TouchableOpacity>
          {!!savedMessage && (
            <Text style={styles.savedMessage} accessibilityLiveRegion="polite" testID="quiet-reminder-status">
              {savedMessage}
            </Text>
          )}
        </View>

        <Text style={styles.footer}>You don't have to stay in the app to keep the thought.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#090514',
  },
  loading: {
    flex: 1,
    backgroundColor: '#090514',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 32,
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#8f7ba9',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2.2,
    textAlign: 'center',
  },
  moon: {
    fontSize: 46,
    textAlign: 'center',
    marginTop: 14,
  },
  title: {
    color: '#f8f3ff',
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    color: '#b7a9ca',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginTop: 8,
  },
  openRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 26,
  },
  openCard: {
    flex: 1,
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(221,214,254,0.14)',
    backgroundColor: 'rgba(91,51,126,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  openEmoji: {
    fontSize: 24,
  },
  openTitle: {
    color: '#f4edff',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 7,
  },
  openCopy: {
    color: '#9686aa',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
  reminderCard: {
    marginTop: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(240,201,106,0.18)',
    backgroundColor: 'rgba(23,12,36,0.88)',
    padding: 17,
  },
  reminderEyebrow: {
    color: '#c9a95e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.25,
  },
  reminderTitle: {
    color: '#f4edff',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 5,
  },
  input: {
    minHeight: 70,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(221,214,254,0.14)',
    backgroundColor: 'rgba(255,255,255,0.035)',
    color: '#f8f3ff',
    fontSize: 14,
    lineHeight: 20,
    padding: 12,
    marginTop: 12,
    textAlignVertical: 'top',
  },
  saveButton: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: '#ddd6fe',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: {
    opacity: 0.42,
  },
  saveButtonText: {
    color: '#171022',
    fontSize: 13,
    fontWeight: '800',
  },
  savedMessage: {
    color: '#cfc3df',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
  },
  footer: {
    color: '#776986',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 17,
  },
});

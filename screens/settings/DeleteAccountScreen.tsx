/**
 * DeleteAccountScreen.tsx
 *
 * Full-screen account-deletion request UI. The actual deletion is handled by
 * the repository's canonical seven-day, cancellable deletion processor.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  requestAccountDeletion,
  type AccountDeletionRequest,
} from '@/services/accountDeletion';

const WHAT_GETS_DELETED = [
  "Your Se'kret Bip account and login",
  'Account-owned conversations and companion history',
  'Account-owned journal, rewards, and profile data',
  'Parent or teen relationship access tied to your account',
  'Private uploads stored under your account path',
];

function formatDeletionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'after the seven-day grace period';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scheduledRequest, setScheduledRequest] = useState<AccountDeletionRequest | null>(null);

  const scheduleDeletion = () => {
    Alert.alert(
      'Schedule account deletion?',
      'Your account will be scheduled for deletion after a seven-day grace period. You can cancel from Settings before processing begins.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Schedule deletion',
          style: 'destructive',
          onPress: () => void performDeletionRequest(),
        },
      ],
    );
  };

  const performDeletionRequest = async () => {
    setLoading(true);
    try {
      const result = await requestAccountDeletion();
      if (!result.ok) throw new Error(result.message);

      setScheduledRequest(result.value);
      Alert.alert(
        'Deletion scheduled',
        `Your account is scheduled for deletion on ${formatDeletionDate(result.value.scheduledFor)}. You can cancel from Settings before processing begins.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not schedule account deletion.';
      Alert.alert(
        'Could not schedule deletion',
        `${message}\n\nPlease check your connection and try again.`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Delete your account</Text>
        <Text style={styles.subtitle}>
          Account deletion uses a seven-day grace period so you can cancel an accidental request before processing begins.
        </Text>

        <View style={styles.listCard}>
          <Text style={styles.listTitle}>When the grace period ends, deletion includes:</Text>
          {WHAT_GETS_DELETED.map((item) => (
            <View key={item} style={styles.listRow}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.listItem}>{item}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.warning}>
          If you have an active subscription, cancel it in the App Store separately. Deleting your Se'kret Bip account does not cancel an App Store subscription.
        </Text>

        {scheduledRequest ? (
          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Deletion scheduled</Text>
            <Text style={styles.statusText}>
              Processing is scheduled for {formatDeletionDate(scheduledRequest.scheduledFor)}. Return to Settings to review or cancel the request before then.
            </Text>
          </View>
        ) : loading ? (
          <ActivityIndicator size="large" color="#c0392b" style={styles.loader} />
        ) : (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={scheduleDeletion}
            accessibilityLabel="Schedule account deletion"
            accessibilityRole="button"
          >
            <Text style={styles.deleteButtonText}>Schedule account deletion</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => router.back()}
          accessibilityRole="button"
        >
          <Text style={styles.cancelButtonText}>
            {scheduledRequest ? 'Back to Settings' : 'Cancel'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.support}>
          Need help? Contact{' '}
          <Text style={styles.supportLink}>support@sekretbip.net</Text>
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf9f7' },
  scroll: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#555', lineHeight: 24, marginBottom: 24 },
  listCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  listTitle: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 12 },
  listRow: { flexDirection: 'row', marginBottom: 8 },
  bullet: { color: '#c0392b', marginRight: 8, fontSize: 16 },
  listItem: { fontSize: 14, color: '#444', lineHeight: 20, flex: 1 },
  warning: {
    fontSize: 13,
    color: '#8a6a00',
    backgroundColor: '#fff8e1',
    borderRadius: 8,
    padding: 12,
    marginBottom: 28,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#c0392b',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    minHeight: 54,
  },
  deleteButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  statusCard: {
    backgroundColor: '#fff3f1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c0392b55',
    padding: 16,
    marginBottom: 12,
  },
  statusTitle: { color: '#96281b', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  statusText: { color: '#6b3029', fontSize: 14, lineHeight: 20 },
  cancelButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.15)',
    minHeight: 54,
  },
  cancelButtonText: { color: '#333', fontSize: 16 },
  loader: { marginVertical: 20 },
  support: { fontSize: 13, color: '#888', textAlign: 'center' },
  supportLink: { color: '#01696f' },
});

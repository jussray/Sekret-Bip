import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  cancelAccountDeletion,
  fetchAccountDeletionRequest,
  requestAccountDeletion,
  type AccountDeletionRequest,
} from '@/services/accountDeletion';

function formatDeletionDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'after the seven-day grace period';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function AccountDeletionControls() {
  const [request, setRequest] = useState<AccountDeletionRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setRequest(await fetchAccountDeletionRequest());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const scheduleDeletion = useCallback(() => {
    Alert.alert(
      'Schedule account deletion?',
      'Your account will be scheduled for deletion after a seven-day grace period. You can cancel before processing begins. This includes account-owned server data and private uploads.',
      [
        { text: 'Keep account', style: 'cancel' },
        {
          text: 'Schedule deletion',
          style: 'destructive',
          onPress: async () => {
            setIsSubmitting(true);
            const result = await requestAccountDeletion();
            setIsSubmitting(false);
            if (!result.ok) {
              Alert.alert('Could not schedule deletion', result.message);
              return;
            }
            setRequest(result.value);
            Alert.alert(
              'Deletion scheduled',
              `Your account is scheduled for deletion on ${formatDeletionDate(result.value.scheduledFor)}. You can cancel from Settings before processing begins.`,
            );
          },
        },
      ],
    );
  }, []);

  const cancelDeletion = useCallback(() => {
    Alert.alert(
      'Cancel account deletion?',
      'Your account and data will remain active.',
      [
        { text: 'Keep scheduled', style: 'cancel' },
        {
          text: 'Cancel deletion',
          onPress: async () => {
            setIsSubmitting(true);
            const result = await cancelAccountDeletion();
            setIsSubmitting(false);
            if (!result.ok) {
              Alert.alert('Could not cancel deletion', result.message);
              return;
            }
            setRequest(result.value);
            Alert.alert('Deletion cancelled', 'Your account is no longer scheduled for deletion.');
          },
        },
      ],
    );
  }, []);

  if (isLoading) {
    return <Text style={styles.status}>Checking account status…</Text>;
  }

  const isPending = request?.status === 'pending';
  const isProcessing = request?.status === 'processing';

  return (
    <View style={styles.container}>
      {isPending ? (
        <>
          <Text style={styles.status}>
            Account deletion scheduled for {formatDeletionDate(request.scheduledFor)}. You can cancel before processing begins.
          </Text>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={cancelDeletion}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel scheduled account deletion"
          >
            <Text style={styles.secondaryText}>{isSubmitting ? 'Cancelling…' : 'Cancel scheduled deletion'}</Text>
          </TouchableOpacity>
        </>
      ) : isProcessing ? (
        <Text style={styles.status}>Account deletion is being processed and can no longer be cancelled.</Text>
      ) : (
        <TouchableOpacity
          style={styles.dangerButton}
          onPress={scheduleDeletion}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Schedule account deletion"
        >
          <Text style={styles.dangerText}>{isSubmitting ? 'Scheduling…' : 'Schedule account deletion'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 10 },
  status: { color: '#fca5a5', textAlign: 'center', marginBottom: 10, lineHeight: 20 },
  dangerButton: { padding: 14, borderRadius: 16, backgroundColor: '#991b1b', alignItems: 'center' },
  dangerText: { color: '#fff', fontWeight: '800' },
  secondaryButton: { padding: 14, borderRadius: 16, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center' },
  secondaryText: { color: '#fca5a5', fontWeight: '800' },
});

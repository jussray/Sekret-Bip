import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  fetchParentLinkStatuses,
  revokeParentLinkResult,
  type ParentLinkAccountSide,
  type ParentLinkStatusSnapshot,
} from '@/utils/relationshipLinkStatus';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; links: ParentLinkStatusSnapshot[] };

interface ParentLinkStatusCardProps {
  accountSide: ParentLinkAccountSide;
  refreshKey?: number;
  onRevoked?: () => void;
}

function statusCopy(link: ParentLinkStatusSnapshot): string {
  if (link.status === 'active') return 'Linked access is active.';
  if (link.status === 'pending') {
    if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
      return 'This invitation has reached its expiry time. Generate a fresh code to continue.';
    }
    return 'An invitation is waiting to be accepted.';
  }
  if (link.status === 'revoked') return 'This link has been revoked.';
  if (link.status === 'expired') return 'This invitation expired before it was accepted.';
  return 'Link status is unavailable.';
}

function updatedCopy(updatedAt: string | null): string | null {
  if (!updatedAt) return null;
  const value = new Date(updatedAt);
  if (Number.isNaN(value.getTime())) return null;
  return `Updated ${value.toLocaleString()}`;
}

export function ParentLinkStatusCard({
  accountSide,
  refreshKey = 0,
  onRevoked,
}: ParentLinkStatusCardProps) {
  const counterparty = accountSide === 'teen' ? 'parent' : 'teen';
  const requestId = useRef(0);
  const [loadState, setLoadState] = useState<LoadState>({ kind: 'loading' });
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setLoadState({ kind: 'loading' });
    const result = await fetchParentLinkStatuses(accountSide);
    if (currentRequest !== requestId.current) return;
    setLoadState(result.ok
      ? { kind: 'ready', links: result.value }
      : { kind: 'error', message: result.message });
  }, [accountSide]);

  useEffect(() => {
    void loadStatus();
    return () => {
      requestId.current += 1;
    };
  }, [loadStatus, refreshKey]);

  const confirmUnlink = useCallback((linkId?: string) => {
    const exactLink = Boolean(linkId);
    Alert.alert(
      `Unlink ${counterparty}?`,
      exactLink
        ? 'Linked access will be removed immediately. A new invite is required to reconnect.'
        : 'Status is unavailable. The app will ask the secure server to remove the current parent link without guessing from cached UI state.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            setUnlinkingId(linkId ?? 'current-link');
            const result = await revokeParentLinkResult(linkId);
            setUnlinkingId(null);

            if (!result.ok) {
              Alert.alert('Could not unlink', result.message);
              return;
            }
            if (!result.value) {
              Alert.alert('Already unlinked', 'No active or pending link was found. Refresh status to confirm.');
              await loadStatus();
              return;
            }

            onRevoked?.();
            Alert.alert(`${counterparty === 'parent' ? 'Parent' : 'Teen'} unlinked`, 'Linked access has been removed.');
            await loadStatus();
          },
        },
      ],
    );
  }, [counterparty, loadStatus, onRevoked]);

  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>{counterparty === 'parent' ? 'Parent' : 'Teen'} link status</Text>

      {loadState.kind === 'loading' && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#a78bfa" />
          <Text style={styles.body}>Loading secure link status…</Text>
        </View>
      )}

      {loadState.kind === 'error' && (
        <View>
          <Text style={styles.error}>{loadState.message}</Text>
          <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => void loadStatus()}>
            <Text style={styles.secondaryButtonText}>Retry status</Text>
          </TouchableOpacity>
          {accountSide === 'teen' && (
            <>
              <Text style={styles.warning}>A teen has one canonical parent-link row, so server-side unlinking can still be requested while status is unavailable.</Text>
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.dangerButton}
                disabled={unlinkingId !== null}
                onPress={() => confirmUnlink()}
              >
                <Text style={styles.dangerButtonText}>{unlinkingId ? 'Unlinking…' : 'Unlink current parent anyway'}</Text>
              </TouchableOpacity>
            </>
          )}
          {accountSide === 'parent' && (
            <Text style={styles.warning}>For safety, retry before unlinking so the app does not guess which link you meant.</Text>
          )}
        </View>
      )}

      {loadState.kind === 'ready' && loadState.links.length === 0 && (
        <Text style={styles.body}>No {counterparty} link is recorded for this account.</Text>
      )}

      {loadState.kind === 'ready' && loadState.links.map((link, index) => {
        const updated = updatedCopy(link.updatedAt);
        return (
          <View key={link.linkId} style={styles.linkRow}>
            <Text style={styles.statusLabel}>
              {loadState.links.length > 1 ? `Link ${index + 1}: ` : ''}{link.status}
            </Text>
            <Text style={styles.body}>{statusCopy(link)}</Text>
            {updated && <Text style={styles.metadata}>{updated}</Text>}
            {link.canRevoke && (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.dangerButton}
                disabled={unlinkingId !== null}
                onPress={() => confirmUnlink(link.linkId)}
              >
                <Text style={styles.dangerButtonText}>
                  {unlinkingId === link.linkId ? 'Unlinking…' : `Unlink ${counterparty}`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, borderWidth: 1, borderColor: '#6d5aa5', padding: 14, marginBottom: 10 },
  heading: { color: '#fff', fontWeight: '800', fontSize: 15, marginBottom: 8 },
  body: { color: '#ddd6fe', lineHeight: 20 },
  error: { color: '#fecaca', lineHeight: 20, marginBottom: 10 },
  warning: { color: '#fde68a', lineHeight: 19, marginTop: 10, marginBottom: 10 },
  metadata: { color: '#a99bc7', fontSize: 12, marginTop: 4 },
  statusLabel: { color: '#c4b5fd', fontWeight: '800', textTransform: 'capitalize', marginBottom: 4 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.10)', paddingTop: 10, marginTop: 8 },
  secondaryButton: { borderRadius: 14, borderWidth: 1, borderColor: '#a78bfa', padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: '#ddd6fe', fontWeight: '800' },
  dangerButton: { borderRadius: 14, backgroundColor: '#ef4444', padding: 12, alignItems: 'center', marginTop: 10 },
  dangerButtonText: { color: '#1e1236', fontWeight: '800' },
});

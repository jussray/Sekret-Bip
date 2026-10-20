import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getCurrentFounderProfile, isFounderProfile } from '@/services/founderAudit';
import { getSupabase } from '@/utils/supabase';

type GuardianReviewRow = {
  target_user_id: string;
  email: string | null;
  private_display_name: string | null;
  verification_state: 'PENDING_GUARDIAN_REVIEW';
  verification_reason: string | null;
  submitted_at: string;
};

type ReviewGateState =
  | { phase: 'idle' }
  | { phase: 'review'; row: GuardianReviewRow; approve: boolean; note: string }
  | { phase: 'confirm'; row: GuardianReviewRow; approve: boolean; note: string };

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function GuardianReviewsPanel() {
  const [rows, setRows] = useState<GuardianReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const [gate, setGate] = useState<ReviewGateState>({ phase: 'idle' });

  const load = useCallback(async () => {
    setError(null);
    const founder = await getCurrentFounderProfile();
    if (!founder || !isFounderProfile(founder) || !founder.can_manage_app) {
      setAuthorized(false);
      setRows([]);
      setLoading(false);
      return;
    }

    setAuthorized(true);
    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      setLoading(false);
      return;
    }

    const { data, error: queueError } = await supabase.rpc('list_guardian_verification_queue');
    if (queueError) {
      setError(queueError.message);
      setRows([]);
    } else {
      setRows((data ?? []) as GuardianReviewRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function refresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  function openGate(row: GuardianReviewRow, approve: boolean) {
    setError(null);
    setGate({ phase: 'review', row, approve, note: '' });
  }

  function updateGateNote(note: string) {
    if (gate.phase === 'idle') return;
    setGate({ ...gate, note });
  }

  function advanceToConfirmation() {
    if (gate.phase !== 'review') return;
    if (!gate.approve && !gate.note.trim()) {
      setError('A reason is required before rejecting a guardian review.');
      return;
    }
    setError(null);
    setGate({ ...gate, phase: 'confirm' });
  }

  async function applyDecision() {
    if (gate.phase !== 'confirm' || busyId) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase is not configured.');
      return;
    }

    const { row, approve, note } = gate;
    setBusyId(row.target_user_id);
    setError(null);

    try {
      const { error: reviewError } = await supabase.rpc('review_guardian_verification', {
        p_target_user_id: row.target_user_id,
        p_approve: approve,
        p_reason: note.trim() || null,
      });
      if (reviewError) throw reviewError;

      await load();
      setGate({ phase: 'idle' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to review this guardian account.');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#a78bfa" /></View>;
  }

  if (!authorized) {
    return (
      <View style={styles.center}>
        <Text style={styles.locked}>Founder or admin management access is required.</Text>
      </View>
    );
  }

  if (gate.phase !== 'idle') {
    const busy = busyId === gate.row.target_user_id;
    const isConfirming = gate.phase === 'confirm';

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>{isConfirming ? 'CONFIRM LIVE RPC' : 'REVIEW DECISION'}</Text>
        <Text style={styles.title}>
          {gate.approve ? 'Approve this guardian account?' : 'Reject this guardian account?'}
        </Text>
        <Text style={styles.body}>
          This submits the existing live guardian-review RPC only after confirmation. It changes guardian verification state and writes a review record. It does not create a parent–teen link or grant access to teen private content.
        </Text>

        <View style={styles.blastCard}>
          <Text style={styles.blastTitle}>Verified blast radius</Text>
          <Text style={styles.blastItem}>• Updates this completed parent account's guardian verification state</Text>
          <Text style={styles.blastItem}>• Writes the reviewer, decision, reason, and timestamp to the guardian review record</Text>
          <Text style={styles.blastNot}>• Does not create parent_link data</Text>
          <Text style={styles.blastNot}>• Does not expose journal, voice note, companion chat, or private source content</Text>
        </View>

        <View style={styles.reviewTarget}>
          <Text style={styles.name}>{gate.row.private_display_name || 'Unnamed guardian'}</Text>
          <Text style={styles.email}>{gate.row.email || 'No email available'}</Text>
          <Text style={styles.meta}>Submitted {formatDate(gate.row.submitted_at)}</Text>
          {gate.row.verification_reason ? (
            <Text style={styles.meta}>Stated reason: {gate.row.verification_reason}</Text>
          ) : null}
        </View>

        {!isConfirming ? (
          <>
            <Text style={styles.fieldLabel}>
              {gate.approve ? 'Decision note (optional)' : 'Rejection reason (required)'}
            </Text>
            <TextInput
              value={gate.note}
              onChangeText={updateGateNote}
              placeholder={gate.approve ? 'Optional review note' : 'State the reason for rejection'}
              placeholderTextColor="#625b72"
              style={styles.input}
              multiline
              maxLength={500}
            />
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.ghost]}
                onPress={() => setGate({ phase: 'idle' })}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.planNext,
                  !gate.approve && !gate.note.trim() && styles.buttonDisabled,
                ]}
                disabled={!gate.approve && !gate.note.trim()}
                onPress={advanceToConfirmation}
              >
                <Text style={styles.planNextText}>Review final action</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.notePreview}>
              <Text style={styles.fieldLabel}>DECISION NOTE</Text>
              <Text style={styles.body}>{gate.note.trim() || 'No optional note provided.'}</Text>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                disabled={busy}
                style={[styles.button, styles.ghost, busy && styles.buttonDisabled]}
                onPress={() => setGate({ ...gate, phase: 'review' })}
              >
                <Text style={styles.ghostText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy}
                style={[
                  styles.button,
                  gate.approve ? styles.approve : styles.reject,
                  busy && styles.buttonDisabled,
                ]}
                onPress={() => void applyDecision()}
              >
                {busy ? (
                  <ActivityIndicator color={gate.approve ? '#07140e' : '#fda4af'} />
                ) : (
                  <Text style={gate.approve ? styles.approveText : styles.rejectText}>
                    {gate.approve ? 'Confirm approve' : 'Confirm reject'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#a78bfa" />}
    >
      <Text style={styles.kicker}>GUARDIAN REVIEW</Text>
      <Text style={styles.title}>Verify adults without touching teen consent.</Text>
      <Text style={styles.body}>
        Approval unlocks guardian-only Parent surfaces. It does not create a parent link or expose any teen journal, voice note, companion chat, or private source.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {rows.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Queue clear</Text>
          <Text style={styles.muted}>No completed Parent accounts are awaiting review.</Text>
        </View>
      ) : rows.map((row) => {
        const busy = busyId === row.target_user_id;
        return (
          <View key={row.target_user_id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.name}>{row.private_display_name || 'Unnamed guardian'}</Text>
                <Text style={styles.email}>{row.email || 'No email available'}</Text>
              </View>
              <Text style={styles.state}>PENDING</Text>
            </View>
            <Text style={styles.meta}>Submitted {formatDate(row.submitted_at)}</Text>
            {row.verification_reason ? <Text style={styles.meta}>Reason: {row.verification_reason}</Text> : null}
            <View style={styles.actions}>
              <TouchableOpacity
                disabled={busy}
                style={[styles.button, styles.reject, busy && styles.buttonDisabled]}
                onPress={() => openGate(row, false)}
              >
                <Text style={styles.rejectText}>Review rejection</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy}
                style={[styles.button, styles.approve, busy && styles.buttonDisabled]}
                onPress={() => openGate(row, true)}
              >
                <Text style={styles.approveText}>Review approval</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  content: { padding: 22, paddingTop: 72, paddingBottom: 48 },
  center: { flex: 1, backgroundColor: '#080611', alignItems: 'center', justifyContent: 'center', padding: 28 },
  locked: { color: '#c4b5fd', fontSize: 15, lineHeight: 22, textAlign: 'center' },
  kicker: { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 2.3, marginBottom: 10 },
  title: { color: '#fff', fontSize: 27, lineHeight: 34, fontWeight: '900', marginBottom: 12 },
  body: { color: '#aaa1b8', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  error: { color: '#fca5a5', fontSize: 13, lineHeight: 19, marginTop: 14 },
  empty: { borderWidth: 1, borderColor: '#2a2436', borderRadius: 20, padding: 22, backgroundColor: '#0d0a15' },
  emptyTitle: { color: '#fff', fontSize: 17, fontWeight: '900', marginBottom: 6 },
  muted: { color: '#7c7489', fontSize: 12, lineHeight: 18 },
  card: { borderWidth: 1, borderColor: '#2a2436', borderRadius: 20, padding: 18, backgroundColor: '#0d0a15', marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1 },
  name: { color: '#fff', fontSize: 16, fontWeight: '900' },
  email: { color: '#aaa1b8', fontSize: 12, marginTop: 4 },
  state: { color: '#fbbf24', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  meta: { color: '#7c7489', fontSize: 11, lineHeight: 17, marginTop: 8 },
  fieldLabel: { color: '#8f899e', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 7 },
  input: { minHeight: 88, borderRadius: 14, borderWidth: 1, borderColor: '#2f293c', color: '#fff', backgroundColor: '#080611', padding: 12, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  button: { flex: 1, minHeight: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  reject: { borderWidth: 1, borderColor: '#fb718566', backgroundColor: '#fb718514' },
  approve: { backgroundColor: '#6ee7b7' },
  ghost: { borderWidth: 1, borderColor: '#3b3448', backgroundColor: '#0d0a15' },
  planNext: { backgroundColor: '#6d28d9' },
  rejectText: { color: '#fda4af', fontSize: 13, fontWeight: '900' },
  approveText: { color: '#07140e', fontSize: 13, fontWeight: '900' },
  ghostText: { color: '#c4b5fd', fontSize: 13, fontWeight: '900' },
  planNextText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  blastCard: { borderRadius: 18, borderWidth: 1, borderColor: '#3b3448', backgroundColor: '#0d0a15', padding: 16, marginBottom: 18 },
  blastTitle: { color: '#fff', fontSize: 14, fontWeight: '900', marginBottom: 10 },
  blastItem: { color: '#a7f3d0', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  blastNot: { color: '#aaa1b8', fontSize: 12, lineHeight: 19, marginBottom: 4 },
  reviewTarget: { borderRadius: 18, borderWidth: 1, borderColor: '#2a2436', backgroundColor: '#0d0a15', padding: 16, marginBottom: 18 },
  notePreview: { borderRadius: 14, borderWidth: 1, borderColor: '#2f293c', backgroundColor: '#0d0a15', padding: 14 },
});

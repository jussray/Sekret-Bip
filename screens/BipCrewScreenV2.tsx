import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { CrewCheckIn, CrewMember } from '@/types';
import {
  loadOwnedCrewRelationships,
  setOwnedCrewRelationshipStatus,
  type CrewRelationship,
} from '@/services/crewRelationshipRepository';
import { syncCrewMember, deleteCrewMember } from '@/utils/sync';
import type { SyncStatus } from '../components/SyncBadge';

interface Props {
  t: Record<string, any>;
  mood: string;
  selectedSekret: 'rylane' | 'raylene' | string;
  crewMembers: CrewMember[];
  setCrewMembers: React.Dispatch<React.SetStateAction<CrewMember[]>>;
  crewCheckIns: CrewCheckIn[];
  setCrewCheckIns: React.Dispatch<React.SetStateAction<CrewCheckIn[]>>;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  syncStatus?: SyncStatus;
  withSyncWrap?: (fn: () => Promise<void>) => Promise<void>;
}

const EMOJIS = ['💜', '🌙', '☁️', '⭐', '🍜', '💫'];

function makeInviteCode(): string {
  const chars = 'BIPCREW0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function BipCrewScreen({
  selectedSekret,
  crewMembers,
  setCrewMembers,
  setCrewCheckIns,
  BottomNav,
  withSyncWrap,
}: Props) {
  const [relationships, setRelationships] = useState<CrewRelationship[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [privateLabel, setPrivateLabel] = useState('');
  const [commitment, setCommitment] = useState('');
  const [emoji, setEmoji] = useState(selectedSekret === 'rylane' ? '⭐' : '💜');
  const [cadence, setCadence] = useState<'daily' | 'weekly' | 'whenever'>('weekly');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      setRelationships(await loadOwnedCrewRelationships());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Crew connections could not load.');
    }
  }

  useEffect(() => { void refresh(); }, []);

  const liveIds = useMemo(
    () => new Set(relationships.map(item => String(item.id))),
    [relationships],
  );

  const localPending = useMemo(
    () => crewMembers.filter(member => !liveIds.has(String(member.id))),
    [crewMembers, liveIds],
  );

  function addPendingInvite() {
    const label = privateLabel.trim();
    if (!label) return;

    const numericIds = crewMembers.map(member => Number(member.id)).filter(Number.isFinite);
    const nextId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 1;
    const member: CrewMember = {
      id: nextId,
      name: label,
      emoji,
      commitment: commitment.trim() || 'we show up for each other',
      cadence,
      inviteCode: makeInviteCode(),
      addedAt: new Date().toISOString(),
    };

    setCrewMembers(current => [...current, member]);
    const write = async () => { syncCrewMember(member); };
    if (withSyncWrap) void withSyncWrap(write);
    else void write();

    setPrivateLabel('');
    setCommitment('');
    setShowInvite(false);
    setTimeout(() => void refresh(), 500);
  }

  async function changeLiveStatus(item: CrewRelationship, status: 'blocked' | 'removed') {
    const changed = await setOwnedCrewRelationshipStatus(item.id, status);
    if (!changed) {
      setError(`Could not mark this connection as ${status}.`);
      return;
    }
    await refresh();
  }

  function removeLocal(member: CrewMember) {
    setCrewMembers(current => current.filter(item => String(item.id) !== String(member.id)));
    setCrewCheckIns(current => current.filter(item => String(item.memberId) !== String(member.id)));
    deleteCrewMember(member.id);
  }

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>PRIVATE CONNECTIONS</Text>
        <Text style={styles.title}>Bip Crew</Text>
        <Text style={styles.subtitle}>
          Add as many trusted people as fit your life. Every account stays anonymous until the invite is accepted.
        </Text>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleTitle}>Crew identity rule</Text>
          <Text style={styles.ruleText}>Pending: anonymous account + Bip invite only.</Text>
          <Text style={styles.ruleText}>Accepted: trusted account name may appear inside Crew.</Text>
          <Text style={styles.ruleText}>Blocked or removed: private identity and shared access end immediately.</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.headerRow}>
          <Text style={styles.count}>Your Crew connections · {relationships.length + localPending.length}</Text>
          <TouchableOpacity onPress={() => setShowInvite(value => !value)}>
            <Text style={styles.add}>{showInvite ? 'close' : '+ create invite'}</Text>
          </TouchableOpacity>
        </View>

        {showInvite ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Create a private invite</Text>
            <Text style={styles.helper}>
              The label below is visible only to you while the account is pending. It is not treated as their identity.
            </Text>
            <TextInput
              value={privateLabel}
              onChangeText={setPrivateLabel}
              placeholder="your private label, like cousin or study buddy"
              placeholderTextColor="#746681"
              maxLength={60}
              style={styles.input}
            />
            <TextInput
              value={commitment}
              onChangeText={setCommitment}
              placeholder="what are y’all showing up for?"
              placeholderTextColor="#746681"
              maxLength={120}
              style={styles.input}
            />
            <View style={styles.wrap}>
              {EMOJIS.map(value => (
                <TouchableOpacity key={value} onPress={() => setEmoji(value)} style={[styles.emojiPick, emoji === value && styles.emojiActive]}>
                  <Text>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.wrap}>
              {(['daily', 'weekly', 'whenever'] as const).map(value => (
                <TouchableOpacity key={value} onPress={() => setCadence(value)} style={[styles.chip, cadence === value && styles.chipActive]}>
                  <Text style={styles.chipText}>{value}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity disabled={!privateLabel.trim()} onPress={addPendingInvite} style={[styles.primary, !privateLabel.trim() && styles.disabled]}>
              <Text style={styles.primaryText}>Create anonymous invite</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {relationships.map(item => (
          <View key={`live-${item.id}`} style={styles.card}>
            <View style={styles.memberRow}>
              <Text style={styles.memberEmoji}>{item.avatarEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{item.displayName}</Text>
                <Text style={styles.status}>{item.connectionStatus.replace('_', ' ')}</Text>
              </View>
            </View>

            {item.identityVisibility === 'anonymous' ? (
              <View style={styles.anonymousBox}>
                <Text style={styles.anonymousTitle}>Anonymous until accepted</Text>
                <Text style={styles.inviteCode}>Bip invite: {item.inviteCode}</Text>
              </View>
            ) : (
              <Text style={styles.accepted}>✓ accepted Crew identity</Text>
            )}

            <Text style={styles.commitment}>{item.commitment}</Text>
            <Text style={styles.cadence}>{item.cadence} check-in rhythm</Text>

            <View style={styles.actionRow}>
              {item.connectionStatus !== 'blocked' ? (
                <TouchableOpacity onPress={() => void changeLiveStatus(item, 'blocked')} style={styles.secondary}>
                  <Text style={styles.secondaryText}>block</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={() => void changeLiveStatus(item, 'removed')} style={styles.remove}>
                <Text style={styles.removeText}>remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {localPending.map(member => (
          <View key={`local-${member.id}`} style={styles.card}>
            <View style={styles.memberRow}>
              <Text style={styles.memberEmoji}>{member.emoji || '🌙'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>Anonymous account</Text>
                <Text style={styles.status}>pending</Text>
              </View>
            </View>
            <Text style={styles.privateLabel}>Your private label: {member.name}</Text>
            <Text style={styles.inviteCode}>Bip invite: {member.inviteCode}</Text>
            <Text style={styles.commitment}>{member.commitment}</Text>
            <TouchableOpacity onPress={() => removeLocal(member)} style={styles.remove}>
              <Text style={styles.removeText}>cancel invite</Text>
            </TouchableOpacity>
          </View>
        ))}

        {relationships.length === 0 && localPending.length === 0 && !showInvite ? (
          <Text style={styles.empty}>No Crew connections yet. There is no member limit.</Text>
        ) : null}
      </ScrollView>
      {BottomNav}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0c0713' },
  content: { padding: 18, paddingTop: 58, paddingBottom: 120 },
  kicker: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#a99db7', fontSize: 12, lineHeight: 19, marginTop: 6, marginBottom: 14 },
  ruleCard: { backgroundColor: '#1d1029', borderColor: '#5b3675', borderWidth: 1, borderRadius: 17, padding: 14, marginBottom: 14 },
  ruleTitle: { color: '#e9ddff', fontSize: 12, fontWeight: '900', marginBottom: 6 },
  ruleText: { color: '#a99bb7', fontSize: 10, lineHeight: 16 },
  error: { color: '#fecdd3', backgroundColor: '#3b1025', borderRadius: 12, padding: 10, marginBottom: 10 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  count: { color: '#d7cce4', fontSize: 11, fontWeight: '900' },
  add: { color: '#c4b5fd', fontSize: 11, fontWeight: '900' },
  card: { backgroundColor: '#160c20', borderColor: '#3b244c', borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 11 },
  cardTitle: { color: '#fff', fontSize: 14, fontWeight: '900' },
  helper: { color: '#8f809c', fontSize: 10, lineHeight: 16, marginTop: 4, marginBottom: 10 },
  input: { backgroundColor: '#0e0814', color: '#fff', borderRadius: 12, paddingHorizontal: 11, paddingVertical: 10, marginBottom: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 9 },
  emojiPick: { borderRadius: 999, borderWidth: 1, borderColor: '#3a2946', padding: 8 },
  emojiActive: { borderColor: '#a78bfa', backgroundColor: '#2c1940' },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#3a2946', paddingHorizontal: 10, paddingVertical: 6 },
  chipActive: { backgroundColor: '#6d28d9', borderColor: '#a78bfa' },
  chipText: { color: '#e9e1f1', fontSize: 10, fontWeight: '800' },
  primary: { backgroundColor: '#7c3aed', alignItems: 'center', borderRadius: 14, paddingVertical: 12, marginTop: 3 },
  disabled: { opacity: 0.4 },
  primaryText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  memberEmoji: { fontSize: 24 },
  memberName: { color: '#fff', fontSize: 14, fontWeight: '900' },
  status: { color: '#9b8ba9', fontSize: 9, marginTop: 2, textTransform: 'uppercase' },
  anonymousBox: { backgroundColor: '#0f0816', borderRadius: 12, padding: 10, marginTop: 10 },
  anonymousTitle: { color: '#c4b5fd', fontSize: 10, fontWeight: '900' },
  inviteCode: { color: '#b8acc5', fontSize: 11, fontWeight: '800', marginTop: 4 },
  accepted: { color: '#86efac', fontSize: 10, fontWeight: '900', marginTop: 9 },
  privateLabel: { color: '#8f809c', fontSize: 10, marginTop: 9 },
  commitment: { color: '#ddd3e7', fontSize: 11, lineHeight: 17, marginTop: 9 },
  cadence: { color: '#766a80', fontSize: 9, marginTop: 3 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 11 },
  secondary: { borderRadius: 999, borderWidth: 1, borderColor: '#6d4b7d', paddingHorizontal: 12, paddingVertical: 7 },
  secondaryText: { color: '#d8cde3', fontSize: 9, fontWeight: '900' },
  remove: { alignSelf: 'flex-start', borderRadius: 999, backgroundColor: '#3a1528', paddingHorizontal: 12, paddingVertical: 7, marginTop: 10 },
  removeText: { color: '#fda4af', fontSize: 9, fontWeight: '900' },
  empty: { color: '#7f718b', fontSize: 11, textAlign: 'center', paddingVertical: 30 },
});

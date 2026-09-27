import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { founderPreviewAudience, isFounderPreviewEnabled } from '@/constants/founderPreview';
import { isRelationshipFeatureAvailable } from '@/constants/relationshipFeatureFlags';
import {
  createCheckIn,
  fetchCrewFeed,
  fetchMyCheckIns,
  sendEncouragement,
  type CrewCheckInItem,
  type CrewFeedItem,
} from '@/services/crewAccountabilityService';
import { setAcceptedCrewConnectionStatus } from '@/services/crewRelationshipRepository';
import { getSupabase } from '@/utils/supabase';
import type { CrewCheckinEmoji } from '@/types/relationshipLayer';

const AUDIENCE = founderPreviewAudience();
const PREVIEW = isFounderPreviewEnabled();
const EMOJIS: CrewCheckinEmoji[] = ['great', 'okay', 'low', 'need_support', 'resting'];
const ENCOURAGEMENTS = [
  { key: 'with_you', label: 'with you 💜' },
  { key: 'proud_of_you', label: 'proud of you ⭐' },
  { key: 'keep_going', label: 'keep going 🌙' },
] as const;

interface TrustedProfile {
  userId: string;
  displayName: string;
  avatarEmoji: string;
}

type CrewProfileRow = {
  user_id: string;
  display_name: string;
  avatar_emoji: string;
};

const PREVIEW_PROFILES: TrustedProfile[] = [
  { userId: 'preview-crew-jay', displayName: 'Jay', avatarEmoji: '🌙' },
  { userId: 'preview-crew-kai', displayName: 'Kai', avatarEmoji: '☁️' },
  { userId: 'preview-crew-zuri', displayName: 'Zuri', avatarEmoji: '💜' },
];

const PREVIEW_MINE: CrewCheckInItem[] = [{
  id: 'preview-mine-1',
  ownerUserId: 'preview-founder',
  localDate: new Date().toISOString().slice(0, 10),
  emoji: 'okay',
  note: 'I showed up even though today felt noisy.',
  status: 'active',
  createdAt: new Date().toISOString(),
  shares: [{ sharedWith: 'preview-crew-jay', status: 'active' }],
}];

const PREVIEW_FEED: CrewFeedItem[] = [{
  checkInId: 'preview-feed-checkin-1',
  shareId: 'preview-feed-share-1',
  ownerUserId: 'preview-crew-jay',
  localDate: new Date().toISOString().slice(0, 10),
  emoji: 'need_support',
  note: 'Could use a little encouragement today.',
  createdAt: new Date().toISOString(),
  encouragementCount: 1,
  myEncouragementKey: null,
}];

async function loadOwnedAcceptedIds(): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;
  if (!user || user.is_anonymous) return [];

  const { data, error } = await supabase
    .from('crew_members')
    .select('member_user_id')
    .eq('user_id', user.id)
    .eq('connection_status', 'accepted')
    .not('member_user_id', 'is', null);
  if (error) throw error;

  return [...new Set(
    (data ?? [])
      .map(row => row.member_user_id as string | null)
      .filter((value): value is string => Boolean(value)),
  )];
}

async function loadTrustedProfiles(userIds: string[]): Promise<TrustedProfile[]> {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('get_crew_connection_profiles', {
    p_user_ids: uniqueIds,
  });
  if (error) throw error;

  return ((data ?? []) as CrewProfileRow[]).map(profile => ({
    userId: profile.user_id,
    displayName: profile.display_name?.trim() || 'Accepted Crew member',
    avatarEmoji: profile.avatar_emoji?.trim() || '🌙',
  }));
}

export function CrewAccountabilityScreen() {
  const available = isRelationshipFeatureAvailable('crewAccountability', AUDIENCE);
  const [ownedMemberIds, setOwnedMemberIds] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<TrustedProfile[]>([]);
  const [myCheckIns, setMyCheckIns] = useState<CrewCheckInItem[]>([]);
  const [feed, setFeed] = useState<CrewFeedItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [emoji, setEmoji] = useState<CrewCheckinEmoji>('okay');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(available);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewSample, setPreviewSample] = useState(false);

  const refresh = useCallback(async () => {
    if (!available) return;
    setError(null);
    setLoading(true);
    try {
      const [acceptedIds, mine, shared] = await Promise.all([
        loadOwnedAcceptedIds(),
        fetchMyCheckIns(AUDIENCE),
        fetchCrewFeed(AUDIENCE),
      ]);

      const feedItems = shared.ok ? shared.value : [];
      const trustedProfiles = await loadTrustedProfiles([
        ...acceptedIds,
        ...feedItems.map(item => item.ownerUserId),
      ]);

      const hasLiveData = acceptedIds.length > 0
        || (mine.ok && mine.value.length > 0)
        || feedItems.length > 0;

      if (PREVIEW && !hasLiveData) {
        setOwnedMemberIds(PREVIEW_PROFILES.map(profile => profile.userId));
        setProfiles(PREVIEW_PROFILES);
        setMyCheckIns(PREVIEW_MINE);
        setFeed(PREVIEW_FEED);
        setPreviewSample(true);
        return;
      }

      setPreviewSample(false);
      setOwnedMemberIds(acceptedIds);
      setProfiles(trustedProfiles);
      if (mine.ok) setMyCheckIns(mine.value);
      else setError(mine.message);
      if (shared.ok) setFeed(shared.value);
      else setError(current => current ?? shared.message);
    } catch (caught) {
      if (PREVIEW) {
        setOwnedMemberIds(PREVIEW_PROFILES.map(profile => profile.userId));
        setProfiles(PREVIEW_PROFILES);
        setMyCheckIns(PREVIEW_MINE);
        setFeed(PREVIEW_FEED);
        setPreviewSample(true);
        setError(null);
      } else {
        setError(caught instanceof Error ? caught.message : 'Crew could not load.');
      }
    } finally {
      setLoading(false);
    }
  }, [available]);

  useEffect(() => { void refresh(); }, [refresh]);

  const profileMap = useMemo(
    () => new Map(profiles.map(profile => [profile.userId, profile])),
    [profiles],
  );
  const selectableMembers = useMemo(
    () => ownedMemberIds.map(userId => profileMap.get(userId)).filter((value): value is TrustedProfile => Boolean(value)),
    [ownedMemberIds, profileMap],
  );
  const selectedMembers = useMemo(
    () => selectableMembers.filter(member => selectedIds.has(member.userId)),
    [selectableMembers, selectedIds],
  );

  function toggleMember(userId: string) {
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(current => current.size === selectableMembers.length
      ? new Set()
      : new Set(selectableMembers.map(member => member.userId)));
  }

  async function submitCheckIn() {
    if (selectedIds.size === 0 || saving) return;
    setSaving(true);
    setError(null);

    if (previewSample) {
      const now = new Date();
      setMyCheckIns(current => [{
        id: `preview-${now.getTime()}`,
        ownerUserId: 'preview-founder',
        localDate: now.toISOString().slice(0, 10),
        emoji,
        note: note.trim() || null,
        status: 'active',
        createdAt: now.toISOString(),
        shares: [...selectedIds].map(sharedWith => ({ sharedWith, status: 'active' as const })),
      }, ...current]);
      setNote('');
      setSelectedIds(new Set());
      setSaving(false);
      return;
    }

    const result = await createCheckIn({
      localDate: new Date().toISOString().slice(0, 10),
      emoji,
      note,
      shareWithUserIds: [...selectedIds],
    }, AUDIENCE);

    if (!result.ok) setError(result.message);
    else {
      setNote('');
      setSelectedIds(new Set());
      await refresh();
    }
    setSaving(false);
  }

  async function encourage(item: CrewFeedItem, presetKey: string) {
    if (previewSample) {
      setFeed(current => current.map(entry => entry.shareId === item.shareId
        ? {
            ...entry,
            encouragementCount: entry.myEncouragementKey ? entry.encouragementCount : entry.encouragementCount + 1,
            myEncouragementKey: presetKey,
          }
        : entry));
      return;
    }

    const result = await sendEncouragement({
      checkInId: item.checkInId,
      recipientUserId: item.ownerUserId,
      presetKey,
      localDate: new Date().toISOString().slice(0, 10),
    }, AUDIENCE);
    if (!result.ok) setError(result.message);
    else await refresh();
  }

  async function endConnection(otherUserId: string, status: 'blocked' | 'removed') {
    if (previewSample) {
      setFeed(current => current.filter(item => item.ownerUserId !== otherUserId));
      setProfiles(current => current.filter(profile => profile.userId !== otherUserId));
      return;
    }

    const changed = await setAcceptedCrewConnectionStatus(otherUserId, status);
    if (!changed) setError(`Could not mark this connection as ${status}.`);
    else await refresh();
  }

  if (!available) {
    return (
      <View style={styles.center}>
        <Text style={styles.previewEmoji}>🤝</Text>
        <Text style={styles.previewTitle}>Private Crew is being prepared.</Text>
        <Text style={styles.previewBody}>Only permanent accounts with accepted Bip-ID connections can enter Crew.</Text>
      </View>
    );
  }

  if (loading) return <View style={styles.center}><ActivityIndicator color="#a855f7" /></View>;

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>PRIVATE ACCOUNTABILITY</Text>
      <Text style={styles.title}>Bip Crew</Text>
      <Text style={styles.subtitle}>
        Unlimited accepted Crew. Private names appear only after acceptance; everybody else stays anonymous.
      </Text>

      {previewSample ? (
        <View style={styles.previewBanner}>
          <Text style={styles.previewBannerTitle}>FOUNDER PREVIEW SAMPLE</Text>
          <Text style={styles.previewBannerBody}>These accepted members and check-ins are local demo data. Nothing is written to Supabase.</Text>
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>How are you showing up today?</Text>
        <View style={styles.rowWrap}>
          {EMOJIS.map(value => (
            <TouchableOpacity key={value} onPress={() => setEmoji(value)} style={[styles.chip, emoji === value && styles.chipActive]}>
              <Text style={styles.chipText}>{value.replace('_', ' ')}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={280}
          multiline
          placeholder="a short note for your crew…"
          placeholderTextColor="#6b5a78"
          style={styles.input}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>Share with accepted Crew · {selectableMembers.length}</Text>
          {selectableMembers.length > 0 ? (
            <TouchableOpacity onPress={toggleAll}>
              <Text style={styles.selectAll}>{selectedIds.size === selectableMembers.length ? 'clear all' : 'select all'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {selectableMembers.length === 0 ? (
          <Text style={styles.empty}>No accepted Crew connections yet. Pending accounts stay anonymous.</Text>
        ) : selectableMembers.map(member => {
          const selected = selectedIds.has(member.userId);
          return (
            <TouchableOpacity key={member.userId} onPress={() => toggleMember(member.userId)} style={[styles.member, selected && styles.memberSelected]}>
              <Text style={styles.memberEmoji}>{member.avatarEmoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.displayName}</Text>
                <Text style={styles.acceptedLabel}>accepted Crew identity</Text>
              </View>
              <Text style={styles.check}>{selected ? '✓' : '○'}</Text>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity disabled={selectedMembers.length === 0 || saving} onPress={() => void submitCheckIn()} style={[styles.primary, (selectedMembers.length === 0 || saving) && styles.disabled]}>
          <Text style={styles.primaryText}>{saving ? 'sharing…' : `Share with ${selectedMembers.length}`}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Shared with you</Text>
        {feed.length === 0 ? <Text style={styles.empty}>Nothing shared with you yet.</Text> : feed.map(item => {
          const sender = profileMap.get(item.ownerUserId);
          return (
            <View key={item.shareId} style={styles.feedItem}>
              <Text style={styles.feedEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.feedSender}>{sender?.displayName ?? 'Accepted Crew member'}</Text>
                <Text style={styles.feedNote}>{item.note || 'A quiet check-in.'}</Text>
                <Text style={styles.feedMeta}>{item.localDate} · {item.encouragementCount} encouragements</Text>
                <View style={styles.rowWrap}>
                  {ENCOURAGEMENTS.map(preset => (
                    <TouchableOpacity key={preset.key} onPress={() => void encourage(item, preset.key)} style={[styles.encouragement, item.myEncouragementKey === preset.key && styles.encouragementSelected]}>
                      <Text style={styles.encouragementText}>{preset.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={styles.connectionActions}>
                  <TouchableOpacity onPress={() => void endConnection(item.ownerUserId, 'removed')}>
                    <Text style={styles.leaveText}>leave Crew</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void endConnection(item.ownerUserId, 'blocked')}>
                    <Text style={styles.blockText}>block</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your recent check-ins</Text>
        {myCheckIns.length === 0 ? <Text style={styles.empty}>No check-ins yet.</Text> : myCheckIns.slice(0, 10).map(item => (
          <View key={item.id} style={styles.historyItem}>
            <Text style={styles.historyEmoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.historyNote}>{item.note || 'Quiet check-in'}</Text>
              <Text style={styles.feedMeta}>{item.localDate} · shared with {item.shares.filter(share => share.status === 'active').length}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0616' },
  content: { padding: 18, paddingTop: 58, paddingBottom: 120 },
  center: { flex: 1, backgroundColor: '#0d0616', alignItems: 'center', justifyContent: 'center', padding: 28 },
  kicker: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: '#a99bb8', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 16 },
  previewEmoji: { fontSize: 42 },
  previewTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginTop: 12 },
  previewBody: { color: '#a99bb8', textAlign: 'center', lineHeight: 20, marginTop: 8 },
  previewBanner: { backgroundColor: '#24123c', borderColor: '#8b5cf655', borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  previewBannerTitle: { color: '#c4b5fd', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  previewBannerBody: { color: '#aa9db9', fontSize: 11, lineHeight: 17, marginTop: 4 },
  error: { color: '#fecdd3', backgroundColor: '#3b1025', borderRadius: 12, padding: 11, marginBottom: 10 },
  card: { backgroundColor: '#160b22', borderColor: '#3d2055', borderWidth: 1, borderRadius: 20, padding: 15, marginBottom: 14 },
  cardTitle: { color: '#f4edff', fontSize: 15, fontWeight: '900', marginBottom: 11 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { borderRadius: 999, borderWidth: 1, borderColor: '#3e2652', paddingHorizontal: 10, paddingVertical: 7 },
  chipActive: { backgroundColor: '#6d28d9', borderColor: '#a78bfa' },
  chipText: { color: '#eee7f8', fontSize: 10, fontWeight: '800' },
  input: { minHeight: 78, color: '#fff', backgroundColor: '#0f0718', borderRadius: 14, padding: 12, textAlignVertical: 'top', marginTop: 12, marginBottom: 13 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  sectionLabel: { color: '#9c8dab', fontSize: 10, fontWeight: '900' },
  selectAll: { color: '#c4b5fd', fontSize: 10, fontWeight: '900' },
  empty: { color: '#796a87', fontSize: 11, lineHeight: 17, paddingVertical: 8 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1, borderColor: '#2e1b3d', padding: 11, marginBottom: 7 },
  memberSelected: { borderColor: '#a78bfa', backgroundColor: '#2b1742' },
  memberEmoji: { fontSize: 21 },
  memberName: { color: '#fff', fontSize: 12, fontWeight: '900' },
  acceptedLabel: { color: '#7f7190', fontSize: 9, marginTop: 2 },
  check: { color: '#c4b5fd', fontSize: 18, fontWeight: '900' },
  primary: { backgroundColor: '#7c3aed', borderRadius: 16, alignItems: 'center', paddingVertical: 13, marginTop: 10 },
  disabled: { opacity: 0.4 },
  primaryText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  feedItem: { flexDirection: 'row', gap: 10, paddingVertical: 11, borderBottomColor: '#2a1838', borderBottomWidth: 1 },
  feedEmoji: { fontSize: 24 },
  feedSender: { color: '#c4b5fd', fontSize: 11, fontWeight: '900' },
  feedNote: { color: '#efe8f7', fontSize: 12, lineHeight: 18, marginTop: 2 },
  feedMeta: { color: '#756782', fontSize: 9, marginTop: 3 },
  encouragement: { borderRadius: 999, backgroundColor: '#21112f', paddingHorizontal: 9, paddingVertical: 6, marginTop: 7 },
  encouragementSelected: { backgroundColor: '#4c1d95' },
  encouragementText: { color: '#d9d0e5', fontSize: 9, fontWeight: '800' },
  connectionActions: { flexDirection: 'row', gap: 16, marginTop: 10 },
  leaveText: { color: '#c4b5fd', fontSize: 9, fontWeight: '900' },
  blockText: { color: '#fda4af', fontSize: 9, fontWeight: '900' },
  historyItem: { flexDirection: 'row', gap: 9, paddingVertical: 9, borderBottomColor: '#2a1838', borderBottomWidth: 1 },
  historyEmoji: { fontSize: 20 },
  historyNote: { color: '#eee7f6', fontSize: 11, lineHeight: 16 },
});

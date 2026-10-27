import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import {
  createPublicCirclePost,
  isHeavyCircleText,
  loadPublicCircleFeed,
  reactToPublicCirclePost,
  reportPublicCirclePost,
  type CircleReactionKey,
  type PublicCircleFeedItem,
} from '@/features/circle/circleRepository';
import {
  audienceLabel,
  CIRCLE_AUDIENCES,
} from '@/features/circle/audiencePolicy';
import type { CirclePost } from '@/types';

const HIDE_HEAVY_KEY = 'circle_hide_heavy_posts_v2';
const OPEN_BIP_AUDIENCE = CIRCLE_AUDIENCES.open_bip;
const OPEN_BIP_LABEL = audienceLabel('open_bip');
const REACTIONS: Array<{ key: CircleReactionKey; emoji: string; label: string }> = [
  { key: 'felt', emoji: '💜', label: 'felt this' },
  { key: 'comfort', emoji: '☁️', label: 'comfort' },
  { key: 'proud', emoji: '⭐', label: 'proud' },
  { key: 'stay', emoji: '🌙', label: 'stay' },
];

function toLegacyCirclePost(item: PublicCircleFeedItem): CirclePost {
  const createdAt = new Date(item.createdAt);
  return {
    id: item.id,
    text: item.text,
    date: createdAt.toLocaleDateString(),
    time: createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    reactions: item.reactions,
    postMood: item.postMood ?? undefined,
    mediaKind: item.mediaKind ?? undefined,
  };
}

export default function PublicCircleFeedV2() {
  const { setCirclePosts } = useAppContext();
  const [items, setItems] = useState<PublicCircleFeedItem[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [busyReaction, setBusyReaction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hideHeavy, setHideHeavy] = useState(false);

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const next = await loadPublicCircleFeed(50);
      setItems(next);
      setCirclePosts(next.map(toLegacyCirclePost));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Circle could not load.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [setCirclePosts]);

  useEffect(() => {
    void AsyncStorage.getItem(HIDE_HEAVY_KEY)
      .then(value => setHideHeavy(value === 'true'))
      .catch(() => {});
    void refresh();
  }, [refresh]);

  const visibleItems = useMemo(
    () => hideHeavy ? items.filter(item => !isHeavyCircleText(item.text)) : items,
    [hideHeavy, items],
  );

  function toggleHideHeavy(value: boolean) {
    setHideHeavy(value);
    void AsyncStorage.setItem(HIDE_HEAVY_KEY, value ? 'true' : 'false');
  }

  async function submitPost() {
    const text = draft.trim();
    if (!text || posting) return;

    setPosting(true);
    setError(null);
    try {
      const saved = await createPublicCirclePost(text);
      setItems(current => [saved, ...current.filter(item => item.id !== saved.id)]);
      setCirclePosts(current => [
        toLegacyCirclePost(saved),
        ...current.filter(item => item.id !== saved.id),
      ]);
      setDraft('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your post was not saved.');
    } finally {
      setPosting(false);
    }
  }

  async function react(item: PublicCircleFeedItem, reaction: CircleReactionKey) {
    const key = `${item.id}:${reaction}`;
    if (busyReaction) return;
    setBusyReaction(key);
    setError(null);
    try {
      const savedReaction = await reactToPublicCirclePost(item.id, reaction);
      setItems(current => current.map(post => post.id === item.id
        ? { ...post, viewerReaction: savedReaction }
        : post));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The reaction was not saved.');
    } finally {
      setBusyReaction(null);
    }
  }

  function confirmReport(item: PublicCircleFeedItem) {
    Alert.alert(
      'Report this bip?',
      'It will disappear from your feed while the report is reviewed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            void reportPublicCirclePost(item.id)
              .then(() => {
                setItems(current => current.filter(post => post.id !== item.id));
                setCirclePosts(current => current.filter(post => post.id !== item.id));
              })
              .catch(caught => {
                setError(caught instanceof Error ? caught.message : 'The report was not submitted.');
              });
          },
        },
      ],
    );
  }

  const header = (
    <View>
      <View style={styles.truthCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.truthTitle}>Newest bips</Text>
          <Text style={styles.truthBody}>
            Support has no public score. Only the person who posted can see their private totals.
          </Text>
        </View>
        <View style={styles.switchWrap}>
          <Text style={styles.switchLabel}>hide heavy</Text>
          <Switch value={hideHeavy} onValueChange={toggleHideHeavy} />
        </View>
      </View>

      <View style={styles.composeCard}>
        <View style={styles.audienceRow}>
          <View style={styles.audiencePill} accessibilityLabel={`Audience: ${OPEN_BIP_LABEL}`}>
            <Text style={styles.audiencePillText}>{OPEN_BIP_LABEL}</Text>
          </View>
          <Text style={styles.audienceHint}>inside Circle · faces stay hidden here</Text>
        </View>
        <Text style={styles.composeLabel}>put something into the circle</Text>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="say it here. keep private names out."
          placeholderTextColor="#695579"
          multiline
          maxLength={280}
          style={styles.input}
        />
        <Text style={styles.audienceRule}>{OPEN_BIP_AUDIENCE.description}</Text>
        <View style={styles.composeFooter}>
          <Text style={styles.count}>{draft.length}/280</Text>
          <TouchableOpacity
            disabled={!draft.trim() || posting}
            onPress={submitPost}
            style={[styles.postButton, (!draft.trim() || posting) && styles.disabled]}
          >
            {posting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.postButtonText}>Bip it 💜</Text>}
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => void refresh(true)}>
            <Text style={styles.retry}>try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#a855f7" />
        <Text style={styles.loadingText}>opening the circle…</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={item => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} />}
      ListHeaderComponent={header}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌙</Text>
          <Text style={styles.emptyText}>{hideHeavy ? 'No lighter posts are here yet.' : 'The circle is quiet. Be the first to bip.'}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const createdAt = new Date(item.createdAt);
        return (
          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.86}
            onPress={() => router.push(`/(teen)/circle/${item.id}` as never)}
          >
            <View style={styles.authorRow}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.avatarEmoji}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.author}>{item.nickname}</Text>
                <Text style={styles.meta}>{createdAt.toLocaleDateString()} · {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmReport(item)} hitSlop={10}>
                <Text style={styles.report}>•••</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.body}>{item.text}</Text>

            {item.isOwnPost ? (
              <View style={styles.privateSupportCard} accessibilityLabel="Private support totals, visible only to you">
                <Text style={styles.privateSupportTitle}>🔒 support on your bip · only you</Text>
                <View style={styles.privateSupportRow}>
                  {REACTIONS.map(reaction => (
                    <View key={reaction.key} style={styles.privateSupportPill}>
                      <Text style={styles.privateSupportText}>
                        {reaction.emoji} {item.reactions[reaction.key]}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={styles.reactions}>
              {REACTIONS.map(reaction => {
                const supportKey = `${item.id}:${reaction.key}`;
                const busy = busyReaction === supportKey;
                const selected = item.viewerReaction === reaction.key;
                return (
                  <TouchableOpacity
                    key={reaction.key}
                    disabled={Boolean(busyReaction)}
                    onPress={() => void react(item, reaction.key)}
                    style={[styles.reaction, selected && styles.reactionSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={`Support with ${reaction.label}`}
                    accessibilityState={{ selected, busy }}
                  >
                    <Text style={styles.reactionText}>{busy ? '…' : reaction.emoji}</Text>
                    <Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>
                      {selected ? 'sent' : reaction.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </TouchableOpacity>
        );
      }}
      ListFooterComponent={<View style={{ height: 48 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100, backgroundColor: '#0d0518', flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0518' },
  loadingText: { color: '#8f7aa6', marginTop: 10, fontSize: 12 },
  truthCard: { flexDirection: 'row', gap: 12, borderRadius: 18, borderWidth: 1, borderColor: '#3d1a5e', backgroundColor: '#16082a', padding: 14, marginBottom: 12 },
  truthTitle: { color: '#f0e6ff', fontSize: 15, fontWeight: '900', marginBottom: 4 },
  truthBody: { color: '#8f7aa6', fontSize: 11, lineHeight: 16 },
  switchWrap: { alignItems: 'center', justifyContent: 'center' },
  switchLabel: { color: '#8f7aa6', fontSize: 9, marginBottom: 2 },
  composeCard: { borderRadius: 20, borderWidth: 1, borderColor: '#3d1a5e', backgroundColor: '#180a28', padding: 16, marginBottom: 12 },
  audienceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  audiencePill: { borderRadius: 999, borderWidth: 1, borderColor: '#6d28d966', backgroundColor: '#26103f', paddingHorizontal: 10, paddingVertical: 6 },
  audiencePillText: { color: '#ddd6fe', fontSize: 11, fontWeight: '900' },
  audienceHint: { color: '#806b98', fontSize: 10, fontWeight: '700' },
  audienceRule: { color: '#806b98', fontSize: 10, lineHeight: 15, marginTop: 8 },
  composeLabel: { color: '#8f7aa6', fontSize: 11, fontWeight: '800', marginBottom: 10 },
  input: { minHeight: 76, borderRadius: 14, backgroundColor: '#100520', color: '#f0e6ff', padding: 12, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  count: { color: '#695579', fontSize: 11 },
  postButton: { minWidth: 104, minHeight: 42, borderRadius: 22, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  disabled: { opacity: 0.4 },
  postButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  errorCard: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderRadius: 14, backgroundColor: '#3b1025', padding: 12, marginBottom: 12 },
  errorText: { color: '#fecdd3', fontSize: 11, lineHeight: 16, flex: 1 },
  retry: { color: '#fff', fontSize: 11, fontWeight: '900' },
  card: { borderRadius: 20, borderWidth: 1, borderColor: '#3d1a5e', backgroundColor: '#16082a', padding: 16, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2d1450', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18 },
  author: { color: '#c4b5fd', fontSize: 13, fontWeight: '900' },
  meta: { color: '#695579', fontSize: 9, marginTop: 2 },
  report: { color: '#695579', fontSize: 15, padding: 4 },
  body: { color: '#f0e6ff', fontSize: 16, lineHeight: 25, marginBottom: 14 },
  privateSupportCard: { borderRadius: 14, borderWidth: 1, borderColor: '#a78bfa33', backgroundColor: '#100520', padding: 10, marginBottom: 10 },
  privateSupportTitle: { color: '#9f8bb6', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 7 },
  privateSupportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  privateSupportPill: { borderRadius: 999, backgroundColor: '#211036', paddingHorizontal: 8, paddingVertical: 4 },
  privateSupportText: { color: '#d8cdf0', fontSize: 10, fontWeight: '800' },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  reaction: { minWidth: 62, alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: '#2e1250', backgroundColor: '#1e0a30', paddingHorizontal: 9, paddingVertical: 7 },
  reactionSelected: { borderColor: '#a78bfa88', backgroundColor: '#321252' },
  reactionText: { color: '#c4b5fd', fontSize: 15, fontWeight: '800' },
  reactionLabel: { color: '#695579', fontSize: 8, marginTop: 2 },
  reactionLabelSelected: { color: '#c4b5fd' },
  empty: { alignItems: 'center', paddingVertical: 52 },
  emptyEmoji: { fontSize: 34, marginBottom: 10 },
  emptyText: { color: '#8f7aa6', textAlign: 'center', fontSize: 13 },
});

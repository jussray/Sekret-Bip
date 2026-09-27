import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
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
import { circleRelativeTime } from '@/features/circle/relativeTime';
import { CIRCLE_COLORS as C, CIRCLE_GRADIENT, CIRCLE_SKY } from '@/features/circle/circleTheme';
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

// Every lens is backed by real data: newest-first order from the RPC,
// the existing heavy-text filter, and the viewer's own posts. No ranking,
// no popularity lens — Circle has no public score.
type FeedLens = 'newest' | 'lighter' | 'mine';
const LENSES: Array<{ key: FeedLens; label: string }> = [
  { key: 'newest', label: 'Newest' },
  { key: 'lighter', label: 'Lighter' },
  { key: 'mine', label: 'My bips' },
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
  const inputRef = useRef<TextInput>(null);
  const [items, setItems] = useState<PublicCircleFeedItem[]>([]);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [posting, setPosting] = useState(false);
  const [busyReaction, setBusyReaction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lens, setLens] = useState<FeedLens>('newest');
  const [loadedAt, setLoadedAt] = useState(() => new Date());

  const refresh = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    setError(null);
    try {
      const next = await loadPublicCircleFeed(50);
      setItems(next);
      setLoadedAt(new Date());
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
      .then(value => { if (value === 'true') setLens('lighter'); })
      .catch(() => {});
    void refresh();
  }, [refresh]);

  const visibleItems = useMemo(() => {
    if (lens === 'lighter') return items.filter(item => !isHeavyCircleText(item.text));
    if (lens === 'mine') return items.filter(item => item.isOwnPost);
    return items;
  }, [lens, items]);

  function chooseLens(next: FeedLens) {
    setLens(next);
    // "Lighter" keeps the existing hide-heavy preference durable.
    void AsyncStorage.setItem(HIDE_HEAVY_KEY, next === 'lighter' ? 'true' : 'false');
  }

  function openComposer() {
    setComposerOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
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
      setComposerOpen(false);
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
      <LinearGradient colors={CIRCLE_SKY} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.heroRow}>
          <LinearGradient colors={CIRCLE_GRADIENT} style={styles.heroIcon}>
            <Text style={styles.heroIconText}>🪐</Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle} accessibilityRole="header">{OPEN_BIP_LABEL}</Text>
            <Text style={styles.heroSub}>Anonymous by default</Text>
            <Text style={styles.heroSub}>Real thoughts. Kind people.</Text>
          </View>
          <TouchableOpacity
            onPress={openComposer}
            style={styles.plus}
            accessibilityRole="button"
            accessibilityLabel="Drop a Bip"
          >
            <Text style={styles.plusText}>+</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {composerOpen ? (
        <View style={styles.composeCard}>
          <View style={styles.audienceRow}>
            <View style={styles.audiencePill} accessibilityLabel={`Audience: ${OPEN_BIP_LABEL}`}>
              <Text style={styles.audiencePillText}>{OPEN_BIP_LABEL}</Text>
            </View>
            <Text style={styles.audienceHint}>inside Circle · faces stay hidden here</Text>
          </View>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            placeholder="Share what's on your mind… keep private names out."
            placeholderTextColor={C.faint}
            multiline
            maxLength={280}
            style={styles.input}
          />
          <Text style={styles.audienceRule}>{OPEN_BIP_AUDIENCE.description}</Text>
          <View style={styles.composeFooter}>
            <TouchableOpacity onPress={() => setComposerOpen(false)} hitSlop={8}>
              <Text style={styles.cancel}>not now</Text>
            </TouchableOpacity>
            <View style={styles.composeActions}>
              <Text style={styles.count}>{draft.length}/280</Text>
              <TouchableOpacity
                disabled={!draft.trim() || posting}
                onPress={submitPost}
                style={(!draft.trim() || posting) && styles.disabled}
                accessibilityRole="button"
                accessibilityLabel="Bip it"
              >
                <LinearGradient colors={CIRCLE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.postButton}>
                  {posting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.postButtonText}>Bip it 💜</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.shareBar}
          onPress={openComposer}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Share what's on your mind"
        >
          <Text style={styles.shareBarText}>Share what's on your mind…</Text>
          <LinearGradient colors={CIRCLE_GRADIENT} style={styles.shareBarIcon}>
            <Text style={styles.shareBarIconText}>✎</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      <View style={styles.lensRow} accessibilityRole="tablist">
        {LENSES.map(option => {
          const active = lens === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => chooseLens(option.key)}
              style={[styles.lens, active && styles.lensActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.lensText, active && styles.lensTextActive]}>{option.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.truthLine}>
        🔒 Support has no public score. Only the person who posted can see their private totals.
      </Text>

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
        <ActivityIndicator color={C.accent} />
        <Text style={styles.loadingText}>opening the circle…</Text>
      </View>
    );
  }

  const emptyText = lens === 'lighter'
    ? 'No lighter bips are here yet.'
    : lens === 'mine'
      ? "You haven't dropped a bip yet."
      : 'The circle is quiet. Be the first to bip.';

  return (
    <FlatList
      data={visibleItems}
      keyExtractor={item => String(item.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh(true)} tintColor={C.accent} />}
      ListHeaderComponent={header}
      ListEmptyComponent={(
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🌙</Text>
          <Text style={styles.emptyText}>{emptyText}</Text>
        </View>
      )}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.card} testID="circle-post-card">
          <View style={styles.authorRow}>
            <LinearGradient colors={CIRCLE_GRADIENT} style={styles.avatarRing}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{item.avatarEmoji}</Text></View>
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.author}>{item.nickname}</Text>
              <Text style={styles.meta}>{circleRelativeTime(item.createdAt, loadedAt)}</Text>
            </View>
            <TouchableOpacity
              onPress={() => confirmReport(item)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Report this bip"
            >
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
                  <Text style={styles.reactionEmoji}>{busy ? '…' : reaction.emoji}</Text>
                  <Text style={[styles.reactionLabel, selected && styles.reactionLabelSelected]}>
                    {selected ? 'sent' : reaction.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
      ListFooterComponent={<View style={{ height: 48 }} />}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100, backgroundColor: C.bg, flexGrow: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg },
  loadingText: { color: C.muted, marginTop: 10, fontSize: 12 },

  hero: { borderRadius: 22, borderWidth: 1, borderColor: C.border, padding: 16, marginBottom: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  heroIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  heroIconText: { fontSize: 24 },
  heroTitle: { color: C.text, fontSize: 24, fontWeight: '900', letterSpacing: -0.3 },
  heroSub: { color: C.muted, fontSize: 12, lineHeight: 17 },
  plus: { width: 40, height: 40, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.cardRaised, alignItems: 'center', justifyContent: 'center' },
  plusText: { color: C.text, fontSize: 24, fontWeight: '500', marginTop: -2 },

  shareBar: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, paddingLeft: 16, paddingRight: 8, paddingVertical: 8, marginBottom: 12 },
  shareBarText: { flex: 1, color: C.muted, fontSize: 14 },
  shareBarIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shareBarIconText: { color: '#fff', fontSize: 15, fontWeight: '900' },

  composeCard: { borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 14, marginBottom: 12 },
  audienceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  audiencePill: { borderRadius: 999, borderWidth: 1, borderColor: '#7c3aed66', backgroundColor: C.pillSelected, paddingHorizontal: 10, paddingVertical: 5 },
  audiencePillText: { color: C.accentSoft, fontSize: 11, fontWeight: '900' },
  audienceHint: { color: C.faint, fontSize: 10, fontWeight: '700' },
  audienceRule: { color: C.faint, fontSize: 10, lineHeight: 15, marginTop: 8 },
  input: { minHeight: 84, borderRadius: 14, backgroundColor: C.bgDeep, color: C.text, padding: 12, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  composeFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  composeActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cancel: { color: C.muted, fontSize: 12, fontWeight: '700' },
  count: { color: C.faint, fontSize: 11 },
  postButton: { minWidth: 104, minHeight: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  disabled: { opacity: 0.4 },
  postButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },

  lensRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  lens: { borderRadius: 999, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: C.chip, paddingHorizontal: 14, paddingVertical: 7 },
  lensActive: { backgroundColor: C.chipActive, borderColor: C.chipActive },
  lensText: { color: C.muted, fontSize: 12, fontWeight: '800' },
  lensTextActive: { color: '#fff' },
  truthLine: { color: C.faint, fontSize: 10, lineHeight: 15, marginBottom: 12, paddingHorizontal: 2 },

  errorCard: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderRadius: 14, backgroundColor: C.danger, padding: 12, marginBottom: 12 },
  errorText: { color: C.dangerText, fontSize: 11, lineHeight: 16, flex: 1 },
  retry: { color: '#fff', fontSize: 11, fontWeight: '900' },

  card: { borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, padding: 14, marginBottom: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarRing: { width: 40, height: 40, borderRadius: 20, padding: 2 },
  avatar: { flex: 1, borderRadius: 18, backgroundColor: C.cardRaised, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17 },
  author: { color: C.textSoft, fontSize: 13, fontWeight: '900' },
  meta: { color: C.faint, fontSize: 10, marginTop: 2 },
  report: { color: C.faint, fontSize: 15, padding: 4 },
  body: { color: C.text, fontSize: 15, lineHeight: 23, marginBottom: 12 },

  privateSupportCard: { borderRadius: 14, borderWidth: 1, borderColor: '#a78bfa33', backgroundColor: C.bgDeep, padding: 10, marginBottom: 10 },
  privateSupportTitle: { color: C.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 7 },
  privateSupportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  privateSupportPill: { borderRadius: 999, backgroundColor: C.pill, paddingHorizontal: 8, paddingVertical: 4 },
  privateSupportText: { color: C.textSoft, fontSize: 10, fontWeight: '800' },

  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  reaction: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, borderWidth: 1, borderColor: C.borderSoft, backgroundColor: C.pill, paddingHorizontal: 8, paddingVertical: 6 },
  reactionSelected: { borderColor: '#a78bfa88', backgroundColor: C.pillSelected },
  reactionEmoji: { fontSize: 12 },
  reactionLabel: { color: C.muted, fontSize: 10, fontWeight: '700' },
  reactionLabelSelected: { color: C.accentSoft },

  empty: { alignItems: 'center', paddingVertical: 52 },
  emptyEmoji: { fontSize: 34, marginBottom: 10 },
  emptyText: { color: C.muted, textAlign: 'center', fontSize: 13 },
});

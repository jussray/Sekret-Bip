// Se'kret Bip — CircleScreen V1
// Four tabs: Open Bip (Public), My Circle (Friends), Crew Bip, Parent Bridge
// Identity rules enforced per tab — see circle-v1-spec.md
// Content safety via guardrails.ts (SOFT_CONTENT_FLAGS + CRISIS_NUDGE)

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type {
  CircleTab,
  PublicCirclePost,
  FriendsCirclePost,
  CrewCirclePost,
  ParentCirclePost,
  CircleComment,
} from '../types/circle';
import { COMPOSER_DESTINATIONS, CIRCLE_TERMS } from '../types/circle';
import {
  loadCircleFeed,
  syncCircleReaction,
  writeCirclePost,
} from '@/utils/sync';
import { SOFT_CONTENT_FLAGS, CRISIS_NUDGE, TONE } from '../constants/guardrails';

// ─── Reaction sets ──────────────────────────────────────────────────────────
const TEEN_REACTIONS    = ['💜 felt', '🫂 comfort', '💪 proud', '🌙 stay'];
// Parent Bridge reactions aligned with ParentCircleScreen
const PARENT_REACTIONS  = ['☕ beenThere', '🤝 solidarity', '🌱 reminder', '💜 needed', '🕯️ strength'];

// ─── Tab config — Se'kret Bip language layer (circle-v1-spec.md §4) ─────────
const TABS: { key: CircleTab; label: string; emoji: string }[] = [
  { key: 'public',  label: 'Open Bip',      emoji: '🌎' },
  { key: 'friends', label: 'My Circle',     emoji: '💜' },
  { key: 'crew',    label: 'Crew Bip',      emoji: '🤝' },
  { key: 'parent',  label: 'Parent Bridge', emoji: '🌿' },
];

// ─── Fallback mock data (shown when Supabase is unconfigured / offline) ──────
const MOCK_PUBLIC: PublicCirclePost[] = [
  { id: 1, text: "some days just feel heavy and i don't know why 🌙", post_mood: 'heavy', media_kind: null, reactions: { felt: 14, comfort: 8, proud: 2, stay: 11 }, created_at: new Date().toISOString() },
  { id: 2, text: 'passed my test today without telling anyone. just wanted to say it somewhere.', post_mood: 'proud', media_kind: null, reactions: { felt: 6, comfort: 3, proud: 22, stay: 5 }, created_at: new Date().toISOString() },
];
const MOCK_FRIENDS: FriendsCirclePost[] = [
  { id: 1, user_id: 'u1', nickname: 'MoonGirl_17', avatar_emoji: '🌙', text: "today felt like a lot but i\'m okay", post_mood: 'okay', media_kind: null, reactions: { felt: 4, comfort: 2, proud: 0, stay: 3 }, created_at: new Date().toISOString() },
];
const MOCK_CREW: CrewCirclePost[] = [
  { id: 1, user_id: 'u2', nickname: 'Suhana 💜', avatar_emoji: '💜', text: "crew check-in: what\'s one thing we're each holding right now?", post_mood: null, media_kind: null, reactions: { felt: 3, comfort: 5, proud: 1, stay: 2 }, created_at: new Date().toISOString() },
];
const MOCK_PARENT: ParentCirclePost[] = [
  { id: 1, user_id: 'p1', text: "does anyone else feel like they don't know how to help without making it worse?", reactions: { beenThere: 9, solidarity: 7, reminder: 2, needed: 5, strength: 4 }, circle_tag: null, created_at: new Date().toISOString(), identity_revealed: false },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function ReactionBar({
  reactions,
  reactionSet,
  onReact,
}: {
  reactions: Record<string, number>;
  reactionSet: string[];
  onReact: (key: string) => void;
}) {
  return (
    <View style={styles.reactionBar}>
      {reactionSet.map((r) => {
        const [emoji, key] = r.split(' ');
        const count = reactions[key] ?? 0;
        return (
          <TouchableOpacity
            key={key}
            style={styles.reactionBtn}
            onPress={() => onReact(key)}
            accessibilityLabel={`React with ${key}, ${count} reactions`}
          >
            <Text style={styles.reactionEmoji}>{emoji}</Text>
            {count > 0 && <Text style={styles.reactionCount}>{count}</Text>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function PostMenu({
  isOwnPost,
  onBlock,
  onReport,
  onDelete,
}: {
  isOwnPost: boolean;
  onBlock: () => void;
  onReport: () => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)} style={styles.menuDot} accessibilityLabel="Post options">
        <Text style={styles.menuDotText}>···</Text>
      </TouchableOpacity>
      <Modal transparent visible={open} animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.menuOverlay} onPress={() => setOpen(false)}>
          <View style={styles.menuSheet}>
            {!isOwnPost && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOpen(false); onBlock(); }}>
                <Text style={styles.menuItemText}>🚫 Block</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => { setOpen(false); onReport(); }}>
              <Text style={styles.menuItemText}>🚩 Report</Text>
            </TouchableOpacity>
            {isOwnPost && onDelete && (
              <TouchableOpacity style={styles.menuItem} onPress={() => { setOpen(false); onDelete(); }}>
                <Text style={[styles.menuItemText, { color: '#e05' }]}>🗑 Delete</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.menuItem} onPress={() => setOpen(false)}>
              <Text style={[styles.menuItemText, { color: '#888' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── useFeed — shared live-data hook ─────────────────────────────────────────
function useFeed<T>(
  tab: CircleTab,
  fallback: T[],
): [T[], React.Dispatch<React.SetStateAction<T[]>>, boolean, () => void] {
  const [posts, setPosts]     = useState<T[]>(fallback);
  const [loading, setLoading] = useState(false);
  const active = useRef(true);

  const load = useCallback(() => {
    active.current = true;
    setLoading(true);
    loadCircleFeed(tab).then(rows => {
      if (!active.current) return;
      if (rows && rows.length > 0) setPosts(rows as T[]);
      setLoading(false);
    });
  }, [tab]);

  useEffect(() => {
    load();
    return () => { active.current = false; };
  }, [load]);

  return [posts, setPosts, loading, load];
}

// ─── Public feed ─────────────────────────────────────────────────────────────
function PublicFeed({ onOptimisticInsert }: {
  onOptimisticInsert?: (fn: (text: string) => void) => void;
}) {
  const [posts, setPosts, loading, refresh] = useFeed<PublicCirclePost>('public', MOCK_PUBLIC);
  const [refreshing, setRefreshing] = useState(false);

  const optimisticInsert = useCallback((text: string) => {
    const optimistic: PublicCirclePost = {
      id: Date.now(),
      text,
      post_mood: null,
      media_kind: null,
      reactions: {},
      created_at: new Date().toISOString(),
    };
    setPosts(prev => [optimistic, ...prev]);
  }, [setPosts]);

  useEffect(() => {
    onOptimisticInsert?.(optimisticInsert);
  }, [onOptimisticInsert, optimisticInsert]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleReact = (postId: number, key: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, [key]: (p.reactions[key] ?? 0) + 1 } }
          : p
      )
    );
    void syncCircleReaction(postId, 'public', key);
  };

  const handleBlock  = () => Alert.alert('Blocked', 'This account has been blocked.');
  const handleReport = (postId: number) =>
    Alert.alert('Report Bip', 'Why are you reporting this?', [
      { text: 'Harmful content', onPress: () => {} },
      { text: 'Spam',           onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FlatList
      data={posts}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.feedList}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={PURPLE}
          colors={[PURPLE]}
        />
      }
      ListHeaderComponent={
        <View style={styles.anonBadge}>
          <Text style={styles.anonBadgeText}>🌎 Open Bip · Anonymous · Reactions only · No profiles</Text>
        </View>
      }
      ListEmptyComponent={
        loading
          ? <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
          : <Text style={styles.emptyText}>{TONE.emptyCircle}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Text style={styles.anonLabel}>Anonymous Bip</Text>
            <PostMenu
              isOwnPost={false}
              onBlock={handleBlock}
              onReport={() => handleReport(item.id)}
            />
          </View>
          <Text style={styles.postText}>{item.text}</Text>
          <ReactionBar
            reactions={item.reactions}
            reactionSet={TEEN_REACTIONS}
            onReact={key => handleReact(item.id, key)}
          />
        </View>
      )}
    />
  );
}

// ─── Friends feed ────────────────────────────────────────────────────────────
function FriendsFeed({ myUserId }: { myUserId: string }) {
  const [posts, setPosts, loading] = useFeed<FriendsCirclePost>('friends', MOCK_FRIENDS);
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [commentText,   setCommentText]   = useState('');
  const [comments, setComments] = useState<Record<number, CircleComment[]>>({});

  const handleReact = (postId: number, key: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, [key]: (p.reactions[key] ?? 0) + 1 } }
          : p
      )
    );
    void syncCircleReaction(postId, 'friends', key);
  };

  const handleComment = (postId: number) => {
    const text = commentText.trim();
    if (!text) return;
    const newComment: CircleComment = {
      id: Date.now(),
      post_id: postId,
      post_type: 'friends',
      user_id: myUserId,
      nickname: 'Me',
      avatar_emoji: '💜',
      text,
      created_at: new Date().toISOString(),
    };
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }));
    setCommentTarget(null);
    setCommentText('');
  };

  const handleBlock  = () => Alert.alert('Blocked', 'This account has been blocked.');
  const handleReport = (postId: number) =>
    Alert.alert('Report Bip', 'Why are you reporting this?', [
      { text: 'Harmful content', onPress: () => {} },
      { text: 'Spam',           onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FlatList
      data={posts}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.feedList}
      ListEmptyComponent={
        loading
          ? <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
          : <Text style={styles.emptyText}>{TONE.emptyCircle}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.postAuthor}>
              <Text style={styles.avatarEmoji}>{item.avatar_emoji}</Text>
              <Text style={styles.nicknameLabel}>{item.nickname}</Text>
            </View>
            <PostMenu
              isOwnPost={item.user_id === myUserId}
              onBlock={handleBlock}
              onReport={() => handleReport(item.id)}
            />
          </View>
          <Text style={styles.postText}>{item.text}</Text>
          <ReactionBar
            reactions={item.reactions}
            reactionSet={TEEN_REACTIONS}
            onReact={key => handleReact(item.id, key)}
          />
          <TouchableOpacity
            style={styles.commentToggle}
            onPress={() => setCommentTarget(commentTarget === item.id ? null : item.id)}
          >
            <Text style={styles.commentToggleText}>💬 comment</Text>
          </TouchableOpacity>
          {(comments[item.id] ?? []).map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentEmoji}>{c.avatar_emoji}</Text>
              <Text style={styles.commentText}><Text style={styles.commentNick}>{c.nickname}: </Text>{c.text}</Text>
            </View>
          ))}
          {commentTarget === item.id && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentField}
                placeholder="say something kind..."
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={() => handleComment(item.id)}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={() => handleComment(item.id)} style={styles.commentSend}>
                <Text style={styles.commentSendText}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

// ─── Crew feed ───────────────────────────────────────────────────────────────
function CrewFeed({ myUserId }: { myUserId: string }) {
  const [posts, setPosts, loading] = useFeed<CrewCirclePost>('crew', MOCK_CREW);
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [commentText,   setCommentText]   = useState('');
  const [comments, setComments] = useState<Record<number, CircleComment[]>>({});

  const handleReact = (postId: number, key: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, [key]: (p.reactions[key] ?? 0) + 1 } }
          : p
      )
    );
    void syncCircleReaction(postId, 'crew', key);
  };

  const handleComment = (postId: number) => {
    const text = commentText.trim();
    if (!text) return;
    const newComment: CircleComment = {
      id: Date.now(),
      post_id: postId,
      post_type: 'crew',
      user_id: myUserId,
      nickname: 'Me',
      avatar_emoji: '💜',
      text,
      created_at: new Date().toISOString(),
    };
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }));
    setCommentTarget(null);
    setCommentText('');
  };

  const handleBlock  = () => Alert.alert('Blocked', 'This account has been blocked.');
  const handleReport = (postId: number) =>
    Alert.alert('Report Bip', 'Why are you reporting this?', [
      { text: 'Harmful content', onPress: () => {} },
      { text: 'Spam',           onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FlatList
      data={posts}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.feedList}
      ListEmptyComponent={
        loading
          ? <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
          : <Text style={styles.emptyText}>{TONE.emptyCrew}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <View style={styles.postAuthor}>
              <Text style={styles.avatarEmoji}>{item.avatar_emoji}</Text>
              <Text style={styles.nicknameLabel}>{item.nickname}</Text>
            </View>
            <PostMenu
              isOwnPost={item.user_id === myUserId}
              onBlock={handleBlock}
              onReport={() => handleReport(item.id)}
            />
          </View>
          <Text style={styles.postText}>{item.text}</Text>
          <ReactionBar
            reactions={item.reactions}
            reactionSet={TEEN_REACTIONS}
            onReact={key => handleReact(item.id, key)}
          />
          <TouchableOpacity
            style={styles.commentToggle}
            onPress={() => setCommentTarget(commentTarget === item.id ? null : item.id)}
          >
            <Text style={styles.commentToggleText}>💬 comment</Text>
          </TouchableOpacity>
          {(comments[item.id] ?? []).map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentEmoji}>{c.avatar_emoji}</Text>
              <Text style={styles.commentText}><Text style={styles.commentNick}>{c.nickname}: </Text>{c.text}</Text>
            </View>
          ))}
          {commentTarget === item.id && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentField}
                placeholder="say something kind..."
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={() => handleComment(item.id)}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={() => handleComment(item.id)} style={styles.commentSend}>
                <Text style={styles.commentSendText}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

// ─── Parent feed ─────────────────────────────────────────────────────────────
function ParentFeed({ myUserId }: { myUserId: string }) {
  const [posts, setPosts, loading] = useFeed<ParentCirclePost>('parent', MOCK_PARENT);
  const [commentTarget, setCommentTarget] = useState<number | null>(null);
  const [commentText,   setCommentText]   = useState('');
  const [comments, setComments] = useState<Record<number, CircleComment[]>>({});

  const handleReact = (postId: number, key: string) => {
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, reactions: { ...p.reactions, [key]: (p.reactions[key] ?? 0) + 1 } }
          : p
      )
    );
    void syncCircleReaction(postId, 'parent', key);
  };

  const handleComment = (postId: number) => {
    const text = commentText.trim();
    if (!text) return;
    const newComment: CircleComment = {
      id: Date.now(),
      post_id: postId,
      post_type: 'parent',
      user_id: myUserId,
      nickname: 'Parent',
      avatar_emoji: '🌿',
      text,
      created_at: new Date().toISOString(),
    };
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }));
    setCommentTarget(null);
    setCommentText('');
  };

  const handleBlock  = () => Alert.alert('Blocked', 'This account has been blocked.');
  const handleReport = (postId: number) =>
    Alert.alert('Report Bip', 'Why are you reporting this?', [
      { text: 'Harmful content', onPress: () => {} },
      { text: 'Spam',           onPress: () => {} },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <FlatList
      data={posts}
      keyExtractor={item => String(item.id)}
      contentContainerStyle={styles.feedList}
      ListHeaderComponent={
        <View style={styles.anonBadge}>
          <Text style={styles.anonBadgeText}>🌿 Parent Bridge · Anonymous · Quiet space · Be kind</Text>
        </View>
      }
      ListEmptyComponent={
        loading
          ? <ActivityIndicator color={PURPLE} style={{ marginTop: 40 }} />
          : <Text style={styles.emptyText}>{TONE.emptyCircle}</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Text style={styles.anonLabel}>{item.identity_revealed ? 'Parent' : 'Anonymous Parent'}</Text>
            <PostMenu
              isOwnPost={item.user_id === myUserId}
              onBlock={handleBlock}
              onReport={() => handleReport(item.id)}
            />
          </View>
          <Text style={styles.postText}>{item.text}</Text>
          <ReactionBar
            reactions={item.reactions}
            reactionSet={PARENT_REACTIONS}
            onReact={key => handleReact(item.id, key)}
          />
          <TouchableOpacity
            style={styles.commentToggle}
            onPress={() => setCommentTarget(commentTarget === item.id ? null : item.id)}
          >
            <Text style={styles.commentToggleText}>💬 respond</Text>
          </TouchableOpacity>
          {(comments[item.id] ?? []).map(c => (
            <View key={c.id} style={styles.comment}>
              <Text style={styles.commentEmoji}>{c.avatar_emoji}</Text>
              <Text style={styles.commentText}><Text style={styles.commentNick}>{c.nickname}: </Text>{c.text}</Text>
            </View>
          ))}
          {commentTarget === item.id && (
            <View style={styles.commentInput}>
              <TextInput
                style={styles.commentField}
                placeholder="respond with care..."
                placeholderTextColor="#888"
                value={commentText}
                onChangeText={setCommentText}
                onSubmitEditing={() => handleComment(item.id)}
                returnKeyType="send"
                autoFocus
              />
              <TouchableOpacity onPress={() => handleComment(item.id)} style={styles.commentSend}>
                <Text style={styles.commentSendText}>→</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    />
  );
}

// ─── Composer modal ───────────────────────────────────────────────────────────
const MAX_CHARS = 280;
const PURPLE = '#a855f7';

function Composer({
  activeTab,
  nickname,
  onClose,
  onPost,
}: {
  activeTab: CircleTab;
  nickname: string;
  onClose: () => void;
  onPost:  (tab: CircleTab, text: string) => void;
}) {
  const [text, setText] = useState('');
  const [selectedTab, setSelectedTab] = useState<CircleTab>(activeTab);
  const [crisisFlag, setCrisisFlag] = useState(false);
  const [confirmedPost, setConfirmedPost] = useState(false);

  const destinations = COMPOSER_DESTINATIONS.filter(d =>
    d.tab !== 'parent' || activeTab === 'parent'
  );

  const handleTextChange = (val: string) => {
    setText(val);
    const lower = val.toLowerCase();
    const flagged = SOFT_CONTENT_FLAGS.some(f => lower.includes(f));
    setCrisisFlag(flagged);
    setConfirmedPost(false);
  };

  const handlePost = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (crisisFlag && !confirmedPost) {
      setConfirmedPost(true);
      return;
    }
    onPost(selectedTab, trimmed);
    onClose();
  };

  const remaining = MAX_CHARS - text.length;
  const overLimit = remaining < 0;
  const canPost   = !overLimit && !!text.trim();

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.composerOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.composerSheet}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>New Bip</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close composer">
              <Text style={styles.composerClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.composerTabs}>
            {destinations.map(d => (
              <TouchableOpacity
                key={d.tab}
                style={[styles.composerTab, selectedTab === d.tab && styles.composerTabActive]}
                onPress={() => setSelectedTab(d.tab)}
              >
                <Text style={[styles.composerTabText, selectedTab === d.tab && styles.composerTabTextActive]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.composerIdentity}>
            <Text style={styles.composerIdentityText}>
              {selectedTab === 'public' || selectedTab === 'parent'
                ? '🌑 posting anonymously'
                : `💜 posting as ${nickname}`}
            </Text>
          </View>

          <TextInput
            style={styles.composerInput}
            placeholder="what's on your mind..."
            placeholderTextColor="#555"
            multiline
            value={text}
            onChangeText={handleTextChange}
            maxLength={MAX_CHARS + 10}
            autoFocus
          />

          {crisisFlag && (
            <View style={styles.crisisNudge}>
              <Text style={styles.crisisNudgeText}>{CRISIS_NUDGE}</Text>
              {confirmedPost && (
                <Text style={styles.crisisNudgeSub}>tap "Bip it" again if you still want to post.</Text>
              )}
            </View>
          )}

          <View style={styles.composerFooter}>
            <Text style={[styles.charCount, overLimit && styles.charCountOver]}>
              {remaining}
            </Text>
            <TouchableOpacity
              style={[styles.composerPostBtn, !canPost && styles.composerPostBtnDisabled]}
              onPress={handlePost}
              disabled={!canPost}
              accessibilityLabel="Post bip"
            >
              <Text style={styles.composerPostBtnText}>
                {crisisFlag && !confirmedPost ? 'continue?' : 'Bip it 💜'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Add to Circle modal ──────────────────────────────────────────────────────
function AddToCircleModal({ onClose }: { onClose: () => void }) {
  const [search, setSearch]   = useState('');
  const [sent,   setSent]     = useState(false);

  const handleSend = () => {
    if (!search.trim()) return;
    setSent(true);
    setTimeout(onClose, 1200);
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.composerOverlay}>
        <View style={styles.composerSheet}>
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>Add to Circle</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <Text style={styles.composerClose}>✕</Text>
            </TouchableOpacity>
          </View>
          {sent ? (
            <Text style={[styles.emptyText, { marginTop: 24 }]}>✅ {CIRCLE_TERMS.friendRequest} sent 💜</Text>
          ) : (
            <>
              <TextInput
                style={styles.composerInput}
                placeholder="search by nickname..."
                placeholderTextColor="#555"
                value={search}
                onChangeText={setSearch}
                autoFocus
              />
              <TouchableOpacity style={styles.composerPostBtn} onPress={handleSend}>
                <Text style={styles.composerPostBtnText}>Send {CIRCLE_TERMS.friendRequest} 💜</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function CircleScreen(_props: Record<string, unknown> = {}) {
  const myUserId   = 'current-user-id';
  const myNickname = 'MoonGirl_17';

  const [activeTab,     setActiveTab]     = useState<CircleTab>('public');
  const [composerOpen,  setComposerOpen]  = useState(false);
  const [addCircleOpen, setAddCircleOpen] = useState(false);

  const breath = useRef(new Animated.Value(0)).current;
  const publicInsertRef = useRef<((text: string) => void) | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [breath]);

  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });

  const handlePost = useCallback((tab: CircleTab, text: string) => {
    if (tab === 'public') publicInsertRef.current?.(text);
    void writeCirclePost(tab, text);
  }, []);

  const TAB_IDENTITY: Record<CircleTab, string> = {
    public:  '🌑 anonymous',
    friends: '💜 nickname visible',
    crew:    '✨ identity visible',
    parent:  '🌑 anonymous',
  };

  return (
    <SafeAreaView style={styles.root}>
      <LinearGradient
        colors={['#0a0010', '#0d0018', '#100028']}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Circle</Text>
          <Animated.View style={[styles.liveBadge, { opacity: breathOpacity, transform: [{ scale: breathScale }] }]}>
            <Text style={styles.liveBadgeText}>🌐 circle is open</Text>
          </Animated.View>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => setAddCircleOpen(true)} style={styles.headerBtn} accessibilityLabel={CIRCLE_TERMS.friendRequest}>
            <Text style={styles.headerBtnText}>{CIRCLE_TERMS.friendRequest}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setComposerOpen(true)} style={styles.headerBtnPrimary} accessibilityLabel="New Bip">
            <Text style={styles.headerBtnPrimaryText}>+ Bip</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <View style={styles.tabBar}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
            >
              <Text style={[styles.tabEmoji, isActive && styles.tabEmojiActive]}>{tab.emoji}</Text>
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Identity strip ─────────────────────────────────────────────────── */}
      <View style={styles.identityStrip}>
        <Text style={styles.identityStripText}>{TAB_IDENTITY[activeTab]}</Text>
      </View>

      {/* ── Feed ───────────────────────────────────────────────────────────── */}
      <View style={styles.feedWrap}>
        {activeTab === 'public'  && <PublicFeed onOptimisticInsert={fn => { publicInsertRef.current = fn; }} />}
        {activeTab === 'friends' && <FriendsFeed myUserId={myUserId} />}
        {activeTab === 'crew'    && <CrewFeed    myUserId={myUserId} />}
        {activeTab === 'parent'  && <ParentFeed  myUserId={myUserId} />}
      </View>

      {composerOpen && (
        <Composer
          activeTab={activeTab}
          nickname={myNickname}
          onClose={() => setComposerOpen(false)}
          onPost={handlePost}
        />
      )}

      {addCircleOpen && <AddToCircleModal onClose={() => setAddCircleOpen(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────────
  root: { flex: 1, backgroundColor: '#0a0010' },

  // ── Header ────────────────────────────────────────────────────────────────
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 6 },
  headerTitle: { color: '#e9defc', fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  liveBadge:   { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#7c3aed66', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, backgroundColor: '#7c3aed18' },
  liveBadgeText: { color: '#c4b5fd', fontSize: 11, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  headerBtn:   { borderColor: '#7c3aed88', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  headerBtnText: { color: '#a855f7', fontSize: 13 },
  headerBtnPrimary: { backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  headerBtnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Tab bar ───────────────────────────────────────────────────────────────
  tabBar:        { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 6, paddingBottom: 0, gap: 4 },
  tab:           { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
  tabActive:     { borderColor: '#7c3aed55', backgroundColor: '#7c3aed18' },
  tabEmoji:      { fontSize: 13, marginBottom: 1, opacity: 0.4 },
  tabEmojiActive:{ opacity: 1 },
  tabText:       { color: '#444', fontSize: 10, fontWeight: '600' },
  tabTextActive: { color: '#c4b5fd', fontWeight: '800' },

  // ── Identity strip ────────────────────────────────────────────────────────
  identityStrip:     { paddingHorizontal: 18, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1a0a2e' },
  identityStripText: { color: '#555', fontSize: 11 },

  // ── Feed ──────────────────────────────────────────────────────────────────
  feedWrap:    { flex: 1 },
  feedList:    { padding: 14, paddingBottom: 48 },

  // ── Anonymous badge ───────────────────────────────────────────────────────
  anonBadge:    { backgroundColor: '#12002a', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, alignItems: 'center', borderWidth: 1, borderColor: '#2a0a4a' },
  anonBadgeText:{ color: '#6b4fa0', fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },

  // ── Empty state ───────────────────────────────────────────────────────────
  emptyText: { color: '#4a3a6a', textAlign: 'center', marginTop: 52, fontSize: 14, lineHeight: 21 },

  // ── Post card ─────────────────────────────────────────────────────────────
  postCard:    { backgroundColor: '#0f0020', borderRadius: 18, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#2a0a4a' },
  postHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  postAuthor:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  anonLabel:   { color: '#4a3a6a', fontSize: 12, fontWeight: '600' },
  avatarEmoji: { fontSize: 20 },
  nicknameLabel: { color: '#c4b5fd', fontSize: 14, fontWeight: '700' },
  postText:    { color: '#e9defc', fontSize: 15, lineHeight: 23, marginBottom: 12 },

  // ── Reactions ─────────────────────────────────────────────────────────────
  reactionBar:   { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reactionBtn:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a0a2e', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, gap: 4, borderWidth: 1, borderColor: '#2a0a4a' },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { color: '#a855f7', fontSize: 12, fontWeight: '700' },

  // ── Comments ──────────────────────────────────────────────────────────────
  commentToggle:     { marginTop: 10, paddingVertical: 4 },
  commentToggleText: { color: '#7c3aed', fontSize: 12, fontWeight: '600' },
  comment:       { flexDirection: 'row', gap: 6, marginTop: 7, paddingLeft: 8 },
  commentEmoji:  { fontSize: 14 },
  commentText:   { color: '#c4b5fd', fontSize: 13, flex: 1, lineHeight: 19 },
  commentNick:   { fontWeight: '700' },
  commentInput:  { flexDirection: 'row', marginTop: 8, gap: 6 },
  commentField:  { flex: 1, backgroundColor: '#1a0a2e', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, color: '#e9defc', fontSize: 13 },
  commentSend:   { justifyContent: 'center', paddingHorizontal: 8 },
  commentSendText: { color: '#a855f7', fontSize: 18 },

  // ── Post menu ─────────────────────────────────────────────────────────────
  menuDot:    { padding: 4 },
  menuDotText:{ color: '#3a2a5a', fontSize: 18, letterSpacing: 2 },
  menuOverlay:{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  menuSheet:  { backgroundColor: '#0f0020', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36, borderWidth: 1, borderColor: '#2a0a4a' },
  menuItem:   { paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#1a0a2e' },
  menuItemText: { color: '#e9defc', fontSize: 16 },

  // ── Composer ──────────────────────────────────────────────────────────────
  composerOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  composerSheet:   { backgroundColor: '#0f0020', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 22, paddingBottom: 40, borderWidth: 1, borderColor: '#2a0a4a', borderBottomWidth: 0 },
  composerHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  composerTitle:   { color: '#e9defc', fontSize: 20, fontWeight: '800' },
  composerClose:   { color: '#4a3a6a', fontSize: 24 },
  composerTabs:    { flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' },
  composerTab:     { borderColor: '#2a0a4a', borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  composerTabActive:     { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  composerTabText:       { color: '#555', fontSize: 12 },
  composerTabTextActive: { color: '#fff', fontWeight: '700' },
  composerIdentity:     { marginBottom: 12 },
  composerIdentityText: { color: '#555', fontSize: 12 },
  composerInput:   { backgroundColor: '#1a0a2e', borderRadius: 16, padding: 16, color: '#e9defc', fontSize: 15, minHeight: 100, textAlignVertical: 'top', marginBottom: 12, borderWidth: 1, borderColor: '#2a0a4a' },
  composerFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  charCount:       { color: '#4a3a6a', fontSize: 13 },
  charCountOver:   { color: '#e05' },
  composerPostBtn:         { backgroundColor: '#7c3aed', borderRadius: 22, paddingHorizontal: 22, paddingVertical: 11 },
  composerPostBtnDisabled: { opacity: 0.35 },
  composerPostBtnText:     { color: '#fff', fontWeight: '700', fontSize: 14 },

  // ── Crisis nudge ──────────────────────────────────────────────────────────
  crisisNudge:    { backgroundColor: '#1a0a2e', borderRadius: 14, padding: 14, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: PURPLE, borderWidth: 1, borderColor: '#2a0a4a' },
  crisisNudgeText:{ color: '#c4b5fd', fontSize: 13, lineHeight: 20 },
  crisisNudgeSub: { color: '#777', fontSize: 11, marginTop: 5 },
});

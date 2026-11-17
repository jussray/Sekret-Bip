import React, { useRef, useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  View,
  Animated,
  Modal,
  StyleSheet,
  Platform,
  Easing,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { SOFT_CONTENT_FLAGS, CRISIS_NUDGE, TONE } from '../constants/guardrails';
import { reportPost } from '@/utils/circleModeration';

type ParentCirclePost = {
  id: string | number;
  text: string;
  date?: string;
  time?: string;
  circleTag?: string;
  anonymousName?: string;
  quietRepliesCount?: number;
  reactions?: {
    beenThere?: number;
    solidarity?: number;
    reminder?: number;
    needed?: number;
    strength?: number;
  };
};

type FeedTab = 'foryou' | 'new' | 'following';
const FEED_TABS: { key: FeedTab; label: string }[] = [
  { key: 'foryou',    label: 'For You'   },
  { key: 'new',       label: 'New'       },
  { key: 'following', label: 'Following' },
];

type ParentCircleScreenProps = {
  parentCirclePosts: ParentCirclePost[];
  parentCirclePostText: string;
  setParentCirclePostText: (text: string) => void;
  saveParentCirclePost: (extra?: Partial<ParentCirclePost>) => void;
  reactToParentPost: (id: string | number, type: string) => void;
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
  onPostPress?: (id: string | number) => void;
};

const PARENT_REACTIONS = [
  { emoji: '☕', key: 'beenThere',  label: 'been there'       },
  { emoji: '🤝', key: 'solidarity', label: 'solidarity'       },
  { emoji: '🌱', key: 'reminder',   label: 'good reminder'    },
  { emoji: '💜', key: 'needed',     label: 'needed this'      },
  { emoji: '🕯️', key: 'strength',   label: 'sending strength' },
];

const PARENT_POST_TYPES = [
  { id: 'parenting-win',   emoji: '🏡', label: 'Parenting win',    sub: 'something landed right'               },
  { id: 'parenting-hard',  emoji: '🌧', label: 'Hard right now',   sub: 'carrying something heavy'              },
  { id: 'lets-talk',       emoji: '💬', label: "Let\'s talk",       sub: 'want to hear from other parents'       },
  { id: 'connection',      emoji: '🌉', label: 'Connection moment', sub: 'the moment something clicked'         },
];

const PARENT_TAGS = [
  'communication',
  'boundaries',
  'school stuff',
  'co-parenting',
  'burnout',
  'connection',
  'proud moment',
  'just venting',
];

const PARENT_QUIET_REPLIES = [
  'you\'re doing better than you think.',
  'same here. it\'s harder than anyone says.',
  'this one hit. thank you for posting it.',
  'solidarity.',
  'holding this alongside you.',
  'good reminder for me today.',
  'you\'re not alone in this.',
  'that took courage to share.',
];

const SEED_POSTS: ParentCirclePost[] = [
  {
    id: 'ps-1',
    anonymousName: 'anonymous parent',
    circleTag: 'communication',
    text: "my teenager won't talk to me and I'm trying to not take it personally. it's really hard.",
    reactions: { beenThere: 47, solidarity: 38, reminder: 12, needed: 21, strength: 29 },
    quietRepliesCount: 14,
  },
  {
    id: 'ps-2',
    anonymousName: 'anonymous parent',
    circleTag: 'connection',
    text: "I let them stay up late and skip the homework lecture. sometimes connection is the homework.",
    reactions: { beenThere: 31, solidarity: 19, reminder: 44, needed: 37, strength: 16 },
    quietRepliesCount: 9,
  },
  {
    id: 'ps-3',
    anonymousName: 'anonymous parent',
    circleTag: 'proud moment',
    text: "I apologized to my kid for how I reacted yesterday. their face when I said sorry — I'll remember that.",
    reactions: { beenThere: 22, solidarity: 18, reminder: 53, needed: 41, strength: 27 },
    quietRepliesCount: 11,
  },
  {
    id: 'ps-4',
    anonymousName: 'anonymous parent',
    circleTag: 'just venting',
    text: "does anyone else feel like they're always one wrong word away from a wall going up?",
    reactions: { beenThere: 68, solidarity: 55, reminder: 9, needed: 33, strength: 24 },
    quietRepliesCount: 22,
  },
  {
    id: 'ps-5',
    anonymousName: 'anonymous parent',
    circleTag: 'connection',
    text: "three years of hard moments and today we laughed together for a whole hour. those are the ones I hold on to.",
    reactions: { beenThere: 29, solidarity: 24, reminder: 38, needed: 51, strength: 43 },
    quietRepliesCount: 17,
  },
  {
    id: 'ps-6',
    anonymousName: 'anonymous parent',
    circleTag: 'burnout',
    text: "I love my kids more than anything. and I'm exhausted in a way that sleep doesn't fix. both things are true.",
    reactions: { beenThere: 84, solidarity: 71, reminder: 19, needed: 62, strength: 48 },
    quietRepliesCount: 31,
  },
];

const WARM = '#d97706';
const WARM_SOFT = '#fbbf24';
const SAGE = '#059669';
const SAGE_SOFT = '#34d399';
const AMBER_GLOW = '#f59e0b';

const postSticker = (id: string | number): string => {
  const MARKS = ['☕', '🌿', '🕯️', '🌉', '📖', '🌱', '🫶', '🤍', '🏡', '🌾'];
  return MARKS[Math.abs(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % MARKS.length];
};

export function ParentCircleScreen({
  parentCirclePosts,
  parentCirclePostText,
  setParentCirclePostText,
  saveParentCirclePost,
  reactToParentPost,
  setScreen,
  BottomNav,
  onPostPress,
}: ParentCircleScreenProps) {
  const [selectedType, setSelectedType] = useState(PARENT_POST_TYPES[0].id);
  const [selectedTag, setSelectedTag]   = useState('');
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [crisisFlag, setCrisisFlag]       = useState(false);
  const [confirmedPost, setConfirmedPost] = useState(false);
  const [activeReplyPostId, setActiveReplyPostId] = useState<string | null>(null);
  const [selectedQuietReply, setSelectedQuietReply] = useState('');
  const [feedTab, setFeedTab] = useState<FeedTab>('foryou');
  const [reportedIds, setReportedIds] = useState<Set<string>>(new Set());

  function handleReport(postId: string | number) {
    Alert.alert(
      'Report this post?',
      "We'll take a look. It'll stop showing up in your feed right away.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => {
            setReportedIds(prev => new Set(prev).add(String(postId)));
            const numericId = Number(postId);
            if (Number.isFinite(numericId)) void reportPost(numericId, 'parent');
          },
        },
      ],
    );
  }

  const currentType = PARENT_POST_TYPES.find(p => p.id === selectedType) || PARENT_POST_TYPES[0];

  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const fade4 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, { toValue: 1, duration: 400, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([stagger(fade1, 0), stagger(fade2, 160), stagger(fade3, 320), stagger(fade4, 480)]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    ).start();
  }, [fade1, fade2, fade3, fade4, breath]);

  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] });
  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const triggerHaptic = async (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'web') return;
    try { await Haptics.impactAsync(style); } catch { void 0; }
  };

  const handleTextChange = (val: string) => {
    setParentCirclePostText(val);
    const lower = val.toLowerCase();
    setCrisisFlag(SOFT_CONTENT_FLAGS.some(f => lower.includes(f)));
    setConfirmedPost(false);
  };

  const handleSavePost = async () => {
    if (!parentCirclePostText.trim()) return;
    if (crisisFlag && !confirmedPost) {
      setConfirmedPost(true);
      return;
    }
    setIsSubmitting(true);
    saveParentCirclePost({
      text:      parentCirclePostText,
      circleTag: selectedTag || undefined,
    });
    setParentCirclePostText('');
    setSelectedTag('');
    setCrisisFlag(false);
    setConfirmedPost(false);
    setIsSubmitting(false);
    await triggerHaptic(Haptics.ImpactFeedbackStyle.Medium);
  };

  const visiblePosts = parentCirclePosts.length ? parentCirclePosts : SEED_POSTS;

  const cultureLines = [
    'no judgment. no comparisons. no competition.',
    'parents in different stages, same circle.',
    'this is not about perfect parenting. it\'s about honest parenting.',
    'what gets posted here stays here.',
  ];

  return (
    <LinearGradient
      colors={['#1a0e06', '#0f1a0e', '#0c0c18']}
      style={styles.bg}
    >
      <ScrollView contentContainerStyle={styles.container}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade1)}>
          <Text style={styles.logo}>Parent Circle ☕</Text>
          <Text style={styles.subtitle}>front porch. coffee after bedtime. people who get it.</Text>

          <Animated.View style={[styles.energyBadge, { opacity: breathOpacity, transform: [{ scale: breathScale }] }]}>
            <Text style={styles.energyText}>🕯️ circle is open</Text>
          </Animated.View>

          {/* Front porch visual */}
          <View style={styles.porchRow}>
            {['☕ here', '🌿 listening', '🕯️ with you', '📖 present'].map((label, i) => (
              <View key={i} style={styles.porchSeat}>
                <Text style={styles.porchSeatText}>{label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.porchCenterCard}>
            <Text style={styles.porchCenterEmoji}>🌉</Text>
            <Text style={styles.porchCenterText}>parenting is hard. you don't have to carry it alone.</Text>
          </View>

          <View style={styles.presenceRow}>
            <View style={styles.presencePill}>
              <Text style={styles.presenceText}>anonymous · no judgment · always here</Text>
            </View>
          </View>
        </Animated.View>

        {/* ── Intro ──────────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade2)}>
          <View style={styles.introCard}>
            <Text style={styles.introEmoji}>🏡</Text>
            <Text style={styles.introTitle}>this is not a parenting forum.</Text>
            <Text style={styles.introText}>
              it's the group chat after the kids go to sleep. real moments. real struggles. real wins. no perfect parent energy here.
            </Text>
          </View>

          {/* Post type picker */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
            {PARENT_POST_TYPES.map(pt => (
              <TouchableOpacity
                key={pt.id}
                onPress={() => setSelectedType(pt.id)}
                style={[styles.typeChip, selectedType === pt.id && styles.typeChipActive]}
              >
                <Text style={styles.typeChipEmoji}>{pt.emoji}</Text>
                <Text style={[styles.typeChipLabel, selectedType === pt.id && styles.typeChipLabelActive]}>{pt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── Composer ───────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade3)}>
          <View style={styles.composerCard}>
            <Text style={styles.composerLabel}>{currentType.emoji} {currentType.sub}</Text>

            {/* Tag picker */}
            <TouchableOpacity
              onPress={() => setShowTagPicker(s => !s)}
              style={[styles.tagToggle, selectedTag ? styles.tagToggleActive : {}]}
            >
              <Text style={[styles.tagToggleText, !!selectedTag && styles.tagToggleTextActive]}>
                {selectedTag ? `✦ ${selectedTag}` : '+ topic tag (optional)'}
              </Text>
            </TouchableOpacity>

            {showTagPicker && (
              <View style={styles.tagGrid}>
                {PARENT_TAGS.map(tag => (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => { setSelectedTag(selectedTag === tag ? '' : tag); setShowTagPicker(false); }}
                    style={[styles.tagChip, selectedTag === tag && styles.tagChipActive]}
                  >
                    <Text style={[styles.tagChipText, selectedTag === tag && styles.tagChipTextActive]}>{tag}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="say it honest. no performance needed here."
              placeholderTextColor="#6b7a5e"
              multiline
              value={parentCirclePostText}
              onChangeText={handleTextChange}
            />

            {crisisFlag && (
              <View style={styles.crisisNudge}>
                <Text style={styles.crisisNudgeText}>{CRISIS_NUDGE}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.postBtn}
              onPress={handleSavePost}
              disabled={isSubmitting}
            >
              <Text style={styles.postBtnText}>
                {isSubmitting ? 'posting…' : crisisFlag && !confirmedPost ? 'continue?' : '+ share anonymously'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.safeText}>no name · no profile · community only</Text>
          </View>

          <View style={styles.journalNote}>
            <Text style={styles.journalNoteText}>
              "the honest ones are the ones that help."
            </Text>
          </View>
        </Animated.View>

        {/* ── Posts ──────────────────────────────────────────────────────── */}
        <Animated.View style={cardStyle(fade4)}>
          {/* Feed tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.feedTabRail}
          >
            {FEED_TABS.map(ft => {
              const active = feedTab === ft.key;
              return (
                <TouchableOpacity
                  key={ft.key}
                  onPress={() => setFeedTab(ft.key)}
                  style={[styles.feedTab, active && styles.feedTabActive]}
                >
                  <Text style={[styles.feedTabText, active && styles.feedTabTextActive]}>{ft.label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>what parents are carrying</Text>

            {parentCirclePosts.length === 0 && (
              <Text style={styles.emptyText}>{TONE.emptyCircle}</Text>
            )}

            <View style={styles.circlePromise}>
              <Text style={styles.circlePromiseText}>Every post here is from a real parent having a real day.</Text>
              <Text style={styles.circlePromiseSub}>anonymous · no likes · no ranking</Text>
            </View>

            {visiblePosts.filter(post => !reportedIds.has(String(post.id))).map(post => (
              <TouchableOpacity
                key={post.id}
                style={styles.postCard}
                onPress={() => onPostPress ? onPostPress(post.id) : setActiveReplyPostId(String(post.id))}
                activeOpacity={0.8}
              >
                <Text style={styles.postSticker}>{postSticker(post.id)}</Text>
                <View style={styles.postMetaRow}>
                  <View style={styles.anonymousDot} />
                  <Text style={styles.anonymousName}>{post.anonymousName || 'anonymous parent'}</Text>
                  {!String(post.id).startsWith('ps-') && (
                    <TouchableOpacity
                      style={styles.reportBtn}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={(e) => { e.stopPropagation?.(); handleReport(post.id); }}
                    >
                      <Text style={styles.reportBtnText}>⚑</Text>
                    </TouchableOpacity>
                  )}
                </View>
                {!!post.circleTag && (
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{post.circleTag}</Text>
                  </View>
                )}
                <Text style={styles.postText}>{post.text}</Text>
                {!!post.date && <Text style={styles.postDate}>{post.date}</Text>}

                <View style={styles.reactionRow}>
                  {PARENT_REACTIONS.map(r => (
                    <TouchableOpacity
                      key={r.key}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        if (!String(post.id).startsWith('ps-')) reactToParentPost(post.id, r.key);
                      }}
                      style={styles.reactionBtn}
                    >
                      <Text style={styles.reactionEmoji}>{r.emoji}</Text>
                      <Text style={styles.reactionCount}>{(post.reactions as any)?.[r.key] || 0}</Text>
                      <Text style={styles.reactionLabel}>{r.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity
                  style={styles.replyBtn}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    if (onPostPress) { onPostPress(post.id); } else { setActiveReplyPostId(String(post.id)); }
                  }}
                >
                  <Text style={styles.replyBtnText}>
                    reply softly{post.quietRepliesCount ? ` · ${post.quietRepliesCount} quiet replies` : ''}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.cultureCard}>
            <Text style={styles.cultureTitle}>circle culture ☕</Text>
            {cultureLines.map((line, i) => (
              <Text key={i} style={styles.cultureText}>{line}</Text>
            ))}
          </View>
        </Animated.View>

        {/* ── Quiet reply modal ─────────────────────────────────────────── */}
        <Modal
          visible={!!activeReplyPostId}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveReplyPostId(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>reply softly</Text>
              <Text style={styles.modalSub}>one thought. anonymous. no thread. no drama.</Text>
              {PARENT_QUIET_REPLIES.map(reply => (
                <TouchableOpacity
                  key={reply}
                  style={[styles.replyOption, selectedQuietReply === reply && styles.replyOptionActive]}
                  onPress={() => setSelectedQuietReply(reply)}
                >
                  <Text style={styles.replyOptionText}>{reply}</Text>
                </TouchableOpacity>
              ))}
              <TextInput
                style={styles.replyInput}
                placeholder="or a short note of your own…"
                placeholderTextColor="#6b7a5e"
                value={selectedQuietReply}
                onChangeText={setSelectedQuietReply}
              />
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={() => { setSelectedQuietReply(''); setActiveReplyPostId(null); }}
              >
                <Text style={styles.sendBtnText}>send quietly</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setSelectedQuietReply(''); setActiveReplyPostId(null); }}
              >
                <Text style={styles.cancelBtnText}>nevermind</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {BottomNav}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bg:        { flex: 1 },
  container: {
    flexGrow: 1, padding: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}),
  },

  logo:     { fontSize: 26, fontWeight: 'bold', color: '#f5f0e8', textAlign: 'center', marginBottom: 6, letterSpacing: 0.3 },
  subtitle: { fontSize: 13, color: '#a3b899', textAlign: 'center', marginBottom: 14, fontStyle: 'italic' },

  energyBadge: { alignSelf: 'center', borderWidth: 1, borderColor: AMBER_GLOW, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 16 },
  energyText:  { fontSize: 13, fontWeight: '600', color: AMBER_GLOW },

  porchRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 14 },
  porchSeat:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#3a4a35', backgroundColor: 'rgba(20,30,18,0.7)' },
  porchSeatText: { color: '#a3b899', fontSize: 12, fontWeight: '600' },

  porchCenterCard:  { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 20, padding: 16, alignItems: 'center', backgroundColor: 'rgba(15,26,14,0.8)', marginBottom: 14 },
  porchCenterEmoji: { fontSize: 32, marginBottom: 8 },
  porchCenterText:  { color: '#d4e8cc', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 20 },

  presenceRow:  { alignItems: 'center', marginBottom: 10 },
  presencePill: { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4, backgroundColor: 'rgba(15,26,14,0.6)' },
  presenceText: { color: '#8fa885', fontSize: 12, fontWeight: '600' },

  introCard:  { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 20, padding: 16, marginBottom: 12, backgroundColor: 'rgba(20,30,18,0.85)' },
  introEmoji: { fontSize: 28, marginBottom: 6 },
  introTitle: { color: '#f5f0e8', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  introText:  { color: '#c9dfc2', fontSize: 14, lineHeight: 21 },

  typeRow:     { marginBottom: 14 },
  typeChip:    { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1, borderColor: '#3a4a35', backgroundColor: 'rgba(20,30,18,0.7)', marginRight: 8, alignItems: 'center' },
  typeChipActive:     { borderColor: WARM, backgroundColor: 'rgba(217,119,6,0.18)' },
  typeChipEmoji:      { fontSize: 18, marginBottom: 2 },
  typeChipLabel:      { color: '#8fa885', fontSize: 11, fontWeight: '600' },
  typeChipLabelActive:{ color: WARM_SOFT },

  composerCard:  { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 20, padding: 16, marginBottom: 12, backgroundColor: 'rgba(20,30,18,0.85)' },
  composerLabel: { color: '#8fa885', fontSize: 12, fontWeight: '600', marginBottom: 12 },

  tagToggle:          { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
  tagToggleActive:    { borderColor: WARM },
  tagToggleText:      { color: '#6b7a5e', fontSize: 12, fontWeight: '600' },
  tagToggleTextActive:{ color: WARM_SOFT },

  tagGrid:        { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tagChip:        { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: '#3a4a35', backgroundColor: 'rgba(20,30,18,0.7)' },
  tagChipActive:  { borderColor: WARM, backgroundColor: 'rgba(217,119,6,0.18)' },
  tagChipText:    { color: '#8fa885', fontSize: 12, fontWeight: '600' },
  tagChipTextActive:{ color: WARM_SOFT },

  input:      { color: '#f5f0e8', padding: 14, borderRadius: 14, minHeight: 100, textAlignVertical: 'top', marginBottom: 14, backgroundColor: 'rgba(0,0,0,0.35)', fontSize: 14, lineHeight: 22, borderWidth: 1, borderColor: '#3a4a3566' },
  postBtn:    { padding: 14, borderRadius: 18, marginBottom: 8, alignItems: 'center', backgroundColor: WARM },
  postBtnText:{ color: '#fff', fontSize: 15, fontWeight: 'bold' },
  safeText:   { color: '#6b7a5e', fontSize: 11, textAlign: 'center', marginTop: 4 },
  crisisNudge:    { backgroundColor: 'rgba(5,150,105,0.12)', borderRadius: 12, padding: 12, marginBottom: 10, borderLeftWidth: 3, borderLeftColor: SAGE },
  crisisNudgeText:{ color: SAGE_SOFT, fontSize: 13, lineHeight: 19 },

  journalNote:    { borderWidth: 1, borderColor: '#3a4a35', borderStyle: 'dashed', borderRadius: 12, padding: 10, marginBottom: 12, backgroundColor: '#f5f0e808', transform: [{ rotate: '1deg' }] },
  journalNoteText:{ color: '#8fa885', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  sectionCard:       { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 20, padding: 16, marginTop: 6, marginBottom: 14, backgroundColor: 'rgba(15,22,12,0.85)' },
  sectionTitle:      { color: '#f5f0e8', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  emptyText:         { color: '#8fa885', fontSize: 13, fontStyle: 'italic', textAlign: 'center', paddingVertical: 18 },
  circlePromise:     { padding: 13, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 12 },
  circlePromiseText: { color: '#d4e8cc', fontSize: 13, fontWeight: '600' },
  circlePromiseSub:  { color: '#6b7a5e', fontSize: 10, letterSpacing: 0.5, marginTop: 3 },

  postCard:      { borderWidth: 1, borderColor: '#3a4a3588', borderRadius: 20, padding: 16, marginBottom: 10, backgroundColor: 'rgba(20,30,18,0.82)' },
  postSticker:   { fontSize: 18, position: 'absolute', top: 12, right: 14 },
  postMetaRow:   { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  anonymousDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: AMBER_GLOW, marginRight: 7 },
  anonymousName: { color: '#c9dfc2', fontSize: 11, fontWeight: '800', flex: 1 },
  reportBtn:     { paddingHorizontal: 4 },
  reportBtnText: { color: '#c9dfc2', fontSize: 13, opacity: 0.6 },
  postDate:      { color: '#6b7a5e', fontSize: 11, marginTop: 4, marginBottom: 6 },
  postText:      { color: '#f5f0e8', fontSize: 15, lineHeight: 22, marginBottom: 8 },

  tagBadge:     { alignSelf: 'flex-start', borderWidth: 1, borderColor: WARM + '55', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8, backgroundColor: WARM + '18' },
  tagBadgeText: { color: WARM_SOFT, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },

  reactionRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  reactionBtn:  { backgroundColor: 'rgba(20,30,18,0.85)', paddingHorizontal: 8, paddingVertical: 8, borderRadius: 14, alignItems: 'center', flex: 1, minWidth: '18%' },
  reactionEmoji:{ fontSize: 15 },
  reactionCount:{ color: '#f5f0e8', fontWeight: 'bold', fontSize: 12, marginTop: 1 },
  reactionLabel:{ color: '#6b7a5e', fontSize: 9, marginTop: 2, textAlign: 'center' },

  feedTabRail:      { gap: 8, paddingHorizontal: 0, paddingBottom: 12, paddingTop: 4 },
  feedTab:          { borderRadius: 999, borderWidth: 1, borderColor: '#3a4a35', backgroundColor: 'rgba(20,30,18,0.7)', paddingHorizontal: 14, paddingVertical: 6 },
  feedTabActive:    { borderColor: WARM, backgroundColor: 'rgba(217,119,6,0.18)' },
  feedTabText:      { color: '#6b7a5e', fontSize: 11, fontWeight: '700' },
  feedTabTextActive:{ color: WARM_SOFT },

  replyBtn:     { marginTop: 10, padding: 10, borderRadius: 14, backgroundColor: 'rgba(217,119,6,0.15)' },
  replyBtnText: { color: WARM_SOFT, fontWeight: '700', fontSize: 12, textAlign: 'center' },

  cultureCard:  { borderWidth: 1, borderColor: '#3a4a35', borderRadius: 20, padding: 18, marginTop: 4, marginBottom: 24, backgroundColor: 'rgba(20,30,18,0.85)' },
  cultureTitle: { color: '#f5f0e8', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  cultureText:  { color: '#a3b899', fontSize: 13, marginBottom: 4, lineHeight: 19 },

  modalBackdrop:  { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalCard:      { borderWidth: 1, borderColor: '#3a4a35', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 16, maxHeight: '80%', backgroundColor: 'rgba(15,22,12,0.98)' },
  modalTitle:     { color: '#f5f0e8', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub:       { color: '#8fa885', fontSize: 12, marginBottom: 12 },
  replyOption:    { padding: 12, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 8 },
  replyOptionActive:{ backgroundColor: 'rgba(217,119,6,0.18)' },
  replyOptionText:{ color: '#d4e8cc', fontSize: 14, fontWeight: '600' },
  replyInput:     { color: '#f5f0e8', padding: 12, borderRadius: 12, minHeight: 44, marginTop: 8, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: '#3a4a3566' },
  sendBtn:        { marginTop: 12, padding: 14, borderRadius: 16, alignItems: 'center', backgroundColor: WARM },
  sendBtnText:    { color: '#fff', fontWeight: '800' },
  cancelBtn:      { marginTop: 8, padding: 10, alignItems: 'center' },
  cancelBtnText:  { color: '#6b7a5e', fontSize: 13 },
});

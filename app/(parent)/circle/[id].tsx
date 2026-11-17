// app/(parent)/circle/[id].tsx
// Parent Circle — Post Detail + Reply Flow
// Modes: Reply softly / Been there / Sit with this / Save to Pages

import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';

const PARENT_REACTIONS = [
  { emoji: '☕', key: 'beenThere',  label: 'been there'       },
  { emoji: '🤝', key: 'solidarity', label: 'solidarity'       },
  { emoji: '🌱', key: 'reminder',   label: 'good reminder'    },
  { emoji: '💜', key: 'needed',     label: 'needed this'      },
  { emoji: '🕯️', key: 'strength',  label: 'sending strength' },
];

const REPLY_MODES = [
  { key: 'soft',   emoji: '☕', label: 'Reply softly',   desc: 'One anonymous soft word — no thread, no drama' },
  { key: 'beenthere', emoji: '🤝', label: 'Been there',  desc: 'Silent solidarity — they\'ll feel it' },
  { key: 'sit',    emoji: '🕯️', label: 'Sit with this',  desc: 'Stay quietly. sometimes that\'s everything' },
  { key: 'pages',  emoji: '📖', label: 'Save to Pages',  desc: 'Keep this one for yourself' },
] as const;

type ReplyModeKey = (typeof REPLY_MODES)[number]['key'];

const QUIET_REPLY_PROMPTS = [
  'you\'re doing better than you think.',
  'same here. it\'s harder than anyone says.',
  'this one hit. thank you for posting it.',
  'solidarity.',
  'holding this alongside you.',
  'good reminder for me today.',
  'you\'re not alone in this.',
  'that took courage to share.',
];

const SAFE_ENERGY = [
  { emoji: '☕', label: 'you\'re not alone' },
  { emoji: '🌱', label: 'growth takes time' },
  { emoji: '🕯️', label: 'your effort matters' },
  { emoji: '🌉', label: 'connection is possible' },
  { emoji: '🏡', label: 'home is a practice' },
];

const WARM = '#d97706';
const WARM_SOFT = '#fbbf24';
const SAGE_SOFT = '#34d399';

type ParentCirclePost = {
  id: string | number;
  text: string;
  date?: string;
  time?: string;
  circleTag?: string;
  anonymousName?: string;
  quietRepliesCount?: number;
  reactions?: Record<string, number>;
};

const SEED_POSTS: ParentCirclePost[] = [
  { id: 'ps-1', anonymousName: 'anonymous parent', circleTag: 'communication', text: "my teenager won\'t talk to me and I'm trying to not take it personally. it's really hard.", reactions: { beenThere: 47, solidarity: 38, reminder: 12, needed: 21, strength: 29 }, quietRepliesCount: 14 },
  { id: 'ps-2', anonymousName: 'anonymous parent', circleTag: 'connection', text: "I let them stay up late and skip the homework lecture. sometimes connection is the homework.", reactions: { beenThere: 31, solidarity: 19, reminder: 44, needed: 37, strength: 16 }, quietRepliesCount: 9 },
  { id: 'ps-3', anonymousName: 'anonymous parent', circleTag: 'proud moment', text: "I apologized to my kid for how I reacted yesterday. their face when I said sorry — I'll remember that.", reactions: { beenThere: 22, solidarity: 18, reminder: 53, needed: 41, strength: 27 }, quietRepliesCount: 11 },
  { id: 'ps-4', anonymousName: 'anonymous parent', circleTag: 'just venting', text: "does anyone else feel like they're always one wrong word away from a wall going up?", reactions: { beenThere: 68, solidarity: 55, reminder: 9, needed: 33, strength: 24 }, quietRepliesCount: 22 },
  { id: 'ps-5', anonymousName: 'anonymous parent', circleTag: 'connection', text: "three years of hard moments and today we laughed together for a whole hour. those are the ones I hold on to.", reactions: { beenThere: 29, solidarity: 24, reminder: 38, needed: 51, strength: 43 }, quietRepliesCount: 17 },
  { id: 'ps-6', anonymousName: 'anonymous parent', circleTag: 'burnout', text: "I love my kids more than anything. and I\'m exhausted in a way that sleep doesn't fix. both things are true.", reactions: { beenThere: 84, solidarity: 71, reminder: 19, needed: 62, strength: 48 }, quietRepliesCount: 31 },
];

export default function ParentCirclePostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { parentCirclePosts, reactToParentPost } = useAppContext();

  const allPosts = parentCirclePosts.length ? parentCirclePosts : SEED_POSTS;
  const post = (allPosts as ParentCirclePost[]).find(p => String(p.id) === String(id));

  const [replyMode, setReplyMode]   = useState<ReplyModeKey | null>(null);
  const [softText, setSoftText]     = useState('');
  const [sitModal, setSitModal]     = useState(false);
  const [beenThereSent, setBeenThereSent] = useState(false);
  const [sat, setSat]               = useState(false);
  const [savedToPages, setSavedToPages] = useState(false);

  if (!post) {
    return (
      <View style={s.root}>
        <LinearGradient colors={['#1a0e06', '#0f1a0e']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={s.notFound}>
            <Text style={s.notFoundEmoji}>☕</Text>
            <Text style={s.notFoundText}>this post has floated away</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const reactions = post.reactions ?? {};
  const isSeed = String(post.id).startsWith('ps-');

  function react(key: string) {
    if (!isSeed) reactToParentPost(Number(post!.id), key);
  }

  function handleReplyMode(key: ReplyModeKey) {
    if (key === 'sit') {
      setSitModal(true);
      return;
    }
    if (key === 'beenthere') {
      setBeenThereSent(true);
      react('solidarity');
      return;
    }
    if (key === 'pages') {
      setSavedToPages(true);
      return;
    }
    setReplyMode(replyMode === key ? null : key);
  }

  function submitSoftReply() {
    const t = softText.trim();
    if (!t) return;
    react('needed');
    setSoftText('');
    setReplyMode(null);
  }

  function handleSit() {
    setSat(true);
    react('strength');
    setSitModal(false);
  }

  const circleNoticed =
    (reactions.beenThere ?? 0) + (reactions.solidarity ?? 0) > 50
      ? 'The circle noticed — a lot of parents feel this too. you\'re not carrying it alone. ☕'
      : (reactions.needed ?? 0) > 30
      ? 'The circle noticed — this one is really landing. thank you for sharing it. 💜'
      : null;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#1a0e06', '#0f1a0e', '#0c0c18']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={s.header}>
              <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                <Text style={s.backBtnText}>‹</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={s.kicker}>PARENT CIRCLE</Text>
                <Text style={s.title}>a post</Text>
              </View>
              <View style={s.anonPill}>
                <Text style={s.anonPillText}>🌿 anonymous</Text>
              </View>
            </View>

            {/* Post body */}
            <View style={s.postCard}>
              <View style={s.postMeta}>
                <View style={s.anonRow}>
                  <View style={s.anonDot} />
                  <Text style={s.anonLabel}>{post.anonymousName ?? 'anonymous parent'}</Text>
                </View>
                {post.time ? <Text style={s.postTime}>{post.time}</Text> : null}
              </View>

              {post.circleTag ? (
                <View style={s.tagBadge}>
                  <Text style={s.tagBadgeText}>{post.circleTag}</Text>
                </View>
              ) : null}

              <Text style={s.postText}>{post.text}</Text>

              {/* Reactions */}
              <View style={s.reactionsRow}>
                {PARENT_REACTIONS.map(r => {
                  const count = (reactions[r.key] ?? 0);
                  return (
                    <TouchableOpacity
                      key={r.key}
                      style={[s.reactionBtn, count > 0 && s.reactionBtnActive]}
                      onPress={() => react(r.key)}
                    >
                      <Text style={s.reactionEmoji}>{r.emoji}</Text>
                      <Text style={[s.reactionCount, count > 0 && s.reactionCountActive]}>{count}</Text>
                      <Text style={[s.reactionLabel, count > 0 && s.reactionLabelActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {post.quietRepliesCount ? (
                <Text style={s.quietCount}>{post.quietRepliesCount} quiet replies in the circle</Text>
              ) : null}
            </View>

            {/* Circle noticed */}
            {circleNoticed ? (
              <View style={s.circleNotice}>
                <Text style={s.circleNoticeText}>{circleNoticed}</Text>
              </View>
            ) : null}

            {/* Reply mode selector */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>how do you want to show up?</Text>
              <View style={s.replyModeGrid}>
                {REPLY_MODES.map(mode => {
                  const active = replyMode === mode.key
                    || (mode.key === 'beenthere' && beenThereSent)
                    || (mode.key === 'sit' && sat)
                    || (mode.key === 'pages' && savedToPages);
                  return (
                    <TouchableOpacity
                      key={mode.key}
                      style={[s.replyModeCard, active && s.replyModeCardActive]}
                      onPress={() => handleReplyMode(mode.key)}
                      activeOpacity={0.75}
                    >
                      <Text style={s.replyModeEmoji}>{mode.emoji}</Text>
                      <Text style={[s.replyModeLabel, active && s.replyModeLabelActive]}>{mode.label}</Text>
                      <Text style={s.replyModeDesc}>{mode.desc}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Soft reply composer */}
            {replyMode === 'soft' ? (
              <View style={s.softComposer}>
                <Text style={s.softLabel}>one soft word, anonymously</Text>
                <View style={s.quickReplies}>
                  {QUIET_REPLY_PROMPTS.slice(0, 4).map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[s.quickReply, softText === r && s.quickReplyActive]}
                      onPress={() => setSoftText(r)}
                    >
                      <Text style={s.quickReplyText}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={s.softInput}
                  placeholder="or a short note of your own…"
                  placeholderTextColor="#6b7a5e"
                  value={softText}
                  onChangeText={setSoftText}
                  multiline
                  maxLength={200}
                />
                <View style={s.softFooter}>
                  <TouchableOpacity onPress={() => { setReplyMode(null); setSoftText(''); }}>
                    <Text style={s.cancelText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sendBtn, !softText.trim() && s.sendBtnDisabled]}
                    onPress={submitSoftReply}
                    disabled={!softText.trim()}
                  >
                    <Text style={s.sendBtnText}>send quietly ☕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Been there sent feedback */}
            {beenThereSent ? (
              <View style={s.feedbackCard}>
                <Text style={s.feedbackText}>🤝 silent solidarity sent. they feel it.</Text>
              </View>
            ) : null}

            {/* Saved to pages feedback */}
            {savedToPages ? (
              <View style={[s.feedbackCard, { borderColor: 'rgba(52,211,153,0.3)' }]}>
                <Text style={[s.feedbackText, { color: SAGE_SOFT }]}>📖 saved to your Pages quietly.</Text>
              </View>
            ) : null}

            {/* Safe energy */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>safe energy for this space</Text>
              <View style={s.safeEnergyRow}>
                {SAFE_ENERGY.map((item, i) => (
                  <View key={i} style={s.safeEnergyChip}>
                    <Text style={s.safeEnergyEmoji}>{item.emoji}</Text>
                    <Text style={s.safeEnergyLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 80 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Sit with this modal */}
      <Modal visible={sitModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>🕯️</Text>
            <Text style={s.modalTitle}>sit with this post</Text>
            <Text style={s.modalBody}>
              you don"t have to say anything. reading, feeling, staying — sometimes that's the whole thing. the circle knows you"re here.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleSit}>
              <Text style={s.modalBtnText}>I'm sitting with it 🕯️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSitModal(false)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a1a14' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#f5f0e8', fontSize: 22, lineHeight: 26 },
  kicker: { color: WARM, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#f5f0e8', fontSize: 22, fontWeight: '800', marginTop: 2 },
  anonPill: { backgroundColor: 'rgba(15,26,14,0.9)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#3a4a35' },
  anonPillText: { color: '#8fa885', fontSize: 11, fontWeight: '600' },

  postCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: 'rgba(20,30,18,0.85)', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#3a4a3588' },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  anonRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  anonDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: WARM_SOFT },
  anonLabel: { color: '#c9dfc2', fontSize: 11, fontWeight: '800' },
  postTime: { color: '#6b7a5e', fontSize: 10 },
  tagBadge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: `${WARM}55`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10, backgroundColor: `${WARM}18` },
  tagBadgeText: { color: WARM_SOFT, fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  postText: { color: '#f5f0e8', fontSize: 16, lineHeight: 25, marginBottom: 14 },
  quietCount: { color: '#6b7a5e', fontSize: 11, marginTop: 8, fontStyle: 'italic' },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reactionBtn: { alignItems: 'center', backgroundColor: 'rgba(20,30,18,0.85)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 8, flex: 1, minWidth: '18%', borderWidth: 1, borderColor: '#3a4a3566' },
  reactionBtnActive: { backgroundColor: `${WARM}18`, borderColor: `${WARM}55` },
  reactionEmoji: { fontSize: 15 },
  reactionCount: { color: '#f5f0e8', fontWeight: '800', fontSize: 12, marginTop: 1 },
  reactionCountActive: { color: WARM_SOFT },
  reactionLabel: { color: '#6b7a5e', fontSize: 9, marginTop: 2, textAlign: 'center' },
  reactionLabelActive: { color: WARM_SOFT },

  circleNotice: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)', padding: 12 },
  circleNoticeText: { color: WARM_SOFT, fontSize: 13, lineHeight: 20 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { color: '#6b7a5e', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },

  replyModeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  replyModeCard: { width: '47%', backgroundColor: 'rgba(20,30,18,0.8)', borderRadius: 16, borderWidth: 1, borderColor: '#3a4a35', padding: 14, gap: 4 },
  replyModeCardActive: { backgroundColor: `${WARM}18`, borderColor: WARM },
  replyModeEmoji: { fontSize: 20, marginBottom: 2 },
  replyModeLabel: { color: '#d4e8cc', fontSize: 13, fontWeight: '800' },
  replyModeLabelActive: { color: WARM_SOFT },
  replyModeDesc: { color: '#6b7a5e', fontSize: 11, lineHeight: 16 },

  softComposer: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(20,30,18,0.9)', borderRadius: 16, borderWidth: 1, borderColor: '#3a4a35', padding: 14 },
  softLabel: { color: '#8fa885', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  quickReplies: { gap: 6, marginBottom: 10 },
  quickReply: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: '#3a4a35' },
  quickReplyActive: { backgroundColor: `${WARM}18`, borderColor: WARM },
  quickReplyText: { color: '#d4e8cc', fontSize: 13, fontWeight: '600' },
  softInput: { color: '#f5f0e8', fontSize: 14, minHeight: 64, lineHeight: 22, backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 12, marginBottom: 10, textAlignVertical: 'top', borderWidth: 1, borderColor: '#3a4a3566' },
  softFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { color: '#6b7a5e', fontSize: 13, fontWeight: '600' },
  sendBtn: { backgroundColor: WARM, borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  feedbackCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(217,119,6,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(217,119,6,0.3)', padding: 12 },
  feedbackText: { color: WARM_SOFT, fontSize: 13, fontWeight: '700' },

  safeEnergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safeEnergyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(20,30,18,0.7)', borderRadius: 999, borderWidth: 1, borderColor: '#3a4a35', paddingHorizontal: 10, paddingVertical: 6 },
  safeEnergyEmoji: { fontSize: 12 },
  safeEnergyLabel: { color: '#6b7a5e', fontSize: 11, fontWeight: '600' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundEmoji: { fontSize: 36, marginBottom: 12 },
  notFoundText: { color: '#6b7a5e', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: 'rgba(20,30,18,0.98)', borderRadius: 24, borderWidth: 1, borderColor: '#3a4a35', padding: 24, width: '100%', alignItems: 'center' },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: { color: '#f5f0e8', fontSize: 20, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  modalBody: { color: '#c9dfc2', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  modalBtn: { backgroundColor: WARM, borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
  modalBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { color: '#6b7a5e', fontSize: 13, fontWeight: '600' },
});

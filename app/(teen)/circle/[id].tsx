// app/(teen)/circle/[id].tsx
// SE'KRET CIRCLE — Post Detail + Se'kret-Guided Reply Flow
// Modes: Write comfort / Voice reply / Send support / Just stay

import React, { useState } from 'react';
import {
  Alert,
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
import { syncCircleReaction } from '@/utils/sync';
import type { CirclePost } from '@/context/AppContext';

const REACTION_LABELS: { key: keyof CirclePost['reactions']; emoji: string; label: string }[] = [
  { key: 'felt',    emoji: '💜', label: 'felt this too'     },
  { key: 'comfort', emoji: '☁️', label: 'sending comfort'  },
  { key: 'proud',   emoji: '⭐', label: 'proud of you'     },
  { key: 'stay',    emoji: '🌙', label: 'staying with this' },
];

const REPLY_MODES = [
  { key: 'comfort',  emoji: '☁️', label: 'Write comfort',  desc: 'Leave a soft anonymous word' },
  { key: 'voice',    emoji: '🎙️', label: 'Voice reply',   desc: 'A 30-sec voice bip (coming soon)' },
  { key: 'support',  emoji: '⭐', label: 'Send support',   desc: 'Send a silent energy boost' },
  { key: 'stay',     emoji: '🌙', label: 'Just stay',      desc: 'Stay with this post quietly' },
] as const;

type ReplyModeKey = (typeof REPLY_MODES)[number]['key'];

const SAFE_ENERGY = [
  { emoji: '💜', label: 'you\'re not alone' },
  { emoji: '🌙', label: 'it\'s okay to feel this' },
  { emoji: '☁️', label: 'rest if you need to' },
  { emoji: '⭐', label: 'this will pass' },
  { emoji: '🌿', label: 'breathe with me' },
];

function normalizeReactions(raw: unknown): CirclePost['reactions'] {
  const r = (raw ?? {}) as Partial<Record<keyof CirclePost['reactions'], number>>;
  return {
    felt:    Number(r.felt    ?? 0),
    comfort: Number(r.comfort ?? 0),
    proud:   Number(r.proud   ?? 0),
    stay:    Number(r.stay    ?? 0),
  };
}

function getPostMoodColor(text: string): string | null {
  if (text.startsWith('🌧️ ')) return '#7dd3fc';
  if (text.startsWith('☁️ '))  return '#c4b5fd';
  if (text.startsWith('🌟 ')) return '#fbbf24';
  if (text.startsWith('✨ '))  return '#fb7185';
  return null;
}

export default function CirclePostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { circlePosts, setCirclePosts } = useAppContext();

  const post = circlePosts.find(p => String(p.id) === String(id));

  const [replyMode, setReplyMode]     = useState<ReplyModeKey | null>(null);
  const [comfortText, setComfortText] = useState('');
  const [stayModal, setStayModal]     = useState(false);
  const [supportSent, setSupportSent] = useState(false);
  const [stayed, setStayed]           = useState(false);

  if (!post) {
    return (
      <View style={s.root}>
        <LinearGradient colors={['#10091b', '#0d0518']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={s.notFound}>
            <Text style={s.notFoundEmoji}>🌑</Text>
            <Text style={s.notFoundText}>this bip has floated away</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const reactions = normalizeReactions(post.reactions);
  const moodColor = getPostMoodColor(post.text);
  const displayText = moodColor
    ? post.text.slice(post.text.indexOf(' ') + 1)
    : post.text;

  function react(key: keyof CirclePost['reactions']) {
    setCirclePosts(posts =>
      posts.map(p =>
        String(p.id) === String(id)
          ? { ...p, reactions: { ...normalizeReactions(p.reactions), [key]: (normalizeReactions(p.reactions)[key] ?? 0) + 1 } }
          : p,
      ),
    );
    void syncCircleReaction(post!.id, key);
  }

  function handleReplyMode(key: ReplyModeKey) {
    if (key === 'stay') {
      setStayModal(true);
      return;
    }
    if (key === 'support') {
      setSupportSent(true);
      react('comfort');
      return;
    }
    if (key === 'voice') {
      Alert.alert('Voice Bip 🎙️', 'Voice replies are coming soon. 💜');
      return;
    }
    setReplyMode(replyMode === key ? null : key);
  }

  function submitComfort() {
    const t = comfortText.trim();
    if (!t) return;
    react('comfort');
    setComfortText('');
    setReplyMode(null);
  }

  function handleStay() {
    setStayed(true);
    react('stay');
    setStayModal(false);
  }

  const sekretPrompt = reactions.felt + reactions.stay > 3
    ? 'Se\'kret noticed — a lot of people feel this too. you\'re in good company. 💜'
    : reactions.comfort > 2
    ? 'Se\'kret noticed — this bip is getting a lot of comfort energy. someone cares. ☁️'
    : null;

  return (
    <View style={s.root}>
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

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
                <Text style={s.kicker}>SE'KRET CIRCLE</Text>
                <Text style={s.title}>a bip</Text>
              </View>
              <View style={s.anonPill}>
                <Text style={s.anonPillText}>🌑 anonymous</Text>
              </View>
            </View>

            {/* Post body */}
            <View style={[s.postCard, moodColor ? { borderLeftColor: moodColor, borderLeftWidth: 3 } : null]}>
              <View style={s.postMeta}>
                <Text style={s.anonLabel}>anonymous bip</Text>
                <Text style={s.postTime}>{post.time}</Text>
              </View>
              <Text style={s.postText}>{displayText}</Text>

              {/* Reactions full */}
              <View style={s.reactionsRow}>
                {REACTION_LABELS.map(({ key, emoji, label }) => {
                  const count = reactions[key] ?? 0;
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[s.reactionBtn, count > 0 && s.reactionBtnActive]}
                      onPress={() => react(key)}
                    >
                      <Text style={s.reactionEmoji}>{emoji}</Text>
                      <Text style={[s.reactionLabel, count > 0 && s.reactionLabelActive]}>{label}</Text>
                      {count > 0 && <Text style={s.reactionCount}>{count}</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Se'kret noticed prompt */}
            {sekretPrompt ? (
              <View style={s.sekretNotice}>
                <Text style={s.sekretNoticeText}>{sekretPrompt}</Text>
              </View>
            ) : null}

            {/* Reply mode selector */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>how do you want to show up?</Text>
              <View style={s.replyModeGrid}>
                {REPLY_MODES.map(mode => {
                  const active = replyMode === mode.key || (mode.key === 'support' && supportSent) || (mode.key === 'stay' && stayed);
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

            {/* Write comfort composer */}
            {replyMode === 'comfort' ? (
              <View style={s.comfortComposer}>
                <Text style={s.comfortLabel}>your soft anonymous word</Text>
                <TextInput
                  style={s.comfortInput}
                  placeholder="say something soft. they'll feel it, not see it."
                  placeholderTextColor="#5a3a78"
                  value={comfortText}
                  onChangeText={setComfortText}
                  multiline
                  maxLength={200}
                  autoFocus
                />
                <View style={s.comfortFooter}>
                  <TouchableOpacity onPress={() => { setReplyMode(null); setComfortText(''); }}>
                    <Text style={s.cancelText}>cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.sendBtn, !comfortText.trim() && s.sendBtnDisabled]}
                    onPress={submitComfort}
                    disabled={!comfortText.trim()}
                  >
                    <Text style={s.sendBtnText}>send comfort ☁️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {/* Support sent feedback */}
            {supportSent ? (
              <View style={s.supportSentCard}>
                <Text style={s.supportSentText}>⭐ silent support sent. they feel it.</Text>
              </View>
            ) : null}

            {/* Safe Energy Controls */}
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

      {/* Stay With Them modal */}
      <Modal visible={stayModal} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalEmoji}>🌙</Text>
            <Text style={s.modalTitle}>stay with this post</Text>
            <Text style={s.modalBody}>
              you don't have to say anything. sometimes being here — reading, feeling, staying — is the whole thing.
            </Text>
            <TouchableOpacity style={s.modalBtn} onPress={handleStay}>
              <Text style={s.modalBtnText}>I'm staying 🌙</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStayModal(false)} style={s.modalCancel}>
              <Text style={s.modalCancelText}>go back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711' },
  safe: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  kicker: { color: '#a855f7', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 2 },
  anonPill: { backgroundColor: '#1e0b30', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#3d1a5e' },
  anonPillText: { color: '#7c5a9e', fontSize: 11, fontWeight: '600' },

  postCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#16082a', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#2e1250' },
  postMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  anonLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '600' },
  postTime: { color: '#3d2258', fontSize: 10 },
  postText: { color: '#e8dff5', fontSize: 16, lineHeight: 25, marginBottom: 14 },

  reactionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reactionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1e0a30', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: '#2e1250' },
  reactionBtnActive: { backgroundColor: '#3d1a5e', borderColor: '#7c3aed' },
  reactionEmoji: { fontSize: 14 },
  reactionLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '600' },
  reactionLabelActive: { color: '#c4b5fd' },
  reactionCount: { color: '#a855f7', fontSize: 11, fontWeight: '800', marginLeft: 2 },

  sekretNotice: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(168,85,247,0.25)', padding: 12 },
  sekretNoticeText: { color: '#c4b5fd', fontSize: 13, lineHeight: 20 },

  section: { paddingHorizontal: 16, marginBottom: 16 },
  sectionLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, textTransform: 'uppercase' },

  replyModeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  replyModeCard: { width: '47%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, borderWidth: 1, borderColor: '#2e1250', padding: 14, gap: 4 },
  replyModeCardActive: { backgroundColor: 'rgba(168,85,247,0.15)', borderColor: '#7c3aed' },
  replyModeEmoji: { fontSize: 20, marginBottom: 2 },
  replyModeLabel: { color: '#c4b5fd', fontSize: 13, fontWeight: '800' },
  replyModeLabelActive: { color: '#e8dff5' },
  replyModeDesc: { color: '#5a3a78', fontSize: 11, lineHeight: 16 },

  comfortComposer: { marginHorizontal: 16, marginBottom: 16, backgroundColor: '#180a28', borderRadius: 16, borderWidth: 1, borderColor: '#3d1a5e', padding: 14 },
  comfortLabel: { color: '#6b4888', fontSize: 11, fontWeight: '700', marginBottom: 8 },
  comfortInput: { color: '#e8dff5', fontSize: 14, minHeight: 80, lineHeight: 22, backgroundColor: '#100520', borderRadius: 12, padding: 12, marginBottom: 10, textAlignVertical: 'top' },
  comfortFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cancelText: { color: '#5a3a78', fontSize: 13, fontWeight: '600' },
  sendBtn: { backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 18, paddingVertical: 8 },
  sendBtnDisabled: { opacity: 0.35 },
  sendBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  supportSentCard: { marginHorizontal: 16, marginBottom: 16, backgroundColor: 'rgba(251,191,36,0.1)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(251,191,36,0.25)', padding: 12 },
  supportSentText: { color: '#fbbf24', fontSize: 13, fontWeight: '700' },

  safeEnergyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  safeEnergyChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 999, borderWidth: 1, borderColor: '#2e1250', paddingHorizontal: 10, paddingVertical: 6 },
  safeEnergyEmoji: { fontSize: 12 },
  safeEnergyLabel: { color: '#5a3a78', fontSize: 11, fontWeight: '600' },

  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundEmoji: { fontSize: 36, marginBottom: 12 },
  notFoundText: { color: '#5a3a78', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#180a28', borderRadius: 24, borderWidth: 1, borderColor: '#3d1a5e', padding: 24, width: '100%', alignItems: 'center' },
  modalEmoji: { fontSize: 40, marginBottom: 12 },
  modalTitle: { color: '#e8dff5', fontSize: 20, fontWeight: '900', marginBottom: 10, textAlign: 'center' },
  modalBody: { color: '#c4b5fd', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 24 },
  modalBtn: { backgroundColor: '#7c3aed', borderRadius: 20, paddingHorizontal: 28, paddingVertical: 12, width: '100%', alignItems: 'center', marginBottom: 10 },
  modalBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { color: '#5a3a78', fontSize: 13, fontWeight: '600' },
});

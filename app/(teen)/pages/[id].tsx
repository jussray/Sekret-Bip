// app/(teen)/pages/[id].tsx
// SE'KRET PAGES — Entry Detail
// Full entry view: text, media, sekretReply, voice playback, pin toggle,
// Today's Check-In, Entry Insights, and Reply to Se'kret composer.

import React, { useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import {
  fetchSekretBrainReply,
  fetchSekretVoice,
  type SekretCharacterId,
  type SekretHistoryTurn,
} from '@/utils/api';
import { buildReplyRequest } from '@/services/ai/buildReplyRequest';
import { buildOracleContext } from '@/services/oracleDiscovery';
import { saveContinuation } from '@/features/retention/savedContinuation';

type CompanionMeta = {
  label: string;
  accent: string;
  emoji: string;
  avatarId: SekretCharacterId | null;
};

const COMPANION_META: Record<string, CompanionMeta> = {
  suhana: { label: 'Suhana', accent: '#f08bc5', emoji: '💜', avatarId: 'suhana' },
  sy:     { label: 'Sy',     accent: '#76a7ff', emoji: '⚡', avatarId: 'sy'     },
  cloud:   { label: 'Cloud',   accent: '#8ed9e7', emoji: '☁️', avatarId: 'cloud'   },
  night:   { label: 'Night',   accent: '#9a8ee8', emoji: '🌙', avatarId: 'night'   },
  me:      { label: 'Me',      accent: '#b8a9c9', emoji: '🪞', avatarId: null },
  oracle:  { label: 'Oracle',  accent: '#c7b87a', emoji: '🔮', avatarId: null },
};

const AI_COMPANIONS = new Set<SekretCharacterId>(['suhana', 'sy', 'cloud', 'night']);

const CHECK_IN_MOODS = [
  { emoji: '😔', label: 'alone' },
  { emoji: '😮', label: 'a lot' },
  { emoji: '😌', label: 'a little' },
  { emoji: '🙂', label: 'okay' },
];

function getEnergyLevel(moodTag?: string): string {
  if (['heavy', 'anxious', 'numb'].includes(moodTag ?? '')) return 'low';
  if (moodTag === 'fired') return 'high';
  if (['soft', 'hopeful', 'okay'].includes(moodTag ?? '')) return 'medium';
  return 'medium';
}

function getSekretTip(moodTag?: string): string {
  const tips: Record<string, string> = {
    heavy: 'rest + breathe',
    anxious: 'ground yourself',
    numb: 'just feel it',
    soft: 'stay soft',
    okay: 'keep going',
    hopeful: 'hold onto this',
    fired: 'channel it',
  };
  return tips[moodTag ?? ''] ?? 'be gentle';
}

export default function EntryDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { entries, setEntries, patchJournalEntry, oracleProfile } = useAppContext();

  const entry = entries.find(e => String(e.id) === id);
  const companion: CompanionMeta | null = entry
    ? (COMPANION_META[(entry.activeTab || entry.source) ?? ''] ?? {
        label: 'Pages', accent: '#b8a9c9', emoji: '📄', avatarId: null,
      })
    : null;

  const [voiceLoading, setVoiceLoading] = useState(false);
  const [checkInMood, setCheckInMood] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);
  const [savedForLater, setSavedForLater] = useState(false);
  const audioCache = useRef<Record<string, string>>({});

  async function playReply() {
    if (!entry?.sekretReply || !companion?.avatarId || voiceLoading) return;
    setVoiceLoading(true);
    try {
      const key = String(entry.id);
      let uri = audioCache.current[key];
      if (!uri) {
        const audio = await fetchSekretVoice({
          reply: entry.sekretReply,
          characterId: companion.avatarId,
        });
        if (!audio) return;
        uri = `data:${audio.contentType};base64,${audio.audioBase64}`;
        audioCache.current[key] = uri;
      }
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
    } finally {
      setVoiceLoading(false);
    }
  }

  function togglePin() {
    if (!entry) return;
    patchJournalEntry(entry.id, { pinned: !entry.pinned });
  }

  async function handleSaveForLater() {
    if (!entry) return;
    await saveContinuation({
      entryId: entry.id,
      companionKey: entry.activeTab || entry.source,
    });
    setSavedForLater(true);
  }

  async function handleReply() {
    if (!replyText.trim() || replying || !entry || !companion) return;
    const text = replyText.trim();
    setReplying(true);

    const newId = Date.now();
    const companionKey = entry.activeTab || entry.source;
    setEntries(prev => [
      ...prev,
      {
        id: newId,
        text,
        mood: entry.moodTag ?? '',
        moodTag: entry.moodTag,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: companionKey,
        activeTab: companionKey,
        entryMode: 'typed',
        locked: entry.locked,
      },
    ]);
    setReplyText('');
    router.push('/(teen)/pages' as any);

    const avatarId = companion.avatarId;
    if (avatarId && AI_COMPANIONS.has(avatarId)) {
      try {
        const history: SekretHistoryTurn[] = [];
        for (const e of entries
          .filter(e => (e.activeTab || e.source) === companionKey)
          .sort((a, b) => Number(a.id) - Number(b.id))) {
          if (e.text) history.push({ role: 'user', content: e.text });
          if (e.sekretReply) history.push({ role: 'assistant', content: e.sekretReply });
        }

        const { request } = await buildReplyRequest({
          characterId: avatarId,
          surface: 'journal',
          text,
          mood: entry.moodTag ?? '',
          parentSharingEnabled: false,
          history,
          oracleContext: buildOracleContext(oracleProfile, 'teen'),
        });
        const result = await fetchSekretBrainReply(request);
        patchJournalEntry(newId, { sekretReply: result.reply });
      } catch {
        // Silent: the entry remains available even if the companion reply fails.
      }
    }
    setReplying(false);
  }

  if (!entry || !companion) {
    return (
      <View style={s.root}>
        <LinearGradient colors={['#10091b', '#090711']} style={StyleSheet.absoluteFill} />
        <SafeAreaView style={s.safe} edges={['top']}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Text style={s.backBtnText}>‹</Text>
            </TouchableOpacity>
          </View>
          <View style={s.notFound}>
            <Text style={s.notFoundText}>Entry not found.</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const energyLevel = getEnergyLevel(entry.moodTag);
  const sekretTip = getSekretTip(entry.moodTag);

  return (
    <View style={s.root}>
      <LinearGradient colors={['#10091b', '#171024', '#090711']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backBtnText}>‹</Text>
          </TouchableOpacity>
          <View style={[s.companionBadge, { backgroundColor: `${companion.accent}20`, borderColor: `${companion.accent}40` }]}>
            <Text style={s.companionEmoji}>{companion.emoji}</Text>
            <Text style={[s.companionLabel, { color: companion.accent }]}>{companion.label}</Text>
          </View>
          <View style={s.headerActions}>
            {entry.locked ? <Text style={s.lockIndicator}>🔒</Text> : null}
            <TouchableOpacity onPress={togglePin} style={s.pinBtn}>
              <Text style={s.pinBtnText}>{entry.pinned ? '📌' : '📍'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <Text style={s.dateTime}>{entry.date} at {entry.time}</Text>

          {entry.moodTag ? (
            <View style={s.moodTagWrap}>
              <Text style={[s.moodTag, { color: companion.accent, borderColor: `${companion.accent}40` }]}>
                #{entry.moodTag}
              </Text>
            </View>
          ) : null}

          {entry.imageUri ? (
            <Image source={{ uri: entry.imageUri }} style={s.media} resizeMode="cover" />
          ) : null}

          {entry.text ? (
            <View style={s.textCard}>
              <Text style={s.entryText}>{entry.text}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            onPress={handleSaveForLater}
            style={[s.saveLaterButton, { borderColor: `${companion.accent}35` }]}
            accessibilityRole="button"
            accessibilityLabel="Save this page so you can continue it later"
          >
            <Text style={[s.saveLaterText, { color: companion.accent }]}>
              {savedForLater ? '✓ saved for later' : '↩ save for later'}
            </Text>
            <Text style={s.saveLaterSub}>
              Room only remembers which page to reopen.
            </Text>
          </TouchableOpacity>

          {entry.sekretReply ? (
            <View style={[s.replyCard, { borderColor: `${companion.accent}25` }]}>
              <Text style={[s.replyLabel, { color: companion.accent }]}>
                {companion.emoji} {companion.label} said
              </Text>
              <Text style={s.replyText}>{entry.sekretReply}</Text>
              <View style={s.replyActions}>
                {companion.avatarId ? (
                  <TouchableOpacity
                    onPress={playReply}
                    disabled={voiceLoading}
                    style={[s.hearBtn, { borderColor: `${companion.accent}40` }]}
                  >
                    <Text style={[s.hearBtnText, { color: companion.accent }]}>
                      {voiceLoading ? 'loading…' : '▶ hear this'}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[s.quickReplyBtn, { borderColor: `${companion.accent}30` }]}>
                  <Text style={[s.quickReplyText, { color: companion.accent }]}>talk more</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.quickReplyBtn, { borderColor: `${companion.accent}30` }]}>
                  <Text style={[s.quickReplyText, { color: companion.accent }]}>comfort me</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <View style={s.sectionCard}>
            <Text style={[s.sectionTitle, { color: companion.accent }]}>Today's Check-In ♡</Text>
            <Text style={s.sectionSub}>How are you feeling now?</Text>
            <View style={s.checkInRow}>
              {CHECK_IN_MOODS.map(m => (
                <TouchableOpacity
                  key={m.label}
                  onPress={() => setCheckInMood(m.label)}
                  style={[
                    s.checkInChip,
                    checkInMood === m.label && {
                      borderColor: companion.accent,
                      backgroundColor: `${companion.accent}20`,
                    },
                  ]}
                >
                  <Text style={s.checkInEmoji}>{m.emoji}</Text>
                  <Text style={[s.checkInLabel, checkInMood === m.label && { color: companion.accent }]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.sectionCard}>
            <Text style={[s.sectionTitle, { color: companion.accent }]}>Entry Insights</Text>
            <View style={s.insightRow}>
              <View style={s.insightItem}>
                <Text style={s.insightKey}>Top Feeling</Text>
                <Text style={[s.insightValue, { color: companion.accent }]}>
                  {entry.moodTag ?? 'not tagged'}
                </Text>
              </View>
              <View style={s.insightItem}>
                <Text style={s.insightKey}>Energy Level</Text>
                <Text style={[s.insightValue, { color: companion.accent }]}>{energyLevel}</Text>
              </View>
              <View style={s.insightItem}>
                <Text style={s.insightKey}>Se'kret Tip</Text>
                <Text style={[s.insightValue, { color: companion.accent }]}>{sekretTip}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity onPress={togglePin} style={s.pinHint}>
            <Text style={s.pinHintText}>
              {entry.pinned ? '📌 Pinned — tap to unpin' : '📍 Tap to pin this entry'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={[s.composer, { borderTopColor: `${companion.accent}20` }]}>
            <TextInput
              value={replyText}
              onChangeText={setReplyText}
              placeholder="reply to se'kret…"
              placeholderTextColor="#6b607a"
              style={s.composerInput}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              onPress={handleReply}
              disabled={!replyText.trim() || replying}
              style={[
                s.composerSend,
                { backgroundColor: companion.accent },
                (!replyText.trim() || replying) && s.composerSendDisabled,
              ]}
            >
              <Text style={s.composerSendText}>{replying ? '…' : '›'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#090711' },
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  backBtnText: { color: '#fff', fontSize: 22, lineHeight: 26 },
  companionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  companionEmoji: { fontSize: 13 },
  companionLabel: { fontSize: 11, fontWeight: '800' },
  headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 10 },
  lockIndicator: { fontSize: 16 },
  pinBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  pinBtnText: { fontSize: 16 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  dateTime: { color: '#6b607a', fontSize: 11, marginBottom: 10 },
  moodTagWrap: { marginBottom: 12 },
  moodTag: { alignSelf: 'flex-start', fontSize: 11, fontWeight: '800', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  media: { width: '100%', height: 220, borderRadius: 18, marginBottom: 14 },
  textCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 16, marginBottom: 14 },
  entryText: { color: '#f0eaf4', fontSize: 16, lineHeight: 26 },
  replyCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, padding: 16, marginBottom: 14 },
  replyLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 0.6, marginBottom: 8 },
  replyText: { color: '#cfc5d5', fontSize: 15, lineHeight: 24, marginBottom: 12 },
  replyActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  hearBtn: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  hearBtnText: { fontSize: 10, fontWeight: '800' },
  quickReplyBtn: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  quickReplyText: { fontSize: 10, fontWeight: '700' },
  sectionCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 0.4, marginBottom: 4 },
  sectionSub: { color: '#6b607a', fontSize: 11, marginBottom: 12 },
  checkInRow: { flexDirection: 'row', gap: 8 },
  checkInChip: { flex: 1, alignItems: 'center', gap: 4, borderRadius: 14, borderWidth: 1, borderColor: '#ffffff14', backgroundColor: 'rgba(255,255,255,0.04)', paddingVertical: 10 },
  checkInEmoji: { fontSize: 20 },
  checkInLabel: { color: '#7a6e83', fontSize: 9, fontWeight: '700' },
  insightRow: { flexDirection: 'row', gap: 8 },
  insightItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 },
  insightKey: { color: '#6b607a', fontSize: 9, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  insightValue: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  pinHint: { alignSelf: 'center', paddingVertical: 10 },
  pinHintText: { color: '#504660', fontSize: 11 },
  saveLaterButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  saveLaterText: { fontSize: 12, fontWeight: '900', letterSpacing: 0.3 },
  saveLaterSub: { color: '#6b607a', fontSize: 10, lineHeight: 15, marginTop: 4, textAlign: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 24, borderTopWidth: 1 },
  composerInput: { flex: 1, color: '#f0eaf4', fontSize: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)', paddingHorizontal: 14, paddingVertical: 10, maxHeight: 100 },
  composerSend: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  composerSendText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  composerSendDisabled: { opacity: 0.3 },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundText: { color: '#6b607a', fontSize: 15 },
});
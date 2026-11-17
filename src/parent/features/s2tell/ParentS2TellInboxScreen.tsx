// src/parent/features/s2tell/ParentS2TellInboxScreen.tsx
//
// Parent S2Tell Inbox — reads messages the teen chose to share.
// Teen writes raw → Se'kret translates to a softer version → teen decides to share.
// Parent ONLY sees the softer rewrite. Raw text is never surfaced here.
//
// Privacy rules enforced:
//   - Only entries with shared === true are shown
//   - Raw text is never read or displayed
//   - Parent can draft a warm response; it stays local until they choose to send
//   - Parent cannot initiate — they can only receive + respond

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOP = Platform.OS === 'ios' ? 56 : 36;
const S2TELL_STORAGE_KEY   = 's2tell_entries';
const PENDING_FLAG_KEY     = 'parent_bridge_pending';
const PARENT_DRAFTS_KEY    = 'parent_s2tell_drafts';

// ── Response starters ─────────────────────────────────────────────────────────
const RESPONSE_STARTERS = [
  "Thank you for telling me. I am here.",
  "I hear you. That took courage to share.",
  "I love you. We can talk whenever you are ready.",
  "That makes sense. I am glad you told me.",
];

interface S2TellEntry {
  id:      string;
  rewrite: string;
  tone:    string;
  savedAt: string;
  shared:  boolean;
}

interface ParentS2TellInboxScreenProps {
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function ParentS2TellInboxScreen({ setScreen, BottomNav }: ParentS2TellInboxScreenProps) {
  const [entries, setEntries]             = useState<S2TellEntry[]>([]);
  const [drafts, setDrafts]               = useState<Record<string, string>>({});
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [starterIdx, setStarterIdx]       = useState(0);
  const [loading, setLoading]             = useState(true);

  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    loadEntries();
  }, []);

  async function loadEntries() {
    try {
      const [raw, draftsRaw] = await Promise.all([
        AsyncStorage.getItem(S2TELL_STORAGE_KEY),
        AsyncStorage.getItem(PARENT_DRAFTS_KEY),
      ]);
      const all: S2TellEntry[] = raw ? JSON.parse(raw) : [];
      setEntries(all.filter(e => e.shared));
      if (draftsRaw) setDrafts(JSON.parse(draftsRaw));
      // Clear the pending nudge once parent opens the inbox
      await AsyncStorage.removeItem(PENDING_FLAG_KEY).catch(() => {});
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft(entryId: string, text: string) {
    const updated = { ...drafts, [entryId]: text };
    setDrafts(updated);
    await AsyncStorage.setItem(PARENT_DRAFTS_KEY, JSON.stringify(updated)).catch(() => {});
  }

  const toneLabel: Record<string, string> = {
    soft:      'Soft Start',
    honest:    'Honest',
    boundary:  'Boundary',
    idontknow: "I don't know how",
  };

  const isEmpty = !loading && entries.length === 0;

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      >

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => setScreen('home')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.back}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>S2Tell Inbox</Text>
            <Text style={s.sub}>messages your teen chose to share</Text>
          </View>
          {entries.length > 0 && (
            <View style={s.countPill}>
              <Text style={s.countText}>{entries.length}</Text>
            </View>
          )}
        </View>

        {/* ── Privacy note ── */}
        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            {"These are Se'kret-translated versions of what your teen wrote. The original words stay private. They chose to share this with you."}
          </Text>
        </View>

        {/* ── Empty state ── */}
        {isEmpty && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>📬</Text>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptySub}>
              {"When your teen shares something from their S2Tell, you'll see it here."}
            </Text>
          </View>
        )}

        {/* ── Entries ── */}
        {entries.map(entry => {
          const isOpen = expandedId === entry.id;
          const draft  = drafts[entry.id] ?? '';
          return (
            <TouchableOpacity
              key={entry.id}
              style={[s.entryCard, isOpen && s.entryCardOpen]}
              onPress={() => setExpandedId(isOpen ? null : entry.id)}
              activeOpacity={0.85}
            >
              <View style={s.entryHeader}>
                <View style={s.tonePill}>
                  <Text style={s.toneText}>{toneLabel[entry.tone] ?? entry.tone}</Text>
                </View>
                <Text style={s.entryDate}>{entry.savedAt}</Text>
                <Text style={s.entryArrow}>{isOpen ? '▲' : '▼'}</Text>
              </View>
              <Text style={s.entryText} numberOfLines={isOpen ? undefined : 3}>{entry.rewrite}</Text>

              {isOpen && (
                <View style={s.replySection}>
                  <Text style={s.replyLabel}>Your response (private draft)</Text>
                  <TextInput
                    style={s.replyInput}
                    value={draft}
                    onChangeText={t => saveDraft(entry.id, t)}
                    placeholder="Write a warm response…"
                    placeholderTextColor="#475569"
                    multiline
                  />
                  {/* Starter suggestions */}
                  <TouchableOpacity
                    style={s.starterRow}
                    onPress={() => {
                      saveDraft(entry.id, RESPONSE_STARTERS[starterIdx]);
                      setStarterIdx(i => (i + 1) % RESPONSE_STARTERS.length);
                    }}
                  >
                    <Text style={s.starterSuggest}>Suggest a response</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* ── Bridge shortcut ── */}
        {!isEmpty && (
          <TouchableOpacity style={s.bridgeLink} onPress={() => setScreen('bridge')} activeOpacity={0.8}>
            <Text style={s.bridgeLinkEmoji}>🌉</Text>
            <Text style={s.bridgeLinkText}>Send a warm note from Bridge</Text>
            <Text style={s.bridgeLinkArrow}>›</Text>
          </TouchableOpacity>
        )}

      </Animated.ScrollView>
      {BottomNav}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#06030f' },
  scroll: { paddingBottom: 100 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 16,
  },
  back:  { color: '#c4b5fd', fontSize: 22, fontWeight: '300' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:   { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  countPill: {
    backgroundColor: 'rgba(192,132,252,0.18)',
    borderWidth: 1, borderColor: '#c084fc',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700' },

  privacyNote: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 2, borderLeftColor: '#475569',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  privacyText: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { color: '#64748B', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  entryCard: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 16,
  },
  entryCardOpen: { borderColor: '#c084fc' },

  entryHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  tonePill:    { backgroundColor: 'rgba(192,132,252,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  toneText:    { color: '#c084fc', fontSize: 11, fontWeight: '700' },
  entryDate:   { color: '#475569', fontSize: 11, flex: 1 },
  entryArrow:  { color: '#475569', fontSize: 11 },
  entryText:   { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },

  replySection: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12 },
  replyLabel:   { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  replyInput:   {
    color: '#fff', fontSize: 14, lineHeight: 22,
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    padding: 12, minHeight: 80,
  },
  starterRow:    { marginTop: 8, alignItems: 'flex-end' },
  starterSuggest:{ color: '#c084fc', fontSize: 12, fontWeight: '600' },

  bridgeLink: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginHorizontal: 20, marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
  bridgeLinkEmoji: { fontSize: 20 },
  bridgeLinkText:  { color: '#CBD5E1', fontSize: 14, flex: 1 },
  bridgeLinkArrow: { color: '#64748B', fontSize: 18 },
});

// screens/ParentBridgeScreen.tsx
// Parent Bridge — the canonical linked-account connection surface:
//   "Shared"  → signals, S2Tell shares, and moments the teen chose to share
//   "History" → a chronological log of the whole connection
//   "Reply"   → one-way warm message to teen
//
// Parent Se'kret advice (topic picker) moved to its own screen —
// see src/parent/features/sekret/ParentSekretCoachScreen.tsx — since it
// duplicated that richer, AI-backed coaching surface. Bridge stays scoped
// to intentionally shared relationship content (see docs/BRIDGE_CONNECTION_AUDIT.md).

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  View,
  Animated,
  StyleSheet,
  Platform,
  Alert,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import {
  sendParentNote,
} from '@/utils/sync';
import { fetchParentSentNotes, type ParentNote } from '@/utils/parentBridgeCompat';
import type { LinkedTeenData } from '@/hooks/useLinkedTeen';

// ─── palette ──────────────────────────────────────────────────────────────────
const P = {
  accent:  '#e9a04a',   // warm amber-orange (orange headphones energy)
  soft:    '#f5e8c8',
  deep:    '#2e1a10',
  card:    'rgba(46,26,16,0.88)',
  cardBorder: '#e9a04a44',
  bg1:     '#1e0f06',
  bg2:     '#2e1a10',
  bg3:     '#3a2208',
};

const STARTER_PROMPTS = [
  "I'm proud of you, even when I don't say it enough.",
  "You don't have to have it all figured out. Neither do I.",
  'I love you. No strings. No conditions.',
  "I noticed you've been quiet. I'm here whenever you're ready.",
  "You can always come to me. I promise I'll listen first.",
  "I'm rooting for you, always.",
];

interface ParentBridgeScreenProps {
  t:          Record<string, any>;
  setScreen:  (screen: string) => void;
  BottomNav:  React.ReactNode;
  linkedTeen: LinkedTeenData;
}

export function ParentBridgeScreen({ t, setScreen, BottomNav, linkedTeen }: ParentBridgeScreenProps) {
  const { linkedTeenId: teenId, isLinked: linked, sharedJournal, sharedMoods, signals } = linkedTeen;

  const [tab,        setTab]        = useState<'shared' | 'history' | 'bridge'>('shared');
  const [message,    setMessage]    = useState('');
  const [sent,       setSent]       = useState(false);
  const [sending,    setSending]    = useState(false);
  const [sentNotes,  setSentNotes]  = useState<ParentNote[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const s = (val: Animated.Value, delay: number) =>
      Animated.timing(val, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true });
    Animated.parallel([s(fade1, 0), s(fade2, 180), s(fade3, 360)]).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setSentNotes(await fetchParentSentNotes());
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    if (tab === 'history' && sentNotes.length === 0) void loadHistory();
  }, [tab, sentNotes.length, loadHistory]);

  type HistoryItem = { id: string; emoji: string; label: string; detail?: string; timestamp: string };
  const historyItems: HistoryItem[] = [
    ...signals.map(sig => ({
      id: `signal-${sig.id}`,
      emoji: sig.share_type === 'mood' ? '💜' : sig.share_type === 'thought' ? '💭' : sig.share_type === 'need' ? '🌿' : '⚡',
      label: 'Teen sent a signal',
      detail: sig.share_type === 'mood' ? 'My Mood' : sig.share_type === 'thought' ? 'A Thought' : sig.share_type === 'need' ? 'Something I Need' : 'A Win',
      timestamp: sig.sent_at,
    })),
    ...sharedJournal.map(entry => ({
      id: `shared-${entry.id}`,
      emoji: entry.mood_tag === 's2tell' ? '🌉' : '📖',
      label: entry.mood_tag === 's2tell' ? 'Teen shared through S2Tell' : 'Teen shared a page',
      detail: entry.text ? (entry.text.length > 60 ? `${entry.text.slice(0, 60)}…` : entry.text) : undefined,
      timestamp: entry.created_at,
    })),
    ...sentNotes.map(note => ({
      id: `note-${note.id}`,
      emoji: '💌',
      label: 'You sent a note',
      detail: note.content,
      timestamp: note.sent_at,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !teenId) return;
    setSending(true);
    try {
      const ok = await sendParentNote(teenId, text);
      if (ok) {
        setSent(true);
        setMessage('');
      } else {
        Alert.alert('Could not send', 'Make sure you\'re connected to a teen account in Settings.');
      }
    } catch {
      Alert.alert('Could not send', 'Please try again in a moment.');
    } finally {
      setSending(false);
    }
  };

  const breathScale   = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] });
  const cardSlide     = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
  });
  return (
    <View style={styles.root}>
      <AmbientWeatherOverlay />
      <LinearGradient colors={[P.bg1, P.bg2, P.bg3]} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: P.accent + '08' }]} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ─── HEADER ────────────────────────────────────────────────────────── */}
        <Animated.View style={cardSlide(fade1)}>
          <View style={styles.header}>
            <Animated.View style={[styles.avatarRing, { borderColor: P.accent, shadowColor: P.accent, transform: [{ scale: breathScale }], opacity: breathOpacity }]}>
              <Text style={styles.avatarEmoji}>🌉</Text>
            </Animated.View>
            <Text style={styles.headerName}>Parent Bridge</Text>
            <Text style={[styles.headerTagline, { color: P.soft }]}>
              The private connection to your teen.
            </Text>
            <Text style={[styles.headerDesc, { color: P.soft + 'cc' }]}>
              Only what they choose to share, and what you choose to send back.{'\n'}
              Nothing more.
            </Text>
          </View>
        </Animated.View>

        {/* ─── LINK STATUS ─────────────────────────────────────────────────────── */}
        {!linked && (
          <Animated.View style={cardSlide(fade2)}>
            <View style={[styles.pendingBanner, { borderColor: P.accent + '44', backgroundColor: P.accent + '0e' }]}>
              <Text style={[styles.pendingText, { color: P.soft + 'bb' }]}>
                🔗 Not linked to a teen yet — ask them to generate a code in Settings.
              </Text>
            </View>
          </Animated.View>
        )}

        {/* ─── NEED ADVICE? → Parent Se'kret Coach lives on its own screen ──────── */}
        <Animated.View style={cardSlide(fade2)}>
          <TouchableOpacity
            style={[styles.coachLink, { borderColor: P.accent + '44' }]}
            onPress={() => setScreen('sekret')}
            activeOpacity={0.82}
          >
            <Text style={styles.coachLinkEmoji}>🎧</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.coachLinkTitle, { color: P.soft }]}>Need advice on a conversation?</Text>
              <Text style={[styles.coachLinkSub, { color: P.soft + '99' }]}>Talk it through with Parent Se'kret Coach</Text>
            </View>
            <Text style={[styles.coachLinkArrow, { color: P.accent }]}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ─── TABS ──────────────────────────────────────────────────────────── */}
        <Animated.View style={[cardSlide(fade2), styles.tabRow]}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'shared' && { backgroundColor: P.accent + '33', borderColor: P.accent }]}
            onPress={() => setTab('shared')}
          >
            <Text style={[styles.tabLabel, { color: tab === 'shared' ? P.accent : P.soft + '99' }]}>
              Shared
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'history' && { backgroundColor: P.accent + '33', borderColor: P.accent }]}
            onPress={() => setTab('history')}
          >
            <Text style={[styles.tabLabel, { color: tab === 'history' ? P.accent : P.soft + '99' }]}>
              History
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'bridge' && { backgroundColor: P.accent + '33', borderColor: P.accent }]}
            onPress={() => setTab('bridge')}
          >
            <Text style={[styles.tabLabel, { color: tab === 'bridge' ? P.accent : P.soft + '99' }]}>
              Reply
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: HISTORY — CHRONOLOGICAL CONNECTION LOG                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'history' && (
          <Animated.View style={cardSlide(fade3)}>

            <View style={[styles.card, { marginBottom: 16 }]}>
              <Text style={styles.cardTitle}>Connection history</Text>
              <Text style={[styles.bodyText, { color: P.soft }]}>
                Everything that's passed through this Bridge, in order — what your
                teen shared and what you sent back. Nothing else.
              </Text>
            </View>

            {historyLoading && historyItems.length === 0 && (
              <View style={[styles.emptyState, { borderColor: P.accent + '33' }]}>
                <Text style={[styles.emptyText, { color: P.soft + '99' }]}>Loading…</Text>
              </View>
            )}

            {!historyLoading && historyItems.length === 0 && (
              <View style={[styles.emptyState, { borderColor: P.accent + '33' }]}>
                <Text style={styles.emptyEmoji}>🕊️</Text>
                <Text style={[styles.emptyText, { color: P.soft + '88' }]}>
                  Nothing has passed through Bridge yet.
                </Text>
              </View>
            )}

            {historyItems.map(item => (
              <View key={item.id} style={[styles.signalCard, { borderColor: P.accent + '44' }]}>
                <Text style={styles.signalEmoji}>{item.emoji}</Text>
                <View style={styles.signalBody}>
                  <Text style={[styles.signalType, { color: P.accent }]}>{item.label}</Text>
                  {!!item.detail && (
                    <Text style={[styles.bodyText, { color: P.soft, marginBottom: 2 }]} numberOfLines={2}>
                      {item.detail}
                    </Text>
                  )}
                  <Text style={[styles.signalTime, { color: P.soft + '77' }]}>
                    {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            ))}

          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: SHARED — WHAT TEEN CHOSE TO SHARE                             */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'shared' && (
          <Animated.View style={cardSlide(fade3)}>

            <View style={[styles.card, { marginBottom: 16 }]}>
              <Text style={styles.cardTitle}>What your teen shared</Text>
              <Text style={[styles.bodyText, { color: P.soft }]}>
                These are moments your teen chose to let you see. You can read them,
                but you can't reply here — reply through a warm note instead.
              </Text>
              <View style={[styles.badge, { borderColor: P.accent }]}>
                <Text style={[styles.badgeText, { color: P.accent }]}>
                  teen-controlled · they decide what you see
                </Text>
              </View>
            </View>

            {/* Bridge signals */}
            {signals.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: P.soft }]}>Moments they signaled</Text>
                {signals.slice(0, 5).map(sig => (
                  <View key={sig.id} style={[styles.signalCard, { borderColor: P.accent + '44' }]}>
                    <Text style={styles.signalEmoji}>
                      {sig.share_type === 'mood' ? '💜' : sig.share_type === 'thought' ? '💭' : sig.share_type === 'need' ? '🌿' : '⚡'}
                    </Text>
                    <View style={styles.signalBody}>
                      <Text style={[styles.signalType, { color: P.accent }]}>
                        {sig.share_type === 'mood' ? 'My Mood' : sig.share_type === 'thought' ? 'A Thought' : sig.share_type === 'need' ? 'Something I Need' : 'A Win'}
                        {sig.conv_mode ? ` · ${sig.conv_mode}` : ''}
                      </Text>
                      <Text style={[styles.signalTime, { color: P.soft + '77' }]}>
                        {new Date(sig.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' · via '}{sig.char_key}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}

            {/* Shared journal entries */}
            {sharedJournal.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: P.soft, marginTop: 12 }]}>Pages they shared</Text>
                {sharedJournal.slice(0, 8).map(entry => (
                  <View key={entry.id} style={[styles.sharedEntryCard, { borderColor: P.accent + '33' }]}>
                    {entry.mood_tag && (
                      <Text style={[styles.sharedMoodTag, { color: P.accent }]}>#{entry.mood_tag}</Text>
                    )}
                    {entry.text ? (
                      <Text style={[styles.sharedEntryText, { color: P.soft }]} numberOfLines={4}>
                        {entry.text}
                      </Text>
                    ) : null}
                    <Text style={[styles.signalTime, { color: P.soft + '55', marginTop: 6 }]}>
                      {new Date(entry.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {/* Shared moods */}
            {sharedMoods.length > 0 && (
              <>
                <Text style={[styles.sectionTitle, { color: P.soft, marginTop: 12 }]}>Moods they shared</Text>
                <View style={styles.moodRow}>
                  {sharedMoods.slice(0, 10).map(m => (
                    <View key={m.id} style={[styles.moodChip, { borderColor: P.accent + '44' }]}>
                      <Text style={[styles.moodChipText, { color: P.soft }]}>{m.mood}</Text>
                      <Text style={[styles.moodChipDate, { color: P.soft + '66' }]}>
                        {new Date(m.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Empty state */}
            {signals.length === 0 && sharedJournal.length === 0 && sharedMoods.length === 0 && (
              <View style={[styles.emptyState, { borderColor: P.accent + '33' }]}>
                <Text style={styles.emptyEmoji}>🌱</Text>
                <Text style={[styles.emptyText, { color: P.soft + '88' }]}>
                  Nothing shared yet.{'\n'}
                  Your teen can share moments from their Pages or mood check-ins — they're in control of what you see.
                </Text>
              </View>
            )}

          </Animated.View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  TAB: BRIDGE — SEND A NOTE                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {tab === 'bridge' && (
          <Animated.View style={cardSlide(fade3)}>

            <View style={[styles.card, { marginBottom: 16 }]}>
              <Text style={styles.cardTitle}>What is the Bridge?</Text>
              <Text style={[styles.bodyText, { color: P.soft }]}>
                Send a short, private message of support to your teen's Se'kret space.
                They'll see it as a gentle note — not a lecture. You can't read their
                journal or conversations. This is one-way warmth.
              </Text>
              <View style={[styles.badge, { borderColor: P.accent }]}>
                <Animated.Text style={[styles.badgeText, { color: P.accent, transform: [{ scale: breathScale }], opacity: breathOpacity }]}>
                  warm · one-way · they choose what to share back
                </Animated.Text>
              </View>
            </View>

            {/* Starter prompts */}
            <Text style={[styles.sectionTitle, { color: P.soft }]}>Need a starting point?</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {STARTER_PROMPTS.map((prompt) => (
                <TouchableOpacity
                  key={prompt}
                  style={[styles.promptChip, { borderColor: P.accent + '55' }]}
                  onPress={() => setMessage(prompt)}
                >
                  <Text style={[styles.promptChipText, { color: P.soft }]}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Message input */}
            {!sent ? (
              <>
                <Text style={[styles.sectionTitle, { color: P.soft }]}>Your message</Text>
                <TextInput
                  style={[styles.input, { borderColor: P.accent + '88', color: '#fff' }]}
                  placeholder="Write something warm..."
                  placeholderTextColor={P.soft + '66'}
                  multiline
                  value={message}
                  onChangeText={setMessage}
                  maxLength={300}
                />
                <Text style={[styles.charCount, { color: P.soft + '99' }]}>{message.length}/300</Text>
                <TouchableOpacity
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor: message.trim() ? P.accent : 'rgba(60,30,10,0.55)',
                      shadowColor:     P.accent,
                      shadowOpacity:   message.trim() ? 0.5 : 0,
                      shadowRadius:    12,
                    },
                  ]}
                  onPress={handleSend}
                  disabled={!message.trim() || sending}
                >
                  <Text style={[styles.sendBtnText, { color: message.trim() ? P.deep : '#fff' }]}>
                    {sending ? 'sending…' : 'send with love 💌'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <View style={[styles.card, { alignItems: 'center', padding: 28 }]}>
                <Animated.Text style={{ fontSize: 52, marginBottom: 12, transform: [{ scale: breathScale }], opacity: breathOpacity }}>💜</Animated.Text>
                <Text style={styles.cardTitle}>Message sent.</Text>
                <Text style={[styles.bodyText, { textAlign: 'center', color: P.soft }]}>
                  Your teen will see it as a gentle note in their Se'kret space.
                  That small act of love matters more than you know.
                </Text>
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: P.accent, marginTop: 18, paddingHorizontal: 32 }]}
                  onPress={() => setSent(false)}
                >
                  <Text style={[styles.sendBtnText, { color: P.deep }]}>send another</Text>
                </TouchableOpacity>
              </View>
            )}

          </Animated.View>
        )}

        <TouchableOpacity
          style={[styles.ghostBtn, { borderColor: P.accent + '55', marginTop: 8 }]}
          onPress={() => setScreen('home')}
        >
          <Text style={[styles.ghostBtnText, { color: P.soft + 'aa' }]}>← back to room</Text>
        </TouchableOpacity>

      </ScrollView>

      {BottomNav}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#1e0f06' },
  scroll: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },

  pendingBanner: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14, alignItems: 'center' },
  pendingText:   { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  signalCard:    { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(46,26,16,0.75)', borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 8 },
  signalEmoji:   { fontSize: 22 },
  signalBody:    { flex: 1 },
  signalType:    { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  signalTime:    { fontSize: 11 },

  // Coach link-out card (replaces the old embedded Advice tab)
  coachLink:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: 'rgba(46,26,16,0.75)', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  coachLinkEmoji: { fontSize: 22 },
  coachLinkTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  coachLinkSub:   { fontSize: 12 },
  coachLinkArrow: { fontSize: 24 },

  // Shared tab
  sharedEntryCard: { backgroundColor: 'rgba(46,26,16,0.75)', borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 10 },
  sharedMoodTag:   { fontSize: 11, fontWeight: '700', marginBottom: 6 },
  sharedEntryText: { fontSize: 14, lineHeight: 21 },
  moodRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  moodChip:        { backgroundColor: 'rgba(46,26,16,0.75)', borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  moodChipText:    { fontSize: 12, fontWeight: '700' },
  moodChipDate:    { fontSize: 10, marginTop: 2 },

  // Header
  header:        { alignItems: 'center', marginBottom: 20 },
  avatarRing:    { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 12, shadowOpacity: 0.6, shadowRadius: 16, elevation: 6 },
  avatarEmoji:   { fontSize: 38 },
  headerName:    { fontSize: 22, fontWeight: 'bold', color: '#fff', letterSpacing: 0.3, marginBottom: 4 },
  headerTagline: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  headerDesc:    { fontSize: 13, textAlign: 'center', lineHeight: 20 },

  // Tabs
  tabRow:    { flexDirection: 'row', marginBottom: 20, gap: 10 },
  tabBtn:    { flex: 1, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: 'transparent', alignItems: 'center' },
  tabLabel:  { fontSize: 14, fontWeight: '700' },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12, color: '#fff' },

  // Empty state
  emptyState: { borderWidth: 1, borderRadius: 18, borderStyle: 'dashed', padding: 32, alignItems: 'center', marginBottom: 16 },
  emptyEmoji: { fontSize: 32, marginBottom: 10 },
  emptyText:  { fontSize: 14, textAlign: 'center', lineHeight: 22 },

  // Bridge tab
  card:         { backgroundColor: 'rgba(46,26,16,0.88)', borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#e9a04a44' },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 8 },
  bodyText:     { fontSize: 14, lineHeight: 22, marginBottom: 12 },
  badge:        { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, marginTop: 4 },
  badgeText:    { fontSize: 11, fontWeight: '600' },
  promptChip:       { backgroundColor: 'rgba(46,26,16,0.85)', borderWidth: 1, borderRadius: 14, padding: 12, marginRight: 10, maxWidth: 230 },
  promptChipText:   { fontSize: 13, lineHeight: 19 },
  input:            { backgroundColor: 'rgba(46,26,16,0.85)', borderWidth: 1, borderRadius: 18, padding: 16, minHeight: 130, textAlignVertical: 'top', fontSize: 14, lineHeight: 22, marginBottom: 6 },
  charCount:        { fontSize: 11, textAlign: 'right', marginBottom: 12 },
  sendBtn:          { padding: 16, borderRadius: 18, alignItems: 'center', marginBottom: 12 },
  sendBtnText:      { fontSize: 16, fontWeight: 'bold' },
  ghostBtn:         { borderWidth: 1, borderRadius: 18, padding: 14, alignItems: 'center', marginBottom: 16 },
  ghostBtnText:     { fontSize: 14, fontWeight: '600' },
});

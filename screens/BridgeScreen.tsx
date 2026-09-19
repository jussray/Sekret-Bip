// screens/BridgeScreen.tsx
// Se'kret Bip — Bridge Screen (Teen Side)
// Phase 1 polish: time-of-day backdrop, char-aware tone, mood glow,
// staggered entrance, breath badge, sticky note, send confirmation glow.
//
// Bridge stores only content the teen intentionally sends into the linked
// relationship: S2Tell text in bridge_shares and support metadata in
// bridge_signals. Private journal/chat/voice/Circle content is never read here.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  Animated,
  StyleSheet,
  Platform,
  Alert,
  Easing,
} from 'react-native';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getRoomBg, TimeOfDay } from '../constants/theme';
import {
  sendBridgeSignal,
  fetchParentNotesResult,
  markParentNoteSeen,
  subscribeToParentNotes,
  type ParentNote,
} from '@/utils/sync';
import { getSupabase } from '@/utils/supabase';
import { fetchBridgeSignalsResult, type BridgeSignal } from '@/utils/parentBridgeCompat';
import {
  fetchBridgeSharesResult,
  sendS2TellShare,
  type BridgeShare,
} from '@/features/bridge/bridgeShareCompat';
import {
  fetchTeenBridgeShareHistory,
  revokeBridgeShareRequest,
} from '@/services/bridgeSummaryService';
import type { BridgeSummaryListItem } from '@/types/bridgeSummary';

interface BridgeScreenProps {
  t:             Record<string, any>;
  currentSekret: Record<string, any>;
  setScreen:     (screen: string) => void;
  BottomNav:     React.ReactNode;
  selectedSekret?: string;
  mood?:         string;
}

const SHARE_TYPES = [
  { id: 'mood',    emoji: '💜', label: 'My Mood',     placeholder: "tell them how you're feeling…" },
  { id: 'thought', emoji: '💭', label: 'A Thought',    placeholder: 'something on your mind…' },
  { id: 'need',    emoji: '🌿', label: 'Something I Need', placeholder: 'what would help right now…' },
  { id: 'win',     emoji: '⚡', label: 'A Win',         placeholder: 'something good that happened…' },
];

const CONV_MODES = [
  { id: 'soft',     emoji: '🌸', label: 'Soft Start',     hint: 'Ease in gently — no pressure to say it all.',          tone: 'soft' },
  { id: 'honest',   emoji: '💜', label: 'Honest Version',  hint: 'Say the full truth. No editing, no softening.',        tone: 'direct' },
  { id: 'boundary', emoji: '🛡️', label: 'Calm Boundary',   hint: 'Set a limit with kindness — you stay in control.',     tone: 'firm' },
  { id: 'safety',   emoji: '🫶', label: 'Safety Check',    hint: 'Check that your message lands the way you mean it.',   tone: 'check' },
] as const;
type ConvModeId = (typeof CONV_MODES)[number]['id'];

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'morning';
  if (h >= 11 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  return 'night';
};

const moodGlow = (mood?: string): string => {
  const m = (mood || '').toLowerCase();
  if (m === 'happy') return '#fbbf24';
  if (m === 'sad' || m === 'anxious') return '#7dd3fc';
  if (m === 'angry' || m === 'overwhelmed' || m === 'stressed') return '#f472b6';
  if (m === 'tired') return '#6d28d9';
  if (m === 'calm') return '#c4b5fd';
  return '#c4b5fd';
};

export function BridgeScreen({
  t, currentSekret, setScreen, BottomNav, selectedSekret, mood,
}: BridgeScreenProps) {
  const [shareType, setShareType]   = useState<string | null>(null);
  const [convMode, setConvMode]     = useState<ConvModeId | null>(null);
  const [message, setMessage]       = useState('');
  const [sent, setSent]             = useState(false);
  const [sending, setSending]       = useState(false);
  const [parentNotes, setParentNotes] = useState<ParentNote[]>([]);
  const [parentNotesLoading, setParentNotesLoading] = useState(true);
  const [parentNotesError, setParentNotesError] = useState(false);
  const [parentNotesRefresh, setParentNotesRefresh] = useState(0);
  const [view, setView]             = useState<'share' | 'history'>('share');
  const [mySignals, setMySignals]   = useState<BridgeSignal[]>([]);
  const [myShares, setMyShares]     = useState<BridgeShare[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [bridgeSummaryHistory, setBridgeSummaryHistory] = useState<BridgeSummaryListItem[]>([]);
  const [bridgeStatus, setBridgeStatus] = useState<string | null>(null);

  const selectedType = SHARE_TYPES.find(s => s.id === shareType);
  const isRylane = selectedSekret === 'rylane';
  const charLabel = isRylane ? 'rylane' : 'raylene';
  const charKey: 'raylene' | 'rylane' = isRylane ? 'rylane' : 'raylene';

  const time = useMemo(() => getTimeOfDay(), []);
  const bg   = useMemo(() => getRoomBg(charKey, time), [charKey, time]);
  const glow = useMemo(() => moodGlow(mood), [mood]);

  const fade1 = useRef(new Animated.Value(0)).current;
  const fade2 = useRef(new Animated.Value(0)).current;
  const fade3 = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const stagger = (val: Animated.Value, delay: number) =>
      Animated.timing(val, {
        toValue: 1, duration: 380, delay,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      });
    Animated.parallel([stagger(fade1, 0), stagger(fade2, 160), stagger(fade3, 320)]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, { toValue: 1, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breath, { toValue: 0, duration: 1900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [fade1, fade2, fade3, breath]);

  useEffect(() => {
    let active = true;
    let unsub = () => {};

    setParentNotes([]);
    setParentNotesLoading(true);
    setParentNotesError(false);

    void (async () => {
      const result = await fetchParentNotesResult();
      if (!active) return;
      if (!result.ok) {
        setParentNotes([]);
        setParentNotesError(true);
        setParentNotesLoading(false);
        return;
      }

      setParentNotes(result.notes);
      setParentNotesLoading(false);

      try {
        const fn = await subscribeToParentNotes(note => {
          if (active) setParentNotes(prev => [note, ...prev]);
        });
        if (active) unsub = fn;
        else fn();
      } catch {
        // The initial read remains authoritative. Do not serialize provider error
        // details, but preserve truthful evidence that supplementary realtime failed.
        console.warn('[Bridge] realtime parent-note refresh unavailable; pull refresh remains authoritative.');
      }
    })().catch(() => {
      if (!active) return;
      setParentNotes([]);
      setParentNotesError(true);
      setParentNotesLoading(false);
    });

    return () => {
      active = false;
      unsub();
    };
  }, [parentNotesRefresh]);

  useEffect(() => {
    if (view !== 'history' || historyLoaded) return;
    let active = true;

    setHistoryError(false);
    setMySignals([]);
    setMyShares([]);
    setBridgeSummaryHistory([]);

    void (async () => {
      const sb = getSupabase();
      if (!sb) {
        if (active) {
          setHistoryError(true);
          setHistoryLoaded(true);
        }
        return;
      }

      const { data, error: authError } = await sb.auth.getUser();
      const myId = data.user?.id;
      if (authError || !myId) {
        if (active) {
          setHistoryError(true);
          setHistoryLoaded(true);
        }
        return;
      }

      const [signalResult, shareResult, summaryHistory] = await Promise.all([
        fetchBridgeSignalsResult(myId),
        fetchBridgeSharesResult(myId),
        fetchTeenBridgeShareHistory(),
      ]);
      if (!active) return;

      if (!signalResult.ok || !shareResult.ok || !summaryHistory.ok) {
        setMySignals([]);
        setMyShares([]);
        setBridgeSummaryHistory([]);
        setHistoryError(true);
        setHistoryLoaded(true);
        return;
      }

      setMySignals(signalResult.signals);
      setMyShares(shareResult.shares);
      setBridgeSummaryHistory(summaryHistory.value);
      setHistoryLoaded(true);
    })().catch(() => {
      if (!active) return;
      setMySignals([]);
      setMyShares([]);
      setBridgeSummaryHistory([]);
      setHistoryError(true);
      setHistoryLoaded(true);
    });

    return () => { active = false; };
  }, [view, historyLoaded]);

  type HistoryItem = { id: string; emoji: string; label: string; detail?: string; timestamp: string };
  const historyItems: HistoryItem[] = [
    ...mySignals.map(sig => ({
      id: `signal-${sig.id}`,
      emoji: sig.share_type === 'mood' ? '💜' : sig.share_type === 'thought' ? '💭' : sig.share_type === 'need' ? '🌿' : '⚡',
      label: 'You sent a signal',
      detail: sig.share_type === 'mood' ? 'My Mood' : sig.share_type === 'thought' ? 'A Thought' : sig.share_type === 'need' ? 'Something I Need' : 'A Win',
      timestamp: sig.sent_at,
    })),
    ...bridgeSummaryHistory.map(item => ({
      id: `summary-${item.requestId}`,
      emoji: item.status === 'revoked' ? '🔒' : '🌉',
      label: item.status === 'revoked' ? 'Bridge Summary revoked' : 'Bridge Summary share',
      detail: item.summary?.themes?.length ? item.summary.themes.join(', ') : `Status: ${item.status}`,
      timestamp: item.generatedAt ?? new Date().toISOString(),
    })),
    ...myShares.map(share => ({
      id: `share-${share.id}`,
      emoji: '🌉',
      label: 'You sent an S2Tell share',
      detail: share.payload.rewrite ?? share.payload.text,
      timestamp: share.shared_at,
    })),
    ...parentNotes.map(note => ({
      id: `note-${note.id}`,
      emoji: '💌',
      label: 'From your person',
      detail: note.content,
      timestamp: note.sent_at,
    })),
  ].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.04] });
  const breathOpacity = breath.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] });
  const cardStyle = (val: Animated.Value) => ({
    opacity: val,
    transform: [{ translateY: val.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
  });

  const refreshBridgeSummaryHistory = async () => {
    const result = await fetchTeenBridgeShareHistory();
    if (result.ok) {
      setBridgeSummaryHistory(result.value);
      return;
    }
    setBridgeStatus('The Bridge action completed, but history could not refresh yet. Try the history view again.');
  };

  const handleCreateBridgeSummary = () => {
    setBridgeStatus('Opening Pages so you can choose what to share. Nothing is sent until you preview and confirm it there.');
    setScreen('pages');
  };

  const handleRevokeBridgeSummary = async (requestId: string) => {
    setBridgeStatus('Revoking Bridge Summary access…');
    const result = await revokeBridgeShareRequest(requestId);
    if (!result.ok) {
      setBridgeStatus(result.message);
      return;
    }
    setBridgeStatus(result.value.revoked ? 'Bridge Summary access revoked.' : 'That share could not be revoked.');
    await refreshBridgeSummaryHistory();
  };

  const retryBridgeReads = () => {
    setHistoryError(false);
    setHistoryLoaded(false);
    setParentNotesRefresh(value => value + 1);
  };

  const handleSend = async () => {
    const text = message.trim();
    if (!shareType || !text) {
      Alert.alert('almost there', 'pick a share type and write your message first.');
      return;
    }

    setSending(true);
    setBridgeStatus(null);

    let shared: BridgeShare | null = null;
    try {
      shared = await sendS2TellShare({
        text,
        tone: convMode ?? undefined,
        shareType,
      });
    } catch {
      setBridgeStatus('Couldn’t send that note. Nothing was marked as delivered.');
      setSending(false);
      return;
    }

    if (!shared) {
      setBridgeStatus('Couldn’t send that note. Nothing was marked as delivered.');
      setSending(false);
      return;
    }

    // This is only a local continuity hint. The bridge_shares row above is
    // the authority that proves the note actually entered the linked Bridge.
    await AsyncStorage.setItem('parent_bridge_pending', 'true').catch(() => {
      console.warn('[Bridge] local continuity hint could not be stored; durable Bridge delivery remains authoritative.');
    });

    try {
      const signalResult = await sendBridgeSignal({ shareType, convMode, charKey });
      if (!signalResult.ok) {
        Alert.alert(
          'Your note was shared',
          'The S2Tell message reached Bridge, but the support signal could not be recorded. Your note was not lost.',
        );
      }
    } catch {
      Alert.alert(
        'Your note was shared',
        'The S2Tell message reached Bridge, but the support signal could not be recorded. Your note was not lost.',
      );
    }

    setSent(true);
    setMessage('');
    setShareType(null);
    setConvMode(null);
    setHistoryLoaded(false);
    setSending(false);
  };

  const heroCopy = isRylane
    ? "share something with your person. no pressure. no big speech."
    : "share something with your person — softly. no full explanation needed.";

  const historyHasError = historyError || parentNotesError;
  const historyLoading = !historyLoaded || parentNotesLoading;

  if (sent) {
    return (
      <View style={styles.root}>
        <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
        <LinearGradient
          colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '14' }]} />

        <ScrollView contentContainerStyle={styles.container}>
          <Animated.View style={cardStyle(fade1)}>
            <Text style={styles.logo}>🌉 bridge</Text>
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.88)', borderColor: glow, shadowColor: glow, alignItems: 'center', paddingVertical: 32 }]}>
              <Animated.Text style={[styles.sentEmoji, { transform: [{ scale: breathScale }], opacity: breathOpacity }]}>💌</Animated.Text>
              <Text style={styles.sentTitle}>sent to your person.</Text>
              <Text style={styles.sentSub}>
                your S2Tell note is in the shared Bridge thread. you chose what crossed over 💜
              </Text>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: glow, marginTop: 18 }]}
                onPress={() => setSent(false)}
              >
                <Text style={styles.buttonText}>send another</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ghostButton, { borderColor: glow }]}
                onPress={() => setScreen('home')}
              >
                <Text style={[styles.ghostButtonText, { color: '#e9defc' }]}>back to room</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          {BottomNav}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AmbientWeatherOverlay />
      <ImageBackground source={bg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(40,20,70,0.72)', 'rgba(15,8,30,0.92)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: glow + '12' }]} />

      <ScrollView contentContainerStyle={styles.container}>
        <Animated.View style={cardStyle(fade1)}>
          <Text style={styles.logo}>🌉 bridge</Text>
          <Text style={styles.subtitle}>{heroCopy}</Text>

          <Animated.View
            style={[
              styles.energyBadge,
              { borderColor: glow, shadowColor: glow, shadowOpacity: 0.6, shadowRadius: 12 },
              { transform: [{ scale: breathScale }], opacity: breathOpacity },
            ]}
          >
            <Text style={[styles.energyText, { color: glow }]}>
              {charLabel} helps you bridge it · you stay in control
            </Text>
          </Animated.View>

          <View style={styles.viewToggleRow}>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === 'share' && { backgroundColor: glow + '33', borderColor: glow }]}
              onPress={() => setView('share')}
            >
              <Text style={[styles.viewToggleText, { color: view === 'share' ? '#fff' : '#cbb6f7' }]}>share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleBtn, view === 'history' && { backgroundColor: glow + '33', borderColor: glow }]}
              onPress={() => setView('history')}
            >
              <Text style={[styles.viewToggleText, { color: view === 'history' ? '#fff' : '#cbb6f7' }]}>history</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {view === 'history' && (
          <Animated.View style={cardStyle(fade2)}>
            <Text style={[styles.sectionLabel, { color: '#cbb6f7', marginBottom: 10 }]}>connection history</Text>

            {historyHasError ? (
              <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.75)', borderColor: glow + '44' }]} accessibilityRole="alert">
                <Text style={styles.historyEmptyText}>Couldn’t verify the complete Bridge history. We won’t call it empty while a read is failing.</Text>
                <TouchableOpacity
                  onPress={retryBridgeReads}
                  style={[styles.seenBtn, { borderColor: glow + '66', alignSelf: 'center' }]}
                  accessibilityRole="button"
                  accessibilityLabel="Retry loading Bridge history"
                >
                  <Text style={[styles.seenBtnText, { color: glow }]}>try again</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!historyHasError && historyLoading ? (
              <Text style={styles.historyEmptyText}>Loading…</Text>
            ) : null}

            {!historyHasError && !historyLoading && historyItems.length === 0 ? (
              <Text style={styles.historyEmptyText}>Nothing's passed through Bridge yet.</Text>
            ) : null}

            {!historyHasError && !historyLoading ? historyItems.map(item => (
              <View key={item.id} style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.75)', borderColor: glow + '44', marginBottom: 10 }]}>
                <Text style={[styles.cardLabel, { color: glow, marginBottom: 4 }]}>{item.emoji} {item.label}</Text>
                {!!item.detail && (
                  <Text style={styles.noteText} numberOfLines={2}>{item.detail}</Text>
                )}
                <Text style={styles.noteTime}>
                  {new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                {item.id.startsWith('summary-') && item.label !== 'Bridge Summary revoked' && (
                  <TouchableOpacity
                    onPress={() => void handleRevokeBridgeSummary(item.id.replace('summary-', ''))}
                    style={[styles.seenBtn, { borderColor: glow + '66' }]}
                  >
                    <Text style={[styles.seenBtnText, { color: glow }]}>revoke</Text>
                  </TouchableOpacity>
                )}
              </View>
            )) : null}
          </Animated.View>
        )}

        {view === 'share' && (
        <Animated.View style={cardStyle(fade2)}>
          <Text style={[styles.sectionLabel, { color: '#cbb6f7' }]}>what do you want to share?</Text>
          <View style={styles.typeRow}>
            {SHARE_TYPES.map(type => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeChip,
                  {
                    backgroundColor: shareType === type.id ? glow : 'rgba(20,12,40,0.75)',
                    borderColor:     shareType === type.id ? glow : glow + '55',
                  },
                ]}
                onPress={() => setShareType(type.id)}
              >
                <Text style={styles.typeEmoji}>{type.emoji}</Text>
                <Text style={[styles.typeLabel, { color: shareType === type.id ? '#fff' : '#e9defc' }]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {shareType && (
            <>
              <Text style={[styles.sectionLabel, { color: '#cbb6f7', marginTop: 4 }]}>how do you want to say it?</Text>
              <View style={[styles.typeRow, { marginBottom: 14 }]}>
                {CONV_MODES.map(mode => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: convMode === mode.id ? glow : 'rgba(20,12,40,0.75)',
                        borderColor:     convMode === mode.id ? glow : glow + '55',
                      },
                    ]}
                    onPress={() => setConvMode(mode.id)}
                  >
                    <Text style={styles.typeEmoji}>{mode.emoji}</Text>
                    <Text style={[styles.typeLabel, { color: convMode === mode.id ? '#fff' : '#e9defc', fontSize: 12 }]}>
                      {mode.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {convMode && (
                <View style={[styles.convModeHint, { borderColor: glow + '55', backgroundColor: 'rgba(30,18,55,0.65)' }]}>
                  <Text style={[styles.convModeHintText, { color: '#cbb6f7' }]}>
                    {CONV_MODES.find(m => m.id === convMode)?.hint}
                  </Text>
                </View>
              )}

              <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.85)', borderColor: glow + '88', shadowColor: glow }]}>
                <Text style={[styles.cardLabel, { color: glow }]}>
                  {selectedType?.emoji} {selectedType?.label}
                </Text>
                <TextInput
                  style={[styles.input, { color: '#fff', borderColor: glow + '66' }]}
                  placeholder={selectedType?.placeholder}
                  placeholderTextColor="#7c6b98"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={4}
                  maxLength={280}
                />
                <Text style={[styles.charCount, { color: '#cbb6f7' }]}>
                  {message.length}/280
                </Text>
              </View>
            </>
          )}
        </Animated.View>
        )}

        {view === 'share' && parentNotesError ? (
          <Animated.View style={cardStyle(fade2)}>
            <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.75)', borderColor: glow + '44' }]} accessibilityRole="alert">
              <Text style={styles.historyEmptyText}>Couldn’t load notes from your person. We won’t pretend there are none.</Text>
              <TouchableOpacity
                onPress={() => setParentNotesRefresh(value => value + 1)}
                style={[styles.seenBtn, { borderColor: glow + '66', alignSelf: 'center' }]}
                accessibilityRole="button"
                accessibilityLabel="Retry loading parent Bridge notes"
              >
                <Text style={[styles.seenBtnText, { color: glow }]}>try again</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ) : null}

        {/* Parent notes received */}
        {view === 'share' && !parentNotesError && parentNotes.length > 0 && (
          <Animated.View style={cardStyle(fade2)}>
            <Text style={[styles.sectionLabel, { color: '#cbb6f7', marginBottom: 10 }]}>
              💌 from your person
            </Text>
            {parentNotes.map(note => (
              <View
                key={note.id}
                style={[
                  styles.card,
                  {
                    backgroundColor: note.seen_by_teen ? 'rgba(30,18,55,0.6)' : 'rgba(30,18,55,0.92)',
                    borderColor: note.seen_by_teen ? glow + '33' : glow + '88',
                    marginBottom: 10,
                  },
                ]}
              >
                {!note.seen_by_teen && (
                  <View style={[styles.unseenDot, { backgroundColor: glow }]} />
                )}
                <Text style={[styles.noteText, { color: note.seen_by_teen ? '#9d8eb8' : '#e9defc' }]}>
                  {note.content}
                </Text>
                <Text style={styles.noteTime}>
                  {new Date(note.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </Text>
                {!note.seen_by_teen && (
                  <TouchableOpacity
                    onPress={() => {
                      void (async () => {
                        const ok = await markParentNoteSeen(note.id);
                        if (!ok) {
                          Alert.alert('Could not update', 'That note is still unread in Bridge. Try again in a moment.');
                          return;
                        }
                        setParentNotes(prev => prev.map(n => n.id === note.id ? { ...n, seen_by_teen: true } : n));
                      })();
                    }}
                    style={[styles.seenBtn, { borderColor: glow + '66' }]}
                  >
                    <Text style={[styles.seenBtnText, { color: glow }]}>mark as read</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </Animated.View>
        )}

        {view === 'share' && (
        <Animated.View style={cardStyle(fade3)}>
          <View style={styles.stickyNote}>
            <Text style={styles.stickyText}>
              {isRylane
                ? '"share what you can. they don\'t need the whole story."'
                : '"soft is brave. you don\'t have to explain everything."'}
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: 'rgba(30,18,55,0.72)', borderColor: glow + '66' }]}>
            <Text style={[styles.cardLabel, { color: glow }]}>Parent-safe Bridge Summary</Text>
            <Text style={styles.noteText}>
              Choose an existing journal, check-in, or reflection in Pages. You preview exactly what will be shared before anything can leave your private space.
            </Text>
            {!!bridgeStatus && <Text style={[styles.noteText, { color: '#cbb6f7' }]}>{bridgeStatus}</Text>}
            <TouchableOpacity
              style={[styles.seenBtn, { borderColor: glow + '88', marginTop: 8 }]}
              onPress={handleCreateBridgeSummary}
              disabled={sending}
            >
              <Text style={[styles.seenBtnText, { color: glow }]}>choose something in Pages →</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: shareType && message.trim() && !sending ? glow : 'rgba(50,35,80,0.6)',
                opacity:          shareType && message.trim() && !sending ? 1 : 0.6,
              },
            ]}
            onPress={handleSend}
            disabled={!shareType || !message.trim() || sending}
          >
            <Text style={styles.buttonText}>
              {sending ? 'sending…' : '🌉 send to bridge'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
        )}

        <TouchableOpacity
          style={[styles.ghostButton, { borderColor: glow + '88' }]}
          onPress={() => setScreen('home')}
        >
          <Text style={[styles.ghostButtonText, { color: '#cbb6f7' }]}>back to room</Text>
        </TouchableOpacity>

        {BottomNav}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0e0820' },
  container:       { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, ...(Platform.OS === 'web' ? { maxWidth: 520, width: '100%', alignSelf: 'center' as const } : {}) },
  logo:            { fontSize: 28, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle:        { fontSize: 14, color: '#cbb6f7', textAlign: 'center', marginBottom: 14, fontStyle: 'italic', lineHeight: 20 },
  energyBadge:     { alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginBottom: 16 },
  energyText:      { fontSize: 12, fontWeight: '600' },

  viewToggleRow:   { flexDirection: 'row', gap: 8, marginBottom: 6 },
  viewToggleBtn:   { flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14, paddingVertical: 9, alignItems: 'center' },
  viewToggleText:  { fontSize: 13, fontWeight: '700' },
  historyEmptyText:{ color: '#9d8eb8', fontSize: 13, lineHeight: 20, textAlign: 'center', paddingVertical: 20 },

  sectionLabel:    { fontSize: 14, fontWeight: '600', marginBottom: 12 },
  typeRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  typeChip:        { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, borderWidth: 1 },
  typeEmoji:       { fontSize: 18 },
  typeLabel:       { fontSize: 14, fontWeight: '600' },

  card:            { padding: 18, borderRadius: 20, marginBottom: 16, borderWidth: 1, shadowOpacity: 0.4, shadowRadius: 14 },
  cardLabel:       { fontSize: 14, fontWeight: '700', marginBottom: 10 },
  input:           { borderWidth: 1, borderRadius: 14, padding: 14, fontSize: 15, minHeight: 110, textAlignVertical: 'top', marginBottom: 8, backgroundColor: 'rgba(0,0,0,0.35)' },
  charCount:       { fontSize: 12, textAlign: 'right' },

  convModeHint:    { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 12 },
  convModeHintText: { fontSize: 13, fontStyle: 'italic', lineHeight: 19 },

  stickyNote:      { backgroundColor: '#fff8e7', borderColor: '#7c3aed', borderWidth: 1, borderStyle: 'dashed', borderRadius: 12, padding: 12, marginBottom: 14, transform: [{ rotate: '-2deg' }] },
  stickyText:      { color: '#3a2461', fontSize: 13, fontStyle: 'italic', textAlign: 'center', lineHeight: 19 },

  button:          { padding: 16, borderRadius: 18, marginBottom: 12, alignItems: 'center' },
  buttonText:      { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  ghostButton:     { padding: 14, borderRadius: 18, marginBottom: 12, alignItems: 'center', borderWidth: 1 },
  ghostButtonText: { fontSize: 14, fontWeight: '600' },

  sentEmoji:       { fontSize: 56, textAlign: 'center', marginBottom: 12 },
  sentTitle:       { fontSize: 22, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  sentSub:         { fontSize: 14, color: '#e9defc', textAlign: 'center', lineHeight: 21 },
  unseenDot:       { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4 },
  noteText:        { fontSize: 14, lineHeight: 22, marginBottom: 6 },
  noteTime:        { fontSize: 11, color: '#5a4d74', marginBottom: 6 },
  seenBtn:         { alignSelf: 'flex-start', borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  seenBtnText:     { fontSize: 11, fontWeight: '700' },
});

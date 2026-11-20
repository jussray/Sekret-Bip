// screens/MessagesScreen.tsx
// Side-aware warm notes — DM-style chat interface.
// Parent: compose bar at bottom + sent notes as right-aligned bubbles.
// Teen: received notes as left-aligned bubbles (read-only inbox).
// One-way warmth by design — teen cannot reply, parent cannot read teen journal.

import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  Animated, Easing, StyleSheet, Platform, Alert, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { sendParentNote, fetchLinkedTeenId, fetchParentNotes, fetchParentSentNotes, ParentNote } from '@/utils/sync';

const STARTERS = [
  "I'm proud of who you're becoming.",
  "You don't have to figure it all out today.",
  "I'm here — no pressure, no lecture.",
  "Growing up is hard. You're doing it anyway.",
  "I see you working on yourself. That matters.",
];

interface MessagesScreenProps {
  side: 'teen' | 'parent';
  setScreen: (screen: string) => void;
  BottomNav: React.ReactNode;
}

export function MessagesScreen({ side, setScreen, BottomNav }: MessagesScreenProps) {
  const [message,  setMessage]  = useState('');
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [teenId,   setTeenId]   = useState<string | null>(null);
  const [notes,    setNotes]    = useState<ParentNote[]>([]);
  const [loading,  setLoading]  = useState(true);

  const scrollRef = useRef<ScrollView>(null);
  const fade1  = useRef(new Animated.Value(0)).current;
  const breath = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade1, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(breath, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();

    async function load() {
      if (side === 'parent') {
        const id = await fetchLinkedTeenId();
        if (id) setTeenId(id);
        const history = await fetchParentSentNotes();
        setNotes(history);
      } else {
        const inbox = await fetchParentNotes();
        setNotes(inbox);
      }
      setLoading(false);
    }
    load();

    return () => loop.stop();
  }, [fade1, breath, side]);

  // Scroll to bottom when messages load or new one arrives
  useEffect(() => {
    if (!loading) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [loading, notes.length]);

  const breathScale = breath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });

  const accent = side === 'parent' ? '#a78bfa' : '#c084fc';
  const soft   = side === 'parent' ? '#ede9fe' : '#f3e8ff';
  const deep   = '#1e0f3a';

  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;
    if (!teenId) {
      Alert.alert('Not linked', 'Link to your teen in Settings first.');
      return;
    }
    setSending(true);
    try {
      const ok = await sendParentNote(teenId, text);
      if (ok) {
        const newNote: ParentNote = {
          id: Date.now().toString(),
          content: text,
          sent_at: new Date().toISOString(),
          seen_by_teen: false,
        };
        setNotes(prev => [...prev, newNote]);
        setMessage('');
        setSent(true);
        setTimeout(() => setSent(false), 3000);
      } else {
        Alert.alert('Could not send', 'Try again in a moment.');
      }
    } catch {
      Alert.alert('Could not send', 'Check your connection.');
    } finally {
      setSending(false);
    }
  };

  const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days} days ago`;
  };

  return (
    <View style={st.root}>
      <AmbientWeatherOverlay />
      <LinearGradient colors={['#100826', '#1a0d3a']} style={StyleSheet.absoluteFill} />

      {/* Header */}
      <Animated.View style={[st.header, { opacity: fade1 }]}>
        <Text style={[st.title, { color: accent }]}>
          {side === 'parent' ? 'Warm Notes 💜' : 'From Your Parent 💜'}
        </Text>
        <Text style={[st.sub, { color: soft + 'cc' }]}>
          {side === 'parent'
            ? 'one-way warmth. they see it in their space.'
            : 'no pressure to respond.'}
        </Text>
      </Animated.View>

      {/* Chat thread */}
      <ScrollView
        ref={scrollRef}
        style={st.thread}
        contentContainerStyle={st.threadContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {loading && (
          <Text style={[st.loadingText, { color: soft + '55' }]}>loading...</Text>
        )}

        {!loading && notes.length === 0 && (
          <View style={st.emptyState}>
            <Animated.Text style={[st.emptyEmoji, { transform: [{ scale: breathScale }] }]}>💜</Animated.Text>
            <Text style={[st.emptyText, { color: soft + '77' }]}>
              {side === 'parent'
                ? 'your first note will appear here.\nsay something warm below.'
                : 'no notes yet.\nyour parent will reach out when ready.'}
            </Text>
          </View>
        )}

        {!loading && notes.map((note, i) => (
          <Animated.View
            key={note.id}
            style={[
              st.bubbleRow,
              side === 'parent' ? st.bubbleRowRight : st.bubbleRowLeft,
              { opacity: fade1 },
            ]}
          >
            {side === 'teen' && (
              <View style={st.avatar}>
                <Text style={st.avatarEmoji}>💜</Text>
              </View>
            )}

            <View style={[
              st.bubble,
              side === 'parent' ? [st.bubbleSent, { backgroundColor: accent + '33', borderColor: accent + '55' }]
                                : [st.bubbleReceived, { backgroundColor: 'rgba(40,20,70,0.82)', borderColor: accent + '44' }],
            ]}>
              <Text style={[st.bubbleText, { color: soft }]}>{note.content}</Text>
              <View style={st.bubbleMeta}>
                <Text style={[st.bubbleTime, { color: soft + '66' }]}>{timeAgo(note.sent_at)}</Text>
                {side === 'parent' && (
                  <Text style={[st.seenLabel, { color: note.seen_by_teen ? accent : soft + '44' }]}>
                    {note.seen_by_teen ? '· seen 💜' : '· sent'}
                  </Text>
                )}
              </View>
            </View>
          </Animated.View>
        ))}

        <View style={{ height: 12 }} />
      </ScrollView>

      {/* Parent compose area */}
      {side === 'parent' && (
        <View style={[st.composeArea, { borderTopColor: accent + '33' }]}>
          {/* Sent flash */}
          {sent && (
            <View style={[st.sentFlash, { backgroundColor: accent + '22', borderColor: accent + '55' }]}>
              <Text style={[{ color: accent, fontWeight: '700', fontSize: 13 }]}>💜 sent.</Text>
            </View>
          )}

          {/* Starter prompts */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={st.startersScroll}
            contentContainerStyle={st.startersContent}
          >
            {STARTERS.map(s => (
              <TouchableOpacity
                key={s}
                style={[st.starterChip, { borderColor: accent + '44' }]}
                onPress={() => setMessage(s)}
              >
                <Text style={[st.starterText, { color: soft + 'cc' }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Input row */}
          <View style={st.inputRow}>
            <TextInput
              style={[st.input, { borderColor: accent + '66', color: '#fff', backgroundColor: 'rgba(40,20,70,0.85)' }]}
              placeholder="say something warm..."
              placeholderTextColor={soft + '44'}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={280}
            />
            <TouchableOpacity
              style={[st.sendBtn, { backgroundColor: message.trim() ? accent : 'rgba(40,20,70,0.5)' }]}
              onPress={handleSend}
              disabled={!message.trim() || sending}
              activeOpacity={0.75}
            >
              <Text style={[st.sendArrow, { color: message.trim() ? deep : soft + '44' }]}>
                {sending ? '…' : '→'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {BottomNav}
    </View>
  );
}

const st = StyleSheet.create({
  root:           { flex: 1, backgroundColor: '#100826' },

  header:         {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === 'ios' ? 56 : 36,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(167,139,250,0.15)',
  },
  title:          { fontSize: 20, fontWeight: '800', marginBottom: 2 },
  sub:            { fontSize: 12, lineHeight: 18 },

  thread:         { flex: 1 },
  threadContent:  { padding: 16, paddingTop: 12, flexGrow: 1, justifyContent: 'flex-end' },

  loadingText:    { textAlign: 'center', fontSize: 13, marginTop: 40 },

  emptyState:     { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji:     { fontSize: 42, marginBottom: 14, textAlign: 'center' },
  emptyText:      { fontSize: 13, lineHeight: 21, textAlign: 'center', fontStyle: 'italic' },

  // Bubble rows
  bubbleRow:      { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14, gap: 8 },
  bubbleRowLeft:  { justifyContent: 'flex-start' },
  bubbleRowRight: { justifyContent: 'flex-end' },

  avatar:         { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(167,139,250,0.25)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  avatarEmoji:    { fontSize: 16 },

  bubble:         { maxWidth: '78%', borderWidth: 1, borderRadius: 20, padding: 12, paddingBottom: 8 },
  bubbleSent:     { borderBottomRightRadius: 4 },
  bubbleReceived: { borderBottomLeftRadius: 4 },
  bubbleText:     { fontSize: 14, lineHeight: 21, marginBottom: 4 },
  bubbleMeta:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  bubbleTime:     { fontSize: 10, fontWeight: '600' },
  seenLabel:      { fontSize: 10, fontWeight: '600' },

  // Compose area
  composeArea:    {
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
    backgroundColor: 'rgba(16,8,38,0.96)',
  },
  sentFlash:      { marginHorizontal: 14, marginTop: 8, borderRadius: 12, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 14, alignItems: 'center' },

  startersScroll: { marginTop: 10, marginBottom: 6 },
  startersContent:{ paddingHorizontal: 14, gap: 8 },
  starterChip:    { backgroundColor: 'rgba(40,20,70,0.75)', borderWidth: 1, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, maxWidth: 220 },
  starterText:    { fontSize: 11, lineHeight: 16 },

  inputRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  input:          { flex: 1, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 10, fontSize: 14, lineHeight: 20, maxHeight: 110, textAlignVertical: 'top' },
  sendBtn:        { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  sendArrow:      { fontSize: 20, fontWeight: '700' },
});

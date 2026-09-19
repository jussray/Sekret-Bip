import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useLinkedBridge } from '@/hooks/useLinkedBridge';
import {
  fetchParentSentNotesResult,
  sendParentNote,
  type ParentNote,
} from '@/utils/parentBridgeCompat';

interface ThreadItem {
  id: string;
  label: string;
  detail?: string;
  timestamp: string;
  emoji: string;
}

export function ParentBridgeSharedThread() {
  const linked = useLinkedBridge();
  const [sentNotes, setSentNotes] = useState<ParentNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(false);
  const [notesRefresh, setNotesRefresh] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    if (!linked.linkedTeenId || linked.loadError) {
      setSentNotes([]);
      setNotesLoading(false);
      setNotesError(false);
      return () => { active = false; };
    }

    setSentNotes([]);
    setNotesLoading(true);
    setNotesError(false);

    void fetchParentSentNotesResult(linked.linkedTeenId).then(result => {
      if (!active) return;
      if (!result.ok) {
        setSentNotes([]);
        setNotesError(true);
        setNotesLoading(false);
        return;
      }
      setSentNotes(result.notes);
      setNotesLoading(false);
    }).catch(() => {
      if (!active) return;
      setSentNotes([]);
      setNotesError(true);
      setNotesLoading(false);
    });

    return () => { active = false; };
  }, [linked.linkedTeenId, linked.loadError, notesRefresh]);

  const threadItems = useMemo<ThreadItem[]>(() => {
    const signals: ThreadItem[] = linked.signals.map(signal => ({
      id: `signal-${signal.id}`,
      emoji: signal.share_type === 'mood' ? '💜' : signal.share_type === 'thought' ? '💭' : signal.share_type === 'need' ? '🌿' : '⚡',
      label: 'Your teen sent a support signal',
      detail: signal.share_type === 'mood'
        ? 'My Mood'
        : signal.share_type === 'thought'
          ? 'A Thought'
          : signal.share_type === 'need'
            ? 'Something I Need'
            : 'A Win',
      timestamp: signal.sent_at,
    }));

    // Raw journal/mood content is intentionally excluded here. Generated Bridge
    // Summaries render in their own consent-bounded inbox. Only explicit S2Tell
    // shares are rendered as message content in this thread.
    const s2tell: ThreadItem[] = linked.sharedJournal
      .filter(entry => entry.mood_tag === 's2tell')
      .map(entry => ({
        id: `s2tell-${entry.id}`,
        emoji: '🌉',
        label: 'Your teen shared through S2Tell',
        detail: entry.text ?? undefined,
        timestamp: entry.created_at,
      }));

    const replies: ThreadItem[] = sentNotes.map(note => ({
      id: `reply-${note.id}`,
      emoji: '💌',
      label: 'You sent a note',
      detail: note.content,
      timestamp: note.sent_at,
    }));

    return [...signals, ...s2tell, ...replies]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }, [linked.sharedJournal, linked.signals, sentNotes]);

  const retry = () => {
    setSendStatus(null);
    linked.reload();
    setNotesRefresh(value => value + 1);
  };

  const sendReply = async () => {
    const body = message.trim();
    if (!body || !linked.linkedTeenId || sending) return;

    setSending(true);
    setSendStatus(null);
    const ok = await sendParentNote(linked.linkedTeenId, body);
    setSending(false);

    if (!ok) {
      setSendStatus('Couldn’t send that note. Nothing was marked as delivered.');
      return;
    }

    setMessage('');
    setSendStatus('Note sent through Bridge.');
    setNotesRefresh(value => value + 1);
  };

  const loading = linked.isLoading || notesLoading;
  const failed = linked.loadError || notesError;

  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>SHARED BRIDGE THREAD</Text>
      <Text style={styles.title}>What actually passed through Bridge</Text>
      <Text style={styles.boundary}>
        This thread contains only support signals, explicit S2Tell shares, and notes you sent back. Private journals, chats, voice notes, Circle activity, and unshared mood history stay out.
      </Text>

      {loading ? (
        <View style={styles.center} accessibilityLabel="Loading shared Bridge thread">
          <ActivityIndicator color="#e9a04a" />
          <Text style={styles.muted}>Checking the linked relationship and shared thread…</Text>
        </View>
      ) : null}

      {!loading && failed ? (
        <View accessibilityRole="alert">
          <Text style={styles.error}>Couldn’t verify the complete shared thread. We won’t call it empty while a Bridge read is failing.</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={retry} accessibilityRole="button" accessibilityLabel="Retry loading shared Bridge thread">
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !failed && !linked.isLinked ? (
        <Text style={styles.muted}>Link and verify a teen account before shared Bridge content can appear here.</Text>
      ) : null}

      {!loading && !failed && linked.isLinked && threadItems.length === 0 ? (
        <Text style={styles.muted}>Nothing has passed through this Bridge thread yet.</Text>
      ) : null}

      {!loading && !failed ? threadItems.map(item => (
        <View key={item.id} style={styles.threadItem}>
          <Text style={styles.threadLabel}>{item.emoji} {item.label}</Text>
          {item.detail ? <Text style={styles.threadDetail}>{item.detail}</Text> : null}
          <Text style={styles.time}>{new Date(item.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      )) : null}

      {!loading && !failed && linked.isLinked ? (
        <View style={styles.replyCard}>
          <Text style={styles.replyTitle}>Send a warm note back</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="Listen first. Keep it warm and simple…"
            placeholderTextColor="rgba(245,232,200,0.42)"
            multiline
            maxLength={280}
            style={styles.input}
            accessibilityLabel="Parent Bridge reply"
          />
          {sendStatus ? <Text style={sendStatus.startsWith('Couldn’t') ? styles.error : styles.success}>{sendStatus}</Text> : null}
          <TouchableOpacity
            style={[styles.sendButton, (!message.trim() || sending) && styles.disabled]}
            disabled={!message.trim() || sending}
            onPress={() => void sendReply()}
            accessibilityRole="button"
            accessibilityLabel="Send Bridge note"
          >
            <Text style={styles.sendButtonText}>{sending ? 'Sending…' : 'Send note'}</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(233,160,74,0.35)',
    backgroundColor: 'rgba(46,26,16,0.88)',
    padding: 16,
    marginBottom: 16,
  },
  eyebrow: { color: '#e9a04a', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
  title: { color: '#f5e8c8', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  boundary: { color: 'rgba(245,232,200,0.72)', fontSize: 11, lineHeight: 17, marginBottom: 14 },
  center: { alignItems: 'center', gap: 8, paddingVertical: 10 },
  muted: { color: 'rgba(245,232,200,0.62)', fontSize: 12, lineHeight: 18 },
  error: { color: '#fecaca', fontSize: 12, lineHeight: 18, marginBottom: 9 },
  success: { color: '#bbf7d0', fontSize: 12, lineHeight: 18, marginBottom: 9 },
  secondaryButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(233,160,74,0.55)', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 8 },
  secondaryButtonText: { color: '#e9a04a', fontWeight: '800', fontSize: 12 },
  threadItem: { borderTopWidth: 1, borderTopColor: 'rgba(233,160,74,0.18)', paddingTop: 11, marginTop: 11 },
  threadLabel: { color: '#f5e8c8', fontSize: 12, fontWeight: '800', marginBottom: 5 },
  threadDetail: { color: 'rgba(245,232,200,0.82)', fontSize: 13, lineHeight: 19 },
  time: { color: 'rgba(245,232,200,0.38)', fontSize: 9, marginTop: 6 },
  replyCard: { borderTopWidth: 1, borderTopColor: 'rgba(233,160,74,0.22)', marginTop: 16, paddingTop: 14 },
  replyTitle: { color: '#e9a04a', fontWeight: '800', fontSize: 13, marginBottom: 8 },
  input: { minHeight: 88, borderWidth: 1, borderColor: 'rgba(233,160,74,0.34)', borderRadius: 14, padding: 12, color: '#f5e8c8', textAlignVertical: 'top', backgroundColor: 'rgba(20,10,6,0.35)', marginBottom: 10 },
  sendButton: { alignSelf: 'flex-start', borderRadius: 12, backgroundColor: '#e9a04a', paddingHorizontal: 16, paddingVertical: 10 },
  disabled: { opacity: 0.45 },
  sendButtonText: { color: '#2e1a10', fontWeight: '900', fontSize: 12 },
});

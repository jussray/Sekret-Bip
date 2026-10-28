import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  loadMeaningfulReturnSnapshot,
  markMeaningfulReturnSeen,
  type MeaningfulReturnSnapshot,
  type ReturnStage,
} from '@/features/retention/meaningfulReturn';
import {
  archiveSavedContinuation,
  loadSavedContinuation,
  type SavedContinuation,
} from '@/features/retention/savedContinuation';

interface BipReturnOverlayProps {
  onNavigate: (screen: string) => void;
}

const STAGE_COPY: Record<ReturnStage, { title: string; body: string }> = {
  recognition: {
    title: 'You do not have to start over.',
    body: 'This room remembers the safe part: what helped, not everything you said.',
  },
  understanding: {
    title: "You're starting to see what helps.",
    body: 'A few honest check-ins can teach you what helps without asking you to show up every day.',
  },
  ownership: {
    title: 'This is becoming your Bip story.',
    body: 'The point is not to perform every day. The point is to recognize yourself when you return.',
  },
};

const NEEDS = [
  { screen: 'pages', icon: '✏️', label: 'let it out' },
  { screen: 'calm', icon: '☁️', label: 'help me settle' },
  { screen: 'bridge', icon: '🌉', label: 'help me connect' },
] as const;

export function BipReturnOverlay({ onNavigate }: BipReturnOverlayProps) {
  const [snapshot, setSnapshot] = useState<MeaningfulReturnSnapshot | null>(null);
  const [continuation, setContinuation] = useState<SavedContinuation | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [nextSnapshot, nextContinuation] = await Promise.all([
        loadMeaningfulReturnSnapshot(),
        loadSavedContinuation(),
      ]);
      if (!active) return;
      setSnapshot(nextSnapshot);
      setContinuation(nextContinuation);
      setOpen(nextSnapshot.isNew);
    })();
    return () => { active = false; };
  }, []);

  const stageCopy = useMemo(
    () => STAGE_COPY[snapshot?.stage ?? 'recognition'],
    [snapshot?.stage],
  );

  async function close() {
    if (snapshot?.latest) await markMeaningfulReturnSeen(snapshot.latest.id);
    setOpen(false);
  }

  function navigate(screen: string) {
    void close();
    onNavigate(screen);
  }

  async function continueSaved() {
    if (!continuation) return;
    const entryId = continuation.entryId;
    await archiveSavedContinuation();
    setContinuation(null);
    setOpen(false);
    router.push(`/(teen)/pages/${entryId}` as any);
  }

  async function removeSavedFromRoom() {
    await archiveSavedContinuation();
    setContinuation(null);
  }

  return (
    <>
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open your Bip return choices"
        activeOpacity={0.86}
      >
        <Text style={styles.floatingIcon}>
          {continuation ? '↩' : snapshot?.latest?.icon ?? '💜'}
        </Text>
        <Text style={styles.floatingText}>
          {continuation
            ? 'continue your thought'
            : snapshot?.latest
              ? 'your Bip story'
              : 'what do you need?'}
        </Text>
      </TouchableOpacity>

      <Modal transparent visible={open} animationType="fade" onRequestClose={() => void close()}>
        <Pressable style={styles.backdrop} onPress={() => void close()}>
          <Pressable style={styles.sheet} onPress={event => event.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.kicker}>YOUR BIP STORY</Text>

            {continuation ? (
              <View style={styles.continueCard}>
                <Text style={styles.continueKicker}>SAVED FOR LATER</Text>
                <Text style={styles.continueTitle}>Continue where you left off.</Text>
                <Text style={styles.continueBody}>
                  Room remembers which page to reopen. Your words stay on that page.
                </Text>
                <View style={styles.continueActions}>
                  <TouchableOpacity
                    style={styles.continueButton}
                    onPress={() => void continueSaved()}
                    accessibilityRole="button"
                    accessibilityLabel="Continue the saved page"
                  >
                    <Text style={styles.continueButtonText}>continue</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.archiveButton}
                    onPress={() => void removeSavedFromRoom()}
                    accessibilityRole="button"
                    accessibilityLabel="Remove saved page from Room"
                  >
                    <Text style={styles.archiveButtonText}>remove from Room</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : null}

            {snapshot?.latest ? (
              <View style={styles.receiptCard}>
                <Text style={styles.receiptIcon}>{snapshot.latest.icon}</Text>
                <View style={styles.receiptTextWrap}>
                  <Text style={styles.receiptTitle}>{snapshot.latest.label}</Text>
                  <Text style={styles.receiptBody}>{snapshot.latest.acknowledgment}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.emptyCopy}>
                Pick what you need. No performance, no guilt, no perfect wording.
              </Text>
            )}

            <View style={styles.rhythmCard}>
              <Text style={styles.rhythmNumber}>{snapshot?.activeDays30 ?? 0}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.rhythmLabel}>days you checked in this month</Text>
                <Text style={styles.rhythmSub}>Your check-ins stay part of your story, even after time away.</Text>
              </View>
            </View>

            <Text style={styles.stageTitle}>{stageCopy.title}</Text>
            <Text style={styles.stageBody}>{stageCopy.body}</Text>

            <Text style={styles.needLabel}>What would help right now?</Text>
            <View style={styles.needRow}>
              {NEEDS.map(need => (
                <TouchableOpacity
                  key={need.screen}
                  style={styles.needButton}
                  onPress={() => navigate(need.screen)}
                  accessibilityRole="button"
                  accessibilityLabel={need.label}
                >
                  <Text style={styles.needIcon}>{need.icon}</Text>
                  <Text style={styles.needText}>{need.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={() => void close()}>
              <Text style={styles.closeText}>not right now</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    right: 14,
    bottom: 26,
    zIndex: 50,
    elevation: 20,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.58)',
    backgroundColor: 'rgba(18,8,35,0.92)',
    shadowColor: '#8b5cf6',
    shadowOpacity: 0.38,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  floatingIcon: { fontSize: 15 },
  floatingText: { color: '#eee8ff', fontSize: 11, fontWeight: '900' },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(5,2,14,0.72)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(196,181,253,0.28)',
    backgroundColor: '#120923',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center',
    marginBottom: 16,
  },
  kicker: {
    color: '#a78bfa',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 10,
  },
  continueCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.42)',
    backgroundColor: 'rgba(76,29,149,0.22)',
    padding: 15,
    marginBottom: 12,
  },
  continueKicker: { color: '#a78bfa', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  continueTitle: { color: '#fff', fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 5 },
  continueBody: { color: '#cfc6df', fontSize: 11, lineHeight: 17, marginTop: 4 },
  continueActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  continueButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
  },
  continueButtonText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  archiveButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.26)',
    paddingHorizontal: 16,
  },
  archiveButtonText: { color: '#b8aec8', fontSize: 11, fontWeight: '800' },
  receiptCard: {
    flexDirection: 'row',
    gap: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.34)',
    backgroundColor: 'rgba(76,29,149,0.18)',
    padding: 15,
    marginBottom: 12,
  },
  receiptIcon: { fontSize: 28 },
  receiptTextWrap: { flex: 1 },
  receiptTitle: { color: '#fff', fontSize: 15, fontWeight: '900', lineHeight: 21 },
  receiptBody: { color: '#cfc6df', fontSize: 12, lineHeight: 18, marginTop: 4 },
  emptyCopy: { color: '#d9d0e8', fontSize: 13, lineHeight: 20, marginBottom: 12 },
  rhythmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 13,
    marginBottom: 15,
  },
  rhythmNumber: { color: '#fff', fontSize: 30, fontWeight: '900' },
  rhythmLabel: { color: '#efe9f7', fontSize: 12, fontWeight: '800' },
  rhythmSub: { color: '#8f82a5', fontSize: 10, marginTop: 2 },
  stageTitle: { color: '#fff', fontSize: 20, fontWeight: '900', marginBottom: 5 },
  stageBody: { color: '#b8aec8', fontSize: 12, lineHeight: 18, marginBottom: 18 },
  needLabel: { color: '#d8cef0', fontSize: 12, fontWeight: '800', marginBottom: 9 },
  needRow: { flexDirection: 'row', gap: 8 },
  needButton: {
    flex: 1,
    minHeight: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.22)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 7,
  },
  needIcon: { fontSize: 20, marginBottom: 6 },
  needText: { color: '#e9e2f4', fontSize: 10, fontWeight: '800', textAlign: 'center' },
  closeButton: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 12, marginTop: 8 },
  closeText: { color: '#827493', fontSize: 11, fontWeight: '700' },
});
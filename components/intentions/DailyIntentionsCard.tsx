import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ComfortSession, JournalEntry, VoiceNote } from '@/types';
import {
  buildDailyIntentions,
  happenedToday,
  isCompanionJournalEntry,
  localDateKey,
  type DailyIntention,
} from '@/features/intentions/dailyIntentions';
import {
  clearDailyIntentions,
  loadDailyIntentions,
  saveDailyIntentions,
  setDailyIntentionCompleted,
} from '@/features/intentions/dailyIntentionsRepository';

const MODE_KEY = 'sekretbip:daily-intentions:personalization:v1';
const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.min(SCREEN_WIDTH - 28, 340);
const IS_NARROW_RAIL = SCREEN_WIDTH < 360;
const COLLAPSED_CARD_WIDTH = IS_NARROW_RAIL ? Math.min(CARD_WIDTH, 118) : 108;
const COLLAPSED_CARD_LEFT = IS_NARROW_RAIL ? 14 : Math.max(102, Math.round(SCREEN_WIDTH * 0.27));
const COLLAPSED_CARD_BOTTOM = IS_NARROW_RAIL ? 126 : 26;
const EXPANDED_CARD_BOTTOM = 104;

type IntentionMode = 'basic' | 'personalized' | 'off';

interface DailyIntentionsCardProps {
  mood: string;
  companionKey: string;
  entries: JournalEntry[];
  comfortSessions: ComfortSession[];
  voiceNotes: VoiceNote[];
  isLoading?: boolean;
}

function happenedTodayByRecord(record: { id?: number; date?: string }): boolean {
  if (typeof record.id === 'number' && record.id > 1_000_000_000_000) {
    return happenedToday(record.id);
  }
  return Boolean(record.date && record.date === new Date().toLocaleDateString());
}

function companionKeyForEntry(entry?: JournalEntry): string | undefined {
  const value = entry?.activeTab ?? entry?.source;
  return value === 'raylene' || value === 'rylane' || value === 'cloud' || value === 'night'
    ? value
    : undefined;
}

export function DailyIntentionsCard({
  mood,
  companionKey,
  entries,
  comfortSessions,
  voiceNotes,
  isLoading = false,
}: DailyIntentionsCardProps) {
  const date = useMemo(() => localDateKey(), []);
  const [mode, setMode] = useState<IntentionMode>('basic');
  const [items, setItems] = useState<DailyIntention[]>([]);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const generatedInitial = useRef(false);

  const companionEntries = useMemo(
    () => entries
      .filter(isCompanionJournalEntry)
      .sort((a, b) => Number(b.id) - Number(a.id)),
    [entries],
  );

  const todaySignals = useMemo(() => ({
    journaledToday: entries.some(happenedTodayByRecord),
    comfortUsedToday: comfortSessions.some(happenedTodayByRecord),
    voiceUsedToday: voiceNotes.some(happenedTodayByRecord),
  }), [comfortSessions, entries, voiceNotes]);

  const makeItems = useCallback((nextMode: IntentionMode) => {
    const latestEntry = companionEntries[0];
    const recentUserTexts = nextMode === 'personalized'
      ? companionEntries.slice(0, 3).map(entry => entry.text)
      : [];

    return buildDailyIntentions({
      mood,
      companionKey: companionKeyForEntry(latestEntry) ?? companionKey,
      recentUserTexts,
      personalizationEnabled: nextMode === 'personalized',
      ...todaySignals,
    });
  }, [companionEntries, companionKey, mood, todaySignals]);

  const regenerate = useCallback(async (nextMode = mode) => {
    if (nextMode === 'off') return;
    const next = makeItems(nextMode);
    setItems(next);
    setSaving(true);
    try {
      await saveDailyIntentions(date, next);
    } finally {
      setSaving(false);
    }
  }, [date, makeItems, mode]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [savedMode, savedItems] = await Promise.all([
        AsyncStorage.getItem(MODE_KEY),
        loadDailyIntentions(date),
      ]);
      if (cancelled) return;
      const resolvedMode: IntentionMode = savedMode === 'personalized' || savedMode === 'off'
        ? savedMode
        : 'basic';
      setMode(resolvedMode);
      setItems(savedItems);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [date]);

  useEffect(() => {
    if (!ready || isLoading || mode === 'off' || items.length > 0 || generatedInitial.current) return;
    generatedInitial.current = true;
    void regenerate(mode);
  }, [isLoading, items.length, mode, ready, regenerate]);

  const chooseMode = useCallback(async (nextMode: IntentionMode) => {
    setMode(nextMode);
    await AsyncStorage.setItem(MODE_KEY, nextMode);
    setPrivacyOpen(false);

    if (nextMode === 'off') {
      setItems([]);
      await clearDailyIntentions(date).catch(() => {});
      return;
    }

    await regenerate(nextMode).catch(() => {});
  }, [date, regenerate]);

  const toggleItem = useCallback(async (position: number) => {
    const current = items.find(item => item.position === position);
    if (!current) return;
    const completed = !current.completed;
    setItems(list => list.map(item => item.position === position ? { ...item, completed } : item));
    await setDailyIntentionCompleted(date, position, completed).catch(() => {});
  }, [date, items]);

  if (!ready || isLoading) return null;

  if (mode === 'off') {
    return (
      <TouchableOpacity
        style={[
          s.offPill,
          { left: COLLAPSED_CARD_LEFT, bottom: COLLAPSED_CARD_BOTTOM },
        ]}
        onPress={() => setPrivacyOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Daily intentions are off. Open privacy settings."
      >
        <Text style={s.offText}>＋ intentions</Text>
        <PrivacySheet
          visible={privacyOpen}
          mode={mode}
          onClose={() => setPrivacyOpen(false)}
          onChoose={chooseMode}
        />
      </TouchableOpacity>
    );
  }

  const completedCount = items.filter(item => item.completed).length;
  const personalized = mode === 'personalized';

  return (
    <View
      style={[
        s.card,
        expanded ? s.cardExpanded : s.cardCollapsed,
        {
          width: expanded ? CARD_WIDTH : COLLAPSED_CARD_WIDTH,
          left: expanded ? 14 : COLLAPSED_CARD_LEFT,
          bottom: expanded ? EXPANDED_CARD_BOTTOM : COLLAPSED_CARD_BOTTOM,
        },
      ]}
      testID="daily-intentions-card"
    >
      <TouchableOpacity
        style={s.header}
        onPress={() => setExpanded(value => !value)}
        accessibilityRole="button"
        accessibilityLabel={`${expanded ? 'Collapse' : 'Expand'} today's intentions`}
      >
        <View style={s.headerCopy}>
          {expanded ? (
            <>
              <Text style={s.eyebrow}>TODAY, GENTLY</Text>
              <Text style={s.title}>your 3 small things</Text>
            </>
          ) : (
            <Text style={s.collapsedLabel}>✦ today</Text>
          )}
        </View>
        <View style={[s.progressPill, !expanded && s.progressPillCollapsed]}>
          <Text style={s.progressText}>{completedCount}/{items.length || 3}</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View>
          <View style={s.divider} />
          {items.map(item => (
            <TouchableOpacity
              key={item.position}
              style={s.itemRow}
              onPress={() => toggleItem(item.position)}
              activeOpacity={0.78}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.completed }}
              accessibilityLabel={item.label}
            >
              <View style={[s.checkbox, item.completed && s.checkboxDone]}>
                <Text style={s.checkmark}>{item.completed ? '✓' : ''}</Text>
              </View>
              <Text style={[s.itemText, item.completed && s.itemTextDone]}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={s.footer}>
            <TouchableOpacity
              onPress={() => regenerate().catch(() => {})}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel="Refresh today's intentions"
            >
              <Text style={s.footerAction}>{saving ? 'saving…' : '↻ refresh'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPrivacyOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="How daily intentions use my information"
            >
              <Text style={s.footerAction}>ⓘ privacy</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.trustLine}>
            {personalized
              ? 'Checked on this device from up to 3 recent companion pages. No quotes saved.'
              : 'Uses your mood + broad app actions. Not your private words.'}
          </Text>
        </View>
      )}

      <PrivacySheet
        visible={privacyOpen}
        mode={mode}
        onClose={() => setPrivacyOpen(false)}
        onChoose={chooseMode}
      />
    </View>
  );
}

function PrivacySheet({
  visible,
  mode,
  onClose,
  onChoose,
}: {
  visible: boolean;
  mode: IntentionMode;
  onClose: () => void;
  onChoose: (mode: IntentionMode) => Promise<void>;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.modalBackdrop}>
        <View style={s.modalCard}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={s.modalEyebrow}>YOU CONTROL THIS</Text>
            <Text style={s.modalTitle}>Helpful, not watching you.</Text>
            <Text style={s.modalBody}>
              Basic mode uses your current mood and broad actions like journaling, Comfort, or Voice Bip.
            </Text>
            <Text style={s.modalBody}>
              Personalized mode checks up to three recent messages you wrote to a companion, on this device, only when making the checklist.
            </Text>
            <View style={s.ruleBox}>
              <Text style={s.ruleText}>Never saved: journal text, quotes, companion replies, voice transcripts, or parent summaries.</Text>
              <Text style={s.ruleText}>Never shown to parents. Only the final checklist syncs to your own account.</Text>
            </View>

            <ModeButton
              selected={mode === 'personalized'}
              title="Use recent companion entries"
              subtitle="More personal · still processed locally"
              onPress={() => onChoose('personalized')}
            />
            <ModeButton
              selected={mode === 'basic'}
              title="Use basic signals only"
              subtitle="Mood + broad app actions"
              onPress={() => onChoose('basic')}
            />
            <ModeButton
              selected={mode === 'off'}
              title="Turn daily intentions off"
              subtitle="Clears today's saved checklist"
              onPress={() => onChoose('off')}
            />

            <TouchableOpacity style={s.closeButton} onPress={onClose}>
              <Text style={s.closeText}>close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function ModeButton({
  selected,
  title,
  subtitle,
  onPress,
}: {
  selected: boolean;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[s.modeButton, selected && s.modeButtonSelected]} onPress={onPress}>
      <View style={[s.modeRadio, selected && s.modeRadioSelected]}>
        <Text style={s.modeRadioMark}>{selected ? '✓' : ''}</Text>
      </View>
      <View style={s.modeCopy}>
        <Text style={s.modeTitle}>{title}</Text>
        <Text style={s.modeSubtitle}>{subtitle}</Text>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    position: 'absolute',
    zIndex: 40,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.42)',
    backgroundColor: 'rgba(18,8,36,0.91)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOpacity: 0.26,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 9,
  },
  cardExpanded: {
    borderRadius: 18,
  },
  cardCollapsed: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderColor: 'rgba(196,181,253,0.30)',
    backgroundColor: 'rgba(18,8,36,0.78)',
    shadowOpacity: 0.16,
    shadowRadius: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerCopy: { flex: 1 },
  collapsedLabel: { color: '#ddd6fe', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  eyebrow: { color: '#c4b5fd', fontSize: 9, fontWeight: '800', letterSpacing: 1.7 },
  title: { color: '#fff', fontSize: 16, fontWeight: '800', marginTop: 2 },
  progressPill: { backgroundColor: 'rgba(196,181,253,0.13)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  progressPillCollapsed: { paddingHorizontal: 6, paddingVertical: 4, marginLeft: 5 },
  progressText: { color: '#ddd6fe', fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(196,181,253,0.16)', marginVertical: 10 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 6, gap: 9 },
  checkbox: { width: 21, height: 21, borderRadius: 7, borderWidth: 1.5, borderColor: '#a78bfa', alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkboxDone: { backgroundColor: '#8b5cf6', borderColor: '#c4b5fd' },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  itemText: { flex: 1, color: '#f5f3ff', fontSize: 12.5, lineHeight: 18, fontWeight: '600' },
  itemTextDone: { color: 'rgba(221,214,254,0.55)', textDecorationLine: 'line-through' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  footerAction: { color: '#c4b5fd', fontSize: 10.5, fontWeight: '700' },
  trustLine: { color: 'rgba(221,214,254,0.57)', fontSize: 9.5, lineHeight: 14, marginTop: 8 },
  offPill: { position: 'absolute', zIndex: 40, borderRadius: 99, borderWidth: 1, borderColor: 'rgba(196,181,253,0.38)', backgroundColor: 'rgba(18,8,36,0.86)', paddingHorizontal: 13, paddingVertical: 8 },
  offText: { color: '#c4b5fd', fontSize: 11, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(4,2,12,0.72)', justifyContent: 'flex-end' },
  modalCard: { maxHeight: '82%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: '#160b29', borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)', paddingHorizontal: 20, paddingTop: 22, paddingBottom: 28 },
  modalEyebrow: { color: '#a78bfa', fontSize: 10, fontWeight: '900', letterSpacing: 1.8 },
  modalTitle: { color: '#fff', fontSize: 23, lineHeight: 29, fontWeight: '900', marginTop: 5, marginBottom: 12 },
  modalBody: { color: '#ddd6fe', fontSize: 13, lineHeight: 20, marginBottom: 10 },
  ruleBox: { borderRadius: 14, backgroundColor: 'rgba(139,92,246,0.10)', borderWidth: 1, borderColor: 'rgba(167,139,250,0.24)', padding: 12, marginVertical: 8 },
  ruleText: { color: '#ede9fe', fontSize: 11.5, lineHeight: 17, marginVertical: 2, fontWeight: '600' },
  modeButton: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(196,181,253,0.16)', padding: 12, marginTop: 9 },
  modeButtonSelected: { borderColor: '#a78bfa', backgroundColor: 'rgba(139,92,246,0.12)' },
  modeRadio: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: '#7c6b9c', alignItems: 'center', justifyContent: 'center' },
  modeRadioSelected: { backgroundColor: '#8b5cf6', borderColor: '#c4b5fd' },
  modeRadioMark: { color: '#fff', fontSize: 13, fontWeight: '900' },
  modeCopy: { flex: 1 },
  modeTitle: { color: '#f5f3ff', fontSize: 13, fontWeight: '800' },
  modeSubtitle: { color: 'rgba(221,214,254,0.58)', fontSize: 10.5, marginTop: 2 },
  closeButton: { alignSelf: 'center', marginTop: 16, paddingHorizontal: 20, paddingVertical: 9 },
  closeText: { color: '#c4b5fd', fontSize: 12, fontWeight: '800' },
});
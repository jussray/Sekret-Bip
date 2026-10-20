// screens/TeenChoresScreen.tsx
//
// Teen Chores — tasks a parent has set up (see screens/ParentApprovalsScreen.tsx
// for the parent-side counterpart). A teen can see what's active, submit a
// task for approval with an optional note, and see status once their parent
// reviews it. No reward redemption here — the reward catalog/store is not
// part of this build yet.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { fetchMyTasks, submitTask, type TeenTask, type BipTaskCategory } from '@/utils/teenTasks';

const TOP = Platform.OS === 'ios' ? 56 : 36;

const CATEGORY_EMOJI: Record<BipTaskCategory, string> = {
  home: '🏠', school: '📚', self_care: '🌿', growth: '🌱', habit: '🔁', custom: '✨',
};

const STATUS_LABEL: Record<TeenTask['status'], string> = {
  active: 'to do',
  submitted: 'waiting on approval',
  rejected: 'sent back — try again',
  completed: 'done ✓',
  cancelled: 'cancelled',
  expired: 'expired',
};

interface TeenChoresScreenProps {
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function TeenChoresScreen({ setScreen, BottomNav }: TeenChoresScreenProps) {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<TeenTask[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    setLoading(true);
    setTasks(await fetchMyTasks());
    setLoading(false);
  }, []);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    void load();
  }, [load]);

  async function handleSubmit(taskId: string) {
    setSubmittingId(taskId);
    const ok = await submitTask(taskId, notes[taskId]);
    setSubmittingId(null);
    if (ok) {
      setOpenId(null);
      void load();
    }
  }

  const actionable = tasks.filter(t => t.status === 'active' || t.status === 'rejected');
  const history = tasks.filter(t => t.status === 'submitted' || t.status === 'completed');

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      >
        <View style={s.header}>
          <TouchableOpacity onPress={() => setScreen('bippin2')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={s.back}>{'<'}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Chores</Text>
            <Text style={s.sub}>{"things your parent set up for you"}</Text>
          </View>
          {actionable.length > 0 && (
            <View style={s.countPill}>
              <Text style={s.countText}>{actionable.length}</Text>
            </View>
          )}
        </View>

        {loading && <View style={s.loadingWrap}><ActivityIndicator color="#c084fc" /></View>}

        {!loading && tasks.length === 0 && (
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🌤️</Text>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptySub}>{"When your parent sets up a task, it'll show up here."}</Text>
          </View>
        )}

        {!loading && actionable.map(task => {
          const isOpen = openId === task.id;
          return (
            <TouchableOpacity
              key={task.id}
              style={[s.card, isOpen && s.cardOpen]}
              onPress={() => setOpenId(isOpen ? null : task.id)}
              activeOpacity={0.85}
            >
              <View style={s.cardTop}>
                <Text style={s.cardEmoji}>{CATEGORY_EMOJI[task.category] ?? '✨'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{task.title}</Text>
                  <Text style={s.cardSub}>{task.point_value} pts{task.status === 'rejected' ? ' · sent back, try again' : ''}</Text>
                </View>
              </View>
              {!!task.description && <Text style={s.cardDesc}>{task.description}</Text>}

              {isOpen && (
                <View style={s.submitSection}>
                  <TextInput
                    style={s.noteInput}
                    value={notes[task.id] ?? ''}
                    onChangeText={t => setNotes(prev => ({ ...prev, [task.id]: t }))}
                    placeholder="Optional note for your parent…"
                    placeholderTextColor="#64748B"
                    multiline
                  />
                  <TouchableOpacity
                    style={[s.submitBtn, submittingId === task.id && s.submitBtnDisabled]}
                    disabled={submittingId === task.id}
                    onPress={() => handleSubmit(task.id)}
                  >
                    <Text style={s.submitBtnText}>{submittingId === task.id ? 'Submitting…' : "Mark it done"}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {!loading && history.length > 0 && (
          <>
            <Text style={s.sectionLabel}>Submitted / done</Text>
            {history.map(task => (
              <View key={task.id} style={s.historyRow}>
                <Text style={s.cardEmoji}>{CATEGORY_EMOJI[task.category] ?? '✨'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{task.title}</Text>
                  <Text style={s.cardSub}>{task.point_value} pts · {STATUS_LABEL[task.status]}</Text>
                </View>
              </View>
            ))}
          </>
        )}
      </Animated.ScrollView>
      {BottomNav}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#0d0820' },
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

  loadingWrap: { paddingTop: 40, alignItems: 'center' },

  emptyWrap:  { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptySub:   { color: '#64748B', fontSize: 14, lineHeight: 22, textAlign: 'center' },

  card: {
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 16,
  },
  cardOpen: { borderColor: '#c084fc' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cardEmoji: { fontSize: 22, width: 28 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardDesc: { color: '#CBD5E1', fontSize: 13, lineHeight: 19, marginTop: 4 },

  submitSection: { marginTop: 14, borderTopWidth: 1, borderTopColor: '#1e293b', paddingTop: 12 },
  noteInput: {
    color: '#fff', fontSize: 14, lineHeight: 20,
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    padding: 12, minHeight: 60, marginBottom: 12,
  },
  submitBtn: { backgroundColor: 'rgba(192,132,252,0.16)', borderWidth: 1, borderColor: '#c084fc', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700' },

  sectionLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginHorizontal: 20, marginTop: 8, marginBottom: 10, textTransform: 'uppercase' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
});

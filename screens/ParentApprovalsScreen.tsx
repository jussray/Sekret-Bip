// screens/ParentApprovalsScreen.tsx
//
// Parent Approvals — review chore/task submissions and reward redemption
// requests from the linked teen, and create new tasks for them to earn
// points on. Backed by bip_tasks / task_submissions / reward_catalog /
// reward_redemptions (see supabase/migrations/20260627193000_phase_2_tasks_approvals_rewards.sql).
// Parent never sees submission evidence beyond what the teen attaches here;
// no journal, voice, or Circle content flows through this screen.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  StyleSheet, Animated, Platform, ActivityIndicator,
} from 'react-native';
import {
  type BipTask,
  type BipTaskCategory,
  type PendingTaskSubmission,
  type PendingRewardRedemption,
  fetchParentTasks,
  fetchPendingTaskSubmissions,
  fetchPendingRewardRedemptions,
  createBipTask,
  reviewTaskSubmission,
  reviewRewardRedemption,
} from '@/utils/parentApprovals';

const TOP = Platform.OS === 'ios' ? 56 : 36;

const CATEGORIES: { id: BipTaskCategory; label: string; emoji: string }[] = [
  { id: 'home',      label: 'Home',      emoji: '🏠' },
  { id: 'school',    label: 'School',    emoji: '📚' },
  { id: 'self_care', label: 'Self-care', emoji: '🌿' },
  { id: 'growth',    label: 'Growth',    emoji: '🌱' },
  { id: 'habit',     label: 'Habit',     emoji: '🔁' },
  { id: 'custom',    label: 'Custom',    emoji: '✨' },
];

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.id, `${c.emoji} ${c.label}`]));

interface ParentApprovalsScreenProps {
  teenId: string | null;
  isLinked: boolean;
  setScreen: (s: string) => void;
  BottomNav: React.ReactNode;
}

export function ParentApprovalsScreen({ teenId, isLinked, setScreen, BottomNav }: ParentApprovalsScreenProps) {
  const [tab, setTab] = useState<'review' | 'manage'>('review');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [taskSubs, setTaskSubs] = useState<PendingTaskSubmission[]>([]);
  const [rewardReqs, setRewardReqs] = useState<PendingRewardRedemption[]>([]);
  const [tasks, setTasks] = useState<BipTask[]>([]);

  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<BipTaskCategory>('home');
  const [newPoints, setNewPoints] = useState('10');
  const [creating, setCreating] = useState(false);

  const fadeIn = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    if (!teenId) { setLoading(false); return; }
    setLoading(true);
    const [subs, rewards, allTasks] = await Promise.all([
      fetchPendingTaskSubmissions(teenId),
      fetchPendingRewardRedemptions(teenId),
      fetchParentTasks(teenId),
    ]);
    setTaskSubs(subs);
    setRewardReqs(rewards);
    setTasks(allTasks);
    setLoading(false);
  }, [teenId]);

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 480, useNativeDriver: true }).start();
    void load();
  }, [load]);

  const pendingCount = taskSubs.length + rewardReqs.length;

  async function handleTaskReview(submissionId: string, approve: boolean) {
    setBusyId(submissionId);
    const ok = await reviewTaskSubmission(submissionId, approve);
    if (ok) setTaskSubs(prev => prev.filter(s => s.id !== submissionId));
    setBusyId(null);
    if (ok) void load();
  }

  async function handleRewardReview(redemptionId: string, approve: boolean) {
    setBusyId(redemptionId);
    const ok = await reviewRewardRedemption(redemptionId, approve);
    if (ok) setRewardReqs(prev => prev.filter(r => r.id !== redemptionId));
    setBusyId(null);
  }

  async function handleCreateTask() {
    if (!teenId || !newTitle.trim()) return;
    setCreating(true);
    const ok = await createBipTask({
      teenId,
      title: newTitle,
      category: newCategory,
      pointValue: parseInt(newPoints, 10) || 0,
      requiresApproval: true,
    });
    setCreating(false);
    if (ok) {
      setNewTitle('');
      setNewPoints('10');
      void load();
    }
  }

  if (!isLinked) {
    return (
      <View style={s.root}>
        <ScrollView contentContainerStyle={s.scroll}>
          <Header setScreen={setScreen} count={0} />
          <View style={s.emptyWrap}>
            <Text style={s.emptyEmoji}>🔗</Text>
            <Text style={s.emptyTitle}>Not linked to a teen yet</Text>
            <Text style={s.emptySub}>
              {"Ask your teen to generate a connection code in Settings, then link it from More to see chores and rewards here."}
            </Text>
          </View>
        </ScrollView>
        {BottomNav}
      </View>
    );
  }

  return (
    <View style={s.root}>
      <Animated.ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeIn }}
      >
        <Header setScreen={setScreen} count={pendingCount} />

        <View style={s.privacyNote}>
          <Text style={s.privacyText}>
            {"Tasks and rewards here are only what you set up or what your teen submitted for one of your tasks. This is separate from their journal, voice notes, and Circle."}
          </Text>
        </View>

        <View style={s.tabRow}>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'review' && s.tabBtnActive]}
            onPress={() => setTab('review')}
          >
            <Text style={[s.tabText, tab === 'review' && s.tabTextActive]}>To Review{pendingCount ? ` (${pendingCount})` : ''}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tabBtn, tab === 'manage' && s.tabBtnActive]}
            onPress={() => setTab('manage')}
          >
            <Text style={[s.tabText, tab === 'manage' && s.tabTextActive]}>Create & Manage</Text>
          </TouchableOpacity>
        </View>

        {loading && (
          <View style={s.loadingWrap}><ActivityIndicator color="#34d399" /></View>
        )}

        {!loading && tab === 'review' && (
          <>
            {pendingCount === 0 && (
              <View style={s.emptyWrap}>
                <Text style={s.emptyEmoji}>✅</Text>
                <Text style={s.emptyTitle}>Nothing waiting on you</Text>
                <Text style={s.emptySub}>{"When your teen submits a task or requests a reward, it'll show up here."}</Text>
              </View>
            )}

            {taskSubs.map(sub => (
              <View key={sub.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardEmoji}>{CATEGORIES.find(c => c.id === sub.task?.category)?.emoji ?? '✅'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{sub.task?.title ?? 'Task'}</Text>
                    <Text style={s.cardSub}>{CATEGORY_LABEL[sub.task?.category ?? 'custom']} · {sub.task?.point_value ?? 0} pts</Text>
                  </View>
                </View>
                {!!sub.note && <Text style={s.cardNote}>{'"'}{sub.note}{'"'}</Text>}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn]}
                    disabled={busyId === sub.id}
                    onPress={() => handleTaskReview(sub.id, false)}
                  >
                    <Text style={s.rejectText}>Not yet</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.approveBtn]}
                    disabled={busyId === sub.id}
                    onPress={() => handleTaskReview(sub.id, true)}
                  >
                    <Text style={s.approveText}>{busyId === sub.id ? '…' : 'Approve'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {rewardReqs.map(req => (
              <View key={req.id} style={s.card}>
                <View style={s.cardTop}>
                  <Text style={s.cardEmoji}>🎁</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardTitle}>{req.reward?.name ?? 'Reward'}</Text>
                    <Text style={s.cardSub}>{req.point_cost} pts</Text>
                  </View>
                </View>
                {!!req.reward?.description && <Text style={s.cardNote}>{req.reward.description}</Text>}
                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn]}
                    disabled={busyId === req.id}
                    onPress={() => handleRewardReview(req.id, false)}
                  >
                    <Text style={s.rejectText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.approveBtn]}
                    disabled={busyId === req.id}
                    onPress={() => handleRewardReview(req.id, true)}
                  >
                    <Text style={s.approveText}>{busyId === req.id ? '…' : 'Approve'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {!loading && tab === 'manage' && (
          <>
            <View style={s.formCard}>
              <Text style={s.formLabel}>New task</Text>
              <TextInput
                style={s.input}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Clean your room"
                placeholderTextColor="#475569"
              />
              <View style={s.categoryRow}>
                {CATEGORIES.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[s.categoryChip, newCategory === c.id && s.categoryChipActive]}
                    onPress={() => setNewCategory(c.id)}
                  >
                    <Text style={[s.categoryChipText, newCategory === c.id && s.categoryChipTextActive]}>{c.emoji} {c.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.pointsRow}>
                <Text style={s.formLabel}>Points</Text>
                <TextInput
                  style={s.pointsInput}
                  value={newPoints}
                  onChangeText={setNewPoints}
                  keyboardType="number-pad"
                  placeholderTextColor="#475569"
                />
              </View>
              <TouchableOpacity
                style={[s.createBtn, (!newTitle.trim() || creating) && s.createBtnDisabled]}
                disabled={!newTitle.trim() || creating}
                onPress={handleCreateTask}
              >
                <Text style={s.createBtnText}>{creating ? 'Adding…' : 'Add task'}</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.sectionLabel}>Tasks you've set</Text>
            {tasks.length === 0 && (
              <Text style={s.emptySub}>No tasks yet — add one above.</Text>
            )}
            {tasks.map(task => (
              <View key={task.id} style={s.taskRow}>
                <Text style={s.cardEmoji}>{CATEGORIES.find(c => c.id === task.category)?.emoji ?? '✨'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{task.title}</Text>
                  <Text style={s.cardSub}>{task.point_value} pts · {task.status}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
      {BottomNav}
    </View>
  );
}

function Header({ setScreen, count }: { setScreen: (s: string) => void; count: number }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => setScreen('more')} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={s.back}>{'<'}</Text>
      </TouchableOpacity>
      <View style={{ flex: 1 }}>
        <Text style={s.title}>Approvals</Text>
        <Text style={s.sub}>chores and rewards to review</Text>
      </View>
      {count > 0 && (
        <View style={s.countPill}>
          <Text style={s.countText}>{count}</Text>
        </View>
      )}
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
  back:  { color: '#a7f3d0', fontSize: 22, fontWeight: '300' },
  title: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sub:   { color: '#94A3B8', fontSize: 12, marginTop: 2 },

  countPill: {
    backgroundColor: 'rgba(52,211,153,0.18)',
    borderWidth: 1, borderColor: '#34d399',
    borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { color: '#a7f3d0', fontSize: 13, fontWeight: '700' },

  privacyNote: {
    marginHorizontal: 20, marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderLeftWidth: 2, borderLeftColor: '#475569',
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10,
  },
  privacyText: { color: '#64748B', fontSize: 12, lineHeight: 18 },

  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: 'rgba(52,211,153,0.16)' },
  tabText: { color: '#64748B', fontSize: 13, fontWeight: '700' },
  tabTextActive: { color: '#a7f3d0' },

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
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardEmoji: { fontSize: 22, width: 28 },
  cardTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cardSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
  cardNote: { color: '#CBD5E1', fontSize: 13, fontStyle: 'italic', marginBottom: 10, lineHeight: 19 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  rejectBtn: { borderColor: '#334155', backgroundColor: 'transparent' },
  rejectText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  approveBtn: { borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.16)' },
  approveText: { color: '#a7f3d0', fontSize: 13, fontWeight: '700' },

  formCard: {
    marginHorizontal: 20, marginBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 16, padding: 16,
  },
  formLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginBottom: 8, textTransform: 'uppercase' },
  input: {
    color: '#fff', fontSize: 15,
    borderWidth: 1, borderColor: '#334155', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14,
  },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  categoryChip: { borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  categoryChipActive: { borderColor: '#34d399', backgroundColor: 'rgba(52,211,153,0.14)' },
  categoryChipText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  categoryChipTextActive: { color: '#a7f3d0' },
  pointsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  pointsInput: {
    color: '#fff', fontSize: 15, width: 70, textAlign: 'center',
    borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingVertical: 8,
  },
  createBtn: { backgroundColor: '#047857', borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.5 },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },

  sectionLabel: { color: '#64748B', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginHorizontal: 20, marginBottom: 10, textTransform: 'uppercase' },
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: 20, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: '#1e293b',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12,
  },
});

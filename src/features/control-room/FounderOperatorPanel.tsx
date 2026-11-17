import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  FOUNDER_OPERATOR_HISTORY_KEY,
  buildFounderOperatorPlan,
  getFounderOperatorProgress,
  nextFounderArtifactStatus,
  updateFounderArtifactStatus,
} from '@/services/controlRoomFounderOperator';
import {
  getLocalControlRoomAgentHealth,
  persistFounderOperatorPlan,
  runLocalControlRoomMission,
  type LocalAgentStatus,
  type LocalMissionRun,
} from '@/services/controlRoomLocalAgent';
import type {
  FounderOperatorArtifact,
  FounderOperatorArtifactStatus,
  FounderOperatorPlan,
} from '@/types/controlRoomFounderOperator';

const MODE_LABELS = {
  ultrathink: 'ULTRATHINK',
  'billgates-artifacts': 'BILL GATES ARTIFACTS',
  'elonmusk-execution': 'ELON MUSK EXECUTION',
} as const;

const STATUS_COLORS: Record<FounderOperatorArtifactStatus, string> = {
  planned: '#8f899e',
  building: '#60a5fa',
  'verification-required': '#facc15',
  'human-required': '#fb923c',
  verified: '#4ade80',
};

function title(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function summarizeRun(run: LocalMissionRun | null): string {
  if (!run) return '';
  return [run.stdout, run.stderr].filter(Boolean).join('\n').trim();
}

export default function FounderOperatorPanel() {
  const [mission, setMission] = useState('');
  const [constraints, setConstraints] = useState('');
  const [plans, setPlans] = useState<FounderOperatorPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [persistedPath, setPersistedPath] = useState('');
  const [localAgentStatus, setLocalAgentStatus] = useState<LocalAgentStatus>('checking');
  const [runningMission, setRunningMission] = useState<string | null>(null);
  const [latestRun, setLatestRun] = useState<LocalMissionRun | null>(null);

  const activePlan = useMemo(
    () => plans.find((plan) => plan.id === activePlanId) || plans[plans.length - 1] || null,
    [activePlanId, plans],
  );
  const progress = activePlan ? getFounderOperatorProgress(activePlan) : null;

  const savePlans = useCallback(async (nextPlans: FounderOperatorPlan[], nextActiveId: string) => {
    setPlans(nextPlans);
    setActivePlanId(nextActiveId);
    await AsyncStorage.setItem(FOUNDER_OPERATOR_HISTORY_KEY, JSON.stringify(nextPlans));
  }, []);

  const refreshAgent = useCallback(async () => {
    setLocalAgentStatus('checking');
    try {
      const health = await getLocalControlRoomAgentHealth();
      setLocalAgentStatus('online');
      setLatestRun(health.latestRun);
    } catch {
      setLocalAgentStatus('offline');
    }
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(FOUNDER_OPERATOR_HISTORY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as FounderOperatorPlan[];
          if (Array.isArray(parsed)) {
            setPlans(parsed);
            setActivePlanId(parsed[parsed.length - 1]?.id || '');
          }
        }
      } catch {
        setError('operator_history_unreadable');
      } finally {
        setLoading(false);
        void refreshAgent();
      }
    })();
  }, [refreshAgent]);

  const persistPlan = useCallback(async (plan: FounderOperatorPlan) => {
    setPersistedPath('');
    try {
      const result = await persistFounderOperatorPlan(plan);
      setPersistedPath(result.reportPath);
      setLocalAgentStatus('online');
    } catch (persistError) {
      setError(persistError instanceof Error ? persistError.message : 'plan_persistence_failed');
    }
  }, []);

  const generatePlan = useCallback(async () => {
    setError('');
    setPersistedPath('');
    try {
      const plan = buildFounderOperatorPlan({ mission, constraints });
      const existingIndex = plans.findIndex((item) => item.id === plan.id);
      const nextPlans = existingIndex >= 0
        ? plans.map((item, index) => index === existingIndex ? plan : item)
        : [...plans, plan];
      await savePlans(nextPlans, plan.id);
      if (localAgentStatus === 'online') await persistPlan(plan);
    } catch (planError) {
      setError(planError instanceof Error ? planError.message : 'operator_plan_failed');
    }
  }, [constraints, localAgentStatus, mission, persistPlan, plans, savePlans]);

  const replaceActivePlan = useCallback(async (plan: FounderOperatorPlan) => {
    const nextPlans = plans.map((item) => item.id === plan.id ? plan : item);
    await savePlans(nextPlans, plan.id);
  }, [plans, savePlans]);

  const advanceArtifact = useCallback(async (artifact: FounderOperatorArtifact) => {
    if (!activePlan || artifact.status === 'verified' || artifact.status === 'human-required') return;
    const next = updateFounderArtifactStatus(activePlan, artifact.id, nextFounderArtifactStatus(artifact));
    await replaceActivePlan(next);
  }, [activePlan, replaceActivePlan]);

  const recordFounderApproval = useCallback(async (artifact: FounderOperatorArtifact) => {
    if (!activePlan || artifact.status !== 'human-required' || artifact.approvalRecordedAt) return;
    const next: FounderOperatorPlan = {
      ...activePlan,
      artifacts: activePlan.artifacts.map((item) => item.id === artifact.id
        ? { ...item, approvalRecordedAt: new Date().toISOString() }
        : item),
    };
    await replaceActivePlan(next);
    if (localAgentStatus === 'online') await persistPlan(next);
  }, [activePlan, localAgentStatus, persistPlan, replaceActivePlan]);

  const runSafeMission = useCallback(async (missionId: string, phaseId: string) => {
    if (!activePlan) return;
    setRunningMission(missionId);
    setError('');
    try {
      const run = await runLocalControlRoomMission(missionId);
      setLatestRun(run);
      setLocalAgentStatus('online');
      if (run.status === 'passed' && phaseId === 'verify') {
        const verificationArtifact = activePlan.artifacts.find((item) => item.id === 'verification-report');
        if (verificationArtifact) {
          const next = updateFounderArtifactStatus(activePlan, verificationArtifact.id, 'verified');
          await replaceActivePlan(next);
          await persistPlan(next);
        }
      }
    } catch (missionError) {
      setError(missionError instanceof Error ? missionError.message : 'safe_mission_failed');
      await refreshAgent();
    } finally {
      setRunningMission(null);
    }
  }, [activePlan, persistPlan, refreshAgent, replaceActivePlan]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#a78bfa"/><Text style={styles.muted}>Loading Founder Operator history…</Text></View>;
  }

  return <ScrollView style={styles.root} contentContainerStyle={styles.content}>
    <View style={styles.header}>
      <Text style={styles.kicker}>FOUNDER CONTROL ROOM</Text>
      <Text style={styles.title}>Founder Operator</Text>
      <Text style={styles.body}>One mission becomes a durable plan, assigned AI lanes, evidence artifacts, safe local actions, and explicit founder gates.</Text>
      <View style={styles.modeRow}>
        {Object.values(MODE_LABELS).map((label) => <View key={label} style={styles.modeChip}><Text style={styles.modeText}>{label}</Text></View>)}
      </View>
    </View>

    <View style={styles.callout}>
      <Text style={styles.calloutTitle}>Authority boundary</Text>
      <Text style={styles.body}>This surface may plan, retain artifacts, and run only existing allowlisted local missions. It cannot silently merge, deploy, spend, publish, create accounts, use secrets, apply migrations, or delete anything.</Text>
    </View>

    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Give Control Room the mission</Text>
      <TextInput
        value={mission}
        onChangeText={setMission}
        multiline
        maxLength={2_000}
        placeholder="Example: Audit the current merge queue, fix the highest-risk blockers, create the necessary code, design, and evidence artifacts, then stop at founder approval."
        placeholderTextColor="#6b7280"
        style={[styles.input, styles.missionInput]}
      />
      <TextInput
        value={constraints}
        onChangeText={setConstraints}
        multiline
        maxLength={2_000}
        placeholder="Constraints, preserved decisions, budget, privacy limits, deadlines, or things that must never be deleted."
        placeholderTextColor="#6b7280"
        style={[styles.input, styles.constraintsInput]}
      />
      <TouchableOpacity style={styles.primary} onPress={() => void generatePlan()}>
        <Text style={styles.primaryText}>Build artifact plan</Text>
      </TouchableOpacity>
      <View style={styles.agentRow}>
        <Text style={styles.muted}>Local agent: {localAgentStatus}</Text>
        <TouchableOpacity style={styles.linkButton} onPress={() => void refreshAgent()}>
          <Text style={styles.linkText}>Refresh</Text>
        </TouchableOpacity>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {persistedPath ? <Text style={styles.success}>Evidence persisted: {persistedPath}</Text> : null}
    </View>

    {plans.length ? <View style={styles.panel}>
      <Text style={styles.panelTitle}>Mission history</Text>
      <Text style={styles.muted}>History is append-only in local Control Room storage. No delete action is exposed.</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.historyRow}>
        {plans.map((plan) => <TouchableOpacity key={plan.id} style={[styles.historyChip, activePlan?.id === plan.id && styles.historyChipActive]} onPress={() => setActivePlanId(plan.id)}>
          <Text style={styles.historyText}>{plan.mission.slice(0, 42)}</Text>
        </TouchableOpacity>)}
      </ScrollView>
    </View> : null}

    {activePlan && progress ? <>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricValue}>{activePlan.phases.length}</Text><Text style={styles.muted}>phases</Text></View>
        <View style={styles.metric}><Text style={styles.metricValue}>{progress.artifactCount}</Text><Text style={styles.muted}>artifacts</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, { color: '#fb923c' }]}>{activePlan.approvalGates.length}</Text><Text style={styles.muted}>approval gates</Text></View>
        <View style={styles.metric}><Text style={[styles.metricValue, { color: '#4ade80' }]}>{progress.percent}%</Text><Text style={styles.muted}>verified</Text></View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.kicker}>ACTIVE MISSION</Text>
        <Text style={styles.panelTitle}>{activePlan.mission}</Text>
        {activePlan.constraints ? <Text style={styles.body}>Constraints: {activePlan.constraints}</Text> : null}
        <Text style={styles.muted}>Plan {activePlan.id} · evidence level {activePlan.evidenceLevel}</Text>
        <TouchableOpacity style={[styles.secondary, localAgentStatus !== 'online' && styles.disabled]} disabled={localAgentStatus !== 'online'} onPress={() => void persistPlan(activePlan)}>
          <Text style={styles.secondaryText}>Persist current plan evidence</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>Program phases</Text>
      {activePlan.phases.map((phase, index) => {
        const phaseArtifacts = activePlan.artifacts.filter((item) => phase.artifactIds.includes(item.id));
        const missionBusy = Boolean(runningMission);
        return <View key={phase.id} style={styles.phase}>
          <View style={styles.row}>
            <Text style={styles.phaseNumber}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.flex}>
              <Text style={styles.phaseTitle}>{phase.title}</Text>
              <Text style={styles.muted}>{title(phase.status)} · owner {title(phase.ownerLane)}</Text>
            </View>
          </View>
          <Text style={styles.body}>{phase.objective}</Text>
          <Text style={styles.question}>{phase.operatingQuestion}</Text>
          <Text style={styles.muted}>Support: {phase.supportLanes.map(title).join(' · ')}</Text>
          {phase.safeMissionId ? <TouchableOpacity
            style={[styles.secondary, (localAgentStatus !== 'online' || missionBusy) && styles.disabled]}
            disabled={localAgentStatus !== 'online' || missionBusy}
            onPress={() => void runSafeMission(phase.safeMissionId!, phase.id)}
          >
            <Text style={styles.secondaryText}>{runningMission === phase.safeMissionId ? 'Running…' : `Run safe evidence step: ${phase.safeMissionId}`}</Text>
          </TouchableOpacity> : null}
          {phaseArtifacts.map((item) => <View key={item.id} style={styles.artifact}>
            <View style={styles.row}>
              <View style={styles.flex}>
                <Text style={styles.artifactTitle}>{item.title}</Text>
                <Text style={styles.muted}>{title(item.kind)} · {title(item.ownerLane)}</Text>
              </View>
              <Text style={[styles.status, { color: STATUS_COLORS[item.status] }]}>{title(item.status)}</Text>
            </View>
            <Text style={styles.path}>{item.pathHint}</Text>
            <Text style={styles.muted}>Proof: {item.evidenceRequired.join(' · ')}</Text>
            {item.approvalGate ? <Text style={styles.warning}>{item.approvalGate}</Text> : null}
            {item.status === 'human-required'
              ? item.approvalRecordedAt
                ? <Text style={styles.approvalRecorded}>Founder approval recorded {new Date(item.approvalRecordedAt).toLocaleString()} · external action still pending</Text>
                : <TouchableOpacity style={styles.approvalButton} onPress={() => void recordFounderApproval(item)}><Text style={styles.approvalText}>Founder records approval</Text></TouchableOpacity>
              : item.status !== 'verified'
                ? <TouchableOpacity style={styles.linkButton} onPress={() => void advanceArtifact(item)}><Text style={styles.linkText}>Advance to {title(nextFounderArtifactStatus(item))}</Text></TouchableOpacity>
                : null}
          </View>)}
          <Text style={styles.exitGate}>Exit gate: {phase.exitGate}</Text>
        </View>;
      })}

      {latestRun ? <View style={styles.panel}>
        <View style={styles.row}><Text style={styles.panelTitle}>Latest safe mission</Text><Text style={[styles.status, { color: latestRun.status === 'passed' ? '#4ade80' : '#fb7185' }]}>{title(latestRun.status)}</Text></View>
        <Text style={styles.muted}>{latestRun.missionId} · {Math.round(latestRun.durationMs / 1_000)}s · exit {latestRun.exitCode ?? '—'}</Text>
        {summarizeRun(latestRun) ? <Text style={styles.output} numberOfLines={20}>{summarizeRun(latestRun)}</Text> : null}
      </View> : null}

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Human-only gates</Text>
        {activePlan.approvalGates.map((gate) => <Text key={gate} style={styles.listItem}>• {gate}</Text>)}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Truth boundary</Text>
        {activePlan.nonClaims.map((claim) => <Text key={claim} style={styles.listItem}>• {claim}</Text>)}
      </View>
    </> : null}
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#080611' },
  content: { padding: 20, paddingTop: 74, paddingBottom: 80, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: '#080611' },
  header: { gap: 8 },
  kicker: { color: '#a78bfa', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: '#fff', fontSize: 30, fontWeight: '900' },
  body: { color: '#d6d1df', fontSize: 14, lineHeight: 21 },
  muted: { color: '#8f899e', fontSize: 12, lineHeight: 18 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  modeChip: { borderWidth: 1, borderColor: '#4c3c72', backgroundColor: '#161022', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  modeText: { color: '#d8c8ff', fontSize: 10, fontWeight: '900' },
  callout: { borderWidth: 1, borderColor: '#6d28d9', backgroundColor: '#160f27', borderRadius: 16, padding: 15, gap: 6 },
  calloutTitle: { color: '#c4b5fd', fontSize: 14, fontWeight: '900' },
  panel: { borderWidth: 1, borderColor: '#272238', backgroundColor: '#0d0a15', borderRadius: 16, padding: 15, gap: 10 },
  panelTitle: { color: '#fff', fontSize: 17, fontWeight: '900' },
  input: { borderWidth: 1, borderColor: '#332c48', backgroundColor: '#090710', color: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14, textAlignVertical: 'top' },
  missionInput: { minHeight: 112 },
  constraintsInput: { minHeight: 78 },
  primary: { backgroundColor: '#6d28d9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center' },
  primaryText: { color: '#fff', fontWeight: '900' },
  secondary: { borderWidth: 1, borderColor: '#4c3c72', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: '#d8c8ff', fontWeight: '800', fontSize: 12 },
  disabled: { opacity: 0.42 },
  agentRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkButton: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 2 },
  linkText: { color: '#a78bfa', fontWeight: '800', fontSize: 12 },
  error: { color: '#fb7185', fontSize: 12 },
  success: { color: '#4ade80', fontSize: 12 },
  historyRow: { flexGrow: 0 },
  historyChip: { borderWidth: 1, borderColor: '#332c48', borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7, marginRight: 8 },
  historyChipActive: { borderColor: '#a78bfa', backgroundColor: '#211535' },
  historyText: { color: '#d6d1df', fontSize: 11, fontWeight: '700', maxWidth: 220 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metric: { minWidth: 120, flexGrow: 1, borderWidth: 1, borderColor: '#272238', backgroundColor: '#0d0a15', borderRadius: 14, padding: 13 },
  metricValue: { color: '#fff', fontSize: 23, fontWeight: '900' },
  section: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },
  phase: { borderWidth: 1, borderColor: '#332c48', backgroundColor: '#0b0812', borderRadius: 18, padding: 15, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  flex: { flex: 1 },
  phaseNumber: { color: '#a78bfa', fontSize: 18, fontWeight: '900' },
  phaseTitle: { color: '#fff', fontSize: 16, fontWeight: '900' },
  question: { color: '#c4b5fd', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  artifact: { borderTopWidth: 1, borderTopColor: '#272238', paddingTop: 12, gap: 6 },
  artifactTitle: { color: '#f3f0f7', fontSize: 14, fontWeight: '800' },
  status: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  path: { color: '#60a5fa', fontSize: 11, fontFamily: 'monospace' },
  warning: { color: '#fb923c', fontSize: 12, lineHeight: 18 },
  approvalButton: { alignSelf: 'flex-start', borderWidth: 1, borderColor: '#fb923c', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  approvalText: { color: '#fdba74', fontSize: 11, fontWeight: '900' },
  approvalRecorded: { color: '#fdba74', fontSize: 11, lineHeight: 17 },
  exitGate: { color: '#a7f3d0', fontSize: 12, lineHeight: 18, borderTopWidth: 1, borderTopColor: '#272238', paddingTop: 10 },
  output: { color: '#d6d1df', backgroundColor: '#050408', borderRadius: 10, padding: 10, fontFamily: 'monospace', fontSize: 11, lineHeight: 16 },
  listItem: { color: '#d6d1df', fontSize: 13, lineHeight: 20 },
});
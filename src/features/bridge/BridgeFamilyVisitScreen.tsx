import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';

import {
  acknowledgeBridgeFamilyVisitSession,
  declineBridgeFamilyVisitSession,
  endBridgeFamilyVisitSession,
  fetchBridgeFamilyVisitBundle,
  generateBridgeFamilyVisitHumanSummaries,
  recordBridgeFamilyVisitMarker,
  startBridgeFamilyVisitSession,
  submitBridgeFamilyVisitParticipantReflection,
  submitBridgeFamilyVisitProfessionalReflection,
} from '@/services/bridgeFamilyVisitService';
import type {
  BridgeFamilyVisitAnswer,
  BridgeFamilyVisitAssignment,
  BridgeFamilyVisitBundle,
  BridgeFamilyVisitConnection,
  BridgeFamilyVisitEvidenceItem,
  BridgeFamilyVisitMarkerKey,
  BridgeFamilyVisitNextSupport,
  BridgeFamilyVisitReviewSignal,
  BridgeFamilyVisitRole,
  BridgeFamilyVisitSession,
  BridgeParentVisitSummary,
  BridgeProfessionalVisitSummary,
} from '@/types/bridgeFamilyVisit';

const MARKERS: Record<BridgeFamilyVisitRole, Array<{ key: BridgeFamilyVisitMarkerKey; label: string }>> = {
  teen: [
    { key: 'felt_connected', label: 'I felt connected' },
    { key: 'felt_heard', label: 'I felt heard' },
    { key: 'needed_pause', label: 'I needed a pause' },
    { key: 'felt_pressured', label: 'I felt pressured' },
    { key: 'want_human_review', label: 'I want a human to review this' },
  ],
  parent: [
    { key: 'support_offered', label: 'I offered support' },
    { key: 'boundary_respected', label: 'A boundary was respected' },
    { key: 'repair_attempt', label: 'We tried to repair a hard moment' },
    { key: 'needed_pause', label: 'A pause would help' },
    { key: 'want_human_review', label: 'I want a human to review this' },
  ],
  professional: [
    { key: 'support_offered', label: 'Support was offered' },
    { key: 'boundary_respected', label: 'A boundary was respected' },
    { key: 'repair_attempt', label: 'There was a repair attempt' },
    { key: 'needed_pause', label: 'A pause was needed' },
    { key: 'want_human_review', label: 'Flag for human review' },
  ],
};

const ANSWERS: Array<{ value: BridgeFamilyVisitAnswer; label: string }> = [
  { value: 'yes', label: 'Yes' },
  { value: 'somewhat', label: 'Somewhat' },
  { value: 'no', label: 'No' },
  { value: 'not_sure', label: 'Not sure' },
];
const CONNECTIONS: Array<{ value: BridgeFamilyVisitConnection; label: string }> = [
  { value: 'closer', label: 'A little closer' },
  { value: 'same', label: 'About the same' },
  { value: 'more_distant', label: 'More distant' },
  { value: 'not_sure', label: 'Not sure' },
];
const SUPPORT: Array<{ value: BridgeFamilyVisitNextSupport; label: string }> = [
  { value: 'listen', label: 'Listening' },
  { value: 'space', label: 'Space' },
  { value: 'reassurance', label: 'Reassurance' },
  { value: 'clear_plan', label: 'A clear plan' },
  { value: 'human_follow_up', label: 'Human follow-up' },
  { value: 'none', label: 'Nothing specific' },
  { value: 'not_sure', label: 'Not sure' },
];
const REVIEW_SIGNALS: Array<{ value: BridgeFamilyVisitReviewSignal; label: string }> = [
  { value: 'no_concern_observed', label: 'Supportive signals' },
  { value: 'mixed', label: 'Mixed signals' },
  { value: 'needs_human_review', label: 'Needs human review' },
  { value: 'insufficient_evidence', label: 'Not enough evidence' },
];

function activeAssignment(bundle: BridgeFamilyVisitBundle): BridgeFamilyVisitAssignment | null {
  return bundle.assignments.find((assignment) => assignment.status === 'active') ?? bundle.assignments[0] ?? null;
}

function sessionForAssignment(bundle: BridgeFamilyVisitBundle, assignment: BridgeFamilyVisitAssignment | null): BridgeFamilyVisitSession | null {
  if (!assignment) return null;
  return bundle.sessions.find((session) => session.assignmentId === assignment.id) ?? null;
}

function roleAcknowledged(session: BridgeFamilyVisitSession, role: BridgeFamilyVisitRole): boolean {
  if (role === 'teen') return Boolean(session.teenAcknowledgedAt);
  if (role === 'parent') return Boolean(session.parentAcknowledgedAt);
  return Boolean(session.professionalAcknowledgedAt);
}

function EvidenceList({ items }: { items: BridgeFamilyVisitEvidenceItem[] }) {
  if (items.length === 0) return <Text style={styles.muted}>No reliable signal to show here.</Text>;
  return (
    <View style={styles.list}>
      {items.map((item, index) => (
        <View key={`${item.classification}-${index}`} style={styles.evidenceRow}>
          <Text style={styles.evidenceTag}>{item.classification.replace('_', ' ')}</Text>
          <Text style={styles.bodyText}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

function ParentSummaryCard({ summary, teenTransparency = false }: { summary: BridgeParentVisitSummary; teenTransparency?: boolean }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.eyebrow}>{teenTransparency ? 'WHAT YOUR PARENT CAN SEE' : 'PARENT /HUMAN SUMMARY'}</Text>
      <Text style={styles.sectionTitle}>How this visit may have landed</Text>
      <EvidenceList items={summary.childExperience} />
      <Text style={styles.subheading}>Connection moments</Text>
      <EvidenceList items={summary.connectionMoments} />
      <Text style={styles.subheading}>What could help next time</Text>
      {summary.nextTime.map((item, index) => <Text key={index} style={styles.bullet}>• {item}</Text>)}
      <Text style={styles.uncertainty}>{summary.uncertainty}</Text>
      <Text style={styles.limitations}>{summary.limitations}</Text>
    </View>
  );
}

function ProfessionalSummaryCard({ summary, teenTransparency = false }: { summary: BridgeProfessionalVisitSummary; teenTransparency?: boolean }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.eyebrow}>{teenTransparency ? 'WHAT THE PROFESSIONAL CAN SEE' : 'PROFESSIONAL /HUMAN SUMMARY'}</Text>
      <View style={styles.dispositionPill}><Text style={styles.dispositionText}>{summary.disposition.replaceAll('_', ' ')}</Text></View>
      <Text style={styles.subheading}>Interaction patterns</Text>
      <EvidenceList items={summary.interactionPatterns} />
      <Text style={styles.subheading}>Child-centered signals</Text>
      <EvidenceList items={summary.childCenteredSignals} />
      <Text style={styles.subheading}>Human review</Text>
      <EvidenceList items={summary.humanReview} />
      <Text style={styles.uncertainty}>{summary.uncertainty}</Text>
      <Text style={styles.limitations}>{summary.limitations}</Text>
    </View>
  );
}

function ChoiceRow<T extends string>({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      <Text style={styles.question}>{title}</Text>
      <View style={styles.chipWrap}>
        {options.map((option) => (
          <Pressable
            key={option.value}
            onPress={() => onSelect(option.value)}
            style={[styles.chip, selected === option.value && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selected === option.value && styles.chipTextSelected]}>{option.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function BridgeFamilyVisitScreen() {
  const [bundle, setBundle] = useState<BridgeFamilyVisitBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [feltHeard, setFeltHeard] = useState<BridgeFamilyVisitAnswer>('not_sure');
  const [feltComfortable, setFeltComfortable] = useState<BridgeFamilyVisitAnswer>('not_sure');
  const [couldPause, setCouldPause] = useState<BridgeFamilyVisitAnswer>('not_sure');
  const [connectionAfter, setConnectionAfter] = useState<BridgeFamilyVisitConnection>('not_sure');
  const [nextSupport, setNextSupport] = useState<BridgeFamilyVisitNextSupport>('not_sure');
  const [reviewSignal, setReviewSignal] = useState<BridgeFamilyVisitReviewSignal>('insufficient_evidence');

  const refresh = useCallback(async () => {
    const result = await fetchBridgeFamilyVisitBundle();
    if (result.ok && result.value) {
      setBundle(result.value);
      setStatus(null);
    } else {
      setStatus(result.message ?? 'Family Visit Mode is not available yet.');
    }
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const assignment = useMemo(() => bundle ? activeAssignment(bundle) : null, [bundle]);
  const session = useMemo(() => bundle ? sessionForAssignment(bundle, assignment) : null, [bundle, assignment]);
  const role = assignment?.role ?? null;

  const run = useCallback(async (action: () => Promise<{ ok: boolean; message?: string }>, successMessage: string) => {
    setWorking(true);
    setStatus(null);
    try {
      const result = await action();
      if (!result.ok) setStatus(result.message ?? 'That action is not available right now.');
      else {
        setStatus(successMessage);
        await refresh();
      }
    } finally {
      setWorking(false);
    }
  }, [refresh]);

  const summaries = useMemo(() => {
    if (!bundle || !session) return [];
    return bundle.summaries.filter((summary) => summary.sessionId === session.id);
  }, [bundle, session]);

  const parentSummary = summaries.find((summary) => summary.audience === 'parent')?.content as BridgeParentVisitSummary | undefined;
  const professionalSummary = summaries.find((summary) => summary.audience === 'professional')?.content as BridgeProfessionalVisitSummary | undefined;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /><Text style={styles.muted}>Opening Family Visit Mode…</Text></View>;
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><Text style={styles.backText}>‹ Back</Text></Pressable>
        <Text style={styles.brand}>Se’kret Bridge</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>FAMILY VISIT MODE</Text>
        <Text style={styles.title}>A visit support space, not surveillance.</Text>
        <Text style={styles.heroText}>Se’kret is not recording. This session only uses the moments and reflections participants choose to add.</Text>
      </View>

      <View style={styles.privacyCard}>
        <Text style={styles.privacyTitle}>🔐 What this mode never does</Text>
        <Text style={styles.privacyLine}>• No hidden microphone, camera, transcript, or background listening.</Text>
        <Text style={styles.privacyLine}>• No secret parent score, custody decision, diagnosis, or courtroom verdict.</Text>
        <Text style={styles.privacyLine}>• Parent and professional summaries are different and private from each other.</Text>
        <Text style={styles.privacyLine}>• The child can see both summaries Se’kret produced.</Text>
      </View>

      {status ? <View style={styles.statusCard}><Text style={styles.statusText}>{status}</Text></View> : null}

      {!assignment ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>No Family Visit assignment</Text>
          <Text style={styles.bodyText}>
            {bundle?.capability?.verificationStatus === 'verified'
              ? 'Your professional access is verified, but no child-parent visit has been assigned to you. You cannot create your own case assignment.'
              : 'Family Visit Mode only appears when a verified assignment has been created for this account.'}
          </Text>
        </View>
      ) : null}

      {assignment && !session && role === 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ready to invite everyone into the session?</Text>
          <Text style={styles.bodyText}>Starting creates a visible waiting room. Nothing becomes active until the child, parent, and you each acknowledge the same no-recording notice.</Text>
          <Pressable
            disabled={working}
            style={[styles.primaryButton, working && styles.disabled]}
            onPress={() => void run(() => startBridgeFamilyVisitSession(assignment.id), 'Waiting for everyone to acknowledge the visit.')}
          >
            <Text style={styles.primaryText}>Start visible visit check-in</Text>
          </Pressable>
        </View>
      ) : null}

      {assignment && !session && role !== 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>No visit session is open</Text>
          <Text style={styles.bodyText}>The assigned professional can open a visible session. You will be asked before anything starts.</Text>
        </View>
      ) : null}

      {session?.state === 'awaiting_ack' && role ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Everyone knows before it starts</Text>
          <Text style={styles.bodyText}>By joining, you are agreeing only to a structured reflection session. Se’kret will not record the room.</Text>
          <View style={styles.ackGrid}>
            <Text style={styles.ackLine}>Child {session.teenAcknowledgedAt ? '✓' : '…'}</Text>
            <Text style={styles.ackLine}>Parent {session.parentAcknowledgedAt ? '✓' : '…'}</Text>
            <Text style={styles.ackLine}>Professional {session.professionalAcknowledgedAt ? '✓' : '…'}</Text>
          </View>
          {!roleAcknowledged(session, role) ? (
            <Pressable disabled={working} style={[styles.primaryButton, working && styles.disabled]} onPress={() => void run(() => acknowledgeBridgeFamilyVisitSession(session.id), 'Your acknowledgement is saved.')}>
              <Text style={styles.primaryText}>I understand & join</Text>
            </Pressable>
          ) : <Text style={styles.success}>✓ You acknowledged this session.</Text>}
          <Pressable disabled={working} style={styles.secondaryButton} onPress={() => void run(() => declineBridgeFamilyVisitSession(session.id), 'This Family Visit session was stopped.')}>
            <Text style={styles.secondaryText}>Not now / stop this session</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'active' && role ? (
        <View style={styles.card}>
          <Text style={styles.liveBadge}>VISIBLE SESSION • NO RECORDING</Text>
          <Text style={styles.sectionTitle}>Tap only when you want to mark a moment.</Text>
          <Text style={styles.bodyText}>These are participant-chosen signals, not Se’kret watching the room.</Text>
          <View style={styles.markerGrid}>
            {MARKERS[role].map((marker) => (
              <Pressable
                key={marker.key}
                disabled={working}
                onPress={() => void run(() => recordBridgeFamilyVisitMarker(session.id, marker.key), 'Moment saved privately as a structured signal.')}
                style={styles.markerButton}
              >
                <Text style={styles.markerText}>{marker.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable disabled={working} style={styles.primaryButton} onPress={() => void run(() => endBridgeFamilyVisitSession(session.id), 'The visit is closed. Reflection is ready.')}>
            <Text style={styles.primaryText}>End visit & reflect</Text>
          </Pressable>
          <Pressable disabled={working} style={styles.secondaryButton} onPress={() => void run(() => declineBridgeFamilyVisitSession(session.id), 'This Family Visit session was stopped.')}>
            <Text style={styles.secondaryText}>Stop without continuing</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'reflection' && role && role !== 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your private structured reflection</Text>
          <Text style={styles.bodyText}>No essay needed. Your raw choices are not shown to the other audience accounts.</Text>
          <ChoiceRow title="Did you feel heard?" options={ANSWERS} selected={feltHeard} onSelect={setFeltHeard} />
          <ChoiceRow title="Did you feel comfortable enough to be yourself?" options={ANSWERS} selected={feltComfortable} onSelect={setFeltComfortable} />
          <ChoiceRow title="Could you ask for a pause?" options={ANSWERS} selected={couldPause} onSelect={setCouldPause} />
          <ChoiceRow title="How did the connection feel afterward?" options={CONNECTIONS} selected={connectionAfter} onSelect={setConnectionAfter} />
          <ChoiceRow title="What would help next time?" options={SUPPORT} selected={nextSupport} onSelect={setNextSupport} />
          <Pressable
            disabled={working}
            style={[styles.primaryButton, working && styles.disabled]}
            onPress={() => void run(
              () => submitBridgeFamilyVisitParticipantReflection(session.id, { feltHeard, feltComfortable, couldPause, connectionAfter, nextSupport }),
              'Your reflection is saved. Only Se’kret’s audience-safe summary can cross accounts.',
            )}
          >
            <Text style={styles.primaryText}>Save my reflection</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'reflection' && role === 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Professional structured reflection</Text>
          <Text style={styles.bodyText}>Choose a routing signal, not a legal finding. Se’kret will keep uncertainty visible.</Text>
          <ChoiceRow title="How should this encounter be routed for human attention?" options={REVIEW_SIGNALS} selected={reviewSignal} onSelect={setReviewSignal} />
          <Pressable disabled={working} style={styles.secondaryButton} onPress={() => void run(() => submitBridgeFamilyVisitProfessionalReflection(session.id, reviewSignal), 'Professional reflection saved.')}>
            <Text style={styles.secondaryText}>Save professional reflection</Text>
          </Pressable>
          <Pressable disabled={working} style={[styles.primaryButton, working && styles.disabled]} onPress={() => void run(() => generateBridgeFamilyVisitHumanSummaries(session.id), 'Se’kret prepared the audience-specific /human summaries.')}>
            <Text style={styles.primaryText}>Prepare /human summaries</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'ready' && role ? (
        <View style={styles.summaryStack}>
          <Text style={styles.sectionTitle}>Visit reflections</Text>
          {role === 'parent' && parentSummary ? <ParentSummaryCard summary={parentSummary} /> : null}
          {role === 'professional' && professionalSummary ? <ProfessionalSummaryCard summary={professionalSummary} /> : null}
          {role === 'teen' && parentSummary ? <ParentSummaryCard summary={parentSummary} teenTransparency /> : null}
          {role === 'teen' && professionalSummary ? <ProfessionalSummaryCard summary={professionalSummary} teenTransparency /> : null}
          {!parentSummary && !professionalSummary ? <Text style={styles.muted}>The summaries are still being prepared.</Text> : null}
        </View>
      ) : null}

      {session && ['declined', 'revoked', 'expired'].includes(session.state) ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>This session is closed</Text>
          <Text style={styles.bodyText}>No new sharing can happen through this session.</Text>
        </View>
      ) : null}

      <View style={styles.footerCard}>
        <Text style={styles.footerText}>Se’kret supports reflection. It does not secretly record, investigate, diagnose, or decide custody.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0d0715' },
  container: { padding: 20, paddingBottom: 56, gap: 16, maxWidth: 760, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#0d0715' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { paddingVertical: 10, paddingRight: 18 },
  backText: { color: '#d8c8ff', fontSize: 16, fontWeight: '700' },
  brand: { color: '#f6f1ff', fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
  hero: { paddingVertical: 18, gap: 8 },
  eyebrow: { color: '#bda5ff', fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: '#fff', fontSize: 30, lineHeight: 36, fontWeight: '900' },
  heroText: { color: '#ddd2ee', fontSize: 16, lineHeight: 24 },
  privacyCard: { backgroundColor: '#191026', borderWidth: 1, borderColor: '#563f75', borderRadius: 20, padding: 18, gap: 8 },
  privacyTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  privacyLine: { color: '#d6cae6', fontSize: 14, lineHeight: 21 },
  statusCard: { backgroundColor: '#21152f', borderRadius: 14, padding: 12 },
  statusText: { color: '#eadfff', fontSize: 13, lineHeight: 19 },
  card: { backgroundColor: '#171020', borderWidth: 1, borderColor: '#332541', borderRadius: 20, padding: 18, gap: 14 },
  sectionTitle: { color: '#fff', fontSize: 21, fontWeight: '900' },
  subheading: { color: '#f2eaff', fontSize: 15, fontWeight: '800', marginTop: 10 },
  bodyText: { color: '#d8cede', fontSize: 14, lineHeight: 21, flex: 1 },
  muted: { color: '#a99eb5', fontSize: 14, lineHeight: 20 },
  primaryButton: { backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#5c4771', borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center' },
  secondaryText: { color: '#ded1ee', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.55 },
  success: { color: '#b9fbc0', fontSize: 14, fontWeight: '700' },
  ackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ackLine: { color: '#e8ddf5', backgroundColor: '#241832', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  liveBadge: { color: '#ffd166', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  markerGrid: { gap: 8 },
  markerButton: { backgroundColor: '#241832', borderWidth: 1, borderColor: '#4b3861', borderRadius: 13, padding: 13 },
  markerText: { color: '#f1e9fa', fontSize: 14, fontWeight: '700' },
  choiceGroup: { gap: 8 },
  question: { color: '#f4ecff', fontSize: 14, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { paddingHorizontal: 11, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#49375c', backgroundColor: '#20162a' },
  chipSelected: { backgroundColor: '#7c3aed', borderColor: '#a78bfa' },
  chipText: { color: '#cfc2db', fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#fff' },
  summaryStack: { gap: 14 },
  summaryCard: { backgroundColor: '#15101c', borderWidth: 1, borderColor: '#49375c', borderRadius: 20, padding: 18, gap: 10 },
  list: { gap: 8 },
  evidenceRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  evidenceTag: { color: '#b8a3d6', fontSize: 9, fontWeight: '900', letterSpacing: 0.7, width: 74, paddingTop: 3 },
  bullet: { color: '#ded4e9', fontSize: 14, lineHeight: 21 },
  uncertainty: { color: '#c6b8d6', fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: 6 },
  limitations: { color: '#9d91aa', fontSize: 11, lineHeight: 17, borderTopWidth: 1, borderTopColor: '#332541', paddingTop: 10 },
  dispositionPill: { alignSelf: 'flex-start', backgroundColor: '#2d2140', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  dispositionText: { color: '#d9c5ff', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  footerCard: { padding: 16, borderRadius: 16, backgroundColor: '#120c18' },
  footerText: { color: '#968b9f', fontSize: 11, lineHeight: 17, textAlign: 'center' },
});

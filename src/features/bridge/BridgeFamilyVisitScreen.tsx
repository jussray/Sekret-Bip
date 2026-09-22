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

import { GLOBAL_VIBE_TOKENS, VIBE_DESIGN_TOKENS } from '@constants/vibeDesignTokens';
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

const NIGHT = VIBE_DESIGN_TOKENS.night;
const CLOUD = VIBE_DESIGN_TOKENS.cloud;
const UI = GLOBAL_VIBE_TOKENS;

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

function PromiseSignal({ label, detail, tone }: { label: string; detail: string; tone: 'gold' | 'mint' | 'purple' }) {
  return (
    <View style={styles.promiseSignal}>
      <View
        style={[
          styles.promiseDot,
          tone === 'gold' && styles.promiseDotGold,
          tone === 'mint' && styles.promiseDotMint,
          tone === 'purple' && styles.promiseDotPurple,
        ]}
      />
      <View style={styles.promiseCopy}>
        <Text style={styles.promiseLabel}>{label}</Text>
        <Text style={styles.promiseDetail}>{detail}</Text>
      </View>
    </View>
  );
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
            accessibilityRole="button"
            accessibilityState={{ selected: selected === option.value }}
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
    return (
      <View style={styles.center}>
        <View style={styles.loadingHalo}><ActivityIndicator size="large" color={NIGHT.color.accentA} /></View>
        <Text style={styles.loadingTitle}>Opening a quiet space…</Text>
        <Text style={styles.muted}>Family Visit stays closed until the right people and permissions are present.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.brandPill}>
          <View style={styles.brandSpark} />
          <Text style={styles.brand}>Se’kret Bridge</Text>
        </View>
      </View>

      <View style={styles.heroShell}>
        <View pointerEvents="none" style={styles.heroGlowGold} />
        <View pointerEvents="none" style={styles.heroGlowMint} />
        <View style={styles.hero}>
          <View style={styles.bipModePill}>
            <Text style={styles.bipModeText}>✦ BIP • FAMILY VISIT</Text>
          </View>
          <Text style={styles.eyebrow}>FAMILY VISIT MODE</Text>
          <Text style={styles.title}>A visit support space, not surveillance.</Text>
          <Text style={styles.heroText}>Se’kret is not recording. This session only uses the moments and reflections participants choose to add.</Text>

          <View style={styles.promiseRail}>
            <PromiseSignal tone="gold" label="YOU CHOOSE" detail="what gets added" />
            <PromiseSignal tone="mint" label="NO CAPTURE" detail="the room stays unrecorded" />
            <PromiseSignal tone="purple" label="VISIBLE" detail="the same notice is shown first" />
          </View>
        </View>
      </View>

      <View style={styles.privacyCard}>
        <View style={styles.privacyKickerRow}>
          <View style={styles.privacyShield}><Text style={styles.privacyShieldText}>B</Text></View>
          <View style={styles.privacyHeadingCopy}>
            <Text style={styles.privacyKicker}>BIP PRIVACY PROMISE</Text>
            <Text style={styles.privacyTitle}>🔐 What this mode never does</Text>
          </View>
        </View>
        <View style={styles.privacyRules}>
          <Text style={styles.privacyLine}>• No hidden microphone, camera, transcript, or background listening.</Text>
          <Text style={styles.privacyLine}>• No secret parent score, custody decision, diagnosis, or courtroom verdict.</Text>
          <Text style={styles.privacyLine}>• Parent and professional summaries are different and private from each other.</Text>
          <Text style={styles.privacyLine}>• The child can see both summaries Se’kret produced.</Text>
        </View>
        <Text style={styles.privacyFoot}>Your choices create the signal. The room itself is not the data.</Text>
      </View>

      {status ? (
        <View style={styles.statusCard}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}

      {!assignment ? (
        <View style={[styles.card, styles.emptyStateCard]}>
          <View style={styles.cardKickerRow}>
            <View style={styles.moonDot} />
            <Text style={styles.cardKicker}>QUIET UNTIL IT’S NEEDED</Text>
          </View>
          <Text style={styles.sectionTitle}>No Family Visit assignment</Text>
          <Text style={styles.bodyText}>
            {bundle?.capability?.verificationStatus === 'verified'
              ? 'Your professional access is verified, but no child-parent visit has been assigned to you. You cannot create your own case assignment.'
              : 'Family Visit Mode only appears when a verified assignment has been created for this account.'}
          </Text>
          <View style={styles.waitingNote}>
            <Text style={styles.waitingNoteTitle}>Nothing is listening while you wait.</Text>
            <Text style={styles.waitingNoteText}>When an authorized visit opens, everyone sees the same privacy promise before anything can begin.</Text>
          </View>
        </View>
      ) : null}

      {assignment && !session && role === 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>VISIBLE START</Text>
          <Text style={styles.sectionTitle}>Ready to invite everyone into the session?</Text>
          <Text style={styles.bodyText}>Starting creates a visible waiting room. Nothing becomes active until the child, parent, and you each acknowledge the same no-recording notice.</Text>
          <Pressable
            accessibilityRole="button"
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
          <Text style={styles.cardKicker}>YOU’LL BE ASKED FIRST</Text>
          <Text style={styles.sectionTitle}>No visit session is open</Text>
          <Text style={styles.bodyText}>The assigned professional can open a visible session. You will be asked before anything starts.</Text>
        </View>
      ) : null}

      {session?.state === 'awaiting_ack' && role ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>EVERYONE SEES THE SAME PROMISE</Text>
          <Text style={styles.sectionTitle}>Everyone knows before it starts</Text>
          <Text style={styles.bodyText}>By joining, you are agreeing only to a structured reflection session. Se’kret will not record the room.</Text>
          <View style={styles.ackGrid}>
            <Text style={styles.ackLine}>Child {session.teenAcknowledgedAt ? '✓' : '…'}</Text>
            <Text style={styles.ackLine}>Parent {session.parentAcknowledgedAt ? '✓' : '…'}</Text>
            <Text style={styles.ackLine}>Professional {session.professionalAcknowledgedAt ? '✓' : '…'}</Text>
          </View>
          {!roleAcknowledged(session, role) ? (
            <Pressable accessibilityRole="button" disabled={working} style={[styles.primaryButton, working && styles.disabled]} onPress={() => void run(() => acknowledgeBridgeFamilyVisitSession(session.id), 'Your acknowledgement is saved.')}>
              <Text style={styles.primaryText}>I understand & join</Text>
            </Pressable>
          ) : <Text style={styles.success}>✓ You acknowledged this session.</Text>}
          <Pressable accessibilityRole="button" disabled={working} style={styles.secondaryButton} onPress={() => void run(() => declineBridgeFamilyVisitSession(session.id), 'This Family Visit session was stopped.')}>
            <Text style={styles.secondaryText}>Not now / stop this session</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'active' && role ? (
        <View style={[styles.card, styles.activeCard]}>
          <View style={styles.liveBadgePill}><Text style={styles.liveBadge}>VISIBLE SESSION • NO RECORDING</Text></View>
          <Text style={styles.sectionTitle}>Tap only when you want to mark a moment.</Text>
          <Text style={styles.bodyText}>These are participant-chosen signals, not Se’kret watching the room.</Text>
          <View style={styles.markerGrid}>
            {MARKERS[role].map((marker) => (
              <Pressable
                accessibilityRole="button"
                key={marker.key}
                disabled={working}
                onPress={() => void run(() => recordBridgeFamilyVisitMarker(session.id, marker.key), 'Moment saved privately as a structured signal.')}
                style={styles.markerButton}
              >
                <View style={styles.markerDot} />
                <Text style={styles.markerText}>{marker.label}</Text>
              </Pressable>
            ))}
          </View>
          <Pressable accessibilityRole="button" disabled={working} style={styles.primaryButton} onPress={() => void run(() => endBridgeFamilyVisitSession(session.id), 'The visit is closed. Reflection is ready.')}>
            <Text style={styles.primaryText}>End visit & reflect</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={working} style={styles.secondaryButton} onPress={() => void run(() => declineBridgeFamilyVisitSession(session.id), 'This Family Visit session was stopped.')}>
            <Text style={styles.secondaryText}>Stop without continuing</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'reflection' && role && role !== 'professional' ? (
        <View style={styles.card}>
          <Text style={styles.cardKicker}>YOUR CHOICES STAY STRUCTURED</Text>
          <Text style={styles.sectionTitle}>Your private structured reflection</Text>
          <Text style={styles.bodyText}>No essay needed. Your raw choices are not shown to the other audience accounts.</Text>
          <ChoiceRow title="Did you feel heard?" options={ANSWERS} selected={feltHeard} onSelect={setFeltHeard} />
          <ChoiceRow title="Did you feel comfortable enough to be yourself?" options={ANSWERS} selected={feltComfortable} onSelect={setFeltComfortable} />
          <ChoiceRow title="Could you ask for a pause?" options={ANSWERS} selected={couldPause} onSelect={setCouldPause} />
          <ChoiceRow title="How did the connection feel afterward?" options={CONNECTIONS} selected={connectionAfter} onSelect={setConnectionAfter} />
          <ChoiceRow title="What would help next time?" options={SUPPORT} selected={nextSupport} onSelect={setNextSupport} />
          <Pressable
            accessibilityRole="button"
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
          <Text style={styles.cardKicker}>ROUTE, DON’T JUDGE</Text>
          <Text style={styles.sectionTitle}>Professional structured reflection</Text>
          <Text style={styles.bodyText}>Choose a routing signal, not a legal finding. Se’kret will keep uncertainty visible.</Text>
          <ChoiceRow title="How should this encounter be routed for human attention?" options={REVIEW_SIGNALS} selected={reviewSignal} onSelect={setReviewSignal} />
          <Pressable accessibilityRole="button" disabled={working} style={styles.secondaryButton} onPress={() => void run(() => submitBridgeFamilyVisitProfessionalReflection(session.id, reviewSignal), 'Professional reflection saved.')}>
            <Text style={styles.secondaryText}>Save professional reflection</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={working} style={[styles.primaryButton, working && styles.disabled]} onPress={() => void run(() => generateBridgeFamilyVisitHumanSummaries(session.id), 'Se’kret prepared the audience-specific /human summaries.')}>
            <Text style={styles.primaryText}>Prepare /human summaries</Text>
          </Pressable>
        </View>
      ) : null}

      {session?.state === 'ready' && role ? (
        <View style={styles.summaryStack}>
          <Text style={styles.cardKicker}>WHAT CROSSES ACCOUNTS IS VISIBLE</Text>
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
          <Text style={styles.cardKicker}>CLOSED MEANS CLOSED</Text>
          <Text style={styles.sectionTitle}>This session is closed</Text>
          <Text style={styles.bodyText}>No new sharing can happen through this session.</Text>
        </View>
      ) : null}

      <View style={styles.footerCard}>
        <View style={styles.footerMark}><Text style={styles.footerMarkText}>✦</Text></View>
        <Text style={styles.footerText}>Se’kret supports reflection. It does not secretly record, investigate, diagnose, or decide custody.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B0713' },
  container: {
    paddingHorizontal: UI.layout.contentPaddingH,
    paddingTop: 14,
    paddingBottom: 64,
    gap: 16,
    maxWidth: 760,
    width: '100%',
    alignSelf: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 32,
    backgroundColor: '#0B0713',
  },
  loadingHalo: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: NIGHT.color.card,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.28)',
  },
  loadingTitle: { color: NIGHT.color.textHigh, fontSize: 18, fontWeight: '800' },
  headerRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { minHeight: 44, justifyContent: 'center', paddingRight: 18 },
  backText: { color: '#D9C8FF', fontSize: 16, fontWeight: '700' },
  brandPill: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: UI.radius.pill,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(42,36,64,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,238,0.08)',
  },
  brandSpark: { width: 7, height: 7, borderRadius: 4, backgroundColor: NIGHT.color.accentA },
  brand: { color: NIGHT.color.textHigh, fontSize: 12, fontWeight: '800', letterSpacing: 0.7 },
  heroShell: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 30,
    backgroundColor: '#181126',
    borderWidth: 1,
    borderColor: 'rgba(189,165,255,0.24)',
  },
  heroGlowGold: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    right: -95,
    top: -70,
    backgroundColor: 'rgba(255,209,102,0.11)',
  },
  heroGlowMint: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -100,
    bottom: -100,
    backgroundColor: 'rgba(168,230,207,0.08)',
  },
  hero: { padding: 22, gap: 10 },
  bipModePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: UI.radius.pill,
    backgroundColor: 'rgba(255,209,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.24)',
  },
  bipModeText: { color: NIGHT.color.accentA, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  eyebrow: { color: '#BDA5FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.3 },
  title: { color: NIGHT.color.textHigh, fontSize: 31, lineHeight: 37, fontWeight: '900', letterSpacing: -0.5 },
  heroText: { color: '#DDD2EE', fontSize: 16, lineHeight: 24, maxWidth: 620 },
  promiseRail: { gap: 9, marginTop: 8 },
  promiseSignal: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: 'rgba(11,7,19,0.46)',
    borderWidth: 1,
    borderColor: 'rgba(255,248,238,0.06)',
  },
  promiseDot: { width: 10, height: 10, borderRadius: 5 },
  promiseDotGold: { backgroundColor: NIGHT.color.accentA },
  promiseDotMint: { backgroundColor: CLOUD.color.accentA },
  promiseDotPurple: { backgroundColor: '#BDA5FF' },
  promiseCopy: { flex: 1, gap: 1 },
  promiseLabel: { color: '#FFF8EE', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  promiseDetail: { color: '#BFB3CC', fontSize: 12, lineHeight: 17 },
  privacyCard: {
    backgroundColor: '#15101F',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.26)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  privacyKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  privacyShield: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,230,207,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(168,230,207,0.26)',
  },
  privacyShieldText: { color: CLOUD.color.accentA, fontSize: 16, fontWeight: '900' },
  privacyHeadingCopy: { flex: 1, gap: 3 },
  privacyKicker: { color: CLOUD.color.accentA, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  privacyTitle: { color: NIGHT.color.textHigh, fontSize: 17, fontWeight: '800' },
  privacyRules: { gap: 10 },
  privacyLine: { color: '#D7CBDF', fontSize: 14, lineHeight: 21 },
  privacyFoot: {
    color: '#AFA4B8',
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,248,238,0.07)',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#21152F',
    borderRadius: 16,
    padding: 13,
    borderWidth: 1,
    borderColor: 'rgba(189,165,255,0.16)',
  },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BDA5FF' },
  statusText: { flex: 1, color: '#EADFFF', fontSize: 13, lineHeight: 19 },
  card: {
    backgroundColor: '#15101F',
    borderWidth: 1,
    borderColor: 'rgba(189,165,255,0.15)',
    borderRadius: 24,
    padding: 18,
    gap: 14,
  },
  emptyStateCard: { borderColor: 'rgba(255,209,102,0.16)' },
  activeCard: { borderColor: 'rgba(255,209,102,0.28)' },
  cardKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardKicker: { color: '#BDA5FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.15 },
  moonDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: NIGHT.color.accentA },
  sectionTitle: { color: NIGHT.color.textHigh, fontSize: 21, lineHeight: 27, fontWeight: '900' },
  subheading: { color: '#F2EAFF', fontSize: 15, fontWeight: '800', marginTop: 10 },
  bodyText: { color: '#D8CEDE', fontSize: 14, lineHeight: 21, flex: 1 },
  muted: { color: '#A99EB5', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  waitingNote: {
    padding: 14,
    gap: 4,
    borderRadius: 16,
    backgroundColor: 'rgba(255,209,102,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.12)',
  },
  waitingNoteTitle: { color: '#FFF3C4', fontSize: 13, fontWeight: '800' },
  waitingNoteText: { color: '#BEB1C6', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 50,
    backgroundColor: NIGHT.color.accentA,
    borderRadius: UI.radius.pill,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: NIGHT.color.bg, fontSize: 15, fontWeight: '900' },
  secondaryButton: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.38)',
    borderRadius: UI.radius.pill,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42,36,64,0.46)',
  },
  secondaryText: { color: '#F5EBDD', fontSize: 14, fontWeight: '800' },
  disabled: { opacity: 0.5 },
  success: { color: CLOUD.color.accentA, fontSize: 14, fontWeight: '700' },
  ackGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ackLine: {
    color: '#E8DDF5',
    backgroundColor: NIGHT.color.card,
    borderWidth: 1,
    borderColor: 'rgba(255,248,238,0.07)',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: UI.radius.pill,
    fontSize: 12,
    fontWeight: '700',
  },
  liveBadgePill: {
    alignSelf: 'flex-start',
    borderRadius: UI.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,209,102,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,209,102,0.18)',
  },
  liveBadge: { color: NIGHT.color.accentA, fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  markerGrid: { gap: 9 },
  markerButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    backgroundColor: NIGHT.color.card,
    borderWidth: 1,
    borderColor: 'rgba(255,248,238,0.08)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  markerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#BDA5FF' },
  markerText: { flex: 1, color: '#F1E9FA', fontSize: 14, fontWeight: '700' },
  choiceGroup: { gap: 9 },
  question: { color: '#F4ECFF', fontSize: 14, fontWeight: '700' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: UI.radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(189,165,255,0.22)',
    backgroundColor: '#20162A',
  },
  chipSelected: { backgroundColor: '#4B3475', borderColor: '#BDA5FF' },
  chipText: { color: '#CFC2DB', fontSize: 12, fontWeight: '700' },
  chipTextSelected: { color: '#FFF' },
  summaryStack: { gap: 14 },
  summaryCard: {
    backgroundColor: '#15101C',
    borderWidth: 1,
    borderColor: 'rgba(189,165,255,0.18)',
    borderRadius: 24,
    padding: 18,
    gap: 10,
  },
  list: { gap: 8 },
  evidenceRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  evidenceTag: { color: '#B8A3D6', fontSize: 9, fontWeight: '900', letterSpacing: 0.7, width: 74, paddingTop: 3 },
  bullet: { color: '#DED4E9', fontSize: 14, lineHeight: 21 },
  uncertainty: { color: '#C6B8D6', fontSize: 13, lineHeight: 19, fontStyle: 'italic', marginTop: 6 },
  limitations: {
    color: '#9D91AA',
    fontSize: 11,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,248,238,0.07)',
    paddingTop: 10,
  },
  dispositionPill: { alignSelf: 'flex-start', backgroundColor: NIGHT.color.cardAlt, paddingHorizontal: 10, paddingVertical: 6, borderRadius: UI.radius.pill },
  dispositionText: { color: '#D9C5FF', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 16,
    borderRadius: 18,
    backgroundColor: '#100B17',
    borderWidth: 1,
    borderColor: 'rgba(255,248,238,0.05)',
  },
  footerMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(189,165,255,0.09)',
  },
  footerMarkText: { color: '#BDA5FF', fontSize: 12 },
  footerText: { flex: 1, color: '#968B9F', fontSize: 11, lineHeight: 17 },
});

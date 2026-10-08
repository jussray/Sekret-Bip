// app/(parent)/bip-jr-study.tsx
// Bip Jr Study Buddy, adult-supervised practice. Ported from
// jussray/bip-jr@cf773ff14c677b706e600437de6c779c3e9c37f2:app/(child)/study.tsx.
// Runs under the Parent account on the parent's device: no child account,
// no network call, and progress stays on this device.

import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import {
  getNextStudyMission,
  getStudyMissions,
  getSubjectCompletion,
  isCorrectStudyChoice,
} from '@/bipJr/study/curriculum';
import { STUDY_MODE_POLICIES, STUDY_SUBJECTS } from '@/bipJr/study/modes';
import { EMPTY_STUDY_PROGRESS, applyStudyAttempt } from '@/bipJr/study/progress';
import { loadStudyProgress, saveStudyProgress } from '@/bipJr/study/progressStore';
import type { ChildAgeBand, StudyMission, StudyProgressSnapshot, StudySubject } from '@/bipJr/study/types';

type Feedback = { kind: 'correct' | 'try_again'; text: string } | null;

const AGE_BANDS: Array<{ value: ChildAgeBand; label: string; accent: string; step: string }> = [
  { value: '5-7', label: 'Ages 5–7', accent: '#7dd3fc', step: 'One small step' },
  { value: '8-10', label: 'Ages 8–10', accent: '#bca7ff', step: 'Try it, then explain it' },
  { value: '11-12', label: 'Ages 11–12', accent: '#a7f3d0', step: 'Reason it through' },
];

export default function BipJrStudyRoute() {
  const [ageBand, setAgeBand] = useState<ChildAgeBand>('5-7');
  const [subject, setSubject] = useState<StudySubject>('math');
  const [progress, setProgress] = useState<StudyProgressSnapshot>(EMPTY_STUDY_PROGRESS);
  const [progressReady, setProgressReady] = useState(false);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [saveError, setSaveError] = useState('');

  const band = AGE_BANDS.find(item => item.value === ageBand) ?? AGE_BANDS[0];
  const missions = useMemo(() => getStudyMissions(ageBand, subject), [ageBand, subject]);

  useEffect(() => {
    let active = true;
    void loadStudyProgress()
      .then(stored => { if (active) setProgress(stored); })
      .catch(() => { if (active) setSaveError('Saved practice could not be read on this device. Practice still works.'); })
      .finally(() => { if (active) setProgressReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!progressReady) return;
    setActiveMissionId(getNextStudyMission(ageBand, subject, progress).id);
    resetAnswer();
    // Progress changes inside a mission must not jump to the next one.
  }, [ageBand, subject, progressReady]);

  const mission: StudyMission = missions.find(item => item.id === activeMissionId)
    ?? getNextStudyMission(ageBand, subject, progress);
  const completion = getSubjectCompletion(ageBand, subject, progress);

  function resetAnswer() {
    setSelectedChoice(null);
    setShowHint(false);
    setFeedback(null);
  }

  async function checkAnswer() {
    if (!selectedChoice || feedback?.kind === 'correct') return;
    const correct = isCorrectStudyChoice(mission, selectedChoice);
    const next = applyStudyAttempt(progress, mission.id, subject, correct);
    setProgress(next);
    if (correct) {
      setFeedback({ kind: 'correct', text: mission.explanation });
    } else {
      setShowHint(true);
      setFeedback({ kind: 'try_again', text: 'Not yet. Use the hint, then choose again.' });
    }
    try {
      await saveStudyProgress(next);
      setSaveError('');
    } catch {
      setSaveError('This answer was checked, but progress could not be saved on this device.');
    }
  }

  function nextMission() {
    setActiveMissionId(getNextStudyMission(ageBand, subject, progress).id);
    resetAnswer();
  }

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#0f0a21', '#17102c', '#0c1024']} style={StyleSheet.absoluteFill} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.eyebrow}>BIP JR · STUDY BUDDY</Text>
        <Text style={styles.title}>Learn together.{`\n`}Not a feed.</Text>

        <View testID="study-safety-banner" style={[styles.notice, { borderColor: `${band.accent}55`, backgroundColor: `${band.accent}20` }]}>
          <Text style={styles.noticeTitle}>Private scripted practice with you beside them.</Text>
          <Text style={styles.noticeBody}>
            Study Buddy is a computer helper with reviewed lessons. It sends nothing to an AI service and has no classmates, profiles, followers, DMs, or public posts. Progress is saved on this device only.
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Age range</Text>
        <View style={styles.ageRow}>
          {AGE_BANDS.map(option => (
            <TouchableOpacity
              key={option.value}
              testID={`study-age-${option.value}`}
              accessibilityRole="button"
              accessibilityState={{ selected: ageBand === option.value }}
              onPress={() => setAgeBand(option.value)}
              style={[styles.ageChip, ageBand === option.value && { borderColor: option.accent, backgroundColor: `${option.accent}20` }]}
            >
              <Text style={[styles.ageText, ageBand === option.value && { color: option.accent }]}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Choose a subject</Text>
        <View style={styles.subjectGrid}>
          {STUDY_SUBJECTS.map(item => (
            <TouchableOpacity
              key={item.id}
              testID={`study-subject-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: subject === item.id }}
              onPress={() => { setSubject(item.id); setActiveMissionId(null); }}
              style={[styles.subject, subject === item.id && { borderColor: band.accent, backgroundColor: `${band.accent}20` }]}
            >
              <Text style={styles.subjectEmoji}>{item.emoji}</Text>
              <Text style={styles.subjectLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View testID="study-progress" style={styles.progressRow}>
          <Text style={styles.progressLabel}>{completion.completed} of {completion.total} finished</Text>
          <View style={styles.dots}>
            {missions.map(item => (
              <View
                key={item.id}
                style={[styles.dot, progress.completedMissionIds.includes(item.id) && { backgroundColor: band.accent, borderColor: band.accent }]}
              />
            ))}
          </View>
        </View>

        <View testID="study-mission" style={styles.mission}>
          <Text style={[styles.missionKicker, { color: band.accent }]}>
            {band.step.toUpperCase()} · {mission.level === 'warm_up' ? 'WARM-UP' : 'PRACTICE'}
          </Text>
          <Text style={styles.missionTitle}>{mission.title}</Text>
          <Text style={styles.goal}>Goal: {mission.goal}</Text>
          <Text style={styles.missionPrompt}>{mission.prompt}</Text>

          <View style={styles.choices}>
            {mission.choices.map(choice => {
              const selected = selectedChoice === choice.id;
              return (
                <TouchableOpacity
                  key={choice.id}
                  testID={`study-choice-${choice.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    if (feedback?.kind === 'correct') return;
                    setSelectedChoice(choice.id);
                    setFeedback(null);
                  }}
                  style={[styles.choice, selected && { borderColor: band.accent, backgroundColor: `${band.accent}20` }]}
                >
                  <Text style={[styles.choiceText, selected && { color: band.accent }]}>{choice.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {showHint ? <Text testID="study-hint" style={styles.hint}>Hint: {mission.hint}</Text> : null}
          {feedback ? (
            <View
              testID={`study-feedback-${feedback.kind}`}
              style={[styles.feedback, feedback.kind === 'correct' ? styles.feedbackCorrect : styles.feedbackTry]}
            >
              <Text style={styles.feedbackText}>{feedback.text}</Text>
            </View>
          ) : null}
          {saveError ? <Text testID="study-save-error" style={styles.saveError} accessibilityRole="alert">{saveError}</Text> : null}

          {feedback?.kind === 'correct' ? (
            <>
              <View style={styles.offlineBox}>
                <Text style={styles.offlineTitle}>Finish away from the screen</Text>
                <Text style={styles.offlineBody}>{mission.offlineFinish}</Text>
              </View>
              <TouchableOpacity
                testID="study-next-button"
                accessibilityRole="button"
                onPress={nextMission}
                style={[styles.primaryButton, { backgroundColor: band.accent }]}
              >
                <Text style={styles.primaryButtonText}>Next small step →</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                testID="study-check-button"
                accessibilityRole="button"
                disabled={!selectedChoice}
                onPress={() => void checkAnswer()}
                style={[styles.primaryButton, { backgroundColor: band.accent }, !selectedChoice && styles.disabled]}
              >
                <Text style={styles.primaryButtonText}>Check my thinking</Text>
              </TouchableOpacity>
              <TouchableOpacity testID="study-hint-button" accessibilityRole="button" onPress={() => setShowHint(true)} style={styles.hintButton}>
                <Text style={styles.hintButtonText}>{showHint ? 'Hint is open ✓' : 'Give me one hint'}</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>How study modes work</Text>
        {STUDY_MODE_POLICIES.map(policy => (
          <View key={policy.mode} testID={`study-mode-${policy.mode}`} style={styles.policy}>
            <Text style={styles.policyTitle}>
              {policy.mode === 'solo_ai' ? 'Computer Study Buddy' : policy.mode === 'adult_mission' ? 'Grown-up mission' : 'Classroom activity'}
              {!policy.enabledInPrototype ? ' · LOCKED' : ''}
            </Text>
            <Text style={styles.policyBody}>{policy.description}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0a21' },
  content: { paddingHorizontal: 22, paddingTop: 104, paddingBottom: 110, gap: 14, maxWidth: 720, width: '100%', alignSelf: 'center' },
  eyebrow: { color: '#bca7ff', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 32, lineHeight: 38, fontWeight: '900', marginBottom: 8 },
  notice: { borderRadius: 24, padding: 18, borderWidth: 1 },
  noticeTitle: { color: '#fff', fontSize: 16, fontWeight: '900', marginBottom: 6 },
  noticeBody: { color: '#c9c0dd', fontSize: 14, lineHeight: 21 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '900', marginTop: 8 },
  ageRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ageChip: { minHeight: 44, justifyContent: 'center', borderRadius: 999, paddingHorizontal: 16, backgroundColor: '#ffffff0a', borderWidth: 1.5, borderColor: '#ffffff18' },
  ageText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  subjectGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  subject: { width: '47%', minHeight: 80, borderRadius: 20, padding: 14, backgroundColor: '#ffffff0a', borderWidth: 1.5, borderColor: '#ffffff18' },
  subjectEmoji: { fontSize: 24, marginBottom: 6 },
  subjectLabel: { color: '#fff', fontSize: 14, fontWeight: '900' },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 18, padding: 14, backgroundColor: '#ffffff08' },
  progressLabel: { color: '#d9d2e8', fontSize: 13, fontWeight: '800' },
  dots: { flexDirection: 'row', gap: 7 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: '#ffffff44', backgroundColor: 'transparent' },
  mission: { borderRadius: 26, padding: 20, backgroundColor: '#ffffff0b', borderWidth: 1, borderColor: '#c9b8ff38' },
  missionKicker: { fontSize: 10, fontWeight: '900', letterSpacing: 1.4, marginBottom: 8 },
  missionTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginBottom: 6 },
  goal: { color: '#bdb4cf', fontSize: 13, fontWeight: '700', marginBottom: 14 },
  missionPrompt: { color: '#eee8ff', fontSize: 17, lineHeight: 25 },
  choices: { gap: 10, marginTop: 18 },
  choice: { minHeight: 52, justifyContent: 'center', borderRadius: 17, paddingHorizontal: 16, backgroundColor: '#ffffff08', borderWidth: 1.5, borderColor: '#ffffff18' },
  choiceText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  hint: { color: '#d9fff0', fontSize: 14, lineHeight: 21, marginTop: 14, padding: 13, borderRadius: 16, backgroundColor: '#6ee7b715' },
  feedback: { marginTop: 14, borderRadius: 16, padding: 14, borderWidth: 1 },
  feedbackCorrect: { backgroundColor: '#6ee7b715', borderColor: '#6ee7b755' },
  feedbackTry: { backgroundColor: '#fcd34d12', borderColor: '#fcd34d55' },
  feedbackText: { color: '#fff', fontSize: 14, lineHeight: 21, fontWeight: '700' },
  saveError: { color: '#fca5a5', fontSize: 13, lineHeight: 19, marginTop: 10 },
  primaryButton: { minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  primaryButtonText: { color: '#151026', fontSize: 14, fontWeight: '900' },
  disabled: { opacity: 0.35 },
  hintButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  hintButtonText: { color: '#bca7ff', fontSize: 13, fontWeight: '800' },
  offlineBox: { borderRadius: 17, padding: 14, backgroundColor: '#7dd3fc12', borderWidth: 1, borderColor: '#7dd3fc33', marginTop: 14 },
  offlineTitle: { color: '#dff6ff', fontSize: 13, fontWeight: '900', marginBottom: 5 },
  offlineBody: { color: '#b8dce9', fontSize: 13, lineHeight: 19 },
  policy: { borderRadius: 20, padding: 16, backgroundColor: '#ffffff08', borderWidth: 1, borderColor: '#ffffff14' },
  policyTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginBottom: 5 },
  policyBody: { color: '#bdb4cf', fontSize: 13, lineHeight: 19 },
});

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { BreathPhase, ResetTool, WorkoutRoutine } from './catalog';
import { breathDurationSeconds, guidedDurationSeconds, workoutDurationSeconds } from './catalog';

interface BaseFlowProps {
  theme: Record<string, any>;
  companionName: string;
  onExit: () => void;
}

interface GuidedResetFlowProps extends BaseFlowProps {
  tool: ResetTool;
  onComplete: (activeSeconds: number) => void;
}

interface BreathToolFlowProps extends BaseFlowProps {
  tool: ResetTool;
  onComplete: () => void;
}

interface BodyWorkoutFlowProps extends BaseFlowProps {
  routine: WorkoutRoutine;
  onComplete: (activeSeconds: number) => void;
}

type WorkoutPhase = 'ready' | 'work' | 'rest' | 'complete';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function accent(theme: Record<string, any>): string {
  return theme.accent ?? '#8B5CF6';
}

function FlowHeader({ onExit, right }: { onExit: () => void; right: string }) {
  return (
    <View style={styles.topRow}>
      <TouchableOpacity style={styles.backButton} onPress={onExit} accessibilityRole="button">
        <Text style={styles.backText}>← Exit</Text>
      </TouchableOpacity>
      <Text style={styles.counter}>{right}</Text>
    </View>
  );
}

function Progress({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(4, value * 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function Completion({
  theme,
  emoji,
  title,
  copy,
  onExit,
}: {
  theme: Record<string, any>;
  emoji: string;
  title: string;
  copy: string;
  onExit: () => void;
}) {
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background ?? '#10091F' }]}>
      <View style={styles.centered}>
        <Text style={styles.completeEmoji}>{emoji}</Text>
        <Text style={styles.completeTitle}>{title}</Text>
        <Text style={styles.completeCopy}>{copy}</Text>
        <TouchableOpacity style={[styles.primaryButton, { backgroundColor: accent(theme) }]} onPress={onExit}>
          <Text style={styles.primaryText}>Back to Reset</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function GuidedResetFlow({
  tool,
  theme,
  companionName,
  onExit,
  onComplete,
}: GuidedResetFlowProps) {
  const steps = tool.steps ?? [];
  const [stepIndex, setStepIndex] = useState(0);
  const [remaining, setRemaining] = useState(steps[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const completionSent = useRef(false);
  const totalSeconds = useMemo(() => guidedDurationSeconds(tool), [tool]);
  const currentStep = steps[stepIndex];
  const elapsedBefore = useMemo(
    () => steps.slice(0, stepIndex).reduce((sum, step) => sum + step.seconds, 0),
    [stepIndex, steps],
  );
  const progress = totalSeconds > 0
    ? Math.min(1, (elapsedBefore + Math.max(0, (currentStep?.seconds ?? 0) - remaining)) / totalSeconds)
    : 0;

  useEffect(() => {
    if (!running || complete || !currentStep) return;
    const timer = setTimeout(() => {
      setActiveSeconds(value => value + 1);
      if (remaining > 1) {
        setRemaining(value => value - 1);
      } else if (stepIndex < steps.length - 1) {
        const next = stepIndex + 1;
        setStepIndex(next);
        setRemaining(steps[next].seconds);
      } else {
        setRunning(false);
        setComplete(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [complete, currentStep, remaining, running, stepIndex, steps]);

  useEffect(() => {
    if (!complete || completionSent.current) return;
    completionSent.current = true;
    const minimumMeaningfulSeconds = Math.min(20, Math.max(8, Math.ceil(totalSeconds * 0.25)));
    if (activeSeconds >= minimumMeaningfulSeconds) onComplete(activeSeconds);
  }, [activeSeconds, complete, onComplete, totalSeconds]);

  const skipStep = () => {
    if (stepIndex >= steps.length - 1) {
      setRunning(false);
      setComplete(true);
      return;
    }
    const next = stepIndex + 1;
    setStepIndex(next);
    setRemaining(steps[next].seconds);
  };

  if (complete) {
    return (
      <Completion
        theme={theme}
        emoji="💜"
        title="You moved through it."
        copy={`${companionName} stayed with you. Notice what feels even a little different.`}
        onExit={onExit}
      />
    );
  }

  if (!currentStep) {
    return <Completion theme={theme} emoji="🧩" title="Reset unavailable" copy="This guide is not ready yet." onExit={onExit} />;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background ?? '#10091F' }]}>
      <FlowHeader onExit={onExit} right={`${stepIndex + 1} / ${steps.length}`} />
      <Progress value={progress} color={accent(theme)} />
      <View style={styles.centered}>
        <Text style={styles.toolEmoji}>{tool.emoji}</Text>
        <Text style={styles.eyebrow}>{tool.title}</Text>
        <Text style={styles.title}>{currentStep.title}</Text>
        <Text style={styles.instruction}>{currentStep.instruction}</Text>
        {currentStep.cue ? <Text style={styles.cue}>{currentStep.cue}</Text> : null}
        <View style={[styles.timerCircle, { borderColor: accent(theme) }]}>
          <Text style={styles.timerText}>{formatTime(remaining)}</Text>
        </View>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accent(theme) }]}
          onPress={() => setRunning(value => !value)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{running ? 'Pause' : activeSeconds === 0 ? 'Start' : 'Keep Going'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={skipStep} accessibilityRole="button">
          <Text style={styles.secondaryText}>Skip this step</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function scaleForPhase(phase: BreathPhase): number {
  if (phase.action === 'expand') return phase.label.includes('top-up') ? 1.3 : 1.22;
  if (phase.action === 'contract') return 0.88;
  return 1;
}

export function BreathToolFlow({
  tool,
  theme,
  companionName,
  onExit,
  onComplete,
}: BreathToolFlowProps) {
  const phases = tool.breathPattern ?? [];
  const cycles = tool.cycles ?? 1;
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleIndex, setCycleIndex] = useState(0);
  const [remaining, setRemaining] = useState(phases[0]?.seconds ?? 0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const completionSent = useRef(false);
  const currentPhase = phases[phaseIndex];
  const totalSeconds = useMemo(() => breathDurationSeconds(tool), [tool]);
  const cycleSeconds = phases.reduce((sum, phase) => sum + phase.seconds, 0);
  const elapsedBeforePhase = phases.slice(0, phaseIndex).reduce((sum, phase) => sum + phase.seconds, 0);
  const progress = totalSeconds > 0
    ? Math.min(1, (cycleIndex * cycleSeconds + elapsedBeforePhase + Math.max(0, (currentPhase?.seconds ?? 0) - remaining)) / totalSeconds)
    : 0;

  useEffect(() => {
    if (!currentPhase) return;
    if (!running) {
      scale.stopAnimation();
      return;
    }
    Animated.timing(scale, {
      toValue: scaleForPhase(currentPhase),
      duration: Math.max(250, currentPhase.seconds * 1000),
      useNativeDriver: true,
    }).start();
  }, [currentPhase, running, scale]);

  useEffect(() => {
    if (!running || complete || !currentPhase) return;
    const timer = setTimeout(() => {
      if (remaining > 1) {
        setRemaining(value => value - 1);
      } else if (phaseIndex < phases.length - 1) {
        const next = phaseIndex + 1;
        setPhaseIndex(next);
        setRemaining(phases[next].seconds);
      } else if (cycleIndex < cycles - 1) {
        setCycleIndex(value => value + 1);
        setPhaseIndex(0);
        setRemaining(phases[0].seconds);
      } else {
        setRunning(false);
        setComplete(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [complete, currentPhase, cycleIndex, cycles, phaseIndex, phases, remaining, running]);

  useEffect(() => {
    if (!complete || completionSent.current) return;
    completionSent.current = true;
    onComplete();
  }, [complete, onComplete]);

  if (complete) {
    return (
      <Completion
        theme={theme}
        emoji="🫧"
        title="Breath complete."
        copy={`${companionName} is still here. Let your next breath happen normally.`}
        onExit={onExit}
      />
    );
  }

  if (!currentPhase) {
    return <Completion theme={theme} emoji="🧩" title="Breath unavailable" copy="This pattern is not ready yet." onExit={onExit} />;
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background ?? '#10091F' }]}>
      <FlowHeader onExit={onExit} right={`round ${cycleIndex + 1} / ${cycles}`} />
      <Progress value={progress} color={accent(theme)} />
      <View style={styles.centered}>
        <Text style={styles.title}>{tool.title}</Text>
        <Animated.View style={[styles.breathCircle, { backgroundColor: accent(theme), transform: [{ scale }] }]}>
          <Text style={styles.phaseLabel}>{currentPhase.label}</Text>
          <Text style={styles.countdown}>{remaining}</Text>
        </Animated.View>
        <Text style={styles.instruction}>Keep it comfortable. Shorten a hold or return to normal breathing whenever you need.</Text>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: accent(theme) }]}
          onPress={() => setRunning(value => !value)}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>{running ? 'Pause' : progress === 0 ? 'Start Breathing' : 'Continue'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={onExit}>
          <Text style={styles.secondaryText}>Stop and return</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function BodyWorkoutFlow({
  routine,
  theme,
  companionName,
  onExit,
  onComplete,
}: BodyWorkoutFlowProps) {
  const [phase, setPhase] = useState<WorkoutPhase>('ready');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [remaining, setRemaining] = useState(routine.exercises[0]?.seconds ?? 0);
  const [paused, setPaused] = useState(false);
  const [lowImpact, setLowImpact] = useState(false);
  const [activeSeconds, setActiveSeconds] = useState(0);
  const completionSent = useRef(false);
  const exercise = routine.exercises[exerciseIndex];
  const nextExercise = routine.exercises[exerciseIndex + 1];
  const totalSeconds = useMemo(() => workoutDurationSeconds(routine), [routine]);
  const elapsedBefore = useMemo(
    () => routine.exercises.slice(0, exerciseIndex).reduce((sum, item) => sum + item.seconds + item.restAfterSeconds, 0),
    [exerciseIndex, routine.exercises],
  );
  const elapsedCurrent = phase === 'work'
    ? Math.max(0, (exercise?.seconds ?? 0) - remaining)
    : phase === 'rest'
      ? (exercise?.seconds ?? 0) + Math.max(0, (exercise?.restAfterSeconds ?? 0) - remaining)
      : 0;
  const progress = phase === 'complete' ? 1 : Math.min(1, (elapsedBefore + elapsedCurrent) / Math.max(1, totalSeconds));

  const beginExercise = (index: number) => {
    setExerciseIndex(index);
    setRemaining(routine.exercises[index].seconds);
    setPhase('work');
    setPaused(false);
  };

  const finishRoutine = () => {
    setPaused(false);
    setPhase('complete');
  };

  useEffect(() => {
    if (paused || phase === 'ready' || phase === 'complete') return;
    const timer = setTimeout(() => {
      setActiveSeconds(value => value + 1);
      if (remaining > 1) {
        setRemaining(value => value - 1);
      } else if (!exercise) {
        setPaused(false);
        setPhase('complete');
      } else if (phase === 'work' && exercise.restAfterSeconds > 0 && nextExercise) {
        setRemaining(exercise.restAfterSeconds);
        setPhase('rest');
      } else if (nextExercise) {
        const nextIndex = exerciseIndex + 1;
        setExerciseIndex(nextIndex);
        setRemaining(nextExercise.seconds);
        setPhase('work');
        setPaused(false);
      } else {
        setPaused(false);
        setPhase('complete');
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [exercise, exerciseIndex, nextExercise, paused, phase, remaining]);

  useEffect(() => {
    if (phase !== 'complete' || completionSent.current) return;
    completionSent.current = true;
    const minimumMeaningfulSeconds = Math.min(30, Math.max(10, Math.ceil(totalSeconds * 0.25)));
    if (activeSeconds >= minimumMeaningfulSeconds) onComplete(activeSeconds);
  }, [activeSeconds, onComplete, phase, totalSeconds]);

  const skip = () => {
    if (nextExercise) beginExercise(exerciseIndex + 1);
    else finishRoutine();
  };

  if (phase === 'ready') {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: theme.background ?? '#0E0919' }]}>
        <ScrollView contentContainerStyle={styles.readyContent} showsVerticalScrollIndicator={false}>
          <FlowHeader onExit={onExit} right={routine.durationLabel} />
          <Text style={styles.heroEmoji}>{routine.emoji}</Text>
          <Text style={styles.completeTitle}>{routine.title}</Text>
          <Text style={styles.completeCopy}>{routine.subtitle}</Text>
          <View style={[styles.safetyCard, { borderColor: `${routine.accent}66` }]}>
            <Text style={styles.safetyTitle}>Before you start</Text>
            <Text style={styles.safetyText}>Clear space to move. Use only a stable wall, counter, step, chair, or bench. Stop for pain, chest pressure, trouble breathing, faintness, or dizziness. This is an optional wellness tool, not medical treatment.</Text>
          </View>
          <TouchableOpacity
            style={[styles.toggle, lowImpact && { borderColor: routine.accent, backgroundColor: `${routine.accent}22` }]}
            onPress={() => setLowImpact(value => !value)}
            accessibilityRole="switch"
            accessibilityState={{ checked: lowImpact }}
          >
            <Text style={styles.toggleText}>{lowImpact ? '✅' : '⬜'} Low-impact mode</Text>
          </TouchableOpacity>
          {routine.exercises.map((item, index) => (
            <View key={`${item.id}-${index}`} style={styles.previewRow}>
              <Text style={styles.previewNumber}>{index + 1}</Text>
              <Text style={styles.previewEmoji}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName}>{item.name}</Text>
                <Text style={styles.previewTime}>{item.seconds}s{item.restAfterSeconds ? ` • ${item.restAfterSeconds}s rest` : ''}</Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: routine.accent }]} onPress={() => beginExercise(0)}>
            <Text style={styles.primaryText}>Start with {companionName} 🔥</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (phase === 'complete') {
    return (
      <Completion
        theme={{ ...theme, accent: routine.accent }}
        emoji="🔥"
        title="You moved through it."
        copy="Not around it. Not under it. Through it. Take water and let your breathing settle."
        onExit={onExit}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background ?? '#0E0919' }]}>
      <View style={styles.activeContent}>
        <FlowHeader onExit={onExit} right={`${exerciseIndex + 1} / ${routine.exercises.length}`} />
        <Progress value={progress} color={routine.accent} />
        <View style={styles.centered}>
          {phase === 'rest' ? (
            <>
              <Text style={styles.restLabel}>REST</Text>
              <Text style={styles.bigTimer}>{remaining}</Text>
              <Text style={styles.nextLabel}>Next up</Text>
              <Text style={styles.nextMove}>{nextExercise?.emoji} {nextExercise?.name}</Text>
              <Text style={styles.instruction}>Shake out your arms. Breathe normally. Get ready.</Text>
            </>
          ) : (
            <>
              <Text style={styles.heroEmoji}>{exercise?.emoji}</Text>
              <Text style={styles.completeTitle}>{exercise?.name}</Text>
              <Text style={styles.bigTimer}>{remaining}</Text>
              <View style={[styles.instructionCard, { borderColor: `${routine.accent}66` }]}>
                <Text style={styles.instructionLabel}>{lowImpact ? 'LOW-IMPACT VERSION' : 'HOW TO MOVE'}</Text>
                <Text style={styles.instruction}>{lowImpact ? exercise?.lowImpact : exercise?.instruction}</Text>
                {exercise?.equipment ? <Text style={styles.equipment}>Needs: {exercise.equipment}</Text> : null}
              </View>
            </>
          )}
        </View>
        <View style={styles.controls}>
          <TouchableOpacity style={[styles.controlButton, styles.pauseButton]} onPress={() => setPaused(value => !value)}>
            <Text style={styles.controlText}>{paused ? 'Resume' : 'Pause'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, { backgroundColor: routine.accent }]} onPress={skip}>
            <Text style={styles.controlText}>{nextExercise ? 'Skip' : 'Finish'}</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => setLowImpact(value => !value)} accessibilityRole="switch" accessibilityState={{ checked: lowImpact }}>
          <Text style={styles.secondaryText}>{lowImpact ? '✅ Low-impact on' : '⬜ Turn on low-impact'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 22, paddingVertical: 14 },
  readyContent: { paddingBottom: 34 },
  activeContent: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { paddingVertical: 10, paddingHorizontal: 4 },
  backText: { color: '#D8D4E8', fontSize: 15, fontWeight: '700' },
  counter: { color: '#AFA9C5', fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  progressTrack: { height: 8, borderRadius: 99, backgroundColor: '#FFFFFF1C', overflow: 'hidden', marginTop: 8 },
  progressFill: { height: '100%', borderRadius: 99 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  toolEmoji: { fontSize: 58, marginBottom: 14 },
  heroEmoji: { fontSize: 58, textAlign: 'center', marginVertical: 18 },
  eyebrow: { color: '#BEB7D8', fontSize: 14, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 30, lineHeight: 36, fontWeight: '900', textAlign: 'center', marginTop: 8 },
  instruction: { color: '#DDD9EA', fontSize: 16, lineHeight: 24, textAlign: 'center', marginTop: 14, maxWidth: 430 },
  cue: { color: '#C4B5FD', fontSize: 18, fontWeight: '800', marginTop: 14 },
  timerCircle: { width: 128, height: 128, borderRadius: 64, borderWidth: 4, alignItems: 'center', justifyContent: 'center', marginVertical: 28, backgroundColor: '#FFFFFF0B' },
  timerText: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', fontVariant: ['tabular-nums'] },
  breathCircle: { width: 190, height: 190, borderRadius: 95, alignItems: 'center', justifyContent: 'center', marginVertical: 42 },
  phaseLabel: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textTransform: 'uppercase' },
  countdown: { color: '#FFFFFF', fontSize: 48, fontWeight: '900', fontVariant: ['tabular-nums'], marginTop: 4 },
  primaryButton: { minWidth: 220, paddingHorizontal: 24, paddingVertical: 16, borderRadius: 18, alignItems: 'center', alignSelf: 'center', marginTop: 16 },
  primaryText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: { marginTop: 12, paddingHorizontal: 20, paddingVertical: 13, alignSelf: 'center' },
  secondaryText: { color: '#BDB7CF', fontSize: 14, fontWeight: '700' },
  completeEmoji: { fontSize: 68, marginBottom: 18 },
  completeTitle: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', textAlign: 'center' },
  completeCopy: { color: '#DDD9EA', fontSize: 17, lineHeight: 26, textAlign: 'center', marginVertical: 18, maxWidth: 430 },
  safetyCard: { backgroundColor: '#FFFFFF0B', borderWidth: 1, borderRadius: 18, padding: 16, marginVertical: 16 },
  safetyTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  safetyText: { color: '#D3CDDE', fontSize: 13, lineHeight: 20, marginTop: 6 },
  toggle: { borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF22', padding: 14, marginBottom: 14 },
  toggleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF0A', borderRadius: 16, padding: 12, marginBottom: 8 },
  previewNumber: { color: '#AFA9C5', fontSize: 12, fontWeight: '900', width: 20 },
  previewEmoji: { fontSize: 24 },
  previewName: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  previewTime: { color: '#AFA9C5', fontSize: 12, marginTop: 2 },
  bigTimer: { color: '#FFFFFF', fontSize: 72, fontWeight: '900', fontVariant: ['tabular-nums'], marginVertical: 14 },
  restLabel: { color: '#FBBF24', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  nextLabel: { color: '#AFA9C5', fontSize: 13, fontWeight: '800' },
  nextMove: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 8 },
  instructionCard: { width: '100%', borderWidth: 1, borderRadius: 20, padding: 18, backgroundColor: '#FFFFFF0A', marginTop: 10 },
  instructionLabel: { color: '#C4B5FD', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  equipment: { color: '#FBBF24', fontSize: 12, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: 12 },
  controlButton: { flex: 1, borderRadius: 18, paddingVertical: 16, alignItems: 'center' },
  pauseButton: { backgroundColor: '#FFFFFF18' },
  controlText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
});
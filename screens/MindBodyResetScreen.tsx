import React, { useMemo, useState } from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomBg, type Character } from '../constants/theme';
import { glowForMood as glowFor } from '../constants/moodGlow';
import { emitEvent } from '@/features/activity/events';
import { BreathToolFlow, GuidedResetFlow } from '@/features/reset/ResetFlows';
import {
  BODY_RESET_TOOLS,
  BODY_WORKOUT_ROUTINES,
  MIND_RESET_TOOLS,
  breathDurationSeconds,
  guidedDurationSeconds,
  type ResetTool,
} from '@/features/reset/catalog';

function timeOfDay(): 'morning' | 'day' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

const AVATAR_ASSETS: Record<string, any> = {
  raylene: IMAGES.rayleneNeutral,
  soft: IMAGES.rayleneNeutral,
  rylane: IMAGES.rylaneProfile,
  cloud: IMAGES.cloudAvatarNeutral,
  night: IMAGES.nightNeutral,
};

const CHARACTER_NAMES: Record<string, string> = {
  raylene: 'Suhana',
  soft: 'Suhana',
  rylane: 'Sy',
  cloud: 'Cloud',
  night: 'Night',
};

const MOOD_CHIPS = [
  { label: 'Overwhelmed', emoji: '🌊' },
  { label: 'Anxious', emoji: '💨' },
  { label: 'Restless', emoji: '⚡' },
  { label: 'Angry', emoji: '🔥' },
  { label: 'Numb', emoji: '🫥' },
  { label: 'Tired', emoji: '🌙' },
];

interface MindBodyResetScreenProps {
  screen: 'mindReset' | 'bodyReset';
  t: Record<string, any>;
  selectedSekret?: string;
  setScreen: (screen: string) => void;
  onComplete?: () => void;
  onStartWorkout?: (routineId: string) => void;
  onChangeMode?: (mode: 'mindReset' | 'bodyReset') => void;
  BottomNav?: React.ReactNode;
  mood?: string;
}

export function MindBodyResetScreen({
  screen,
  t,
  selectedSekret = 'raylene',
  setScreen,
  onComplete,
  onStartWorkout,
  onChangeMode,
  BottomNav,
  mood,
}: MindBodyResetScreenProps) {
  const isMind = screen === 'mindReset';
  const [activeTool, setActiveTool] = useState<ResetTool | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const companionName = CHARACTER_NAMES[selectedSekret] ?? 'Suhana';
  const charKey: Character = ['raylene', 'rylane', 'cloud', 'night'].includes(selectedSekret)
    ? selectedSekret as Character
    : 'raylene';
  const bgSource = getRoomBg(charKey, timeOfDay());
  const moodGlow = glowFor(mood);

  const heroCopy = useMemo(() => {
    if (isMind) return `${companionName}: “We do not have to solve everything at once. Pick one reset.”`;
    return `${companionName}: “Too much energy to sit still? We can move it through.”`;
  }, [companionName, isMind]);

  const completeTool = (tool: ResetTool, activeSeconds?: number) => {
    const durationSecs = activeSeconds ?? (tool.kind === 'breath'
      ? breathDurationSeconds(tool)
      : guidedDurationSeconds(tool));

    emitEvent(tool.kind === 'breath' ? 'breathe_completed' : 'comfort_completed', {
      durationSecs,
      routineId: tool.id,
      resetMode: tool.mode,
      completionKind: tool.kind === 'breath' ? 'breath' : 'guided',
    });
    onComplete?.();
  };

  const openTool = (tool: ResetTool) => {
    if (tool.kind === 'route' && tool.routeKey) {
      setScreen(tool.routeKey);
      return;
    }
    setActiveTool(tool);
  };

  if (activeTool?.kind === 'guided') {
    return (
      <GuidedResetFlow
        tool={activeTool}
        theme={t}
        companionName={companionName}
        onExit={() => setActiveTool(null)}
        onComplete={(activeSeconds: number) => completeTool(activeTool, activeSeconds)}
      />
    );
  }

  if (activeTool?.kind === 'breath') {
    return (
      <BreathToolFlow
        tool={activeTool}
        theme={t}
        companionName={companionName}
        onExit={() => setActiveTool(null)}
        onComplete={() => completeTool(activeTool)}
      />
    );
  }

  const switchMode = (mode: 'mindReset' | 'bodyReset') => {
    if (mode === screen) return;
    if (onChangeMode) onChangeMode(mode);
    else setScreen(mode);
  };

  return (
    <ImageBackground source={bgSource} style={styles.root} resizeMode="cover">
      <LinearGradient
        colors={['rgba(20,10,40,0.55)', 'rgba(35,17,62,0.82)', 'rgba(12,7,24,0.97)']}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.bgGlow, { backgroundColor: moodGlow }]} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backChip} onPress={() => setScreen('home')}>
            <Text style={styles.backChipText}>← Room</Text>
          </TouchableOpacity>
          <View style={styles.regulationBadge}>
            <Text style={styles.regulationText}>REGULATION</Text>
          </View>
        </View>

        <Text style={styles.logo}>Mind + Body Reset</Text>
        <Text style={styles.subtitle}>Calm it down or move it through. Both count.</Text>

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeButton, isMind && { backgroundColor: t.accent ?? '#8B5CF6' }]}
            onPress={() => switchMode('mindReset')}
          >
            <Text style={[styles.modeText, isMind && styles.modeTextActive]}>🧠 Mind</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, !isMind && { backgroundColor: t.accent ?? '#8B5CF6' }]}
            onPress={() => switchMode('bodyReset')}
          >
            <Text style={[styles.modeText, !isMind && styles.modeTextActive]}>🔥 Body</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.heroRow}>
          <Image
            source={AVATAR_ASSETS[selectedSekret] ?? AVATAR_ASSETS.raylene}
            style={styles.heroAvatar}
            resizeMode="contain"
          />
          <View style={[styles.speechBubble, { borderColor: `${t.accent ?? '#8B5CF6'}66` }]}>
            <Text style={styles.speechText}>{heroCopy}</Text>
          </View>
        </View>

        {isMind ? (
          <>
            <Text style={styles.sectionEyebrow}>QUIET THE NOISE</Text>
            <Text style={styles.sectionTitle}>Choose one mind reset</Text>
            <View style={styles.cardStack}>
              {MIND_RESET_TOOLS.map(tool => (
                <ResetToolCard key={tool.id} tool={tool} accent={t.accent} onPress={() => openTool(tool)} />
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sectionEyebrow}>CALM MY BODY</Text>
            <Text style={styles.sectionTitle}>Release tension without a workout</Text>
            <View style={styles.cardStack}>
              {BODY_RESET_TOOLS.map(tool => (
                <ResetToolCard key={tool.id} tool={tool} accent={t.accent} onPress={() => openTool(tool)} />
              ))}
            </View>

            <View style={styles.powerHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.powerEyebrow}>MOVE IT THROUGH</Text>
                <Text style={styles.powerTitle}>Actual body workouts 🔥</Text>
                <Text style={styles.powerCopy}>For anger, adrenaline, restless energy, or when breathing feels too still.</Text>
              </View>
            </View>

            <View style={styles.workoutGrid}>
              {BODY_WORKOUT_ROUTINES.map(routine => (
                <TouchableOpacity
                  key={routine.id}
                  style={[styles.workoutCard, { borderColor: `${routine.accent}77` }]}
                  onPress={() => onStartWorkout?.(routine.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Start ${routine.title}, ${routine.durationLabel}`}
                >
                  <View style={styles.workoutTopRow}>
                    <Text style={styles.workoutEmoji}>{routine.emoji}</Text>
                    <View style={[styles.intensityChip, { backgroundColor: `${routine.accent}28` }]}>
                      <Text style={[styles.intensityText, { color: routine.accent }]}>{routine.intensity}</Text>
                    </View>
                  </View>
                  <Text style={styles.workoutTitle}>{routine.title}</Text>
                  <Text style={styles.workoutSubtitle}>{routine.subtitle}</Text>
                  <View style={styles.workoutMetaRow}>
                    <Text style={styles.workoutMeta}>{routine.durationLabel}</Text>
                    <Text style={styles.workoutMeta}>{routine.exercises.length} moves</Text>
                  </View>
                  <Text style={[styles.startLabel, { color: routine.accent }]}>Start routine →</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.safetyNote}>
              <Text style={styles.safetyTitle}>Move safely</Text>
              <Text style={styles.safetyText}>
                Every routine includes low-impact options, pause, skip, and stop controls. Clear your space, use stable equipment only, and stop for pain or dizziness.
              </Text>
            </View>
          </>
        )}

        <View style={styles.checkInCard}>
          <Text style={styles.checkInTitle}>What are you trying to move through?</Text>
          <View style={styles.chipRow}>
            {MOOD_CHIPS.map(chip => {
              const active = selectedMood === chip.label;
              return (
                <TouchableOpacity
                  key={chip.label}
                  style={[
                    styles.moodChip,
                    {
                      backgroundColor: active ? t.accent ?? '#8B5CF6' : '#FFFFFF0A',
                      borderColor: active ? t.accent ?? '#8B5CF6' : '#FFFFFF1F',
                    },
                  ]}
                  onPress={() => setSelectedMood(active ? null : chip.label)}
                >
                  <Text style={styles.moodChipText}>{chip.emoji} {chip.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {selectedMood ? (
            <Text style={styles.ackText}>{companionName} sees the {selectedMood.toLowerCase()}. Pick the smallest next move.</Text>
          ) : null}
        </View>

        <TouchableOpacity style={styles.comfortButton} onPress={() => setScreen('comfort')}>
          <Text style={styles.comfortButtonText}>I need Comfort Mode instead 💙</Text>
        </TouchableOpacity>

        <View style={{ height: 34 }} />
      </ScrollView>
      {BottomNav ?? null}
    </ImageBackground>
  );
}

function ResetToolCard({
  tool,
  accent,
  onPress,
}: {
  tool: ResetTool;
  accent?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, { borderColor: `${accent ?? '#8B5CF6'}55` }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${tool.title}, ${tool.durationLabel}`}
    >
      <View style={styles.toolIconWrap}>
        <Text style={styles.toolEmoji}>{tool.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.toolTitleRow}>
          <Text style={styles.toolTitle}>{tool.title}</Text>
          <Text style={styles.toolDuration}>{tool.durationLabel}</Text>
        </View>
        <Text style={styles.toolDescription}>{tool.description}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%' },
  bgGlow: { position: 'absolute', top: -140, alignSelf: 'center', width: 360, height: 360, borderRadius: 180, opacity: 0.25 },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 58 : 38,
    ...(Platform.OS === 'web' ? { maxWidth: 620, width: '100%', alignSelf: 'center' as const } : {}),
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  backChip: { backgroundColor: '#1C1330CC', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  backChipText: { color: '#D8D4E8', fontSize: 13, fontWeight: '800' },
  regulationBadge: { borderWidth: 1, borderColor: '#FFFFFF25', backgroundColor: '#FFFFFF0B', borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 },
  regulationText: { color: '#BEB7CE', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 },
  logo: { color: '#FFFFFF', fontSize: 31, fontWeight: '900', textAlign: 'center', letterSpacing: 0.2 },
  subtitle: { color: '#CEC8DC', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 7 },
  modeSwitch: { flexDirection: 'row', backgroundColor: '#10091FCC', borderRadius: 18, padding: 5, marginTop: 20, marginBottom: 20 },
  modeButton: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  modeText: { color: '#AFA8BD', fontSize: 15, fontWeight: '900' },
  modeTextActive: { color: '#FFFFFF' },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 28 },
  heroAvatar: { width: 88, height: 108 },
  speechBubble: { flex: 1, borderRadius: 20, borderWidth: 1, backgroundColor: '#171023D9', padding: 15 },
  speechText: { color: '#E7E2EE', fontSize: 14, lineHeight: 21, fontWeight: '600' },
  sectionEyebrow: { color: '#AAA3BA', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  sectionTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 5, marginBottom: 13 },
  cardStack: { gap: 10, marginBottom: 28 },
  toolCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#171023E8', borderRadius: 20, borderWidth: 1, padding: 14 },
  toolIconWrap: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#FFFFFF0C', alignItems: 'center', justifyContent: 'center' },
  toolEmoji: { fontSize: 25 },
  toolTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toolTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', flex: 1 },
  toolDuration: { color: '#AFA8BD', fontSize: 11, fontWeight: '800' },
  toolDescription: { color: '#C8C2D3', fontSize: 13, lineHeight: 19, marginTop: 4 },
  chevron: { color: '#958DA5', fontSize: 26, marginLeft: 2 },
  powerHeader: { backgroundColor: '#160D12E8', borderRadius: 22, borderWidth: 1, borderColor: '#F9731644', padding: 18, marginTop: 2, marginBottom: 13 },
  powerEyebrow: { color: '#FB923C', fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  powerTitle: { color: '#FFFFFF', fontSize: 23, fontWeight: '900', marginTop: 4 },
  powerCopy: { color: '#D4CCD3', fontSize: 14, lineHeight: 21, marginTop: 6 },
  workoutGrid: { gap: 11 },
  workoutCard: { backgroundColor: '#171023ED', borderWidth: 1, borderRadius: 22, padding: 17 },
  workoutTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  workoutEmoji: { fontSize: 31 },
  intensityChip: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  intensityText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  workoutTitle: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 11 },
  workoutSubtitle: { color: '#C8C2D3', fontSize: 13, lineHeight: 19, marginTop: 5 },
  workoutMetaRow: { flexDirection: 'row', gap: 14, marginTop: 12 },
  workoutMeta: { color: '#AFA8BD', fontSize: 12, fontWeight: '800' },
  startLabel: { fontSize: 13, fontWeight: '900', marginTop: 14 },
  safetyNote: { backgroundColor: '#FFFFFF09', borderRadius: 18, borderWidth: 1, borderColor: '#FFFFFF18', padding: 15, marginTop: 14, marginBottom: 28 },
  safetyTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  safetyText: { color: '#BDB7C9', fontSize: 12, lineHeight: 18, marginTop: 5 },
  checkInCard: { backgroundColor: '#171023E8', borderRadius: 22, borderWidth: 1, borderColor: '#FFFFFF18', padding: 17, marginTop: 2 },
  checkInTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', marginBottom: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  moodChip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 8 },
  moodChipText: { color: '#E8E3EF', fontSize: 12, fontWeight: '800' },
  ackText: { color: '#CFC8DA', fontSize: 13, lineHeight: 19, marginTop: 13, fontStyle: 'italic' },
  comfortButton: { backgroundColor: '#1D2A48DD', padding: 16, borderRadius: 18, alignItems: 'center', marginTop: 14 },
  comfortButtonText: { color: '#E7F0FF', fontSize: 15, fontWeight: '900' },
});

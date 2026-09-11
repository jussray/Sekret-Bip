import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CinematicEvidenceBoard } from '@/components/founder/CinematicEvidenceBoard';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { SEKRET_PROFILES } from '@/constants/theme';
import { getNightPoseAsset, type NightPose } from '@/config/nightRoomAssetRegistry';

const NIGHT_SCENES = [
  require('../../assets/images/resized-bg/bg-night-room-day.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-midday.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-afternoon.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-evening.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-night.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-deep-night.jpg'),
  require('../../assets/images/resized-bg/bg-night-room-rain.jpg'),
] as const;

const NIGHT_POSES: readonly NightPose[] = [
  'neutral',
  'listening',
  'thinking',
  'writing',
  'resting',
  'microphone',
  'window',
];

const SHOT_BLUEPRINT = [
  { id: '01', title: 'The room receives you', beat: 'Arrive first. Nothing demands an explanation.', camera: 'WIDE / SLOW PUSH', atmosphere: 'DAY / ROOM TONE' },
  { id: '02', title: 'A signal, not a spotlight', beat: 'Mood and room cues become noticeable without taking over.', camera: 'MEDIUM / GENTLE DRIFT', atmosphere: 'MIDDAY / LOW MOTION' },
  { id: '03', title: 'The companion listens', beat: 'Presence leads. The user keeps control of the pace.', camera: 'CLOSE / HELD', atmosphere: 'AFTERNOON / QUIET' },
  { id: '04', title: 'Words find a shape', beat: 'Pages, voice, or a quiet tool gives the feeling somewhere to go.', camera: 'OVER SHOULDER / STATIC', atmosphere: 'EVENING / FOCUS' },
  { id: '05', title: 'A small reset', beat: 'Comfort and Calm remain available without turning the moment into a test.', camera: 'MEDIUM / SLOW CIRCLE', atmosphere: 'NIGHT / STEADY' },
  { id: '06', title: 'Connection stays a choice', beat: 'Voice and community paths exist, but the user decides whether to open them.', camera: 'TWO-SHOT / STILL', atmosphere: 'DEEP NIGHT / OPEN SPACE' },
  { id: '07', title: 'The journey continues', beat: 'The room remembers the return without making the person perform for it.', camera: 'WIDE / SLOW PULL BACK', atmosphere: 'RAIN / RETURN' },
] as const;

export default function CinematicDossierPreviewRoute() {
  const enabled = isFounderPreviewEnabled();
  const board = useMemo(() => {
    const profile = SEKRET_PROFILES.night;
    const poseAssets = NIGHT_POSES.map(pose => ({ pose, entry: getNightPoseAsset(pose) }));
    const neutral = getNightPoseAsset('neutral');

    return {
      identity: {
        project: "Se'kret Bip",
        name: 'Night',
        title: profile.title,
        tagline: profile.vibe,
        mission: 'Help feelings become safer to notice, name, and move through.',
        about: 'This founder-only dossier proves the visual grammar against the one companion and room currently in production scope. Missing Night poses stay visibly classified as canonical-neutral fallbacks rather than being disguised as finished art.',
        quote: profile.greeting,
        image: neutral.source,
        scene: NIGHT_SCENES[3],
      },
      shots: SHOT_BLUEPRINT.map((shot, index) => {
        const pose = poseAssets[index];
        const generated = pose.entry.status === 'generated';
        return {
          ...shot,
          image: generated ? pose.entry.source : undefined,
          scene: NIGHT_SCENES[index],
          assetStatus: generated ? `GENERATED · ${pose.pose}` : `FALLBACK → NEUTRAL · ${pose.pose}`,
        };
      }),
      modules: [
        {
          title: 'Tools & rituals',
          note: 'What the companion can point toward without becoming the whole experience.',
          items: ['Pages', 'Voice Bip', 'Calm', 'Cloud Thoughts', 'Bridge'],
        },
        {
          title: 'Emotional fingerprint',
          note: profile.vibe,
          items: [profile.title, 'Low-pressure presence', 'Choice-first interaction', 'Readable emotion', 'Safe return'],
        },
        {
          title: 'Room & conditions',
          note: 'Current production scope is Night + Night Room.',
          items: ['Night Room canon', 'Day → deep night', 'Rain state', 'Canonical-neutral fallback', 'Return memory'],
        },
      ],
      truth: {
        state: 'FOUNDER PREVIEW · NIGHT VERTICAL SLICE · NOT A PRODUCTION FEATURE',
        proof: 'CANONICAL NIGHT REGISTRY + PRODUCTION NIGHT ROOM PLATES + LIVE PROFILE COPY',
        nextGate: 'PLAYWRIGHT DESKTOP + MOBILE → PIXEL REVIEW → REMOVE TEMP PROOF CARRIER',
      },
    };
  }, []);

  if (!enabled) {
    return (
      <View style={styles.locked} testID="cinematic-dossier-locked">
        <Text style={styles.lockedIcon}>🔒</Text>
        <Text style={styles.lockedTitle}>Cinematic dossier preview is development-only.</Text>
        <Text style={styles.lockedBody}>Production does not expose this founder visual-system surface.</Text>
      </View>
    );
  }

  return (
    <View style={styles.root} testID="cinematic-dossier-screen">
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back from cinematic dossier">
            <Text style={styles.backText}>← Founder Preview</Text>
          </TouchableOpacity>
          <View style={styles.previewBadge}>
            <Text style={styles.previewBadgeText}>NIGHT VERTICAL SLICE · V2</Text>
          </View>
        </View>

        <Text style={styles.kicker}>FOUNDER VISUAL SYSTEM</Text>
        <Text style={styles.title}>Character bible + storyboard + evidence.</Text>
        <Text style={styles.subtitle}>
          A reusable dossier grammar proved only against today’s production-authoritative Night vertical slice. Scene plates come from the Night Room art set; character states come from the canonical Night runtime registry; unavailable poses stay labeled as fallbacks instead of being visually impersonated by neutral.
        </Text>

        <CinematicEvidenceBoard
          identity={board.identity}
          shots={board.shots}
          modules={board.modules}
          truth={board.truth}
          accent="#9f7aea"
          version="SE'KRET BIP / NIGHT / 01"
        />

        <View style={styles.footerNote}>
          <Text style={styles.footerTitle}>SYSTEM RULE</Text>
          <Text style={styles.footerText}>
            Preserve the information architecture. Expand companion coverage only when each companion’s canonical production assets and room authority are ready.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0710' },
  locked: { flex: 1, backgroundColor: '#0a0710', alignItems: 'center', justifyContent: 'center', padding: 30 },
  lockedIcon: { fontSize: 40, marginBottom: 12 },
  lockedTitle: { color: '#fff', fontSize: 20, lineHeight: 27, textAlign: 'center', fontWeight: '900' },
  lockedBody: { color: '#9d92aa', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
  content: { width: '100%', maxWidth: 1240, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 54, paddingBottom: 80 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 22 },
  backButton: { paddingVertical: 8, paddingRight: 10 },
  backText: { color: '#c8bdd2', fontSize: 11, fontWeight: '900' },
  previewBadge: { borderRadius: 999, borderWidth: 1, borderColor: '#9f7aea66', backgroundColor: '#2c174466', paddingHorizontal: 10, paddingVertical: 6 },
  previewBadgeText: { color: '#cfb7ff', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  kicker: { color: '#9f7aea', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  title: { color: '#fff', fontSize: 31, lineHeight: 39, fontWeight: '900', marginTop: 7 },
  subtitle: { color: '#afa2bc', fontSize: 12, lineHeight: 20, maxWidth: 860, marginTop: 9, marginBottom: 18 },
  footerNote: { marginTop: 18, borderWidth: 1, borderColor: '#9f7aea33', backgroundColor: '#17101f', padding: 14 },
  footerTitle: { color: '#9f7aea', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  footerText: { color: '#b9adbf', fontSize: 10, lineHeight: 16, marginTop: 5 },
});
import React, { useMemo } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { CinematicEvidenceBoard } from '@/components/founder/CinematicEvidenceBoard';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';
import { SEKRET_PROFILES } from '@/constants/theme';
import { getNightPoseAsset, type NightPose } from '@/config/nightRoomAssetRegistry';

const NIGHT_SCENES = [
  require('../../assets/images/archive/bg-night-room-day.png'),
  require('../../assets/images/archive/bg-night-room-midday.png'),
  require('../../assets/images/archive/bg-night-room-afternoon.png'),
  require('../../assets/images/archive/bg-night-room-evening.png'),
  require('../../assets/images/archive/bg-night-room-night.png'),
  require('../../assets/images/archive/bg-night-room-deep-night.png'),
  require('../../assets/images/archive/bg-night-room-rain.png'),
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

type OriginalCharacterKey = 'night' | 'suhana' | 'sy';

type SorianPairContract = {
  key: string;
  domain: string;
  symbol: string;
  original: {
    character_key: OriginalCharacterKey;
    display_name: string;
    instant_read: string;
    magic_direction: string;
    generation_allowed: boolean;
  };
  counterpart: {
    key: string;
    display_name: string;
    role: string;
    status: string;
    instant_read: string;
    magic_direction: string;
    palette: string[];
    silhouette_contract: string[];
    generation_allowed: boolean;
    continuity_cookie_eligible: boolean;
  };
};

const CHARACTER_CANON = require('../../sekret-bip-character-canon/registry.json') as {
  recognition_contract: {
    principle: string;
    silhouette_review_sizes_px: number[];
  };
  sorian_pairs: SorianPairContract[];
};

const PAIR_ORIGINAL_IMAGES = {
  night: getNightPoseAsset('neutral').source,
  suhana: require('../../assets/images/companions/raylene/raylene-master.png'),
  sy: require('../../assets/images/companions/rylane/rylane-master.png'),
} as const;

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

        <View style={styles.pairGate} testID="sorian-character-recognition-gate">
          <Text style={styles.pairKicker}>SORIAN CHARACTER RECOGNITION GATE</Text>
          <Text style={styles.pairTitle}>Pairs rhyme. They do not clone.</Text>
          <Text style={styles.pairBody}>
            Originals below are current character-authority assets. Counterparts are approved design contracts only, so the proof surface deliberately shows no invented face or body for Nyra, Suhan, or Sya.
          </Text>
          <View style={styles.gateStrip}>
            <Text style={styles.gateStripText}>128px + 64px silhouette review required</Text>
            <Text style={styles.gateStripBlocked}>PENDING COUNTERPARTS · GENERATION BLOCKED · NO COOKIE</Text>
          </View>

          <View style={styles.pairGrid}>
            {CHARACTER_CANON.sorian_pairs.map(pair => (
              <View key={pair.key} testID={`sorian-pair-${pair.key}`} style={styles.pairCard}>
                <View style={styles.pairCardHead}>
                  <View>
                    <Text style={styles.pairDomain}>{pair.domain.toUpperCase()}</Text>
                    <Text style={styles.pairSymbol}>{pair.symbol}</Text>
                  </View>
                  <Text style={styles.pairArrow}>↔</Text>
                </View>

                <View style={styles.pairPeople}>
                  <View style={styles.personColumn}>
                    <View style={styles.originalFrame}>
                      <Image
                        testID={`sorian-pair-${pair.key}-original-image`}
                        accessibilityLabel={`${pair.original.display_name} approved character authority`}
                        source={PAIR_ORIGINAL_IMAGES[pair.original.character_key]}
                        resizeMode="contain"
                        style={styles.originalImage}
                      />
                    </View>
                    <Text style={styles.personName}>{pair.original.display_name}</Text>
                    <Text style={styles.personStatus}>APPROVED REFERENCE</Text>
                    <Text style={styles.personDetail}>{pair.original.magic_direction}</Text>
                  </View>

                  <View
                    testID={`sorian-pair-${pair.key}-counterpart`}
                    accessibilityLabel={`${pair.counterpart.display_name} exact character reference pending`}
                    style={styles.personColumn}
                  >
                    <View style={styles.pendingFrame}>
                      <Text style={styles.pendingGlyph}>{pair.symbol === 'Crescent Eye' ? '☾' : pair.symbol === 'Open Circle' ? '◯' : '✦'}</Text>
                      <Text style={styles.pendingLabel}>REFERENCE{`\n`}PENDING</Text>
                    </View>
                    <Text style={styles.personName}>{pair.counterpart.display_name}</Text>
                    <Text style={styles.pendingStatus}>GENERATION BLOCKED</Text>
                    <Text style={styles.personDetail}>{pair.counterpart.magic_direction}</Text>
                  </View>
                </View>

                <Text style={styles.silhouetteLabel}>SILHOUETTE CONTRACT</Text>
                <Text style={styles.silhouetteText}>{pair.counterpart.silhouette_contract.join(' · ')}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.pairFooter}>
            {CHARACTER_CANON.recognition_contract.principle} Character authority must be approved before provider binding, generation eligibility, or any continuity cookie.
          </Text>
        </View>

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
  pairGate: { marginTop: 22, borderWidth: 1, borderColor: '#9f7aea44', backgroundColor: '#110b18', borderRadius: 18, padding: 16 },
  pairKicker: { color: '#b99cff', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  pairTitle: { color: '#fff', fontSize: 22, lineHeight: 29, fontWeight: '900', marginTop: 5 },
  pairBody: { color: '#afa2bc', fontSize: 11, lineHeight: 18, maxWidth: 840, marginTop: 7 },
  gateStrip: { marginTop: 13, borderWidth: 1, borderColor: '#c2a7ff33', backgroundColor: '#1a1024', borderRadius: 12, padding: 10, gap: 4 },
  gateStripText: { color: '#d5c6f5', fontSize: 9, fontWeight: '800' },
  gateStripBlocked: { color: '#ffbfda', fontSize: 8, lineHeight: 13, fontWeight: '900', letterSpacing: 0.7 },
  pairGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 14 },
  pairCard: { flexGrow: 1, flexBasis: 280, borderWidth: 1, borderColor: '#ffffff18', backgroundColor: '#17101f', borderRadius: 14, padding: 12 },
  pairCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  pairDomain: { color: '#d2bfff', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  pairSymbol: { color: '#fff', fontSize: 14, fontWeight: '900', marginTop: 2 },
  pairArrow: { color: '#7f7190', fontSize: 16, fontWeight: '900' },
  pairPeople: { flexDirection: 'row', gap: 10, marginTop: 11 },
  personColumn: { flex: 1, minWidth: 0 },
  originalFrame: { height: 150, borderRadius: 11, overflow: 'hidden', borderWidth: 1, borderColor: '#8ad9aa55', backgroundColor: '#0b0810' },
  originalImage: { width: '100%', height: '100%' },
  pendingFrame: { height: 150, borderRadius: 11, borderWidth: 1, borderStyle: 'dashed', borderColor: '#ff9fc955', backgroundColor: '#120d16', alignItems: 'center', justifyContent: 'center', padding: 10 },
  pendingGlyph: { color: '#cbb4ff', fontSize: 28, marginBottom: 5 },
  pendingLabel: { color: '#9d92aa', fontSize: 8, lineHeight: 12, textAlign: 'center', fontWeight: '900', letterSpacing: 1 },
  personName: { color: '#fff', fontSize: 13, fontWeight: '900', marginTop: 7 },
  personStatus: { color: '#8ad9aa', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 2 },
  pendingStatus: { color: '#ff9fc9', fontSize: 7, fontWeight: '900', letterSpacing: 0.7, marginTop: 2 },
  personDetail: { color: '#8f849b', fontSize: 8, lineHeight: 12, marginTop: 3 },
  silhouetteLabel: { color: '#ab99bc', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 12 },
  silhouetteText: { color: '#c6bacd', fontSize: 8, lineHeight: 13, marginTop: 4 },
  pairFooter: { color: '#9f94aa', fontSize: 9, lineHeight: 15, marginTop: 13 },
  footerNote: { marginTop: 18, borderWidth: 1, borderColor: '#9f7aea33', backgroundColor: '#17101f', padding: 14 },
  footerTitle: { color: '#9f7aea', fontSize: 8, fontWeight: '900', letterSpacing: 1.4 },
  footerText: { color: '#b9adbf', fontSize: 10, lineHeight: 16, marginTop: 5 },
});

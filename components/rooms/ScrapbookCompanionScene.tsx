import React, { useMemo } from 'react';
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  IMAGES,
  getRoomPhase,
  getRoomScene,
  type Character,
  type RoomPhase,
} from '../../constants/theme';

const DISPLAY_NAMES: Record<Character, string> = {
  raylene: 'Suhana',
  rylane: 'Sy',
  cloud: 'Cloud',
  night: 'Night',
};

const AVATARS: Record<Character, ImageSourcePropType> = {
  raylene: IMAGES.rayleneFullbody,
  rylane: IMAGES.rylaneFullbody,
  cloud: IMAGES.cloudAvatarNeutral,
  night: IMAGES.nightFullbody,
};

const PHASE_COPY: Record<RoomPhase, { eyebrow: string; note: string; accent: string }> = {
  day: {
    eyebrow: 'DAY CHECK-IN',
    note: 'you still have time to make today yours.',
    accent: '#f7b6d2',
  },
  midday: {
    eyebrow: 'MIDDAY CHECK-IN',
    note: 'halfway through still counts as showing up.',
    accent: '#ffd38a',
  },
  afternoon: {
    eyebrow: 'AFTERNOON CHECK-IN',
    note: 'you can change the pace without quitting the day.',
    accent: '#f5a56b',
  },
  evening: {
    eyebrow: 'EVENING CHECK-IN',
    note: 'you made it through today.',
    accent: '#f69ac7',
  },
  rain: {
    eyebrow: 'RAINY CHECK-IN',
    note: 'slow days are still real days.',
    accent: '#9ac8f6',
  },
  night: {
    eyebrow: 'NIGHT CHECK-IN',
    note: "you don't have to solve tonight all at once.",
    accent: '#c8a6ff',
  },
  deepNight: {
    eyebrow: 'LATE-NIGHT CHECK-IN',
    note: 'rest can be the next thing, not one more task.',
    accent: '#a995e8',
  },
};

export function normalizeScrapbookCompanion(value?: string | null): Character {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'sy':
    case 'rylane':
      return 'rylane';
    case 'cloud':
      return 'cloud';
    case 'night':
      return 'night';
    case 'suhana':
    case 'soft':
    case 'raylene':
    default:
      return 'raylene';
  }
}

export function scrapbookCompanionDisplayName(value?: string | null): string {
  return DISPLAY_NAMES[normalizeScrapbookCompanion(value)];
}

type ScrapbookCompanionSceneProps = {
  companion?: string | null;
  onBack?: () => void;
  onBipPress: () => void;
};

export function ScrapbookCompanionScene({
  companion,
  onBack,
  onBipPress,
}: ScrapbookCompanionSceneProps) {
  const character = normalizeScrapbookCompanion(companion);
  const displayName = DISPLAY_NAMES[character];
  const phase = useMemo(() => getRoomPhase(new Date()), []);
  const phaseCopy = PHASE_COPY[phase];
  const roomArt = useMemo(() => getRoomScene(character, phase), [character, phase]);

  return (
    <ImageBackground
      source={roomArt}
      resizeMode="cover"
      style={styles.root}
      testID="scrapbook-companion-scene"
    >
      <LinearGradient
        colors={['rgba(8, 4, 24, 0.38)', 'rgba(22, 8, 43, 0.28)', 'rgba(5, 3, 18, 0.78)']}
        locations={[0, 0.48, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.doodles} pointerEvents="none" accessibilityElementsHidden>
        <Text style={styles.doodleMoon}>☾</Text>
        <Text style={styles.doodleStars}>☆  ☆{`\n`}  ☆</Text>
        <Text style={[styles.doodleHeart, { color: phaseCopy.accent }]}>♡</Text>
      </View>

      <View style={styles.topRow}>
        {onBack ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to Room"
            onPress={onBack}
            style={({ pressed }) => [styles.backScrap, pressed && styles.pressed]}
          >
            <Text style={styles.backText}>← Room</Text>
          </Pressable>
        ) : <View />}

        <View style={styles.eyebrowPaper} pointerEvents="none">
          <View style={styles.eyebrowTape} />
          <Text style={styles.eyebrow}>{phaseCopy.eyebrow}</Text>
        </View>
      </View>

      <View style={styles.sceneStack}>
        <View style={styles.polaroidWrap}>
          <View style={styles.tapeLeft} pointerEvents="none" />
          <View style={styles.polaroid}>
            <View style={styles.photoWell}>
              <LinearGradient
                colors={['rgba(24, 11, 50, 0.24)', 'rgba(7, 4, 18, 0.72)']}
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <Image
                source={AVATARS[character]}
                resizeMode="contain"
                style={styles.avatar}
                accessibilityLabel={`${displayName} companion`}
              />
            </View>
            <View style={styles.polaroidCaptionRow}>
              <Text style={styles.polaroidCaption}>{displayName}</Text>
              <Text style={[styles.captionHeart, { color: phaseCopy.accent }]}>♡</Text>
            </View>
          </View>
          <View style={styles.tapeRight} pointerEvents="none" />
        </View>

        <View style={styles.notePaper}>
          <View style={styles.paperLineOne} pointerEvents="none" />
          <View style={styles.paperLineTwo} pointerEvents="none" />
          <Text style={styles.noteText}>{phaseCopy.note}</Text>
          <Text style={[styles.noteHeart, { color: phaseCopy.accent }]}>♡</Text>
          <Text style={styles.arrow}>↘</Text>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Bip with ${displayName}`}
        onPress={onBipPress}
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: phaseCopy.accent },
          pressed && styles.pressed,
        ]}
        testID="scrapbook-bip-cta"
      >
        <Text style={styles.ctaStar}>☆</Text>
        <Text style={styles.ctaText}>Bip with {displayName}</Text>
        <Text style={styles.ctaArrow}>→</Text>
      </Pressable>
    </ImageBackground>
  );
}

type ScrapbookCheckInLauncherProps = {
  companion?: string | null;
  onPress: () => void;
};

export function ScrapbookCheckInLauncher({ companion, onPress }: ScrapbookCheckInLauncherProps) {
  const displayName = scrapbookCompanionDisplayName(companion);
  const phase = useMemo(() => getRoomPhase(new Date()), []);
  const accent = PHASE_COPY[phase].accent;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open scrapbook check-in with ${displayName}`}
      onPress={onPress}
      style={({ pressed }) => [styles.launcher, pressed && styles.pressed]}
      testID="scrapbook-check-in-launcher"
    >
      <View style={styles.launcherTape} pointerEvents="none" />
      <Text style={[styles.launcherHeart, { color: accent }]}>♡</Text>
      <View style={styles.launcherCopy}>
        <Text style={styles.launcherLabel}>scrapbook check-in</Text>
        <Text style={styles.launcherName}>with {displayName} →</Text>
      </View>
    </Pressable>
  );
}

const handwritingFont = Platform.select({
  ios: 'Noteworthy',
  android: 'sans-serif',
  web: 'Comic Sans MS',
  default: undefined,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#09031c',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  doodles: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  doodleMoon: {
    position: 'absolute',
    top: '11%',
    right: '12%',
    color: 'rgba(255, 247, 232, 0.92)',
    fontSize: 54,
    transform: [{ rotate: '-12deg' }],
  },
  doodleStars: {
    position: 'absolute',
    top: '17%',
    left: '8%',
    color: 'rgba(255,255,255,0.88)',
    fontSize: 21,
    lineHeight: 22,
    transform: [{ rotate: '8deg' }],
  },
  doodleHeart: {
    position: 'absolute',
    top: '28%',
    right: '8%',
    fontSize: 34,
    fontFamily: handwritingFont,
    transform: [{ rotate: '8deg' }],
  },
  topRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 3,
  },
  backScrap: {
    minHeight: 44,
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(252, 247, 237, 0.94)',
    borderRadius: 3,
    transform: [{ rotate: '-2deg' }],
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  backText: {
    color: '#281b34',
    fontFamily: handwritingFont,
    fontSize: 15,
    fontWeight: '700',
  },
  eyebrowPaper: {
    position: 'relative',
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: 'rgba(252, 247, 237, 0.94)',
    transform: [{ rotate: '2deg' }],
  },
  eyebrowTape: {
    position: 'absolute',
    top: -8,
    right: 14,
    width: 44,
    height: 14,
    backgroundColor: 'rgba(211, 176, 112, 0.72)',
    transform: [{ rotate: '-4deg' }],
  },
  eyebrow: {
    color: '#281b34',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
  },
  sceneStack: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -8,
  },
  polaroidWrap: {
    position: 'relative',
    width: '82%',
    maxWidth: 330,
    transform: [{ rotate: '-2.4deg' }],
    zIndex: 2,
  },
  polaroid: {
    width: '100%',
    padding: 14,
    paddingBottom: 20,
    backgroundColor: '#f7f2ea',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  photoWell: {
    height: 330,
    maxHeight: '48%',
    minHeight: 250,
    backgroundColor: '#110b1d',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  polaroidCaptionRow: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: 10,
  },
  polaroidCaption: {
    color: '#2f2537',
    fontFamily: handwritingFont,
    fontSize: 19,
    fontWeight: '700',
  },
  captionHeart: {
    fontFamily: handwritingFont,
    fontSize: 28,
  },
  tapeLeft: {
    position: 'absolute',
    zIndex: 4,
    top: -12,
    left: -22,
    width: 88,
    height: 34,
    backgroundColor: 'rgba(215, 181, 117, 0.78)',
    transform: [{ rotate: '-36deg' }],
  },
  tapeRight: {
    position: 'absolute',
    zIndex: 4,
    right: -18,
    bottom: 24,
    width: 76,
    height: 30,
    backgroundColor: 'rgba(215, 181, 117, 0.72)',
    transform: [{ rotate: '-24deg' }],
  },
  notePaper: {
    width: '78%',
    maxWidth: 310,
    minHeight: 112,
    backgroundColor: '#fbf7ef',
    marginTop: -5,
    paddingHorizontal: 24,
    paddingVertical: 18,
    transform: [{ rotate: '1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    zIndex: 1,
    overflow: 'hidden',
  },
  paperLineOne: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 42,
    height: 1,
    backgroundColor: 'rgba(77, 100, 135, 0.14)',
  },
  paperLineTwo: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 76,
    height: 1,
    backgroundColor: 'rgba(77, 100, 135, 0.14)',
  },
  noteText: {
    color: '#1f1b24',
    fontFamily: handwritingFont,
    fontSize: 21,
    lineHeight: 27,
    textAlign: 'center',
    fontWeight: '700',
  },
  noteHeart: {
    alignSelf: 'center',
    marginTop: 4,
    fontFamily: handwritingFont,
    fontSize: 25,
  },
  arrow: {
    position: 'absolute',
    right: 14,
    bottom: 2,
    color: '#1f1b24',
    fontFamily: handwritingFont,
    fontSize: 30,
    transform: [{ rotate: '8deg' }],
  },
  cta: {
    minHeight: 58,
    marginHorizontal: 28,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(43, 24, 50, 0.86)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    transform: [{ rotate: '-0.7deg' }],
  },
  ctaStar: {
    color: '#24152c',
    fontSize: 22,
    marginRight: 10,
  },
  ctaText: {
    flexShrink: 1,
    color: '#24152c',
    fontFamily: handwritingFont,
    fontSize: 20,
    fontWeight: '800',
  },
  ctaArrow: {
    color: '#24152c',
    fontSize: 25,
    marginLeft: 10,
  },
  pressed: {
    opacity: 0.76,
    transform: [{ scale: 0.985 }],
  },
  launcher: {
    position: 'absolute',
    top: 84,
    right: 12,
    zIndex: 40,
    minWidth: 154,
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
    backgroundColor: 'rgba(250, 246, 236, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(71, 47, 79, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    transform: [{ rotate: '1.5deg' }],
  },
  launcherTape: {
    position: 'absolute',
    top: -8,
    left: 44,
    width: 48,
    height: 16,
    backgroundColor: 'rgba(211, 176, 112, 0.72)',
    transform: [{ rotate: '-5deg' }],
  },
  launcherHeart: {
    fontFamily: handwritingFont,
    fontSize: 24,
    marginRight: 8,
  },
  launcherCopy: {
    flexShrink: 1,
  },
  launcherLabel: {
    color: '#33243d',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  launcherName: {
    color: '#33243d',
    fontFamily: handwritingFont,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
});

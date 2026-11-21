import React, { useMemo } from 'react';
import { Image, ImageBackground, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getRoomPhase, type Character } from '../../constants/theme';
import { getTeenCompanionAsset } from '../../src/utils/companions';
import { BareRoomRenderer } from './BareRoomRenderer';
import { RoomWallScrapbook, getRoomWallCopy, type RoomWallIdentity } from './RoomWallScrapbook';

// Legacy Oracle and the approved Ja display identity are ONE character, not two.
export type ScrapbookIdentity = RoomWallIdentity;

const NAMES: Record<ScrapbookIdentity, string> = {
  raylene: 'Suhana', rylane: 'Sy', cloud: 'Cloud', night: 'Night', ja: 'Ja',
};

const AVATARS = {
  raylene: getTeenCompanionAsset('raylene', 'neutral') ?? IMAGES.rayleneNeutral,
  rylane: getTeenCompanionAsset('rylane', 'neutral') ?? IMAGES.rylaneNeutral,
  cloud: IMAGES.cloudAvatarNeutral,
  night: getTeenCompanionAsset('night', 'neutral') ?? IMAGES.nightNeutral,
};

export function normalizeScrapbookCompanion(value?: string | null): ScrapbookIdentity {
  switch ((value ?? '').trim().toLowerCase()) {
    case 'sy': case 'rylane': return 'rylane';
    case 'cloud': return 'cloud';
    case 'night': return 'night';
    case 'ja': case 'oracle': case 'sekret': return 'ja';
    case 'suhana': case 'soft': case 'raylene':
    default: return 'raylene';
  }
}
export function scrapbookCompanionDisplayName(value?: string | null): string {
  return NAMES[normalizeScrapbookCompanion(value)];
}

type SceneProps = { companion?: string | null; onBack?: () => void; onBipPress: () => void };

export function ScrapbookCompanionScene({ companion, onBack, onBipPress }: SceneProps) {
  const character = normalizeScrapbookCompanion(companion);
  const displayName = NAMES[character];
  const phase = useMemo(() => getRoomPhase(new Date()), []);
  const { width, height } = useWindowDimensions();
  const compactViewport = height < 700 || width < 360;
  const companionHeight = Math.min(height * (character === 'cloud' ? 0.33 : 0.52), character === 'cloud' ? 300 : 530);
  const companionWidth = Math.min(width * (character === 'cloud' ? 0.58 : 0.76), character === 'cloud' ? 320 : 470);
  const accent = getRoomWallCopy(character, phase).accent;

  return (
    <View testID="scrapbook-companion-scene" style={styles.root}>
      {character === 'ja' ? (
        // Ja remains the pre-approved symbolic fallback only. No invented Ja portrait.
        <ImageBackground source={IMAGES.bgJournal} resizeMode="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <BareRoomRenderer character={character as Character} lightingMode={phase} />
      )}
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={['rgba(9,4,27,0.31)', 'rgba(20,8,42,0.03)', 'rgba(6,3,19,0.62)']}
        locations={[0, 0.46, 1]}
      />
      <RoomWallScrapbook character={character} phase={phase} />
      <View style={[styles.topRow, compactViewport && styles.topCompact]}>
        {onBack ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Room" onPress={onBack} testID="scrapbook-back" style={styles.back}>
            <Text style={styles.backText}>← Room</Text>
          </Pressable>
        ) : <View />}
        <Text style={styles.roomName}>{displayName}'s room</Text>
      </View>
      {character === 'ja' ? (
        <View testID="scrapbook-ja-presence" style={styles.jaPresence} pointerEvents="none">
          <Text style={styles.jaStar}>✧</Text>
          <Text style={styles.jaName}>Ja</Text>
        </View>
      ) : (
        <View
          pointerEvents="none"
          style={[
            styles.actor,
            { height: companionHeight, width: companionWidth },
            character === 'rylane' && styles.syActor,
            character === 'cloud' && styles.cloudActor,
            character === 'night' && styles.nightActor,
          ]}
        >
          {character === 'cloud' && <View testID="scrapbook-cloud-aura" style={styles.cloudAura} />}
          <Image
            source={AVATARS[character]}
            resizeMode="contain"
            accessibilityLabel={displayName + ' companion inside their room'}
            testID={character === 'rylane' ? 'scrapbook-sy-actor' : 'scrapbook-room-companion'}
            style={styles.avatar}
          />
        </View>
      )}
      <View style={[styles.bottom, compactViewport && styles.bottomCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Bip with ${displayName}`}
          onPress={onBipPress}
          testID="scrapbook-bip-cta"
          style={({ pressed }) => [styles.cta, { borderColor: accent }, pressed && styles.pressed]}
        >
          <Text style={styles.ctaText}>Bip with {displayName}</Text>
          <Text style={[styles.ctaArrow, { color: accent }]}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

type LauncherProps = { companion?: string | null; onPress: () => void };
export function ScrapbookCheckInLauncher({ companion, onPress }: LauncherProps) {
  const displayName = scrapbookCompanionDisplayName(companion);
  return (
    <Pressable
      testID="scrapbook-check-in-launcher"
      accessibilityRole="button"
      accessibilityLabel={`Enter ${displayName}'s scrapbook room`}
      onPress={onPress}
      style={({ pressed }) => [styles.launcher, pressed && styles.pressed]}
    >
      <Text style={styles.launcherText}>♡ visit {displayName}'s room →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#09031c', overflow: 'hidden' },
  topRow: { position: 'absolute', left: 16, right: 16, top: 12, zIndex: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  topCompact: { top: 5, left: 9, right: 9 },
  back: { minHeight: 44, minWidth: 76, paddingHorizontal: 12, backgroundColor: 'rgba(253,247,234,0.93)', borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  backText: { fontWeight: '700', color: '#2c1d38', fontSize: 14 },
  roomName: { color: '#f8efff', fontSize: 14, fontWeight: '700', textShadowColor: '#0c051e', textShadowRadius: 6 },
  actor: { position: 'absolute', bottom: '12%', left: '3%', zIndex: 8, justifyContent: 'flex-end', alignItems: 'center' },
  syActor: { left: '19%' },
  nightActor: { left: '6%' },
  cloudActor: { left: '22%', bottom: '24%' },
  avatar: { width: '100%', height: '100%' },
  cloudAura: { position: 'absolute', bottom: '12%', left: '4%', right: '4%', height: '75%', borderRadius: 999, backgroundColor: 'rgba(123, 216, 255, 0.27)', shadowColor: '#b7f4ff', shadowOpacity: 0.8, shadowRadius: 35 },
  jaPresence: { position: 'absolute', left: '20%', right: '20%', top: '42%', height: 175, alignItems: 'center', justifyContent: 'center', zIndex: 8 },
  jaStar: { color: '#ffe0a2', fontSize: 106, textShadowColor: '#ffdb98', textShadowRadius: 30 },
  jaName: { color: '#fff0cc', fontSize: 27, fontWeight: '800' },
  bottom: { position: 'absolute', bottom: 24, left: 26, right: 26, zIndex: 12 },
  bottomCompact: { bottom: 12, left: 16, right: 16 },
  cta: { minHeight: 56, maxWidth: 420, width: '100%', alignSelf: 'center', borderWidth: 1, borderRadius: 17, backgroundColor: 'rgba(27,12,46,0.9)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, gap: 16 },
  ctaText: { color: '#fff7f1', fontSize: 19, fontWeight: '800' },
  ctaArrow: { fontSize: 26, fontWeight: '700' },
  pressed: { opacity: 0.75 },
  launcher: { position: 'absolute', bottom: 112, right: 12, minHeight: 44, minWidth: 140, zIndex: 40, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(222,191,146,0.65)', backgroundColor: 'rgba(31,13,52,0.87)', alignItems: 'center', justifyContent: 'center' },
  launcherText: { color: '#f3e5fa', fontSize: 12, fontWeight: '700' },
});

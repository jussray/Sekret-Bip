import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { Character, RoomPhase } from '../../constants/theme';

export type RoomWallIdentity = Character | 'ja';

const PHASE_HEADINGS: Record<RoomPhase, string> = {
  day: 'DAY CHECK-IN',
  midday: 'MIDDAY CHECK-IN',
  afternoon: 'AFTERNOON CHECK-IN',
  evening: 'EVENING CHECK-IN',
  rain: 'RAINY CHECK-IN',
  night: 'NIGHT CHECK-IN',
  deepNight: 'LATE-NIGHT CHECK-IN',
};

const WALL_LINES: Record<RoomWallIdentity, Record<RoomPhase, string>> = {
  raylene: {
    day: 'a fresh page is still yours.',
    midday: 'you can begin again at any hour.',
    afternoon: 'softness and strength can sit together.',
    evening: 'you showed up for yourself today.',
    rain: 'some days need a gentler pace.',
    night: 'you deserve a quiet corner of the world.',
    deepNight: 'rest belongs on the list too.',
  },
  rylane: {
    day: 'one solid move at a time.',
    midday: 'you can reset the play.',
    afternoon: 'a small win is still a win.',
    evening: 'you made it through today.',
    rain: 'slow progress still moves forward.',
    night: 'you do not have to figure it all out.',
    deepNight: 'tomorrow can take the next turn.',
  },
  cloud: {
    day: 'float toward what feels possible.',
    midday: 'a little room to breathe counts.',
    afternoon: 'the clouds are allowed to move slowly.',
    evening: 'you can set the day down.',
    rain: 'rainy thoughts deserve a soft landing.',
    night: 'there is room for quiet here.',
    deepNight: 'dreams do not need a deadline.',
  },
  night: {
    day: 'notice what matters, not just what is loud.',
    midday: 'you can trust a quiet moment.',
    afternoon: 'some answers arrive when you slow down.',
    evening: 'the day can end without every answer.',
    rain: 'let the storm pass at its own pace.',
    night: 'there is still light in the quiet.',
    deepNight: 'you can leave some thoughts for daylight.',
  },
  ja: {
    day: 'curiosity can open a new page.',
    midday: 'a good question is a beginning.',
    afternoon: 'follow the thought that matters.',
    evening: 'your story gets to unfold.',
    rain: 'questions can be held gently.',
    night: 'you can wonder without rushing.',
    deepNight: 'tomorrow can bring a new perspective.',
  },
};

const ACCENTS: Record<RoomWallIdentity, string> = {
  raylene: '#e9a6cb',
  rylane: '#b6caff',
  cloud: '#a5e3f2',
  night: '#c7b6f1',
  ja: '#dfc38a',
};

export function getRoomWallCopy(character: RoomWallIdentity, phase: RoomPhase) {
  return {
    eyebrow: PHASE_HEADINGS[phase],
    message: WALL_LINES[character][phase],
    accent: ACCENTS[character],
  };
}

type RoomWallScrapbookProps = {
  character: RoomWallIdentity;
  phase: RoomPhase;
  customMessage?: string | null;
};

const writingFont = Platform.select({ ios: 'Noteworthy', android: 'sans-serif-medium', web: 'cursive' });

/** A readable, non-interactive note pinned to the actual room wall. Room art and hotspots stay separate. */
export function RoomWallScrapbook({ character, phase, customMessage }: RoomWallScrapbookProps) {
  const copy = getRoomWallCopy(character, phase);
  const message = customMessage?.trim() || copy.message;

  return (
    <View
      pointerEvents="none"
      testID="room-wall-scrapbook"
      style={[styles.wall, character === 'night' && styles.nightWall]}
    >
      <View style={styles.tape} />
      <Text style={styles.eyebrow} testID="room-wall-phase">{copy.eyebrow}</Text>
      <Text style={styles.message} testID="room-wall-message">{message}</Text>
      <View style={styles.bottomMark}>
        <Text style={[styles.heart, { color: copy.accent }]}>♡</Text>
        <Text style={styles.signature}>a little note for today</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wall: {
    position: 'absolute',
    zIndex: 7,
    top: '17%',
    right: '7%',
    width: '48%',
    maxWidth: 210,
    minHeight: 112,
    paddingHorizontal: 13,
    paddingTop: 18,
    paddingBottom: 10,
    borderRadius: 3,
    backgroundColor: 'rgba(251,246,235,0.94)',
    transform: [{ rotate: '-2deg' }],
    shadowColor: '#140926',
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
  nightWall: { right: '5%', top: '18%', transform: [{ rotate: '1deg' }] },
  tape: {
    position: 'absolute',
    width: 54,
    height: 16,
    top: -9,
    left: '31%',
    backgroundColor: 'rgba(210,175,120,0.82)',
    transform: [{ rotate: '4deg' }],
  },
  eyebrow: { color: '#6d536e', fontSize: 9, fontWeight: '800', letterSpacing: 1.05 },
  message: { color: '#38253b', fontFamily: writingFont, fontSize: 15, fontWeight: '700', lineHeight: 21, marginTop: 8 },
  bottomMark: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7 },
  heart: { fontFamily: writingFont, fontSize: 16 },
  signature: { color: '#84708a', fontFamily: writingFont, fontSize: 9 },
});

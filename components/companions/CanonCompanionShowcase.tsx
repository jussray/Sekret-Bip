import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Pressable, StyleSheet, Text, View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FRONT_DOOR_FAMILY,
  type FamilyMemberId,
  type FrontDoorFamilyMember,
} from '../../constants/frontDoorFamilyCanon';

type Props = {
  motionEnabled: boolean;
  onContinue: () => void;
};

// These positions make ONE layered family scene—not a swipe carousel.
// Portraits are cut from previously approved founder-supplied references.
const positions: Record<FamilyMemberId, { x: number; y: number; tilt: string }> = {
  dad: { x: 18, y: 4, tilt: '-5deg' },
  mom: { x: 62, y: 4, tilt: '5deg' },
  sy: { x: 2, y: 29, tilt: '-4deg' },
  night: { x: 27, y: 28, tilt: '-2deg' },
  suhana: { x: 52, y: 28, tilt: '2deg' },
  cloud: { x: 77, y: 29, tilt: '4deg' },
  'bip-jr-1': { x: 2, y: 66, tilt: '-3deg' },
  'bip-jr-2': { x: 27, y: 66, tilt: '3deg' },
  'bip-jr-3': { x: 52, y: 66, tilt: '-3deg' },
  'bip-jr-4': { x: 77, y: 66, tilt: '4deg' },
};

export function CanonCompanionShowcase({ motionEnabled, onContinue }: Props) {
  const [selected, setSelected] = useState<FrontDoorFamilyMember | null>(null);
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const stageWidth = Math.min(width - (compact ? 14 : 48), 880);
  const stageHeight = compact ? (width < 350 ? 282 : 335) : 490;
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!motionEnabled) {
      drift.stopAnimation();
      drift.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(drift, {
        toValue: 1, duration: 2500, easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(drift, {
        toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [drift, motionEnabled]);

  const cloudFloat = motionEnabled
    ? drift.interpolate({ inputRange: [0, 1], outputRange: [0, -5] })
    : 0;

  return (
    <View testID="canon-companion-showcase" style={styles.root}>
      <View style={styles.headingWrap}>
        <Text style={styles.heading}>Your Se’kret Bip Family</Text>
        <Text style={styles.subheading}>A place for every voice, every story ✦</Text>
      </View>

      <View
        testID="family-composition"
        accessible={false}
        style={[styles.stage, { width: stageWidth, height: stageHeight }]}
      >
        <LinearGradient
          pointerEvents="none"
          colors={['#170824', '#301348', '#160A2C']}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={styles.moon} />
        <Text pointerEvents="none" style={[styles.star, styles.starOne]}>✦</Text>
        <Text pointerEvents="none" style={[styles.star, styles.starTwo]}>✧</Text>
        <Text pointerEvents="none" style={[styles.star, styles.starThree]}>✦</Text>
        <View pointerEvents="none" style={styles.glow} />

        {FRONT_DOOR_FAMILY.map(member => {
          const spot = positions[member.id];
          const isChild = member.row === 'children';
          const isParent = member.row === 'parents';
          const cardWidth = Math.round(stageWidth * (isParent ? 0.195 : isChild ? 0.208 : 0.215));
          const imageHeight = Math.round(stageHeight * (isParent ? 0.255 : isChild ? 0.272 : 0.305));
          const portrait = (
            <View style={styles.portraitFrame}>
              <Image
                testID={member.id === 'sy' ? 'web-welcome-hero-teen' : `family-portrait-${member.id}`}
                source={member.portrait}
                resizeMode="cover"
                style={{ width: '100%', height: imageHeight - 6, borderRadius: 5 }}
                accessibilityLabel={`${member.name}, ${member.role}, approved family art`}
              />
            </View>
          );

          return (
            <Pressable
              key={member.id}
              testID={`family-member-${member.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Meet ${member.name}, ${member.role}`}
              accessibilityState={{ selected: selected?.id === member.id }}
              onPress={() => setSelected(member)}
              style={({ pressed }) => [
                styles.person,
                { left: `${spot.x}%`, top: `${spot.y}%`, width: cardWidth, transform: [{ rotate: spot.tilt }] },
                selected?.id === member.id && styles.active,
                pressed && styles.pressed,
              ]}
            >
              <View pointerEvents="none" style={styles.tape} />
              {member.id === 'cloud'
                ? <Animated.View style={{ width: '100%', transform: [{ translateY: cloudFloat }] }}>{portrait}</Animated.View>
                : portrait}
              <Text
                numberOfLines={1}
                style={[styles.name, compact && styles.nameSmall]}
              >{member.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {selected && (
        <View testID="canon-companion-detail" style={styles.detail}>
          <View style={styles.detailText}>
            <Text style={styles.detailTitle}>{selected.name} · {selected.role}</Text>
            <Text style={styles.detailNote}>Part of your Se’kret Bip family</Text>
          </View>
          <Pressable
            testID="canon-companion-continue"
            accessibilityRole="button"
            accessibilityLabel="Continue to Se'kret Bip account setup"
            onPress={onContinue}
            style={styles.close}
          >
            <Text style={styles.closeText}>Enter →</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            testID="canon-companion-close"
            accessibilityLabel="Close family introduction"
            onPress={() => setSelected(null)}
            style={styles.close}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  root: { width: '100%', alignItems: 'center', paddingVertical: 10 },
  headingWrap: { alignItems: 'center', paddingHorizontal: 14, marginBottom: 9 },
  heading: {
    color: '#F8E9FF', fontFamily: 'Georgia', fontSize: 25, textAlign: 'center',
    textShadowColor: '#BB78EE', textShadowRadius: 12,
  },
  subheading: { color: '#E3C9F7', fontSize: 12, textAlign: 'center', marginTop: 3 },
  stage: {
    position: 'relative', overflow: 'hidden', alignSelf: 'center',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(238,186,255,0.55)',
    backgroundColor: '#210D35', shadowColor: '#BB79F2',
    shadowOpacity: 0.33, shadowRadius: 20, shadowOffset: { width: 0, height: 6 },
  },
  moon: {
    position: 'absolute', width: 108, height: 108, borderRadius: 54,
    top: 20, left: '50%', marginLeft: -54, backgroundColor: 'rgba(210,180,255,0.13)',
    borderWidth: 1, borderColor: 'rgba(240,202,255,0.35)',
  },
  glow: {
    position: 'absolute', height: '50%', width: '100%', bottom: 0,
    backgroundColor: 'rgba(132,73,177,0.10)',
  },
  star: {
    position: 'absolute', color: '#FFD898', textShadowColor: '#E4B2FF',
    textShadowRadius: 9, fontSize: 22,
  },
  starOne: { top: 18, left: 18 },
  starTwo: { top: 56, right: 28, fontSize: 28 },
  starThree: { bottom: 33, left: '48%' },
  person: {
    position: 'absolute', alignItems: 'center', padding: 2,
    borderRadius: 10, zIndex: 2,
  },
  portraitFrame: {
    width: '100%', padding: 3, borderRadius: 9, backgroundColor: '#F6E4D7',
    borderWidth: 1, borderColor: '#F5CE9F',
  },
  tape: {
    position: 'absolute', top: -3, zIndex: 4, width: '45%', height: 9,
    backgroundColor: 'rgba(255,192,234,0.64)', transform: [{ rotate: '-4deg' }],
  },
  name: {
    backgroundColor: '#F9E9DE', color: '#3B184A', overflow: 'hidden',
    textAlign: 'center', fontFamily: 'Georgia', fontSize: 12, fontWeight: '700',
    paddingVertical: 3, paddingHorizontal: 2, width: '105%', borderRadius: 5, marginTop: -3,
  },
  nameSmall: { fontSize: 10 },
  active: { backgroundColor: 'rgba(250,210,140,0.42)' },
  pressed: { opacity: 0.78 },
  detail: {
    width: '92%', flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', padding: 12, gap: 10, marginTop: 10,
    borderColor: 'rgba(255,218,157,0.62)', borderWidth: 1, borderRadius: 14,
    backgroundColor: '#281138',
  },
  detailText: { flex: 1 },
  detailTitle: { color: '#FFE6BE', fontFamily: 'Georgia', fontSize: 16 },
  detailNote: { color: '#EBD5F7', fontSize: 11, marginTop: 2 },
  close: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 8, backgroundColor: '#51226A' },
  closeText: { color: '#FFFFFF', fontWeight: '700' },
  continue: { paddingVertical: 9, paddingHorizontal: 18, marginTop: 12, borderRadius: 99,
    borderWidth: 1, borderColor: '#DEB5FF', backgroundColor: 'rgba(114,58,145,0.54)' },
  continueText: { color: '#F9EBFF', fontSize: 13, fontWeight: '700' },
});

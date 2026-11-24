import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Easing, Image, Platform, Pressable, ScrollView, StyleSheet,
  Text, View, useWindowDimensions,
} from 'react-native';
import {
  CANON_COMPANION_ORDER,
  type CanonCompanion,
} from '../../constants/companionVisualCanon';

type Props = {
  motionEnabled: boolean;
  onContinue: () => void;
};

/**
 * Public visual preview; entry still delegates to the existing age/auth router.
 * All five portraits are cropped from the exact founder-selected poster.
 */
export function CanonCompanionShowcase({ motionEnabled, onContinue }: Props) {
  const [selected, setSelected] = useState<CanonCompanion | null>(null);
  const float = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const compact = width < 520;
  const cardWidth = compact ? Math.min(280, Math.round(width * 0.68)) : 176;

  useEffect(() => {
    if (!motionEnabled) {
      float.stopAnimation();
      float.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(float, {
        toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(float, {
        toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [float, motionEnabled]);

  const cloudMotion = {
    transform: [{
      translateY: motionEnabled ? float.interpolate({
        inputRange: [0, 1], outputRange: [0, -6],
      }) : 0,
    }],
  };

  return (
    <View testID="canon-companion-showcase" style={styles.section}>
      <Text style={styles.heading}>Se’kret Bip Family</Text>
      <Text style={styles.subheading}>Your people. Your stories. ✦</Text>
      <ScrollView
        testID="canon-companion-scroll"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, { paddingHorizontal: compact ? Math.max(16, (width - cardWidth) / 2) : 20 }]}
        snapToInterval={compact ? cardWidth + 14 : undefined}
        decelerationRate={compact ? 'fast' : 'normal'}
        accessibilityLabel="Se'kret Bip family companion portraits"
      >
        {CANON_COMPANION_ORDER.map(companion => {
          const portrait = (
            <View style={styles.photoFrame}>
              <Image
                testID={compact && companion.id === 'sy' ? 'web-welcome-hero-teen' : undefined}
                source={companion.portrait}
                style={styles.photo}
                resizeMode="cover"
                accessibilityLabel={`${companion.name}, ${companion.role}, approved portrait`}
              />
            </View>
          );
          return (
            <Pressable
              testID="canon-companion-select"
              key={companion.id}
              accessibilityRole="button"
              accessibilityLabel={`Meet ${companion.name}, ${companion.role}`}
              accessibilityState={{ selected: selected?.id === companion.id }}
              onPress={() => setSelected(companion)}
              style={({ pressed }) => [
                styles.card, { width: cardWidth }, compact && styles.compactCard,
                selected?.id === companion.id && styles.cardSelected,
                pressed && styles.cardPressed,
              ]}
            >
              <View style={styles.tape} pointerEvents="none" />
              {companion.id === 'cloud'
                ? <Animated.View style={cloudMotion}>{portrait}</Animated.View>
                : portrait}
              <View style={styles.paperName}>
                <Text style={styles.companionName}>{companion.name} {companion.symbol}</Text>
                <Text style={styles.companionRole}>{companion.role}</Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      {selected ? (
        <View testID="canon-companion-detail" style={styles.detail}>
          <Text style={styles.detailTitle}>{selected.name} · {selected.role}</Text>
          <Text style={styles.detailTraits}>{selected.traits.join(' · ')}</Text>
          <View style={styles.actions}>
            <Pressable
              testID="canon-companion-continue"
              accessibilityRole="button"
              accessibilityLabel="Continue to Se'kret Bip account setup"
              onPress={onContinue}
              style={styles.continue}
            >
              <Text style={styles.continueText}>Enter Se’kret Bip →</Text>
            </Pressable>
            <Pressable
              testID="canon-companion-close"
              accessibilityRole="button"
              accessibilityLabel="Close companion introduction"
              onPress={() => setSelected(null)}
              style={styles.close}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>Choose a portrait to meet a companion ✦</Text>
      )}
    </View>
  );
}

const handwritten = Platform.select({ ios: 'Noteworthy', android: 'sans-serif-medium', web: 'cursive' });

const styles = StyleSheet.create({
  section: {
    width: '100%', paddingTop: 15, paddingBottom: 20, overflow: 'hidden',
    backgroundColor: 'rgba(24,6,42,0.18)',
    borderTopWidth: 0, borderTopColor: 'transparent',
  },
  heading: {
    fontFamily: 'Georgia', color: '#F8EDF9', fontSize: 29,
    textAlign: 'center', marginHorizontal: 18, textShadowColor: '#B96EFF',
    textShadowRadius: 8,
  },
  subheading: { color: '#E7D5F4', textAlign: 'center', fontSize: 13, marginTop: 5 },
  row: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 18, gap: 14, alignItems: 'flex-start' },
  card: {
    width: 176, alignItems: 'center',
    paddingTop: 8, paddingHorizontal: 7, paddingBottom: 10,
    borderWidth: 1, borderColor: 'rgba(232,199,255,0.19)',
    borderRadius: 15, backgroundColor: 'rgba(50,18,75,0.42)',
  },
  compactCard: { backgroundColor: 'rgba(51,13,72,0.32)', borderColor: 'rgba(250,213,255,0.28)' },
  cardSelected: { borderColor: '#FFD68C', backgroundColor: 'rgba(87,44,117,0.54)' },
  cardPressed: { opacity: 0.76 },
  tape: {
    width: 72, height: 19, position: 'absolute', top: -4, zIndex: 3,
    backgroundColor: 'rgba(242,177,228,0.72)', transform: [{ rotate: '-4deg' }],
    borderRadius: 2,
  },
  photoFrame: {
    width: '100%', aspectRatio: 0.62, padding: 4, backgroundColor: '#F5E8D7',
    borderRadius: 7, borderWidth: 1, borderColor: '#F8CFA1',
    shadowColor: '#CC8FFF', shadowOpacity: 0.32, shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
  },
  photo: { width: '100%', height: '100%', borderRadius: 3, backgroundColor: '#200E35' },
  paperName: {
    width: '100%', alignItems: 'center', marginTop: -18, zIndex: 2,
    backgroundColor: '#F7E9D9', paddingVertical: 7, paddingHorizontal: 4,
    borderRadius: 4, transform: [{ rotate: '-2deg' }],
    shadowColor: '#000', shadowOpacity: 0.24, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  companionName: { color: '#351B41', fontFamily: handwritten, fontSize: 20, lineHeight: 25 },
  companionRole: { color: '#432352', fontFamily: 'Georgia', fontSize: 12, marginTop: 1 },
  hint: { color: '#E8D2F4', textAlign: 'center', fontSize: 12, marginTop: 2 },
  detail: {
    marginHorizontal: 18, marginTop: 6, padding: 15,
    backgroundColor: 'rgba(19,4,34,0.94)', borderWidth: 1,
    borderColor: 'rgba(244,197,133,0.6)', borderRadius: 15,
  },
  detailTitle: { color: '#F9E7C8', fontFamily: 'Georgia', fontSize: 20, textAlign: 'center' },
  detailTraits: { color: '#F6E5FF', fontSize: 13, textAlign: 'center', marginTop: 7 },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 15, flexWrap: 'wrap' },
  continue: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7040AD' },
  continueText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  close: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#A87ACC' },
  closeText: { color: '#F9E7FF', fontSize: 14 },
});

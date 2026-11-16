/**
 * Approved Se'kret Bip Universe public welcome.
 * Only the public view changes; existing server-owned onboarding and guardianship
 * routes remain authoritative after a visitor chooses a portal.
 */
import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { AccountSide } from '@/features/identity/accountProfile';

const UNIVERSE_ART = require('../assets/brand/sekret-bip-universe-canon.jpg');
const ART_RATIO = 1672 / 941;

type Portal = {
  id: 'teens' | 'bip-jr' | 'parents';
  destination: AccountSide;
  label: string;
};

/** Bip Jr stays parent-supervised, never a standalone child account. */
const PORTALS: readonly Portal[] = [
  { id: 'teens', destination: 'teen', label: 'Enter Teens, your own creative space' },
  { id: 'bip-jr', destination: 'parent', label: 'Enter Bip Jr with a parent or guardian' },
  { id: 'parents', destination: 'parent', label: 'Enter Parents and guardians, to manage your family' },
];

export type CanonUniverseWelcomeProps = {
  onEnter: (side: AccountSide) => void;
  showSignIn?: boolean;
  defaultSide?: AccountSide;
};

export function CanonUniverseWelcome({
  onEnter,
  showSignIn = false,
  defaultSide = 'teen',
}: CanonUniverseWelcomeProps) {
  const { width, height } = useWindowDimensions();
  const compact = width < 780;
  const horizontalPadding = compact ? 12 : 24;
  const usableHeight = Math.max(260, height - (compact ? 290 : 90));
  const artWidth = Math.max(0, Math.min(
    width - horizontalPadding * 2,
    1480,
    compact ? Number.POSITIVE_INFINITY : usableHeight * ART_RATIO,
  ));
  const artHeight = artWidth / ART_RATIO;

  return (
    <View style={[styles.page, { minHeight: height }]} testID="bip-universe-welcome">
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          compact && styles.scrollContentCompact,
          compact && { paddingTop: Math.max(26, Math.min(height * 0.09, 78)) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text accessibilityRole="header" style={styles.screenReaderOnly}>
          Se’kret Bip Universe. A magical space to learn, grow, and belong.
        </Text>
        <View style={[styles.artFrame, { width: artWidth, height: artHeight }]}>
          <Image
            testID="bip-universe-hero"
            source={UNIVERSE_ART}
            resizeMode="contain"
            accessible={false}
            importantForAccessibility="no"
            style={styles.art}
          />
          {PORTALS.map((portal, index) => (
            <Pressable
              key={portal.id}
              testID={`bip-universe-portal-${portal.id}`}
              accessibilityRole="button"
              accessibilityLabel={portal.label}
              accessibilityHint="Opens the selected Bip space"
              onPress={() => onEnter(portal.destination)}
              style={({ pressed }) => [
                styles.portalHitArea,
                index === 0 ? styles.teenHitArea : index === 1 ? styles.bipJrHitArea : styles.parentHitArea,
                pressed && styles.portalPressed,
              ]}
            />
          ))}
        </View>
        {showSignIn && (
          <Pressable
            testID="bip-universe-sign-in"
            accessibilityRole="button"
            accessibilityLabel="Sign in to an existing Se’kret Bip account"
            onPress={() => router.push(`/(auth)/login?side=${defaultSide}` as never)}
            style={({ pressed }) => [styles.signIn, pressed && styles.signInPressed]}
          >
            <Text style={styles.signInText}>Already a member? Sign in</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#08051C' },
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 12,
  },
  scrollContentCompact: { justifyContent: 'flex-start' },
  artFrame: { position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#110A30' },
  art: { width: '100%', height: '100%' },
  // The three illustrated archways are the only portal controls on every viewport.
  portalHitArea: { position: 'absolute', top: '60%', height: '32%', minHeight: 44, borderRadius: 20 },
  teenHitArea: { left: '9%', width: '27%' },
  bipJrHitArea: { left: '36%', width: '28%' },
  parentHitArea: { left: '64%', width: '29%' },
  portalPressed: { backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 2, borderColor: '#FFFFFF' },
  signIn: { paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  signInPressed: { opacity: 0.7 },
  signInText: { color: '#F7EAFF', fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  screenReaderOnly: { position: 'absolute', width: 1, height: 1, opacity: 0, overflow: 'hidden' },
});

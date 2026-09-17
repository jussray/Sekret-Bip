import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { ParentRoomScreen } from '@screens/ParentRoomScreen';
import { RoomExploreGuide } from '@/components/rooms/RoomExploreGuide';
import { resolveParentEntryState } from '@/services/parentEntryState';
import { routeForSide } from '@/shared/routes';

const LINK_REQUIRED_ROUTES = new Set([
  'bridge',
  'parent-connection',
  'parent-growth',
]);

type LinkState = 'loading' | 'linked' | 'unlinked' | 'error';

export default function ParentRoomRoute() {
  const { parentMood, parentMoodDate, setParentMood, parentRoomStyle } = useAppContext();
  const [linkState, setLinkState] = useState<LinkState>('loading');

  const verifyLink = useCallback(async () => {
    setLinkState('loading');
    try {
      const state = await resolveParentEntryState();
      if (state.state === 'ready') {
        setLinkState('linked');
      } else if (state.state === 'parent_link_required') {
        setLinkState('unlinked');
      } else {
        setLinkState('error');
      }
    } catch {
      setLinkState('error');
    }
  }, []);

  useEffect(() => {
    void verifyLink();
  }, [verifyLink]);

  const openTeenLink = useCallback(() => {
    router.push('/(onboarding)/parent-link' as any);
  }, []);

  const openParentScreen = useCallback((screen: string) => {
    if (LINK_REQUIRED_ROUTES.has(screen) && linkState !== 'linked') {
      if (linkState === 'unlinked') openTeenLink();
      return;
    }

    router.push(routeForSide('parent', screen) as any);
  }, [linkState, openTeenLink]);

  return (
    <View style={styles.root}>
      <ParentRoomScreen
        parentRoomStyle={(parentRoomStyle === 'dad' ? 'dad' : 'mom')}
        parentMood={parentMood}
        previousMood={parentMoodDate || undefined}
        setParentMood={setParentMood}
        setScreen={openParentScreen}
        BottomNav={null}
      />

      {linkState === 'linked' ? (
        <RoomExploreGuide side="parent" onNavigate={openParentScreen} />
      ) : null}

      {linkState === 'unlinked' ? (
        <View style={styles.linkCard} accessibilityRole="summary">
          <Text style={styles.linkKicker}>YOUR PARENT SIDE IS READY</Text>
          <Text style={styles.linkTitle}>No teen linked yet.</Text>
          <Text style={styles.linkBody}>
            Use your room now. Bridge, Connection, and Growth will unlock after you and your teen approve a private link.
          </Text>
          <TouchableOpacity
            onPress={openTeenLink}
            activeOpacity={0.85}
            style={styles.linkButton}
            accessibilityRole="button"
            accessibilityLabel="Link a teen"
          >
            <Text style={styles.linkButtonText}>Link a Teen →</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {linkState === 'error' ? (
        <View style={styles.linkCard} accessibilityRole="alert">
          <Text style={styles.linkKicker}>PRIVATE LINK CHECK</Text>
          <Text style={styles.linkTitle}>Couldn’t verify your link.</Text>
          <Text style={styles.linkBody}>
            Bridge, Connection, and Growth stay locked until the account service confirms the relationship.
          </Text>
          <TouchableOpacity
            onPress={() => void verifyLink()}
            activeOpacity={0.85}
            style={styles.linkButton}
            accessibilityRole="button"
            accessibilityLabel="Retry private link check"
          >
            <Text style={styles.linkButtonText}>Try Again →</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06030f' },
  linkCard: {
    position: 'absolute',
    top: 126,
    left: 20,
    right: 20,
    zIndex: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(167,243,208,0.38)',
    backgroundColor: 'rgba(4,16,12,0.94)',
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  linkKicker: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  linkTitle: { color: '#fff', fontSize: 21, fontWeight: '900', marginBottom: 7 },
  linkBody: { color: '#b7c9bf', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  linkButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkButtonText: { color: '#062015', fontSize: 14, fontWeight: '900' },
});

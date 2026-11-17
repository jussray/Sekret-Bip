import { Redirect, Tabs, useGlobalSearchParams, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { GlobalMoodButton } from '@/components/GlobalMoodButton';
import { SideSafeBackButton } from '@/components/SideSafeBackButton';
import { SafetyExperienceSheet } from '../../components/safety/SafetyExperienceSheet';
import { useAppContext } from '@/context/AppContext';
import { useSafetyCheck } from '@/hooks/useSafetyCheck';
import { useSleepGuard } from '../../hooks/useSleepGuard';
import { isQuietRouteAllowed } from '@/features/quiet/quietMode';
import { toCompanionId } from '@/features/sekret/companionEngine';
import { hydrateAccountProfile } from '@/features/identity/accountProfile';
import { getDevSplitViewSideOverride } from '@/utils/devSplitViewSide';
import { logEvent } from '@/services/logEvent';
import { isFounderPreviewEnabled } from '@/constants/founderPreview';

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}

function TeenTabs({ selectedSekret, quietActive }: { selectedSekret: string; quietActive: boolean }) {
  const companionId = toCompanionId(selectedSekret ?? 'raylene');
  const { experience, clear } = useSafetyCheck(companionId, true);

  return (
    <View style={{ flex: 1 }}>
      <SafetyExperienceSheet experience={experience} onDismiss={clear} />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: quietActive
            ? { display: 'none' }
            : { backgroundColor: '#111827', borderTopWidth: 0, height: 68, paddingBottom: 10 },
          tabBarActiveTintColor: '#fff',
          tabBarInactiveTintColor: '#94A3B8',
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        }}
      >
        <Tabs.Screen name="room" options={{ title: 'Room', tabBarIcon: () => <TabIcon emoji="🏠" /> }} />
        <Tabs.Screen name="pages" options={{ title: 'Pages', tabBarIcon: () => <TabIcon emoji="📖" /> }} />
        <Tabs.Screen name="calm" options={{ title: 'Calm', tabBarIcon: () => <TabIcon emoji="🌙" /> }} />
        <Tabs.Screen name="calm/breathe" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarIcon: () => <TabIcon emoji="🌐" /> }} />
        <Tabs.Screen name="circle/feed" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="circle/feed-v2" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => <TabIcon emoji="•••" /> }} />
        <Tabs.Screen name="user-room" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="sekret" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="voicebip" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="cloud" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="cloudThoughts" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="comfort" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="crew" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="settings" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="points" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="chores" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="history" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="continuity" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="bridge" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="s2tell" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="period-calendar" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="discover" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="profile" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="chat/index" options={{ href: null }} />
        <Tabs.Screen name="chat/[personalityId]" options={{ href: null }} />
        <Tabs.Screen name="bippin2" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="bippin2/womanhood" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="bippin2/manhood" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="growth" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="mind-body-reset" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="body-workout" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="companion-chat" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="pages/[id]" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="pages/history" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="pages/new" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="circle/[id]" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="circle/weather" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="resources" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="quiet" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
        <Tabs.Screen name="meaning" options={{ tabBarButton: () => null, tabBarItemStyle: { display: 'none' } }} />
      </Tabs>
      {!quietActive && <SideSafeBackButton side="teen" />}
      {!quietActive && <GlobalMoodButton />}
    </View>
  );
}

function TeenLoadingSurface() {
  return <View style={{ flex: 1, backgroundColor: '#0d0820' }} />;
}

export default function TeenLayout() {
  const { userSide, isLoading, selectedSekret } = useAppContext();
  const [profileChecked, setProfileChecked] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const sessionLogged = useRef(false);
  const founderPreview = isFounderPreviewEnabled();
  const devSideOverride = getDevSplitViewSideOverride();
  const pathname = usePathname();
  const { companion } = useGlobalSearchParams<{ companion?: string | string[] }>();
  const { sleepActive, sleepLoaded } = useSleepGuard();
  const quietRouteAllowed = isQuietRouteAllowed({ pathname, companion });

  useEffect(() => {
    // Duplicate web URLs can resolve through the teen route group first. When
    // Split View explicitly selects Parent, route there before touching Teen
    // account state, mirroring the parent layout's symmetric skip below.
    if (devSideOverride === 'parent') return;

    let active = true;
    hydrateAccountProfile('teen')
      .then(profile => {
        if (active) {
          setProfileComplete(Boolean(
            profile?.accountSide === 'teen' && profile.onboardingComplete,
          ));
        }
      })
      .catch(() => {
        if (active) setProfileComplete(false);
      })
      .finally(() => {
        if (active) setProfileChecked(true);
      });
    return () => {
      active = false;
    };
  }, [devSideOverride]);

  const effectiveUserSide = devSideOverride ?? userSide;
  const isTeenActive = founderPreview || (
    !isLoading &&
    profileChecked &&
    profileComplete &&
    (effectiveUserSide === 'teen' || devSideOverride != null)
  );

  useEffect(() => {
    if (isTeenActive && !sessionLogged.current) {
      sessionLogged.current = true;
      logEvent('session_start');
    }
  }, [isTeenActive]);

  // Split View and exact-head browser proof can land on the teen copy of a
  // duplicate web URL first. Honor the explicit side even outside Founder
  // Preview (mirrors the parent layout's symmetric check) so /(teen) and
  // /(parent) remain deterministic in development, pathname included —
  // without this, a parent-side pane that resolves into this route group
  // falls through to the generic `/(parent)/room` redirect below and loses
  // whatever path it was actually trying to reach.
  if (devSideOverride === 'parent') {
    return <Redirect href={`/(parent)${pathname}` as never} />;
  }

  // Founder Preview bypasses only route/onboarding visibility in development.
  // Quiet Bip remains a product boundary, so preview still honors Sleep Guard.
  if (founderPreview) {
    if (!sleepLoaded) return <TeenLoadingSurface />;
    if (sleepActive && !quietRouteAllowed) return <Redirect href="/(teen)/quiet" />;
    return <TeenTabs selectedSekret={selectedSekret ?? 'raylene'} quietActive={sleepActive} />;
  }

  if (isLoading || !profileChecked || !sleepLoaded) return <TeenLoadingSurface />;
  if (effectiveUserSide === 'parent') return <Redirect href="/(parent)/room" />;
  if (effectiveUserSide !== 'teen') return <Redirect href="/" />;
  if (!profileComplete) return <Redirect href="/(onboarding)/welcome" />;
  if (sleepActive && !quietRouteAllowed) return <Redirect href="/(teen)/quiet" />;
  return <TeenTabs selectedSekret={selectedSekret ?? 'raylene'} quietActive={sleepActive} />;
}

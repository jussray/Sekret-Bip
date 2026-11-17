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
        <Tabs.Screen name="calm/breathe" options={{ href: null }} />
        <Tabs.Screen name="circle" options={{ title: 'Circle', tabBarIcon: () => <TabIcon emoji="🌐" /> }} />
        <Tabs.Screen name="circle/feed" options={{ href: null }} />
        <Tabs.Screen name="circle/feed-v2" options={{ href: null }} />
        <Tabs.Screen name="more" options={{ title: 'More', tabBarIcon: () => <TabIcon emoji="•••" /> }} />
        <Tabs.Screen name="user-room" options={{ href: null }} />
        <Tabs.Screen name="sekret" options={{ href: null }} />
        <Tabs.Screen name="voicebip" options={{ href: null }} />
        <Tabs.Screen name="cloud" options={{ href: null }} />
        <Tabs.Screen name="cloudThoughts" options={{ href: null }} />
        <Tabs.Screen name="comfort" options={{ href: null }} />
        <Tabs.Screen name="crew" options={{ href: null }} />
        <Tabs.Screen name="settings" options={{ href: null }} />
        <Tabs.Screen name="points" options={{ href: null }} />
        <Tabs.Screen name="chores" options={{ href: null }} />
        <Tabs.Screen name="history" options={{ href: null }} />
        <Tabs.Screen name="continuity" options={{ href: null }} />
        <Tabs.Screen name="bridge" options={{ href: null }} />
        <Tabs.Screen name="s2tell" options={{ href: null }} />
        <Tabs.Screen name="period-calendar" options={{ href: null }} />
        <Tabs.Screen name="discover" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="chat/index" options={{ href: null }} />
        <Tabs.Screen name="chat/[personalityId]" options={{ href: null }} />
        <Tabs.Screen name="bippin2" options={{ href: null }} />
        <Tabs.Screen name="bippin2/womanhood" options={{ href: null }} />
        <Tabs.Screen name="bippin2/manhood" options={{ href: null }} />
        <Tabs.Screen name="growth" options={{ href: null }} />
        <Tabs.Screen name="mind-body-reset" options={{ href: null }} />
        <Tabs.Screen name="body-workout" options={{ href: null }} />
        <Tabs.Screen name="companion-chat" options={{ href: null }} />
        <Tabs.Screen name="pages/[id]" options={{ href: null }} />
        <Tabs.Screen name="pages/history" options={{ href: null }} />
        <Tabs.Screen name="pages/new" options={{ href: null }} />
        <Tabs.Screen name="circle/[id]" options={{ href: null }} />
        <Tabs.Screen name="circle/weather" options={{ href: null }} />
        <Tabs.Screen name="resources" options={{ href: null }} />
        <Tabs.Screen name="quiet" options={{ href: null }} />
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
  }, []);

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
  // duplicate web URL first. Honor the explicit side before Founder Preview
  // renders so /(teen) and /(parent) remain deterministic in development.
  if (founderPreview && devSideOverride === 'parent') {
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

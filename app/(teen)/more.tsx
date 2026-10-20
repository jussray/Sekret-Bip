import React from 'react';
import { router } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { THEME_PACKS } from '@constants/theme';
import { MoreScreen } from '@screens/MoreScreen';
import { routeForSide } from '@/shared/routes';

export default function MoreRoute() {
  const { theme, mood, selectedSekret, userSide, setUserSide } = useAppContext();
  const t = THEME_PACKS[theme] ?? THEME_PACKS.neon;
  const side = userSide ?? 'teen';

  function handleSetScreen(screen: string) {
    if (screen === 'parent-room') {
      router.push('/(parent)/room' as any);
    } else if (screen === 'home') {
      router.push('/(teen)/room' as any);
    } else if (screen === 'dev-control-room') {
      router.push('/(dev)/control-room' as any);
    } else if (screen === 'dev-split-view') {
      router.push('/(dev)/split-view' as any);
    } else if (screen === 'dev-feature-preview') {
      router.push('/(dev)/feature-preview' as any);
    } else {
      router.push(routeForSide(side, screen) as any);
    }
  }

  return (
    <MoreScreen
      t={t}
      mood={mood}
      selectedSekret={selectedSekret}
      userSide={side}
      setUserSide={(s: string) => setUserSide(s === 'parent' ? 'parent' : 'teen')}
      setScreen={handleSetScreen}
      onSideChanged={() => {}}
      BottomNav={null}
    />
  );
}

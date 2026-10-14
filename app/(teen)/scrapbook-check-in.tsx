import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { TEEN_ROUTES } from '@/teen/routes';
import {
  ScrapbookCompanionScene,
  normalizeScrapbookCompanion,
} from '../../components/rooms/ScrapbookCompanionScene';

export default function ScrapbookCheckInRoute() {
  const { selectedSekret } = useAppContext();
  const { companion } = useLocalSearchParams<{ companion?: string | string[] }>();
  const requestedCompanion = Array.isArray(companion) ? companion[0] : companion;
  const activeCompanion = requestedCompanion ?? selectedSekret;
  const companionKey = normalizeScrapbookCompanion(activeCompanion);

  const openPages = () => {
    router.push({
      pathname: TEEN_ROUTES.pages,
      params: { companion: companionKey },
    } as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09031c' }} edges={['top', 'bottom']}>
      <ScrapbookCompanionScene
        companion={activeCompanion}
        onBack={() => router.replace(TEEN_ROUTES.room as never)}
        onBipPress={openPages}
      />
    </SafeAreaView>
  );
}

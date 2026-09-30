import React from 'react';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { TEEN_ROUTES } from '@/teen/routes';
import {
  ScrapbookCompanionScene,
  normalizeScrapbookCompanion,
} from '../../components/rooms/ScrapbookCompanionScene';

export default function ScrapbookCheckInRoute() {
  const { selectedSekret } = useAppContext();
  const companionKey = normalizeScrapbookCompanion(selectedSekret);

  const openPages = () => {
    router.push({
      pathname: TEEN_ROUTES.pages,
      params: { companion: companionKey },
    } as never);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09031c' }} edges={['top', 'bottom']}>
      <ScrapbookCompanionScene
        companion={selectedSekret}
        onBack={() => router.replace(TEEN_ROUTES.room as never)}
        onBipPress={openPages}
      />
    </SafeAreaView>
  );
}

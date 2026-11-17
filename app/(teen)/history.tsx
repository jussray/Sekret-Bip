import React from 'react';
import { router } from 'expo-router';
import { MeaningfulHistoryScreen } from '@screens/MeaningfulHistoryScreen';
import { navigateTo } from '@/utils/navigation';

export default function HistoryRoute() {
  return (
    <MeaningfulHistoryScreen
      onBack={() => router.back()}
      onNavigate={(screen: string) => navigateTo(screen, 'teen')}
    />
  );
}

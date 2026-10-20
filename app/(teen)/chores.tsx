import React from 'react';
import { TeenChoresScreen } from '@screens/TeenChoresScreen';
import { navigateTo } from '@/utils/navigation';

export default function ChoresRoute() {
  return (
    <TeenChoresScreen
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
      BottomNav={null}
    />
  );
}

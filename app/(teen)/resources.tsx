import React from 'react';
import { ResourcesScreen } from '@screens/ResourcesScreen';
import { navigateTo } from '@/utils/navigation';

export default function ResourcesRoute() {
  return (
    <ResourcesScreen
      side="teen"
      BottomNav={null}
      setScreen={(screen: string) => navigateTo(screen, 'teen')}
    />
  );
}

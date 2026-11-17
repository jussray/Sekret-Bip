import React from 'react';
import { ResourcesScreen } from '@screens/ResourcesScreen';
import { parentNavigateTo } from '@/parent/navigation';

export default function ParentResourcesRoute() {
  return (
    <ResourcesScreen
      side="parent"
      BottomNav={null}
      setScreen={parentNavigateTo}
    />
  );
}

import React from 'react';
import { router } from 'expo-router';
import { ParentApprovalsScreen } from '@screens/ParentApprovalsScreen';
import { routeForSide } from '@/shared/routes';
import { useLinkedBridge } from '@/hooks/useLinkedBridge';

export default function ParentApprovalsRoute() {
  const linkedTeen = useLinkedBridge();
  return (
    <ParentApprovalsScreen
      teenId={linkedTeen.linkedTeenId}
      isLinked={linkedTeen.isLinked}
      setScreen={(screen: string) => router.push(routeForSide('parent', screen) as any)}
      BottomNav={null}
    />
  );
}

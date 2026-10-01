import React from 'react';
import { View } from 'react-native';

import { BridgeFamilyVisitEntryCard } from '@/features/bridge/BridgeFamilyVisitEntryCard';
import { ParentBridgeSummaryScreen } from '@/features/bridge/ParentBridgeSummaryScreen';

export default function ParentBridgeRoute() {
  return (
    <View style={{ flex: 1, backgroundColor: '#0d0715' }}>
      <BridgeFamilyVisitEntryCard />
      <View style={{ flex: 1 }}>
        <ParentBridgeSummaryScreen />
      </View>
    </View>
  );
}

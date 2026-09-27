/**
 * src/components/room/hotspots/RoomHotspotLayer.tsx
 *
 * Renders an array of hotspot configs as an overlay above the room.
 *
 * Usage:
 *   const hotspots: HotspotConfig[] = [
 *     { id: 'lamp', x: 0.72, y: 0.18, label: 'Lamp', onPress: () => {} },
 *     { id: 'journal', x: 0.3, y: 0.6, label: 'Open journal', onPress: () => {} },
 *   ];
 *   <RoomHotspotLayer hotspots={hotspots} />
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RoomHotspot, type HotspotConfig } from './RoomHotspot';

interface RoomHotspotLayerProps {
  hotspots: HotspotConfig[];
}

export function RoomHotspotLayer({ hotspots }: RoomHotspotLayerProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {hotspots.map((h) => (
        <RoomHotspot key={h.id} {...h} />
      ))}
    </View>
  );
}

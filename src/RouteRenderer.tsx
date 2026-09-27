// Copyright © 2026 Juss Ray. All rights reserved. Proprietary and confidential.
/**
 * src/RouteRenderer.tsx
 *
 * PHASE 4 FIX: Hard-gated. This component cannot mount in production.
 * Expo Router is the active navigation system. Do not import or render
 * this file from anywhere in the app.
 */
import React from 'react';
import { View, Text } from 'react-native';

if (__DEV__) {
  console.warn(
    '[RouteRenderer] This component is disabled. Expo Router is the active router. ' +
    'Do not mount RouteRenderer anywhere in the app.'
  );
}

export default function RouteRenderer() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d0d' }}>
      <Text style={{ color: '#ef4444', fontSize: 14, textAlign: 'center', padding: 24 }}>
        RouteRenderer is disabled.{' '}\nExpo Router handles all navigation.
      </Text>
    </View>
  );
}

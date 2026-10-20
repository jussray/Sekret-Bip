/**
 * src/components/room/useRoomParallax.ts  (v2)
 *
 * Guards the expo-sensors import so the build doesn't fail
 * if expo-sensors hasn't been installed yet.
 *
 * Install with:  npx expo install expo-sensors
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

const MAX_OFFSET  = 8;
const LERP_SPEED  = 120;

type GyroscopeModule = {
  isAvailableAsync: () => Promise<boolean>;
  setUpdateInterval: (intervalMs: number) => void;
  addListener: (listener: (measurement: { x: number; y: number; z: number }) => void) => { remove: () => void };
};

let Gyroscope: GyroscopeModule | null = null;
try {
  Gyroscope = require('expo-sensors').Gyroscope as GyroscopeModule;
} catch {
  // expo-sensors not installed — idle float will be used instead.
}

export interface RoomParallaxResult {
  offset: Animated.ValueXY;
}

export function useRoomParallax(): RoomParallaxResult {
  const offset   = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const idleAnim = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    const startIdleFloat = () => {
      const floatX = Animated.sequence([
        Animated.timing(offset.x, { toValue:  MAX_OFFSET * 0.4, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(offset.x, { toValue: -MAX_OFFSET * 0.4, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]);
      const floatY = Animated.sequence([
        Animated.timing(offset.y, { toValue: -MAX_OFFSET * 0.25, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(offset.y, { toValue:  MAX_OFFSET * 0.25, duration: 2800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]);
      idleAnim.current = Animated.loop(Animated.parallel([floatX, floatY]));
      idleAnim.current.start();
    };

    if (!Gyroscope) {
      startIdleFloat();
      return () => idleAnim.current?.stop();
    }

    Gyroscope.isAvailableAsync().then((available) => {
      if (!available) { startIdleFloat(); return; }

      Gyroscope!.setUpdateInterval(16);
      let targetX = 0, targetY = 0;

      subscription = Gyroscope!.addListener(({ x, y }) => {
        targetX = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, targetX + y * 1.5));
        targetY = Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, targetY + x * 1.5));
        Animated.spring(offset, {
          toValue: { x: targetX, y: targetY },
          speed: LERP_SPEED,
          bounciness: 0,
          useNativeDriver: true,
        }).start();
      });
    });

    return () => {
      subscription?.remove();
      idleAnim.current?.stop();
    };
  }, [offset]);

  return { offset };
}

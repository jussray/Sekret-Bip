/**
 * AmbientWeatherOverlay
 *
 * A full-screen, pointer-events-none layer that renders an ambient particle /
 * light effect matching the current time-of-day phase.
 *
 *   day / midday  → cool white sun-ray shafts drifting slowly
 *   afternoon     → warm golden-hour shafts, lower angle
 *   evening       → deep amber shafts + subtle warm wash
 *   rain          → falling rain streaks + random lightning flash
 *   night         → twinkling stars + soft moon glow
 *   deepNight     → same as night, dimmer
 *
 * Usage:
 *   <AmbientWeatherOverlay />               // auto-detects phase from clock
 *   <AmbientWeatherOverlay phase={roomPhase} />  // caller supplies phase
 *
 * All animations run on the native driver (transform + opacity only).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getRoomPhase, type RoomPhase } from '../constants/theme';

const { width: W, height: H } = Dimensions.get('window');

// ─── Phase → effect mapping ───────────────────────────────────────────────────

type WeatherMode = 'sunRays' | 'goldenHour' | 'eveningGlow' | 'rain' | 'night' | 'deepNight';

const PHASE_TO_MODE: Record<string, WeatherMode> = {
  auto:      'sunRays',
  day:       'sunRays',
  midday:    'sunRays',
  afternoon: 'goldenHour',
  evening:   'eveningGlow',
  rain:      'rain',
  night:     'night',
  deepNight: 'deepNight',
};

// ─── Sun / golden-hour rays ───────────────────────────────────────────────────

const RAY_DEFS = [
  { x: W * 0.07, w: W * 0.10 },
  { x: W * 0.26, w: W * 0.07 },
  { x: W * 0.44, w: W * 0.13 },
  { x: W * 0.62, w: W * 0.08 },
  { x: W * 0.80, w: W * 0.11 },
];

// Per-ray drift & opacity ranges — gives organic variation off one anim value.
const RAY_DRIFT: [number, number][]   = [[-8, 8], [-5, 11], [-11, 5], [-6, 9], [-9, 6]];
const RAY_OPACITY: [number, number][] = [[0.55, 0.90], [0.40, 0.75], [0.60, 1.0], [0.45, 0.80], [0.50, 0.85]];

type RayPalette = { colors: [string, string, string]; angle: string; maxOpacity: number };

const RAY_PALETTES: Record<'cool' | 'warm' | 'amber', RayPalette> = {
  cool:  { colors: ['rgba(255,255,230,0)', 'rgba(255,255,220,0.11)', 'rgba(255,255,230,0)'], angle: '-13deg', maxOpacity: 0.90 },
  warm:  { colors: ['rgba(255,210,100,0)', 'rgba(255,200,80,0.13)',  'rgba(255,210,100,0)'], angle: '-9deg',  maxOpacity: 0.85 },
  amber: { colors: ['rgba(255,150,40,0)',  'rgba(255,130,20,0.14)',  'rgba(255,150,40,0)'],  angle: '-6deg',  maxOpacity: 0.80 },
};

function SunRaysLayer({ palette }: { palette: 'cool' | 'warm' | 'amber' }) {
  const p      = RAY_PALETTES[palette];
  const anim   = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 2200, useNativeDriver: true }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 9000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]} pointerEvents="none">
      {RAY_DEFS.map((ray, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: ray.x,
            top: -H * 0.12,
            width: ray.w,
            height: H * 1.24,
            transform: [
              { rotate: p.angle },
              { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: RAY_DRIFT[i] }) },
            ],
            opacity: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [RAY_OPACITY[i][0], RAY_OPACITY[i][1], RAY_OPACITY[i][0]],
            }),
          }}
        >
          <LinearGradient
            colors={p.colors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ))}
    </Animated.View>
  );
}

// ─── Rain + lightning ─────────────────────────────────────────────────────────

const RAIN_COUNT = 10;

// Pre-seed positions at module load so they're stable across renders.
const RAIN_LEFT = Array.from(
  { length: RAIN_COUNT },
  (_, i) => (i / RAIN_COUNT) * W + ((i * 37 + 11) % 29)
);

function RainLayer() {
  const streaks   = useRef(Array.from({ length: RAIN_COUNT }, () => new Animated.Value(0))).current;
  const lightning = useRef(new Animated.Value(0)).current;
  const ltRef     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Rain streaks — same as ComfortScreen
    streaks.forEach((anim, i) => {
      const loop = () => {
        anim.setValue(0);
        Animated.timing(anim, {
          toValue: 1,
          duration: 1400 + ((i * 137 + 43) % 900),
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => { if (finished) loop(); });
      };
      setTimeout(loop, i * 175 + ((i * 53) % 380));
    });

    // Lightning — fires randomly every 5–14 seconds
    const flash = () => {
      ltRef.current = setTimeout(() => {
        Animated.sequence([
          Animated.timing(lightning, { toValue: 0.38, duration: 55,  useNativeDriver: true }),
          Animated.timing(lightning, { toValue: 0,    duration: 95,  useNativeDriver: true }),
          Animated.timing(lightning, { toValue: 0.28, duration: 45,  useNativeDriver: true }),
          Animated.timing(lightning, { toValue: 0,    duration: 120, useNativeDriver: true }),
        ]).start(flash);
      }, 5000 + ((Date.now() % 9000)));
    };
    flash();

    return () => { if (ltRef.current) clearTimeout(ltRef.current); };
  }, []);

  return (
    <>
      {streaks.map((anim, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.rainStreak,
            {
              left: RAIN_LEFT[i],
              opacity: anim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.42, 0.42, 0] }),
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-40, H + 40] }) }],
            },
          ]}
        />
      ))}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: '#ddeeff', opacity: lightning }]}
      />
    </>
  );
}

// ─── Night stars ──────────────────────────────────────────────────────────────

const STARS = [
  { x: 0.08, y: 0.035 }, { x: 0.23, y: 0.08  }, { x: 0.42, y: 0.025 },
  { x: 0.57, y: 0.065 }, { x: 0.72, y: 0.018 }, { x: 0.88, y: 0.055 },
  { x: 0.15, y: 0.155 }, { x: 0.34, y: 0.125 }, { x: 0.62, y: 0.175 },
  { x: 0.79, y: 0.105 }, { x: 0.93, y: 0.145 }, { x: 0.48, y: 0.215 },
  { x: 0.03, y: 0.245 }, { x: 0.68, y: 0.275 }, { x: 0.86, y: 0.235 },
];

function NightStarsLayer({ dim }: { dim: boolean }) {
  const stars    = useRef(STARS.map((_, i) => new Animated.Value((i % 3) * 0.33))).current;
  const moonGlow = useRef(new Animated.Value(0)).current;
  const fadeIn   = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 2800, useNativeDriver: true }).start();

    stars.forEach((anim, i) => {
      const dur = 1700 + (i * 319) % 1300;
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1,    duration: dur,       useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
          Animated.timing(anim, { toValue: 0.12, duration: dur + 250, useNativeDriver: true, easing: Easing.inOut(Easing.sin) }),
        ])
      ).start();
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(moonGlow, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(moonGlow, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const maxGlow = dim ? 0.07 : 0.12;
  const maxStar = dim ? 0.65 : 0.95;

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeIn }]} pointerEvents="none">
      {/* Moon glow — upper right halo */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.moonGlow,
          { opacity: moonGlow.interpolate({ inputRange: [0, 1], outputRange: [maxGlow * 0.4, maxGlow] }) },
        ]}
      />
      {/* Stars */}
      {STARS.map((pos, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.star,
            {
              left:    W * pos.x,
              top:     H * pos.y,
              opacity: stars[i].interpolate({ inputRange: [0, 1], outputRange: [0, maxStar] }),
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface AmbientWeatherOverlayProps {
  /** Supply the already-resolved phase to avoid re-computing from clock. */
  phase?: RoomPhase | 'auto';
}

export function AmbientWeatherOverlay({ phase }: AmbientWeatherOverlayProps) {
  const resolved = phase ?? getRoomPhase(new Date());
  const mode     = PHASE_TO_MODE[resolved];

  if (!mode) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {mode === 'sunRays'    && <SunRaysLayer palette="cool"  />}
      {mode === 'goldenHour' && <SunRaysLayer palette="warm"  />}
      {mode === 'eveningGlow'&& <SunRaysLayer palette="amber" />}
      {mode === 'rain'       && <RainLayer />}
      {mode === 'night'      && <NightStarsLayer dim={false} />}
      {mode === 'deepNight'  && <NightStarsLayer dim={true}  />}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  rainStreak: {
    position: 'absolute',
    top: 0,
    width: 1.5,
    height: 22,
    backgroundColor: 'rgba(180,210,255,0.55)',
    borderRadius: 1,
  },
  star: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#ddd8ff',
  },
  moonGlow: {
    position: 'absolute',
    top:   -H * 0.18,
    right: -W * 0.12,
    width:  W * 0.72,
    height: W * 0.72,
    borderRadius: W * 0.36,
    backgroundColor: '#c4b5fd',
  },
});

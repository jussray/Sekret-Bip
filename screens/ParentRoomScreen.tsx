// screens/ParentRoomScreen.tsx
//
// The room IS the interface. No cards. No grids. No dashboard.
//
// Room art fills the screen. Se'kret presence floats inside it.
// Tappable objects live where the objects are in the room.
// A soft mood check-in can be dragged anywhere the parent prefers.
// Nothing demands. The room waits.

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Text, View, TouchableOpacity,
  ImageBackground, Animated, StyleSheet,
  Platform, Dimensions, Easing, PanResponder,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { IMAGES, getParentRoomBg } from '../constants/theme';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';

const { width: W, height: H } = Dimensions.get('window');
const NAV_H = Platform.OS === 'ios' ? 84 : 64;
const TOP   = Platform.OS === 'ios' ? 56 : 36;
const MOOD_PANEL_POSITION_KEY = 'parent_mood_panel_position_v1';
const MOOD_PANEL_MARGIN = 12;
const MOOD_PANEL_ESTIMATED_HEIGHT = 144;

// ─── Types ───────────────────────────────────────────────────────────────────
export type ParentRoomStyle = 'mom' | 'dad';

type Point = { x: number; y: number };
type PanelSize = { width: number; height: number };

// ─── Overlay: dark vignette top + bottom, clear in the middle ─────────────────
const OVERLAY: Record<ParentRoomStyle, [string, string, string, string]> = {
  mom: ['rgba(30,8,58,0.68)', 'rgba(20,4,40,0.06)', 'rgba(20,4,40,0.04)', 'rgba(12,2,30,0.82)'],
  dad: ['rgba(4,7,22,0.70)',  'rgba(2,5,14,0.06)',  'rgba(2,5,14,0.04)',  'rgba(2,4,12,0.84)'],
};

// ─── Color tokens per room style ──────────────────────────────────────────────
const T: Record<ParentRoomStyle, { accent: string; soft: string; sub: string }> = {
  mom: { accent: '#c088d4', soft: '#f5eeff', sub: '#c8a8e8' },
  dad: { accent: '#5a9ad8', soft: '#d8eeff', sub: '#88b4d8' },
};

// ─── 4 moods only — no homework ──────────────────────────────────────────────
const MOODS = [
  { id: 'heavy',   emoji: '😩', label: 'Heavy' },
  { id: 'hopeful', emoji: '💜', label: 'Hopeful' },
  { id: 'worried', emoji: '😔', label: 'Worried' },
  { id: 'okay',    emoji: '😌', label: 'Okay' },
];

// ─── Ambient presence — not notifications, just voice in the room ─────────────
const PRESENCE = [
  "take a breath. we're solving a Tuesday problem.",
  "that kid still loves you. y'all just speaking different languages today.",
  "you don't gotta have every answer tonight.",
  "you showed up today. that counts.",
  "being present IS the plan.",
  "one rough conversation doesn't erase years of showing up.",
  "you can't pour from an empty cup. that's not selfish. that's math.",
  "small steps. big impact.",
  "the relationship matters more than being right tonight.",
  "progress over perfection. always.",
];

// ─── Se'kret responds to the mood you just chose (multiple options) ──────────
const MOOD_RESPONSES: Record<string, string[]> = {
  heavy: [
    "heavy is okay. you don't have to perform okay right now.",
    "when it's heavy, even breathing counts. you're still in it.",
    "heavy days don't mean you're losing. they mean you're carrying real things.",
    "put the weight down for five minutes. it'll still be there when you pick it back up. 😮‍💨",
  ],
  hopeful: [
    "that feeling you're holding? protect it. it's real.",
    "hopeful is a muscle. you just used it. 💜",
    "hold onto that. the hard days will try to argue with it.",
    "hope is not naive. it's brave. especially after the week you probably had.",
  ],
  worried: [
    "worried means you care. that's not nothing.",
    "worry without action is just pain. what's the one thing you can actually do today?",
    "your kid is lucky you care enough to worry. now breathe. 😮‍💨",
    "worried means you're paying attention. that's parenting.",
  ],
  okay: [
    "okay is enough. seriously. okay is its own kind of win.",
    "okay after a hard stretch is actually pretty solid. don't downplay that.",
    "'okay' is underrated. it means you're upright. that counts.",
    "okay today. that's real. 🧡",
  ],
};

// ─── Se'kret remembers — surfaces naturally, not every time ──────────────────
const MEMORY_PRESENCE: Record<string, string[]> = {
  heavy: [
    "you were carrying something heavy last time. still in it?",
    "checked on you. how's that weight today? ☕",
    "yesterday felt heavy. we taking it day by day today?",
  ],
  hopeful: [
    "you had some hope going last time. still feeling it? 💜",
    "you came in hopeful yesterday. holding onto that today?",
  ],
  worried: [
    "you were worried last time. how's that sitting today?",
    "yesterday had you anxious. checking in — how are we doing? ☕",
    "still carrying that worry from last time?",
  ],
  okay: [
    "you were holding it together last time. how we doing today?",
    "yesterday was okay. what about today? 🧡",
    "last time you said okay. just checking back in.",
  ],
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Time badge labels (same pattern as teen room) ───────────────────────────
const TIME_BADGE: Record<string, string> = {
  day:       '☀️ day',
  evening:   '🌆 evening',
  night:     '🌙 night',
  deepNight: '✨ late night',
  rain:      '🌧️ rain',
};

// ─── Room hotspots ────────────────────────────────────────────────────────────
// Point-based invisible CTAs — x/y are the center of the touch target as a
// fraction of screen width/height (0–1). Rendered BEHIND the room art; the
// art uses pointerEvents="none" so taps fall through to these. No visible
// icon, no ring, no label — matches screens/RoomScreen.tsx's pattern.
// Positions approximated from the room art layout: journal on coffee table
// (center-low), cloud neon on bookshelf (center-mid), laptop/bridge desk
// (right), cork board (right-upper), memory shelf (left-mid). Se'kret has
// its own dedicated pill below, so it isn't duplicated here.
type ParentHotspot = { id: string; x: number; y: number; route: string; label: string; size?: number };

const PARENT_HOTSPOTS: ParentHotspot[] = [
  { id: 'pages',      x: 0.42, y: 0.58, route: 'pages',             label: 'Pages'      },
  { id: 'bridge',     x: 0.74, y: 0.52, route: 'bridge',            label: 'Bridge'     },
  { id: 'circle',     x: 0.83, y: 0.38, route: 'circle',            label: 'Circle'     },
  { id: 'calm',       x: 0.13, y: 0.47, route: 'calm',              label: 'Calm'       },
  { id: 'connection', x: 0.58, y: 0.36, route: 'parent-connection', label: 'Connection' },
  { id: 'growth',     x: 0.31, y: 0.35, route: 'parent-growth',     label: 'Growth'     },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTimeSlot(weatherMode?: string) {
  if (weatherMode === 'rain') return 'rain';
  const h = new Date().getHours();
  if (h >= 5  && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'evening';
  if (h >= 21 || h < 1)  return 'night';
  return 'deepNight';
}

function getGreeting(style: ParentRoomStyle, slot: string) {
  if (slot === 'day')       return style === 'mom' ? "hey, mama. how's the day?" : "hey, dad. how's the day?";
  if (slot === 'evening')   return "you made it through. breathe.";
  if (slot === 'night')     return "still up? sit down for a sec.";
  if (slot === 'deepNight') return "put it down for tonight.";
  if (slot === 'rain')      return "it's a quiet one. take it.";
  return style === 'mom' ? "good morning, mama." : "good morning, dad.";
}

function isSavedPoint(value: unknown): value is Point {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<Point>;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

// ─── ParentRoomScreen ─────────────────────────────────────────────────────────
interface ParentRoomScreenProps {
  parentRoomStyle: ParentRoomStyle;
  parentMood:      string;
  previousMood?:   string;
  setParentMood:   (m: string) => void;
  setScreen:       (s: string) => void;
  weatherMode?:    string;
  BottomNav:       React.ReactNode;
}

export function ParentRoomScreen({
  parentRoomStyle, parentMood, previousMood,
  setParentMood, setScreen, weatherMode, BottomNav,
}: ParentRoomScreenProps) {
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const moodPanelWidth = Math.max(240, Math.min(360, viewportWidth - MOOD_PANEL_MARGIN * 2));

  const slot     = useMemo(() => getTimeSlot(weatherMode), [weatherMode]);
  const tokens   = T[parentRoomStyle];
  const roomBg   = getParentRoomBg(parentRoomStyle, weatherMode) ?? IMAGES.bgRayleneRoomNight;
  const overlay  = OVERLAY[parentRoomStyle];
  const greeting = getGreeting(parentRoomStyle, slot);

  // Memory line: computed once on mount — 60% chance when previous session had a mood
  const [memoryLine] = useState<string>(() => {
    if (!previousMood) return '';
    const lines = MEMORY_PRESENCE[previousMood];
    if (!lines || Math.random() > 0.60) return '';
    return pick(lines);
  });

  // Cycling quotes: if Se'kret has a memory, it leads; ambient quotes follow
  const [cyclingQuotes] = useState<string[]>(() =>
    memoryLine ? [memoryLine, ...PRESENCE] : [...PRESENCE]
  );

  // presenceIdx starts at 0 (memory line) if one exists, else random ambient
  const [presenceIdx, setPresenceIdx] = useState<number>(() =>
    memoryLine ? 0 : Math.floor(Math.random() * PRESENCE.length)
  );

  // Mood response: one response picked per mood selection, stable until mood changes
  const [moodResponse, setMoodResponse] = useState<string>(() => {
    if (!parentMood) return '';
    const opts = MOOD_RESPONSES[parentMood];
    return opts ? pick(opts) : '';
  });

  useEffect(() => {
    if (!parentMood) { setMoodResponse(''); return; }
    const opts = MOOD_RESPONSES[parentMood];
    if (opts) setMoodResponse(pick(opts));
  }, [parentMood]);

  // What Se'kret says: mood response → memory/ambient cycling
  const presenceLine = moodResponse || cyclingQuotes[presenceIdx % cyclingQuotes.length];

  const roomFade    = useRef(new Animated.Value(0)).current;
  const textFade    = useRef(new Animated.Value(0)).current;
  const cloudBreath = useRef(new Animated.Value(0)).current;
  const moodPop     = useRef(new Animated.Value(1)).current;

  // The mood panel uses absolute coordinates so touch and mouse dragging behave
  // consistently across native and web. Position is saved per device.
  const initialMoodPanelPoint = useRef<Point>({
    x: Math.max(MOOD_PANEL_MARGIN, (viewportWidth - moodPanelWidth) / 2),
    y: Math.max(
      TOP + 92,
      viewportHeight - NAV_H - MOOD_PANEL_ESTIMATED_HEIGHT - MOOD_PANEL_MARGIN,
    ),
  }).current;
  const moodPanelPosition = useRef(new Animated.ValueXY(initialMoodPanelPoint)).current;
  const moodPanelPoint = useRef<Point>(initialMoodPanelPoint);
  const dragStartPoint = useRef<Point>(initialMoodPanelPoint);
  const moodPanelSize = useRef<PanelSize>({
    width: moodPanelWidth,
    height: MOOD_PANEL_ESTIMATED_HEIGHT,
  });
  const viewportSize = useRef<PanelSize>({
    width: viewportWidth,
    height: viewportHeight,
  });

  function clampMoodPanelPoint(point: Point): Point {
    const panel = moodPanelSize.current;
    const viewport = viewportSize.current;
    const minX = MOOD_PANEL_MARGIN;
    const maxX = Math.max(minX, viewport.width - panel.width - MOOD_PANEL_MARGIN);
    const minY = TOP + 52;
    const maxY = Math.max(
      minY,
      viewport.height - NAV_H - panel.height - MOOD_PANEL_MARGIN,
    );

    return {
      x: Math.min(maxX, Math.max(minX, point.x)),
      y: Math.min(maxY, Math.max(minY, point.y)),
    };
  }

  function moveMoodPanel(point: Point) {
    const clamped = clampMoodPanelPoint(point);
    moodPanelPoint.current = clamped;
    moodPanelPosition.setValue(clamped);
  }

  function saveMoodPanelPosition() {
    void AsyncStorage.setItem(
      MOOD_PANEL_POSITION_KEY,
      JSON.stringify(moodPanelPoint.current),
    ).catch(() => {});
  }

  const moodPanelPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_event, gesture) =>
        Math.abs(gesture.dx) > 2 || Math.abs(gesture.dy) > 2,
      onPanResponderGrant: () => {
        dragStartPoint.current = { ...moodPanelPoint.current };
      },
      onPanResponderMove: (_event, gesture) => {
        moveMoodPanel({
          x: dragStartPoint.current.x + gesture.dx,
          y: dragStartPoint.current.y + gesture.dy,
        });
      },
      onPanResponderRelease: saveMoodPanelPosition,
      onPanResponderTerminate: saveMoodPanelPosition,
      onPanResponderTerminationRequest: () => false,
    }),
    [moodPanelPosition],
  );

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(MOOD_PANEL_POSITION_KEY)
      .then(raw => {
        if (!active || !raw) return;
        try {
          const saved = JSON.parse(raw) as unknown;
          if (isSavedPoint(saved)) moveMoodPanel(saved);
        } catch {
          // Bad local state should never strand the control off-screen.
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [moodPanelPosition]);

  useEffect(() => {
    viewportSize.current = { width: viewportWidth, height: viewportHeight };
    moodPanelSize.current.width = moodPanelWidth;
    moveMoodPanel(moodPanelPoint.current);
  }, [moodPanelPosition, moodPanelWidth, viewportHeight, viewportWidth]);

  // Se'kret reacts when the parent picks a mood
  useEffect(() => {
    if (!parentMood) return;
    Animated.sequence([
      Animated.timing(moodPop, { toValue: 1.30, duration: 140, useNativeDriver: true }),
      Animated.timing(moodPop, { toValue: 1.00, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [parentMood]);

  useEffect(() => {
    // Room fades in first, then text, then hotspots unlock
    Animated.sequence([
      Animated.timing(roomFade, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(textFade, { toValue: 1, duration: 550, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    const loop = Animated.loop(Animated.sequence([
      Animated.timing(cloudBreath, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(cloudBreath, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  const cloudScale   = cloudBreath.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
  const cloudOpacity = cloudBreath.interpolate({ inputRange: [0, 1], outputRange: [0.80, 1.0] });

  return (
    <View style={s.root}>
      {/* ── HOTSPOT LAYER — invisible CTAs behind the room art ───────────── */}
      {/* Rendered first so it sits below the art in z-order. The art below */}
      {/* uses pointerEvents="none", letting taps fall through to these.   */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {PARENT_HOTSPOTS.map(spot => (
          <TouchableOpacity
            key={spot.id}
            style={{
              position: 'absolute',
              left: W * spot.x - (spot.size ?? 40),
              top: H * spot.y - (spot.size ?? 40),
              width: spot.size ?? 80,
              height: spot.size ?? 80,
            }}
            onPress={() => setScreen(spot.route)}
            activeOpacity={0}
            accessibilityRole="button"
            accessibilityLabel={spot.label}
          />
        ))}
      </View>

      <AmbientWeatherOverlay />

      {/* ── ROOM ART — visual only; taps pass through to the hotspot layer ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: roomFade }]} pointerEvents="none">
        <ImageBackground source={roomBg} style={StyleSheet.absoluteFill} resizeMode="cover" />
      </Animated.View>

      {/* ── READABILITY VIGNETTE: dark top/bottom, clear middle ──────────── */}
      {/* pointerEvents="none" — visual only, must not block the hotspot layer below */}
      <LinearGradient
        colors={overlay}
        style={StyleSheet.absoluteFill}
        locations={[0, 0.28, 0.65, 1.0]}
        pointerEvents="none"
      />

      {/* ── TIME BADGE — small, top-left, same pattern as teen room ────────── */}
      <Animated.View style={[s.timeBadge, { opacity: textFade }]}>
        <Text style={[s.timeBadgeText, { color: tokens.sub }]}>{TIME_BADGE[slot] ?? slot}</Text>
      </Animated.View>

      {/* ── GREETING + PRESENCE — floating text, no borders, no cards ────── */}
      <Animated.View style={[s.topText, { opacity: textFade }]}>
        <Text style={s.greeting}>{greeting}</Text>
        <TouchableOpacity
          onPress={() => {
            if (!parentMood) {
              setPresenceIdx(i => (i + 1) % cyclingQuotes.length);
            }
          }}
          activeOpacity={parentMood ? 1 : 0.75}
        >
          <Text style={[s.presence, { color: tokens.soft }]}>
            "{presenceLine}"
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── SE'KRET — plain pill button, no cloud/bubble art ─────────────── */}
      <Animated.View style={[
        s.sekretPillWrap,
        // top: 0.22, clear of the Connection (0.36) / Growth (0.35) hotspot
        // zones below it — those were getting their taps swallowed by this
        // pill's higher z-order when the two overlapped.
        { left: W * 0.50 - 78, top: H * 0.22 },
        { transform: [{ scale: Animated.multiply(cloudScale, moodPop) }], opacity: cloudOpacity },
      ]}>
        <TouchableOpacity
          onPress={() => setScreen('sekret')}
          activeOpacity={0.75}
          style={[s.sekretPill, { borderColor: tokens.accent + '99', backgroundColor: 'rgba(6,3,15,0.55)' }]}
        >
          <Text style={[s.sekretPillText, { color: tokens.accent }]}>💬 Talk to Se'kret</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── MOVABLE MOOD CHECK-IN — drag by the handle, tap moods normally ── */}
      <Animated.View
        onLayout={event => {
          moodPanelSize.current = {
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          };
          moveMoodPanel(moodPanelPoint.current);
        }}
        style={[
          s.moodPanel,
          {
            width: moodPanelWidth,
            opacity: textFade,
            transform: moodPanelPosition.getTranslateTransform(),
          },
        ]}
      >
        <View
          {...moodPanelPanResponder.panHandlers}
          style={s.dragHandle}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Drag to move the mood check-in"
          accessibilityHint="Touch and drag this handle to reposition the mood choices"
        >
          <Text style={[s.dragDots, { color: tokens.sub }]}>•••</Text>
          <Text style={[s.dragLabel, { color: tokens.sub }]}>drag to move</Text>
        </View>

        <Text style={[s.moodAsk, { color: tokens.sub }]}>how you holding up?</Text>
        <View style={s.moodRow}>
          {MOODS.map(m => {
            const active = parentMood === m.id;
            return (
              <TouchableOpacity
                key={m.id}
                style={[
                  s.moodChip,
                  {
                    backgroundColor: active ? tokens.accent + '44' : 'rgba(0,0,0,0.32)',
                    borderColor: active ? tokens.accent : tokens.accent + '55',
                  },
                ]}
                onPress={() => setParentMood(m.id)}
                activeOpacity={0.7}
              >
                <Text style={s.moodEmoji}>{m.emoji}</Text>
                <Text style={[s.moodLabel, { color: active ? tokens.accent : tokens.sub }]}>
                  {m.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Animated.View>

      {BottomNav}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06030f', overflow: 'hidden' },

  // Time badge — top-right, minimal pill
  timeBadge: {
    position: 'absolute',
    top: TOP,
    right: 18,
    backgroundColor: 'rgba(0,0,0,0.42)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Top floating text — no borders, just shadows for readability
  topText: {
    position: 'absolute',
    top: TOP,
    left: 20,
    right: 90,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  presence: {
    fontSize: 13,
    fontStyle: 'italic',
    lineHeight: 21,
    textShadowColor: 'rgba(0,0,0,0.90)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 10,
  },

  // Se'kret entry point — plain pill, no cloud/bubble art
  sekretPillWrap: { position: 'absolute', alignItems: 'center' },
  sekretPill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  sekretPillText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  moodPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 30,
    elevation: 12,
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(4,2,12,0.94)',
    paddingHorizontal: 12,
    paddingBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.38,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  dragHandle: {
    width: '100%',
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 3,
  },
  dragDots: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 4,
    lineHeight: 14,
  },
  dragLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
    opacity: 0.8,
  },
  moodAsk: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 9,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.80)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  moodChip: {
    minWidth: 58,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: 'center',
  },
  moodEmoji: { fontSize: 17, marginBottom: 2 },
  moodLabel: { fontSize: 10, fontWeight: '600' },
});
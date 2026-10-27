import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  DimensionValue,
  Dimensions,
  Easing,
  Image,
  ImageSourcePropType,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AVATARS as THEME_AVATARS,
  IMAGES,
  THEME_PACKS,
  getRoomPhase,
  type Character,
  type RoomPhase,
  type VibeKey,
} from '../constants/theme';
import STICKER_IMAGES from '../constants/stickerImages';
import { FURNISH_CATALOG, type FurnishCategory } from '../constants/furnishingCatalog';
import { BareRoomRenderer } from '../components/rooms/BareRoomRenderer';
import { AmbientWeatherOverlay } from '../components/AmbientWeatherOverlay';
import { getCompanionRuntime } from '@/config/companionRuntimeRegistry';

const { width, height } = Dimensions.get('window');

const STORAGE_KEY    = 'sekretbip_user_room_v2';
const STORAGE_KEY_V1 = 'sekretbip_user_room_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LightingMode = RoomPhase | 'auto';

export interface PlacedItem {
  uid:       string;     // unique instance id
  stickerId: string;     // FurnishItem.id from FURNISH_CATALOG
  x:         number;     // % from left (0–100)
  y:         number;     // % from top  (0–100)
  scale:     number;     // default 1.0
}

export interface UserRoomConfig {
  baseRoomId:   Character;
  lightingMode: LightingMode;
  companionId:  Character;
  roomName:     string;
  placedItems:  PlacedItem[];
  vibeOverlay:  string;   // rgba color or 'none'
  roomQuote:    string;   // pinned note, max 60 chars
  glowColor:    string;   // hex for accent glow
}

const DEFAULT_USER_ROOM: UserRoomConfig = {
  baseRoomId:   'raylene',
  lightingMode: 'auto',
  companionId:  'raylene',
  roomName:     '',
  placedItems:  [],
  vibeOverlay:  'none',
  roomQuote:    '',
  glowColor:    '#c084fc',
};

// Spread-out default drop positions (right side / bottom to avoid companion on left)
const PLACE_SLOTS: { x: number; y: number }[] = [
  { x: 64, y: 26 }, { x: 76, y: 18 }, { x: 72, y: 46 },
  { x: 80, y: 60 }, { x: 56, y: 66 }, { x: 66, y: 38 },
  { x: 78, y: 32 }, { x: 60, y: 74 },
];

const MAX_PLACED = 8;

type Mood     = string;
type TimeOfDay = 'morning' | 'day' | 'evening' | 'night';
type Pose =
  | 'neutral' | 'happy' | 'thinking' | 'writing' | 'window' | 'fullbody'
  | 'confident' | 'playful' | 'sad' | 'mad' | 'surprised' | 'crouching'
  | 'softsmile' | 'tired' | 'annoyed' | 'overwhelmed' | 'protective' | 'lonely'
  | 'hopeful' | 'relaxed' | 'listening' | 'hurting' | 'inhishead' | 'inlove';
type RoomTarget =
  | 'home' | 'pages' | 'circle' | 'bippin2' | 'comfort' | 'calm'
  | 'voiceBip' | 'sekret' | 'cloudThoughts' | 'bridge' | 'parentBridge'
  | 's2tell' | 'settings' | 'more' | 'mindReset' | 'bodyReset'
  | 'periodCalendar' | 'dashboard' | 'companionPicker';

type Hotspot = {
  id: string;
  label: string;
  target: RoomTarget;
  style: ViewStyle;
  hint?: string;
  pulse?: boolean;
};

type AvatarMap = Partial<Record<Pose, ImageSourcePropType>>;
type CompanionPlacement = { bottom: DimensionValue; left: DimensionValue; w: number; h: number };

// ─── Asset maps ───────────────────────────────────────────────────────────────

const AVATARS: Record<Character, AvatarMap> = THEME_AVATARS as Record<Character, AvatarMap>;

const FALLBACK_AVATAR: Record<Character, ImageSourcePropType> = {
  raylene: IMAGES.rayleneNeutral,
  rylane:  IMAGES.rylaneNeutral,
  cloud:   IMAGES.cloudAvatarNeutral,
  night:   IMAGES.nightAvatarNeutral,
};

// ─── Visual overlays ──────────────────────────────────────────────────────────

const ROOM_PHASE_OVERLAYS: Record<RoomPhase, string> = {
  day:       'rgba(255,225,180,0.08)',
  midday:    'rgba(255,210,140,0.10)',
  afternoon: 'rgba(200,130,60,0.12)',
  evening:   'rgba(91,45,120,0.18)',
  rain:      'rgba(35,85,125,0.30)',
  night:     'rgba(20,10,55,0.28)',
  deepNight: 'rgba(5,3,24,0.48)',
};

const CHARACTER_OVERLAYS: Record<Character, string> = {
  raylene: 'transparent',
  rylane:  'transparent',
  cloud:   'transparent',
  night:   'rgba(6,2,22,0.25)',
};

// ─── Companion placement ──────────────────────────────────────────────────────
// Visual presence and the tap target intentionally have separate geometry.
// This lets the companion lead the composition without stealing Room hotspots.

const HUMAN_VISUAL_W = Math.min(width * 0.78, 420);
const HUMAN_VISUAL_H = Math.min(height * 0.62, 560);
const HUMAN_HIT_W    = Math.min(Math.max(width * 0.32, 124), 168);
const HUMAN_HIT_H    = Math.min(Math.max(height * 0.24, 190), 240);

const COMPANION_VISUAL_POSITIONS: Record<Character, CompanionPlacement> = {
  raylene: { bottom: '9%',  left: '-7%', w: HUMAN_VISUAL_W, h: HUMAN_VISUAL_H },
  rylane:  { bottom: '9%',  left: '20%', w: HUMAN_VISUAL_W, h: HUMAN_VISUAL_H },
  cloud:   { bottom: '24%', left: '16%', w: Math.min(width * 0.62, 280), h: Math.min(height * 0.38, 320) },
  night:   { bottom: '9%',  left: '-5%', w: HUMAN_VISUAL_W, h: HUMAN_VISUAL_H },
};

const COMPANION_HIT_TARGETS: Record<Character, CompanionPlacement> = {
  raylene: { bottom: '22%', left: '4%',  w: HUMAN_HIT_W, h: HUMAN_HIT_H },
  rylane:  { bottom: '22%', left: '34%', w: HUMAN_HIT_W, h: HUMAN_HIT_H },
  cloud:   { bottom: '31%', left: '31%', w: Math.min(Math.max(width * 0.28, 108), 148), h: Math.min(Math.max(height * 0.18, 150), 190) },
  night:   { bottom: '22%', left: '5%',  w: HUMAN_HIT_W, h: HUMAN_HIT_H },
};

// ─── Hotspot maps ─────────────────────────────────────────────────────────────
// Summon hotspot removed — companion image is the tap target now

const RAYLENE_HOTSPOTS: Hotspot[] = [
  { id: 'pages',         label: 'Journal 📖',       target: 'pages',         pulse: true,  hint: 'tap the journal', style: { bottom: '10%', left: '14%',  width: '36%', height: '18%' } },
  { id: 'voiceBip',      label: 'Headphones 🎙️',    target: 'voiceBip',                   hint: 'tap headphones',  style: { bottom: '14%', left: '2%',   width: '18%', height: '12%' } },
  { id: 'cloudThoughts', label: 'Cloud Lamp ☁️',    target: 'cloudThoughts', pulse: true,  hint: 'tap the cloud',   style: { top: '38%',   left: '26%',  width: '14%', height: '12%' } },
  { id: 'comfort',       label: 'Bed 🌙',            target: 'comfort',                    hint: 'tap the bed',     style: { top: '38%',   right: '6%',  width: '34%', height: '34%' } },
  { id: 'bippin2',       label: 'Growth Board ⭐',  target: 'bippin2',                    hint: 'tap the board',   style: { top: '4%',    left: '22%',  width: '24%', height: '26%' } },
  { id: 'circle',        label: 'Photo Wall 🌐',     target: 'circle',                     hint: 'tap the wall',    style: { top: '4%',    right: '0%',  width: '18%', height: '55%' } },
  { id: 'moodCheckIn',   label: 'Mood Check-In 🌤️', target: 'dashboard',     pulse: true,  hint: 'tap the window',  style: { top: '4%',    left: '0%',   width: '18%', height: '50%' } },
  { id: 'bridge',        label: 'Bridge 🌉',         target: 'bridge',                     hint: 'tap the bridge',  style: { bottom: '24%', right: '36%', width: '16%', height: '12%' } },
];

const RYLANE_HOTSPOTS: Hotspot[] = [
  { id: 'pages',         label: 'Journal 📖',       target: 'pages',         pulse: true,  hint: 'tap the journal', style: { bottom: '8%',  left: '18%', width: '38%', height: '20%' } },
  { id: 'voiceBip',      label: 'Headphones 🎙️',    target: 'voiceBip',                   hint: 'tap headphones',  style: { top: '40%',   left: '28%', width: '14%', height: '10%' } },
  { id: 'cloudThoughts', label: 'Cloud Neon ☁️',    target: 'cloudThoughts', pulse: true,  hint: 'tap the cloud',   style: { top: '26%',   left: '36%', width: '14%', height: '12%' } },
  { id: 'comfort',       label: 'Bed 🌙',            target: 'comfort',                    hint: 'tap the bed',     style: { top: '36%',   right: '6%', width: '36%', height: '36%' } },
  { id: 'bippin2',       label: 'Growth Board ⭐',  target: 'bippin2',                    hint: 'tap the board',   style: { top: '2%',    left: '26%', width: '24%', height: '28%' } },
  { id: 'circle',        label: 'Photo Wall 🌐',     target: 'circle',                     hint: 'tap the wall',    style: { top: '2%',    right: '0%', width: '20%', height: '50%' } },
  { id: 'moodCheckIn',   label: 'Mood Check-In 🌤️', target: 'dashboard',     pulse: true,  hint: 'tap the window',  style: { top: '2%',    left: '0%',  width: '20%', height: '55%' } },
  { id: 'bridge',        label: 'Bridge 🌉',         target: 'bridge',                     hint: 'tap the bridge',  style: { bottom: '24%', right: '36%', width: '16%', height: '12%' } },
];

const CLOUD_HOTSPOTS: Hotspot[] = [
  { id: 'headphones',    label: 'Headphones 🎧',     target: 'calm',          pulse: true,  hint: 'tap headphones',  style: { top: '28%', left: '8%',   width: '24%', height: '18%' } },
  { id: 'pages',         label: 'Floating Journal 📖', target: 'pages',        pulse: true,  hint: 'tap the journal', style: { top: '44%', left: '32%',  width: '36%', height: '20%' } },
  { id: 'voiceBip',      label: 'Cloud Mic 🎤',      target: 'voiceBip',                    hint: 'tap the mic',     style: { top: '22%', right: '10%', width: '20%', height: '16%' } },
  { id: 'cloudThoughts', label: 'Big Cloud ☁️',      target: 'cloudThoughts', pulse: true,  hint: 'float up here',   style: { top: '8%',  left: '22%',  width: '56%', height: '20%' } },
];

const NIGHT_HOTSPOTS: Hotspot[] = [
  { id: 'window',        label: 'Window 🪟',          target: 'cloudThoughts', pulse: true,  hint: 'look out',        style: { top: '4%',     left: '4%',  width: '44%', height: '44%' } },
  { id: 'pages',         label: 'Journal 📖',         target: 'pages',         pulse: true,  hint: 'tap the journal', style: { bottom: '16%', left: '6%',  width: '50%', height: '20%' } },
  { id: 'voiceBip',      label: 'Voice Bip Corner 🎙️', target: 'voiceBip',                  hint: 'voice bip corner',style: { top: '20%',   right: '2%', width: '26%', height: '28%' } },
  { id: 'comfort',       label: 'Moon Chair 🌙',      target: 'comfort',                     hint: 'sit in the chair',style: { top: '26%',   left: '34%', width: '36%', height: '40%' } },
  { id: 'bridge',        label: 'Reach Out 🌉',       target: 'bridge',                      hint: 'reach out',       style: { bottom: '30%', right: '6%', width: '22%', height: '16%' } },
];

const ROOM_HOTSPOTS: Record<Character, Hotspot[]> = {
  raylene: RAYLENE_HOTSPOTS,
  rylane:  RYLANE_HOTSPOTS,
  cloud:   CLOUD_HOTSPOTS,
  night:   NIGHT_HOTSPOTS,
};

// ─── VibeLab data ─────────────────────────────────────────────────────────────

const LIGHTING_PRESETS: { key: LightingMode; label: string; emoji: string; hint: string }[] = [
  { key: 'auto',      label: 'Follow the Sun',  emoji: '☀️',  hint: 'changes with your local time' },
  { key: 'day',       label: 'Morning Light',   emoji: '🌤️',  hint: 'soft golden morning' },
  { key: 'midday',    label: 'Bright Noon',     emoji: '🌞',  hint: 'clear and open' },
  { key: 'afternoon', label: 'Golden Hour',     emoji: '🌇',  hint: 'warm amber afternoon' },
  { key: 'evening',   label: 'Sunset Glow',     emoji: '🌆',  hint: 'purple-pink evening' },
  { key: 'rain',      label: 'Rainy Day',       emoji: '🌧️',  hint: 'cozy blue-grey rain' },
  { key: 'night',     label: 'Night Mode',      emoji: '🌙',  hint: 'deep violet night' },
  { key: 'deepNight', label: 'Deep Night',      emoji: '✦',   hint: '2AM energy, stars only' },
];

const ROOM_META: Record<Character, { name: string; emoji: string; vibe: string }> = {
  raylene: { name: `${getCompanionRuntime('raylene').label}'s Room`, emoji: '💜', vibe: 'scrapbook soft' },
  rylane:  { name: `${getCompanionRuntime('rylane').label}'s Room`,  emoji: '⚡', vibe: 'city night'      },
  cloud:   { name: 'Cloud Room',     emoji: '☁️', vibe: 'brain dump space' },
  night:   { name: "Night's Room",   emoji: '🌙', vibe: '2AM energy'      },
};

const ROOM_PREVIEWS: Record<Character, ImageSourcePropType> = {
  raylene: IMAGES.bgRayleneRoomEvening,
  rylane:  IMAGES.bgRylaneRoomEvening,
  cloud:   IMAGES.bgCloudRoomEvening,
  night:   IMAGES.bgNightRoomEvening,
};

type QuotePos = { top?: DimensionValue; bottom?: DimensionValue; left?: DimensionValue; right?: DimensionValue; rotation: string };

const VIBE_OVERLAYS: { label: string; emoji: string; color: string }[] = [
  { label: 'none',     emoji: '✦',  color: 'none' },
  { label: 'lavender', emoji: '💜', color: 'rgba(140,90,240,0.20)' },
  { label: 'rose',     emoji: '🌹', color: 'rgba(244,63,94,0.16)' },
  { label: 'ocean',    emoji: '🌊', color: 'rgba(14,165,233,0.18)' },
  { label: 'forest',   emoji: '🌿', color: 'rgba(16,185,129,0.15)' },
  { label: 'gold',     emoji: '✨', color: 'rgba(234,179,8,0.14)' },
  { label: 'midnight', emoji: '🌙', color: 'rgba(20,5,60,0.38)' },
  { label: 'ember',    emoji: '🔥', color: 'rgba(249,115,22,0.18)' },
];

const GLOW_COLORS: { label: string; color: string }[] = [
  { label: 'violet',  color: '#c084fc' },
  { label: 'pink',    color: '#f472b6' },
  { label: 'blue',    color: '#60a5fa' },
  { label: 'cyan',    color: '#22d3ee' },
  { label: 'emerald', color: '#34d399' },
  { label: 'amber',   color: '#fbbf24' },
  { label: 'rose',    color: '#fb7185' },
  { label: 'cream',   color: '#fef3c7' },
];

const QUOTE_POSITIONS: Record<Character, QuotePos> = {
  raylene: { top: '12%',   right: '4%',  rotation: '2deg'    },
  rylane:  { top: '14%',   right: '6%',  rotation: '-1.5deg' },
  cloud:   { bottom: '38%', left: '6%',  rotation: '3deg'    },
  night:   { bottom: '34%', right: '6%', rotation: '-2deg'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTimeOfDay = (): TimeOfDay => {
  const h = new Date().getHours();
  if (h >= 6  && h < 12) return 'morning';
  if (h >= 12 && h < 18) return 'day';
  if (h >= 18 && h < 22) return 'evening';
  return 'night';
};

const getPresenceLine = (companion: Character, tod: TimeOfDay): string => {
  const displayName = getCompanionRuntime(companion).label;
  if (companion === 'cloud') return `${displayName} is drifting nearby.`;
  if (companion === 'night') return tod === 'night' ? `${displayName} is here. Just us awake.` : `${displayName} is watching over.`;
  if (companion === 'raylene') return `${displayName} is nearby.`;
  return `${displayName} is posted up.`;
};

const getPose = (mood: Mood, tod: TimeOfDay, character: Character): Pose => {
  const m = mood.toLowerCase();
  if (character === 'night') {
    if (m.includes('overwhelm') || m.includes('stress'))                    return 'overwhelmed';
    if (m.includes('hurt') || m.includes('broken'))                         return 'hurting';
    if (m.includes('sad')  || m.includes('cry'))                            return 'sad';
    if (m.includes('lonel') || m.includes('alone'))                         return 'lonely';
    if (m.includes('angry') || m.includes('mad'))                           return 'annoyed';
    if (m.includes('tired') || m.includes('exhaust'))                       return 'tired';
    if (m.includes('happy') || m.includes('good'))                          return 'softsmile';
    if (m.includes('relax') || m.includes('calm') || m.includes('chill'))  return 'relaxed';
    if (tod === 'night') return 'window';
    return 'neutral';
  }
  if (character === 'raylene') {
    if (m.includes('overwhelm') || m.includes('anxious'))   return 'crouching';
    if (m.includes('sad')  || m.includes('hurt'))           return 'sad';
    if (m.includes('angry') || m.includes('mad'))           return 'mad';
    if (m.includes('happy') || m.includes('good'))          return 'happy';
    if (m.includes('playful') || m.includes('fun'))         return 'playful';
    if (m.includes('confident') || m.includes('proud'))     return 'confident';
    if (tod === 'night') return 'window';
    return 'neutral';
  }
  if (character === 'rylane') {
    if (m.includes('happy') || m.includes('good'))          return 'happy';
    if (m.includes('think') || m.includes('sad') || m.includes('angry')) return 'thinking';
    if (tod === 'night') return 'window';
    return 'neutral';
  }
  // cloud
  if (m.includes('happy') || m.includes('good'))   return 'happy';
  if (m.includes('think') || m.includes('listen')) return 'thinking';
  if (m.includes('tired') || m.includes('sleepy')) return 'window';
  return 'neutral';
};

const safe = (src: ImageSourcePropType | undefined, fallback: ImageSourcePropType): ImageSourcePropType =>
  src ?? fallback;

// Resolve image for any placed item — checks furnish catalog first, falls back to sticker images
function resolveItemSource(id: string): ImageSourcePropType | null {
  const fi = FURNISH_CATALOG.find(i => i.id === id);
  if (fi) return fi.source;
  const si = STICKER_IMAGES[id];
  return si ?? null;
}

// Category filter metadata for decor tab
const CATEGORY_META: Record<FurnishCategory | 'all', { label: string; emoji: string }> = {
  all:         { label: 'all',         emoji: '✦'  },
  furniture:   { label: 'furniture',   emoji: '🛏️'  },
  lighting:    { label: 'lighting',    emoji: '✨'  },
  decor:       { label: 'decor',       emoji: '🖼️'  },
  accessories: { label: 'accessories', emoji: '🎧'  },
  plants:      { label: 'plants',      emoji: '🌿'  },
};

// ─── VibeLab2Sheet ────────────────────────────────────────────────────────────

type VLTab = 'room' | 'lighting' | 'companion' | 'decor' | 'vibe';
type DecorFilter = 'all' | FurnishCategory;
const CHARACTERS: Character[] = ['raylene', 'rylane', 'cloud', 'night'];

interface VibeLab2SheetProps {
  visible: boolean;
  current: UserRoomConfig;
  onSave: (cfg: UserRoomConfig) => void;
  onClose: () => void;
}

function VibeLab2Sheet({ visible, current, onSave, onClose }: VibeLab2SheetProps) {
  const [draft,       setDraft]       = useState<UserRoomConfig>(current);
  const [tab,         setTab]         = useState<VLTab>('room');
  const [decorFilter, setDecorFilter] = useState<DecorFilter>('all');
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setDraft(current);
      setTab('room');
      setDecorFilter('all');
      Animated.spring(slideAnim, { toValue: 1, tension: 68, friction: 11, useNativeDriver: true }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 0, duration: 210, easing: Easing.in(Easing.quad), useNativeDriver: true }).start();
    }
  }, [visible, current]);

  const sheetY = slideAnim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });

  // Items scoped to this room's origin (+ shared) then filtered by category
  const filteredItems = useMemo(() => {
    const byOrigin = FURNISH_CATALOG.filter(
      fi => fi.origin === draft.baseRoomId || fi.origin === 'shared',
    );
    return decorFilter === 'all' ? byOrigin : byOrigin.filter(fi => fi.category === decorFilter);
  }, [decorFilter, draft.baseRoomId]);

  const addSticker = useCallback((stickerId: string) => {
    setDraft(d => {
      const newFi      = FURNISH_CATALOG.find(fi => fi.id === stickerId);
      const newCat     = newFi?.category;
      // Each category allows only one item at a time — placing a new one replaces the old
      const base = newCat
        ? d.placedItems.filter(p => {
            const pFi = FURNISH_CATALOG.find(fi => fi.id === p.stickerId);
            return pFi?.category !== newCat;
          })
        : d.placedItems;
      if (base.length >= MAX_PLACED) return d;
      const slot = PLACE_SLOTS[base.length % PLACE_SLOTS.length];
      const uid  = `${stickerId}-${Date.now()}`;
      return { ...d, placedItems: [...base, { uid, stickerId, ...slot, scale: 1 }] };
    });
  }, []);

  const removeSticker = useCallback((uid: string) => {
    setDraft(d => ({ ...d, placedItems: d.placedItems.filter(i => i.uid !== uid) }));
  }, []);

  const scaleItem = useCallback((uid: string, delta: number) => {
    setDraft(d => ({
      ...d,
      placedItems: d.placedItems.map(i =>
        i.uid === uid ? { ...i, scale: Math.max(0.5, Math.min(2.5, i.scale + delta)) } : i
      ),
    }));
  }, []);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableOpacity style={vl.backdrop} onPress={onClose} activeOpacity={1} />
      <Animated.View style={[vl.sheet, { transform: [{ translateY: sheetY }] }]}>
        <View style={vl.handle} />
        <Text style={vl.title}>your room ✦</Text>

        {/* Tabs */}
        <View style={vl.tabRow}>
          {(['room', 'lighting', 'companion', 'decor', 'vibe'] as VLTab[]).map(t => (
            <TouchableOpacity
              key={t}
              style={[vl.tab, tab === t && vl.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[vl.tabText, tab === t && vl.tabTextActive]}>
                {t === 'room'      ? '🏠' :
                 t === 'lighting'  ? '✨' :
                 t === 'companion' ? '💫' :
                 t === 'decor'     ? '🖼️' : '✦'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Room picker */}
        {tab === 'room' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vl.scroll} contentContainerStyle={vl.hContent}>
            {CHARACTERS.map(id => {
              const meta = ROOM_META[id];
              const selected = draft.baseRoomId === id;
              return (
                <TouchableOpacity
                  key={id}
                  style={[vl.roomCard, selected && vl.cardSelected]}
                  onPress={() => setDraft(d => ({ ...d, baseRoomId: id }))}
                  activeOpacity={0.82}
                >
                  <Image source={ROOM_PREVIEWS[id]} style={vl.roomThumb} resizeMode="cover" />
                  {selected && <View style={vl.selectedOverlay} />}
                  <Text style={vl.cardEmoji}>{meta.emoji}</Text>
                  <Text style={vl.cardName}>{meta.name}</Text>
                  <Text style={vl.cardSub}>{meta.vibe}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Lighting picker */}
        {tab === 'lighting' && (
          <ScrollView style={vl.scroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            {LIGHTING_PRESETS.map(preset => {
              const selected = draft.lightingMode === preset.key;
              return (
                <TouchableOpacity
                  key={preset.key}
                  style={[vl.lightRow, selected && vl.lightRowSelected]}
                  onPress={() => setDraft(d => ({ ...d, lightingMode: preset.key }))}
                  activeOpacity={0.82}
                >
                  <Text style={vl.lightEmoji}>{preset.emoji}</Text>
                  <View style={vl.lightTextBlock}>
                    <Text style={vl.lightLabel}>{preset.label}</Text>
                    <Text style={vl.lightHint}>{preset.hint}</Text>
                  </View>
                  {selected && <Text style={vl.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Companion picker */}
        {tab === 'companion' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vl.scroll} contentContainerStyle={vl.hContent}>
            {CHARACTERS.map(id => {
              const meta = ROOM_META[id];
              const selected = draft.companionId === id;
              const avatarSrc = safe(AVATARS[id]?.neutral, FALLBACK_AVATAR[id]);
              return (
                <TouchableOpacity
                  key={id}
                  style={[vl.companionCard, selected && vl.cardSelected]}
                  onPress={() => setDraft(d => ({ ...d, companionId: id }))}
                  activeOpacity={0.82}
                >
                  <Image source={avatarSrc} style={vl.companionAvatar} resizeMode="contain" />
                  <Text style={vl.cardEmoji}>{meta.emoji}</Text>
                  <Text style={vl.cardName}>{getCompanionRuntime(id).label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Decor / furnishing picker — items sourced from this room's style catalog */}
        {tab === 'decor' && (
          <View style={{ flex: 1 }}>
            {/* Category filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={vl.filterRow} contentContainerStyle={vl.filterContent}>
              {(['all', 'furniture', 'lighting', 'decor', 'accessories', 'plants'] as DecorFilter[]).map(f => {
                const meta = CATEGORY_META[f];
                return (
                  <TouchableOpacity
                    key={f}
                    style={[vl.filterChip, decorFilter === f && vl.filterChipActive]}
                    onPress={() => setDecorFilter(f)}
                  >
                    <Text style={[vl.filterChipText, decorFilter === f && vl.filterChipTextActive]}>
                      {meta.emoji} {meta.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Catalog grid — room-native items + shared */}
            <ScrollView style={vl.decorScroll} contentContainerStyle={vl.decorGrid} showsVerticalScrollIndicator={false}>
              {filteredItems.map(fi => {
                const src    = fi.source;
                const placed = draft.placedItems.filter(p => p.stickerId === fi.id).length;
                const atCap  = draft.placedItems.length >= MAX_PLACED;
                return (
                  <TouchableOpacity
                    key={fi.id}
                    style={[vl.decorCell, atCap && !placed && vl.decorCellDim]}
                    onPress={() => !atCap && addSticker(fi.id)}
                    activeOpacity={0.75}
                    disabled={atCap && !placed}
                  >
                    {src
                      ? <Image source={src} style={vl.decorThumb} resizeMode="contain" />
                      : (
                        <View style={vl.decorPlaceholder}>
                          <Text style={vl.decorPlaceholderEmoji}>{fi.emoji}</Text>
                        </View>
                      )
                    }
                    {placed > 0 && (
                      <View style={vl.decorBadge}>
                        <Text style={vl.decorBadgeText}>{placed}</Text>
                      </View>
                    )}
                    <Text style={vl.decorLabel} numberOfLines={1}>{fi.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* In your room — placed items strip */}
            {draft.placedItems.length > 0 && (
              <View style={vl.placedSection}>
                <Text style={vl.placedTitle}>in your room ({draft.placedItems.length}/{MAX_PLACED})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={vl.placedRow}>
                  {draft.placedItems.map(pi => {
                    const src = resolveItemSource(pi.stickerId);
                    const fi  = FURNISH_CATALOG.find(f => f.id === pi.stickerId);
                    return (
                      <View key={pi.uid} style={vl.placedChip}>
                        {src
                          ? <Image source={src} style={vl.placedThumb} resizeMode="contain" />
                          : <Text style={vl.decorPlaceholderEmoji}>{fi?.emoji ?? '✦'}</Text>
                        }
                        <View style={vl.scaleBtnRow}>
                          <TouchableOpacity style={vl.scaleBtn} onPress={() => scaleItem(pi.uid, -0.25)}>
                            <Text style={vl.scaleBtnText}>−</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={vl.scaleBtn} onPress={() => scaleItem(pi.uid, +0.25)}>
                            <Text style={vl.scaleBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>
                        <TouchableOpacity style={vl.placedRemove} onPress={() => removeSticker(pi.uid)}>
                          <Text style={vl.placedRemoveText}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* Vibe tab */}
        {tab === 'vibe' && (
          <ScrollView style={vl.scroll} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={vl.vibeLabel}>room name</Text>
            <TextInput
              style={vl.vibeInput}
              value={draft.roomName}
              onChangeText={v => setDraft(d => ({ ...d, roomName: v.slice(0, 30) }))}
              placeholder="name your space…"
              placeholderTextColor="rgba(196,181,253,0.35)"
              maxLength={30}
            />

            <Text style={[vl.vibeLabel, { marginTop: 16 }]}>pinned note</Text>
            <TextInput
              style={[vl.vibeInput, { height: 64 }]}
              value={draft.roomQuote}
              onChangeText={v => setDraft(d => ({ ...d, roomQuote: v.slice(0, 60) }))}
              placeholder="something pinned to your wall…"
              placeholderTextColor="rgba(196,181,253,0.35)"
              multiline
              maxLength={60}
            />
            <Text style={vl.vibeCount}>{draft.roomQuote.length}/60</Text>

            <Text style={[vl.vibeLabel, { marginTop: 16 }]}>glow color</Text>
            <View style={vl.colorRow}>
              {GLOW_COLORS.map(gc => (
                <TouchableOpacity
                  key={gc.color}
                  style={[vl.colorSwatch, { backgroundColor: gc.color }, draft.glowColor === gc.color && vl.colorSwatchSelected]}
                  onPress={() => setDraft(d => ({ ...d, glowColor: gc.color }))}
                  accessibilityLabel={gc.label}
                />
              ))}
            </View>

            <Text style={[vl.vibeLabel, { marginTop: 16 }]}>wall vibe</Text>
            <View style={vl.overlayRow}>
              {VIBE_OVERLAYS.map(o => (
                <TouchableOpacity
                  key={o.color}
                  style={[vl.overlayChip, draft.vibeOverlay === o.color && vl.overlayChipActive]}
                  onPress={() => setDraft(d => ({ ...d, vibeOverlay: o.color }))}
                >
                  <Text style={vl.overlayEmoji}>{o.emoji}</Text>
                  <Text style={vl.overlayLabel}>{o.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}

        <TouchableOpacity style={vl.saveBtn} onPress={() => { onSave(draft); onClose(); }}>
          <Text style={vl.saveBtnText}>save my room</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserRoomScreenProps {
  mood: Mood;
  selectedSekret: string;
  setSelectedSekret: (v: string) => void;
  setScreen: (screen: string) => void;
  t: Record<string, any>;
  vibe: VibeKey;
  BottomNav: React.ReactNode;
  sekretMode?: string;
  updateRoomMemory?: (patch: Record<string, any>) => void;
  companion?: any;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserRoomScreen({
  mood,
  selectedSekret,
  setScreen,
  t,
  vibe,
  BottomNav,
  updateRoomMemory,
}: UserRoomScreenProps) {

  // Derive initial companion from selectedSekret so first load feels right
  const initialCompanion: Character =
    selectedSekret === 'rylane' ? 'rylane' :
    selectedSekret === 'cloud'  ? 'cloud'  :
    selectedSekret === 'night'  ? 'night'  : 'raylene';

  const [userRoom, setUserRoom] = useState<UserRoomConfig>({
    ...DEFAULT_USER_ROOM,
    baseRoomId:  initialCompanion,
    companionId: initialCompanion,
  });
  const [vibeLabOpen, setVibeLabOpen] = useState(false);

  // Load persisted config on mount — migrates v1 saves to v2, clearing old sticker placements
  useEffect(() => {
    (async () => {
      const raw2 = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw2) {
        try { setUserRoom(prev => ({ ...prev, ...(JSON.parse(raw2) as Partial<UserRoomConfig>) })); } catch {}
        return;
      }
      // v1 → v2 migration: carry room/lighting/companion settings, drop old sticker placements
      const raw1 = await AsyncStorage.getItem(STORAGE_KEY_V1);
      if (raw1) {
        try {
          const old = JSON.parse(raw1) as Partial<UserRoomConfig>;
          const migrated: Partial<UserRoomConfig> = {
            baseRoomId:   old.baseRoomId,
            lightingMode: old.lightingMode,
            companionId:  old.companionId,
            roomName:     old.roomName ?? '',
            placedItems:  [], // old sticker IDs don't match new catalog — start fresh
          };
          setUserRoom(prev => ({ ...prev, ...migrated }));
          AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...DEFAULT_USER_ROOM, ...migrated })).catch(() => {});
        } catch {}
      }
    })();
  }, []);

  const saveUserRoom = useCallback((cfg: UserRoomConfig) => {
    setUserRoom(cfg);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)).catch(() => {});
    updateRoomMemory?.({ character: cfg.companionId });
  }, [updateRoomMemory]);

  // ─── Time / phase ──────────────────────────────────────────────────────
  const now      = useMemo(() => new Date(), []);
  const timeOfDay = useMemo<TimeOfDay>(() => getTimeOfDay(), [now]);

  const roomPhase = useMemo<RoomPhase>(() => {
    if (userRoom.lightingMode === 'auto') {
      return getRoomPhase(now, vibe === 'rain' ? 'rain' : undefined);
    }
    return userRoom.lightingMode as RoomPhase;
  }, [userRoom.lightingMode, now, vibe]);

  const vibePack = THEME_PACKS[vibe] ?? THEME_PACKS.raylene;

  // ─── Companion ─────────────────────────────────────────────────────────
  const cId         = userRoom.companionId;
  const pose        = useMemo(() => getPose(mood, timeOfDay, cId), [mood, timeOfDay, cId]);
  const cRuntime    = getCompanionRuntime(cId);
  const cPoseSrc    = safe(AVATARS[cId]?.[pose], FALLBACK_AVATAR[cId]);
  const cSrc        = safe(AVATARS[cId]?.fullbody, cRuntime.source ?? cPoseSrc);
  const cVisualPos  = COMPANION_VISUAL_POSITIONS[cId];
  const cHitPos     = COMPANION_HIT_TARGETS[cId];
  const hotspots    = useMemo(() => ROOM_HOTSPOTS[userRoom.baseRoomId], [userRoom.baseRoomId]);
  const roomLabel   = userRoom.roomName || ROOM_META[userRoom.baseRoomId].name;

  // ─── Animations ────────────────────────────────────────────────────────
  const fadeAnim       = useRef(new Animated.Value(0)).current;
  const glowAnim       = useRef(new Animated.Value(0.2)).current;
  const pulseAnim      = useRef(new Animated.Value(0)).current;
  const breathAnim     = useRef(new Animated.Value(0)).current;
  const companionAnim  = useRef(new Animated.Value(0)).current;
  const companionScale = useRef(new Animated.Value(0.94)).current;
  const hintAnim       = useRef(new Animated.Value(0)).current;
  const [hintSpot, setHintSpot] = useState<string | null>(null);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 900, useNativeDriver: true }).start();
    Animated.timing(companionAnim, {
      toValue: 1, duration: 680, delay: 280,
      easing: Easing.out(Easing.cubic), useNativeDriver: true,
    }).start();
    Animated.spring(companionScale, { toValue: 1, delay: 280, tension: 55, friction: 8, useNativeDriver: true }).start();

    const glowLoop = Animated.loop(Animated.sequence([
      Animated.timing(glowAnim, { toValue: 1,   duration: 1600, useNativeDriver: true }),
      Animated.timing(glowAnim, { toValue: 0.2, duration: 1600, useNativeDriver: true }),
    ]));
    glowLoop.start();

    const pulseLoop = Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
    ]));
    pulseLoop.start();

    const breathLoop = Animated.loop(Animated.sequence([
      Animated.timing(breathAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
      Animated.timing(breathAnim, { toValue: 0, duration: 2400, useNativeDriver: true }),
    ]));
    breathLoop.start();

    const guide = setTimeout(() => {
      setHintSpot('pages');
      setTimeout(() => setHintSpot(null), 1800);
    }, 700);

    return () => {
      clearTimeout(guide);
      glowLoop.stop();
      pulseLoop.stop();
      breathLoop.stop();
    };
  }, []);

  useEffect(() => {
    Animated.timing(hintAnim, {
      toValue: hintSpot ? 1 : 0,
      duration: hintSpot ? 150 : 220,
      useNativeDriver: true,
    }).start();
  }, [hintSpot]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleHotspot = useCallback((target: RoomTarget) => {
    updateRoomMemory?.({ lastHotspot: target, lastVisit: new Date().toISOString() });
    setScreen(target);
  }, [setScreen, updateRoomMemory]);

  const handleCompanionTap = useCallback(() => {
    updateRoomMemory?.({ lastSummon: new Date().toISOString(), character: cId });
    setScreen('sekret');
  }, [setScreen, cId, updateRoomMemory]);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar style="light" />

      {/* ── Ambient weather overlay ──────────────────────────────────────── */}
      <AmbientWeatherOverlay phase={roomPhase} />

      {/* ── LAYER 0: Bare room shell (walls, floor, window, atmosphere) ── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        <BareRoomRenderer
          character={userRoom.baseRoomId}
          lightingMode={roomPhase}
        />
        {/* LAYER 1: Time-of-day tint + vibe/character overlays */}
        <View style={[s.overlay, { backgroundColor: ROOM_PHASE_OVERLAYS[roomPhase] }]} />
        <View style={[s.overlay, { backgroundColor: vibePack.background + '22' }]} />
        {CHARACTER_OVERLAYS[userRoom.baseRoomId] !== 'transparent' && (
          <View style={[s.overlay, { backgroundColor: CHARACTER_OVERLAYS[userRoom.baseRoomId] }]} />
        )}
        {userRoom.vibeOverlay !== 'none' && (
          <View style={[s.overlay, { backgroundColor: userRoom.vibeOverlay }]} />
        )}
      </Animated.View>

      {/* Night room atmosphere clock */}
      {userRoom.baseRoomId === 'night' && (
        <View style={s.nightTimeWrap} pointerEvents="none">
          <Text style={s.nightTimeText}>
            {(() => {
              const h = new Date().getHours();
              const m = new Date().getMinutes();
              const h12 = h % 12 || 12;
              return `${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
            })()}
          </Text>
          <Text style={s.nightStars}>✦ ✧ ✦</Text>
        </View>
      )}

      {/* Room quote sticky note */}
      {userRoom.roomQuote.length > 0 && (() => {
        const qp = QUOTE_POSITIONS[userRoom.baseRoomId];
        return (
          <Animated.View
            pointerEvents="none"
            style={[
              s.stickyNote,
              { top: qp.top, bottom: qp.bottom, left: qp.left, right: qp.right },
              { opacity: fadeAnim, transform: [{ rotate: qp.rotation }] },
            ]}
          >
            <Text style={s.stickyNoteText}>{userRoom.roomQuote}</Text>
          </Animated.View>
        );
      })()}

      {/* ── LAYER 2: Hotspots ─────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim }]}>
        {hotspots.map(spot => {
          const isHinted = hintSpot === spot.id;
          return (
            <TouchableOpacity
              key={spot.id}
              style={[s.hotspot, spot.style, isHinted && s.hotspotGlow]}
              onPress={() => handleHotspot(spot.target)}
              activeOpacity={0.72}
              accessibilityRole="button"
              accessibilityLabel={spot.label}
            >
              {spot.pulse && (
                <Animated.View
                  pointerEvents="none"
                  style={[
                    s.pulseRing,
                    {
                      opacity:   pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                      transform: [{ scale: pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }],
                      borderColor: t.accent ?? '#d946ef',
                    },
                  ]}
                />
              )}
              {isHinted && (
                <Animated.View style={[s.tapHintWrap, {
                  opacity: hintAnim,
                  transform: [{ translateY: hintAnim.interpolate({ inputRange: [0, 1], outputRange: [4, 0] }) }],
                }]}>
                  <Text style={s.tapHint}>{spot.hint ?? 'Tap'}</Text>
                </Animated.View>
              )}
            </TouchableOpacity>
          );
        })}
      </Animated.View>

      {/* ── LAYER 3: Placed decor / furnishing items ─────────────────── */}
      {userRoom.placedItems.map(item => {
        const src = resolveItemSource(item.stickerId);
        if (!src) return null;
        const sz = width * 0.2 * item.scale;
        return (
          <Image
            key={item.uid}
            source={src}
            style={{
              position: 'absolute',
              left:     `${item.x}%` as any,
              top:      `${item.y}%` as any,
              width:    sz,
              height:   sz,
              zIndex:   6,
            }}
            resizeMode="contain"
            accessible={false}
          />
        );
      })}

      {/* ── LAYER 5: One companion visual + bounded transparent tap target ── */}
      <Animated.View
        pointerEvents="none"
        testID="room-companion-visual"
        style={[
          s.companionWrap,
          {
            bottom: cVisualPos.bottom,
            left:   cVisualPos.left,
            width:  cVisualPos.w,
            height: cVisualPos.h,
            opacity: companionAnim,
            transform: [
              { translateY: companionAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
              { scale: companionScale },
            ],
          },
        ]}
      >
        <Image
          source={cSrc}
          style={s.companionImage}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
          accessible={false}
        />
      </Animated.View>

      <TouchableOpacity
        testID="room-companion-hit-target"
        style={[
          s.companionHitTarget,
          {
            bottom: cHitPos.bottom,
            left:   cHitPos.left,
            width:  cHitPos.w,
            height: cHitPos.h,
          },
        ]}
        onPress={handleCompanionTap}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={`${cRuntime.label} is here. Tap to talk.`}
      >
        <Animated.View
          pointerEvents="none"
          style={[
            s.companionGlow,
            { opacity: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.12] }), backgroundColor: userRoom.glowColor },
          ]}
        />
      </TouchableOpacity>

      {/* Cloud mascot shortcut when companion is not Cloud */}
      {cId !== 'cloud' && (
        <TouchableOpacity
          style={[s.cloudPresence, { borderColor: (t.accent ?? '#d946ef') + '88' }]}
          onPress={() => setScreen('cloudThoughts')}
          accessibilityRole="button"
          accessibilityLabel="Cloud is here. Open Cloud Thoughts"
        >
          <Image source={IMAGES.cloudHappy} style={s.cloudPresenceImage} resizeMode="contain" />
          <Text style={s.cloudPresenceText}>Cloud's here</Text>
        </TouchableOpacity>
      )}

      {/* ── Top bar: room name label ───────────────────────────────────── */}
      <Animated.View style={[s.topBar, { opacity: fadeAnim }]}> 
        <View style={s.roomBadge}>
          <Text style={s.roomBadgeText}>
            {ROOM_META[userRoom.baseRoomId].emoji} {roomLabel}
          </Text>
        </View>
      </Animated.View>

      {/* ── Presence pill ─────────────────────────────────────────────── */}
      <Animated.View
        style={[
          s.presencePill,
          {
            opacity: Animated.multiply(
              fadeAnim,
              breathAnim.interpolate({ inputRange: [0, 1], outputRange: [0.78, 1] })
            ),
            transform: [{ scale: breathAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] }) }],
          },
        ]}
      >
        <Animated.View
          style={[
            s.presenceDot,
            {
              opacity: glowAnim,
              backgroundColor: userRoom.glowColor,
              transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.1] }) }],
            },
          ]}
        />
        <Text style={s.presenceText}>{getPresenceLine(cId, timeOfDay)}</Text>
      </Animated.View>

      {/* ── VibeLab edit button ───────────────────────────────────────── */}
      <Animated.View style={[s.vibeLabBtnWrap, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={[s.vibeLabBtn, { borderColor: userRoom.glowColor + '88', shadowColor: userRoom.glowColor }]}
          onPress={() => setVibeLabOpen(true)}
          activeOpacity={0.82}
          accessibilityRole="button"
          accessibilityLabel="Customize your room in VibeLab"
        >
          <Text style={s.vibeLabBtnText}>✦ room</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Bottom nav ────────────────────────────────────────────────── */}
      <View style={s.bottomSlot}>{BottomNav}</View>

      {/* ── VibeLab V2 sheet ──────────────────────────────────────────── */}
      <VibeLab2Sheet
        visible={vibeLabOpen}
        current={userRoom}
        onSave={saveUserRoom}
        onClose={() => setVibeLabOpen(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:              { flex: 1, backgroundColor: '#0d0014' },
  bg:                { width, height },
  overlay:           StyleSheet.absoluteFill,

  companionWrap:     { position: 'absolute', zIndex: 10 },
  companionImage:    { width: '100%', height: '100%' },
  companionHitTarget:{ position: 'absolute', zIndex: 11, borderRadius: 999 },
  companionGlow:     {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    borderRadius: 999,
    backgroundColor: '#c084fc',
  },

  cloudPresence: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 94,
    right: 18,
    width: 76, height: 76,
    borderRadius: 24, borderWidth: 1,
    backgroundColor: 'rgba(22,12,42,0.58)',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 8,
  },
  cloudPresenceImage: { width: 47, height: 40 },
  cloudPresenceText:  { color: '#f3edff', fontSize: 9, fontWeight: '700', marginTop: -2 },

  hotspot:       { position: 'absolute' },
  hotspotGlow:   {
    borderRadius: 16,
    backgroundColor: 'rgba(244,114,182,0.08)',
    shadowColor: '#f472b6', shadowOpacity: 0.45, shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
  pulseRing: {
    position: 'absolute', width: '100%', height: '100%',
    borderRadius: 16, borderWidth: 1.5,
  },
  tapHintWrap: {
    position: 'absolute', top: -26, left: -2,
    backgroundColor: 'rgba(253,247,236,0.94)',
    borderColor: 'rgba(124,58,237,0.45)',
    borderWidth: 1, borderStyle: 'dashed',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 8, transform: [{ rotate: '-2deg' }],
    shadowColor: '#7c3aed', shadowOpacity: 0.18, shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }, elevation: 3,
  },
  tapHint: { color: '#3b0764', fontSize: 10, fontWeight: '600', fontStyle: 'italic', letterSpacing: 0.2 },

  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 32,
    left: 16,
    zIndex: 20,
  },
  roomBadge:     { backgroundColor: 'rgba(13,0,20,0.68)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5 },
  roomBadgeText: { color: '#c4b5fd', fontSize: 12, fontWeight: '600' },

  presencePill: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 96 : 74,
    left: 16,
    backgroundColor: 'rgba(13,0,20,0.70)',
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 12,
  },
  presenceDot:  { width: 8, height: 8, borderRadius: 4, backgroundColor: '#d946ef' },
  presenceText: { color: '#e9d5ff', fontSize: 11, fontWeight: '500' },

  nightTimeWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 116 : 94,
    left: 18, alignItems: 'flex-start', zIndex: 5,
  },
  nightTimeText: { color: 'rgba(187,183,239,0.75)', fontSize: 13, fontWeight: '300', letterSpacing: 1.5 },
  nightStars:    { color: 'rgba(187,183,239,0.45)', fontSize: 10, marginTop: 2, letterSpacing: 4 },

  vibeLabBtnWrap: { position: 'absolute', bottom: 100, right: 18, zIndex: 20 },
  vibeLabBtn: {
    backgroundColor: 'rgba(13,0,20,0.80)',
    borderWidth: 1, borderColor: 'rgba(167,114,192,0.45)',
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    shadowColor: '#c084fc', shadowOpacity: 0.22, shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 }, elevation: 4,
  },
  vibeLabBtnText: { color: '#c4b5fd', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  bottomSlot: { position: 'absolute', bottom: 0, left: 0, right: 0 },

  stickyNote: {
    position: 'absolute',
    backgroundColor: 'rgba(253,247,236,0.93)',
    borderRadius: 4,
    padding: 10,
    maxWidth: 140,
    zIndex: 7,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 1, height: 2 },
    elevation: 4,
  },
  stickyNoteText: {
    color: '#3b0764',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
    fontStyle: 'italic',
  },
});

// ─── VibeLab styles ───────────────────────────────────────────────────────────

const vl = StyleSheet.create({
  backdrop: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.54)',
  },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#150830',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderColor: 'rgba(147,51,234,0.28)',
    paddingTop: 12, paddingHorizontal: 20, paddingBottom: 36,
    shadowColor: '#7c3aed', shadowOpacity: 0.3, shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 }, elevation: 20,
    minHeight: 400,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4,
    borderRadius: 2, backgroundColor: 'rgba(196,181,253,0.35)',
    marginBottom: 14,
  },
  title: {
    color: '#e9d5ff', fontSize: 18, fontWeight: '700',
    letterSpacing: 0.3, marginBottom: 14,
  },

  tabRow:       { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab:          { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  tabActive:    { backgroundColor: 'rgba(147,51,234,0.28)', borderWidth: 1, borderColor: 'rgba(196,181,253,0.4)' },
  tabText:      { color: 'rgba(196,181,253,0.55)', fontSize: 11, fontWeight: '600' },
  tabTextActive:{ color: '#e9d5ff', fontSize: 11, fontWeight: '700' },

  scroll:   { maxHeight: 220 },
  hContent: { paddingRight: 16, gap: 12, flexDirection: 'row' },

  roomCard: {
    width: 130, borderRadius: 16, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(147,51,234,0.18)',
  },
  roomThumb: { width: 130, height: 90 },
  cardSelected: {
    borderColor: '#c084fc', borderWidth: 2,
    shadowColor: '#c084fc', shadowOpacity: 0.45, shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }, elevation: 6,
  },
  selectedOverlay: {
    position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(192,132,252,0.15)',
  },
  cardEmoji: { color: '#e9d5ff', fontSize: 18, textAlign: 'center', marginTop: 8 },
  cardName:  { color: '#e9d5ff', fontSize: 11, fontWeight: '700', textAlign: 'center', paddingHorizontal: 8 },
  cardSub:   { color: 'rgba(196,181,253,0.6)', fontSize: 9, textAlign: 'center', paddingHorizontal: 8, marginBottom: 8 },

  lightRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  lightRowSelected: {
    backgroundColor: 'rgba(147,51,234,0.18)',
    borderWidth: 1, borderColor: 'rgba(196,181,253,0.35)',
  },
  lightEmoji:     { fontSize: 20, width: 28, textAlign: 'center' },
  lightTextBlock: { flex: 1 },
  lightLabel:     { color: '#e9d5ff', fontSize: 13, fontWeight: '600' },
  lightHint:      { color: 'rgba(196,181,253,0.55)', fontSize: 10, marginTop: 1 },
  check:          { color: '#c084fc', fontSize: 16, fontWeight: '700' },

  companionCard: {
    width: 120, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1.5, borderColor: 'rgba(147,51,234,0.18)',
    alignItems: 'center', paddingBottom: 10,
  },
  companionAvatar: { width: 100, height: 120 },

  // ── Decor tab ────────────────────────────────────────────────────────────────

  filterRow:    { maxHeight: 36, marginBottom: 10 },
  filterContent:{ paddingRight: 8, gap: 8, flexDirection: 'row', alignItems: 'center' },
  filterChip:   {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.18)',
  },
  filterChipActive: {
    backgroundColor: 'rgba(124,58,237,0.28)',
    borderColor: 'rgba(196,181,253,0.55)',
  },
  filterChipText:      { color: 'rgba(196,181,253,0.55)', fontSize: 11, fontWeight: '600' },
  filterChipTextActive:{ color: '#e9d5ff', fontSize: 11, fontWeight: '700' },

  decorScroll: { maxHeight: 200 },
  decorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 10, paddingBottom: 8, paddingTop: 2,
  },
  decorCell: {
    width: (width - 80) / 4,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.14)',
  },
  decorCellDim: { opacity: 0.35 },
  decorThumb:   { width: 46, height: 46 },
  decorPlaceholder: { width: 46, height: 46, backgroundColor: 'rgba(147,51,234,0.12)', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  decorPlaceholderEmoji: { fontSize: 20 },
  decorLabel:   { color: 'rgba(196,181,253,0.6)', fontSize: 8, marginTop: 4, textAlign: 'center', paddingHorizontal: 2 },
  decorBadge: {
    position: 'absolute', top: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  decorBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  placedSection: { paddingTop: 10, borderTopWidth: 1, borderColor: 'rgba(147,51,234,0.18)', marginTop: 6 },
  placedTitle:   { color: 'rgba(196,181,253,0.6)', fontSize: 10, fontWeight: '600', marginBottom: 8 },
  placedRow:     { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  placedChip:    {
    width: 64, borderRadius: 12, paddingVertical: 6,
    backgroundColor: 'rgba(124,58,237,0.15)',
    borderWidth: 1, borderColor: 'rgba(196,181,253,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  placedThumb:       { width: 38, height: 38 },
  placedRemove: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: 'rgba(220,38,38,0.85)', alignItems: 'center', justifyContent: 'center',
  },
  placedRemoveText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  // ── Save button ───────────────────────────────────────────────────────────────

  saveBtn: {
    marginTop: 14, paddingVertical: 14, borderRadius: 18,
    backgroundColor: '#7c3aed', alignItems: 'center',
    shadowColor: '#7c3aed', shadowOpacity: 0.5, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 0.3 },

  vibeLabel:    { color: 'rgba(196,181,253,0.75)', fontSize: 11, fontWeight: '600', marginBottom: 8, letterSpacing: 0.3 },
  vibeInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.30)',
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    color: '#e9d5ff', fontSize: 13,
  },
  vibeCount:    { color: 'rgba(196,181,253,0.4)', fontSize: 9, textAlign: 'right', marginTop: 4 },
  colorRow:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  colorSwatch:  { width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: 'transparent' },
  colorSwatchSelected: {
    borderColor: '#fff',
    shadowColor: '#fff', shadowOpacity: 0.5, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4,
  },
  overlayRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  overlayChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(147,51,234,0.18)',
    alignItems: 'center', minWidth: 72,
  },
  overlayChipActive: { backgroundColor: 'rgba(124,58,237,0.28)', borderColor: 'rgba(196,181,253,0.55)' },
  overlayEmoji: { fontSize: 18, textAlign: 'center' },
  overlayLabel: { color: 'rgba(196,181,253,0.65)', fontSize: 9, fontWeight: '600', textAlign: 'center', marginTop: 4 },
  scaleBtnRow:  { flexDirection: 'row', gap: 4, marginTop: 4 },
  scaleBtn:     { width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(147,51,234,0.35)', alignItems: 'center', justifyContent: 'center' },
  scaleBtnText: { color: '#e9d5ff', fontSize: 13, fontWeight: '700', lineHeight: 20 },
});

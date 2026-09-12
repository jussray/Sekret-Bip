import type { ImageSourcePropType } from "react-native";

// constants/theme.ts
// Se'kret Bip — Design Tokens + IMAGES Map
//
// IMPORTANT: every require() below points at a file that ACTUALLY EXISTS in
// assets/images/. When the original asset name is missing or still a 2-byte
// placeholder, we fall back to the closest matching real image so the bundle
// never crashes. Replace the fallback with the real asset later — the variable
// name stays the same so no screen code has to change.

// ── Suhana (updated look — new portraits match Night/Sy art style) ───
const rayleneNeutral    = require("../assets/images/raylene-neutral-new.png");
const rayleneHappy      = require("../assets/images/raylene-happy-new.png");
const rayleneWriting    = require("../assets/images/raylene-writing.png");       // old style kept
const rayleneWindow     = require("../assets/images/raylene-window-new.png");
const rayleneFullbody   = require("../assets/images/raylene-confident-new.png"); // arms-crossed fullbody
const rayleneHappyV3    = require("../assets/images/raylene-happy-v3.png");      // old style kept
const rayleneNeutralV3  = rayleneNeutral;

// ── Suhana (new emotions) ─────────────────────────────────────────────────
const rayleneConfident  = require("../assets/images/raylene-confident-new.png");
const raylenePlayful    = require("../assets/images/raylene-playful-new.png");
const rayleeneSad       = require("../assets/images/raylene-sad-new.png");
const rayleeneMad       = require("../assets/images/raylene-mad-new.png");
const rayleeneSurprised = require("../assets/images/raylene-surprised-new.png");
const rayleeneCrouching = require("../assets/images/raylene-crouching-new.png");

// ── Suhana (pose variants; voice/window-rainy now have real assets) ──────
const rayleneThinking    = require("../assets/images/raylene-thinking-new.png");
const rayleneWindowRainy = require("../assets/images/raylene-window-rainy.png");
const rayleneNightWindow = rayleneWindowRainy; // night window → rainy window (closer semantic)
const rayleneNightDoodle = rayleneWriting; // fallback → writing
const rayleneVoiceDay    = require("../assets/images/raylene-voice-day.png");
const rayleneVoiceNight  = require("../assets/images/raylene-voice-night.png");
const raylene_Bippin2Day = rayleneWriting; // fallback → writing
const raylene_Bippin2Night = rayleneWriting; // fallback → writing
const raylene_PeriodCalendar = rayleneWriting; // fallback → writing
const rayleneNeutralV2 = rayleneNeutral; // fallback → neutral
const rayleneHappyV2 = rayleneHappy; // fallback → happy
const rayleneWindowV2 = rayleneWindow; // fallback → window
const rayleneWindowV3 = rayleneWindow; // fallback → window

// ── Sy (real assets) ───────────────────────────────────────────────────
const rylaneNeutral = require("../assets/images/rylane-neutral.png");
const rylaneHappy = require("../assets/images/rylane-happy.png");
const rylaneWriting = require("../assets/images/rylane-writing.png");
const rylaneWindow = require("../assets/images/rylane-window.png");
const rylaneFullbody = require("../assets/images/rylane-fullbody.png");
const rylaneNeutralV2 = require("../assets/images/rylane-neutral-v2.png");

// ── Sy (thinking now has real asset; voice assets real) ──────────────
const rylaneThinking   = require("../assets/images/rylane-thinking.png");
const rylaneProfile    = rylaneFullbody; // fallback → fullbody portrait
const rylaneVoiceDay   = require("../assets/images/rylane-voice-day.png");
const rylaneVoiceNight = require("../assets/images/rylane-voice-night.png");
const rylaneWindowDay  = require("../assets/images/rylane-window-day.png");

// ── Room Backgrounds ───────────────────────────────────────────────────────
const bgRayleneRoomDay       = require("../assets/images/resized-bg/bg-raylene-room-day.jpg");
const bgRayleneRoomMidday    = require("../assets/images/resized-bg/bg-raylene-room-midday.jpg");
const bgRayleneRoomAfternoon = require("../assets/images/resized-bg/bg-raylene-room-afternoon.jpg");
const bgRayleneRoomEvening   = require("../assets/images/resized-bg/bg-raylene-room-evening.jpg");
const bgRayleneRoomRain      = require("../assets/images/resized-bg/bg-raylene-room-rain.jpg");
const bgRayleneRoomNight     = require("../assets/images/resized-bg/bg-raylene-room-night.jpg");
const bgRayleneRoomDeepNight = require("../assets/images/resized-bg/bg-raylene-room-deep-night.jpg");

const bgRylaneRoomDay       = require("../assets/images/resized-bg/bg-rylane-room-day.jpg");
const bgRylaneRoomMidday    = require("../assets/images/resized-bg/bg-rylane-room-midday.jpg");
const bgRylaneRoomAfternoon = require("../assets/images/resized-bg/bg-rylane-room-afternoon.jpg");
const bgRylaneRoomEvening   = require("../assets/images/resized-bg/bg-rylane-room-evening.jpg");
const bgRylaneRoomRain      = require("../assets/images/resized-bg/bg-rylane-room-rain.jpg");
const bgRylaneRoomNight     = require("../assets/images/resized-bg/bg-rylane-room-night.jpg");
const bgRylaneRoomDeepNight = require("../assets/images/resized-bg/bg-rylane-room-deep-night.jpg");

// ── Cloud Room Backgrounds — REAL ASSETS ──────────────────────────────────
// Cloud Room identity: cozy purple room, cloud neon sign, city window view,
// open journals, bean bag, headphones, brain-dump backpack, scrapbook walls.
// NOT a floating sky — it's the place you go when your brain is loud.
const bgCloudRoomDay       = require("../assets/images/resized-bg/bg-cloud-room-day.jpg");
const bgCloudRoomMidday    = require("../assets/images/resized-bg/bg-cloud-room-midday.jpg");
const bgCloudRoomAfternoon = require("../assets/images/resized-bg/bg-cloud-room-afternoon.jpg");
const bgCloudRoomEvening   = require("../assets/images/resized-bg/bg-cloud-room-evening.jpg");
const bgCloudRoomNight     = require("../assets/images/resized-bg/bg-cloud-room-night.jpg");
const bgCloudRoomDeepNight = require("../assets/images/resized-bg/bg-cloud-room-deep-night.jpg");
const bgCloudRoomRain      = require("../assets/images/resized-bg/bg-cloud-room-rain.jpg");

// ── Night Room Backgrounds — REAL ASSETS ──────────────────────────────────
// Night Room identity: crescent moon chair, galaxy bedding, "Voice Bip Corner"
// light-box sign, city window with clock, sticky notes everywhere, 2AM energy.
// NOT Suhana's room — completely different furniture, palette, and spirit.
const bgNightRoomDay       = require("../assets/images/resized-bg/bg-night-room-day.jpg");
const bgNightRoomMidday    = require("../assets/images/resized-bg/bg-night-room-midday.jpg");
const bgNightRoomAfternoon = require("../assets/images/resized-bg/bg-night-room-afternoon.jpg");
const bgNightRoomEvening   = require("../assets/images/resized-bg/bg-night-room-evening.jpg");
const bgNightRoomNight     = require("../assets/images/resized-bg/bg-night-room-night.jpg");
const bgNightRoomDeepNight = require("../assets/images/resized-bg/bg-night-room-deep-night.jpg");
const bgNightRoomRain      = require("../assets/images/resized-bg/bg-night-room-rain.jpg");

// ── Night Avatar ───────────────────────────────────────────────────────────
const nightFullbody    = require("../assets/images/night-fullbody.png");
const nightNeutral     = require("../assets/images/night-neutral.png");
const nightSoftsmile   = require("../assets/images/night-softsmile.png");
const nightHappy       = require("../assets/images/night-happy.png");
const nightThinking    = require("../assets/images/night-thinking.png");
const nightTired       = require("../assets/images/night-tired.png");
const nightAnnoyed     = require("../assets/images/night-annoyed.png");
const nightSad         = require("../assets/images/night-sad.png");
const nightOverwhelmed = require("../assets/images/night-overwhelmed.png");
const nightProtective  = require("../assets/images/night-protective.png");
const nightLonely      = require("../assets/images/night-lonely.png");
const nightHopeful     = require("../assets/images/night-hopeful.png");
const nightRelaxed     = require("../assets/images/night-relaxed.png");
const nightListening   = require("../assets/images/night-listening.png");
const nightWriting     = require("../assets/images/night-writing.png");
const nightWindow      = require("../assets/images/night-window.png");
const nightPlayful     = require("../assets/images/night-playful.png");
const nightHurting     = require("../assets/images/night-hurting.png");
const nightInHisHead   = require("../assets/images/night-inhishead.png");
const nightInLove      = require("../assets/images/night-in-love.png");

const nightAvatarNeutral  = nightNeutral;
const nightAvatarHappy    = nightSoftsmile;
const nightAvatarThinking = nightThinking;
const nightAvatarWriting  = nightWriting;
const nightAvatarWindow   = nightWindow;
const nightAvatarFullbody = nightFullbody;

// ── Night voice backgrounds (aliases — real assets TBD) ────────────────────
const nightVoiceDay   = nightNeutral;   // placeholder until night-voice-day.png exists
const nightVoiceNight = nightWindow;    // window/late-night scene fits night voice context

// ── Parent Room Backgrounds ────────────────────────────────────────────────
const bgMomRoomDay       = require("../assets/images/resized-bg/bg-mom-room-day.jpg");
const bgMomRoomEvening   = require("../assets/images/resized-bg/bg-mom-room-evening.jpg");
const bgMomRoomNight     = require("../assets/images/resized-bg/bg-mom-room-night.jpg");
const bgMomRoomDeepNight = require("../assets/images/resized-bg/bg-mom-room-deep-night.jpg");
const bgMomRoomRain      = require("../assets/images/resized-bg/bg-mom-room-rain.jpg");

const bgDadRoomDay       = require("../assets/images/resized-bg/bg-dad-room-day.jpg");
const bgDadRoomEvening   = require("../assets/images/resized-bg/bg-dad-room-evening.jpg");
const bgDadRoomNight     = require("../assets/images/resized-bg/bg-dad-room-night.jpg");
const bgDadRoomDeepNight = require("../assets/images/resized-bg/bg-dad-room-deep-night.jpg");
const bgDadRoomRain      = require("../assets/images/resized-bg/bg-dad-room-rain.jpg");

// ── Screen Backgrounds (all real) ──────────────────────────────────────────
const bgComfort         = require('../assets/images/resized-bg/comfort-bg.jpg');
const bgJournal         = require('../assets/images/resized-bg/journal-bg.jpg');
const bgBridge          = require('../assets/images/resized-bg/bridge-bg.jpg');
const bgVoiceBip        = require('../assets/images/resized-bg/voice-bip-bg.jpg');
// Circle is assembled from React Native controls over a generic atmosphere asset.
// Design mockups live outside assets/ and are never loaded by the application.
const bgCircle          = require('../assets/images/resized-bg/room-bg-dark.jpg');
const bgWindow          = require('../assets/images/window.png');
const bgCalmHero        = rayleneWindow; // hero on Calm = Suhana at the window

// ── Cloud / Mascot (all real) ──────────────────────────────────────────────
const cloud             = require('../assets/images/cloud.png');
const cloudHappy        = require('../assets/images/cloud-happy.png');
const cloudHeadphones   = require('../assets/images/cloud-headphones.png');
const cloudHeadphonesV2 = require('../assets/images/cloud-headphones-v2.png');
const cloudSleepy       = require('../assets/images/cloud-sleepy.png');
const cloudStormy       = require('../assets/images/cloud-stormy.png');

// ── Cloud Avatar (cloud mascot IS Cloud's presence — declared after cloud assets) ─────────
const cloudAvatarNeutral  = cloud;
const cloudAvatarHappy    = cloudHappy;
const cloudAvatarThinking = cloudHeadphones;
const cloudAvatarWriting  = cloudHeadphonesV2;
const cloudAvatarWindow   = cloudSleepy;
const cloudAvatarFullbody = cloudHappy;

// ── App Entry Splash Screens ───────────────────────────────────────────────
// These are the first full-screen images the user sees when opening the app
// after completing onboarding — one per side. Teen side and parent side are
// completely separate app experiences. These images are entry doors, not
// companion UI or in-app features.
//
//   sekretSplashTeen   → teen side entry: two teens back-to-back, neon pink/purple
//   sekretSplashParent → parent side entry: couple by candlelight, warm purple neon
//
// sekretSplash is a backward-compat alias → resolves to teen splash.
const sekretSplashTeen   = require("../assets/images/A2EB8B5A-0109-4A02-927A-FA7080B5F501.png");
const sekretSplashParent = require("../assets/images/80B326EB-C67B-4369-A3EE-CFE0348E0701.jpeg");
const sekretSplash       = sekretSplashTeen; // ← backward-compat alias


export const IMAGES = {
  // Suhana
  rayleneNeutral,
  rayleneNeutralV2,
  rayleneNeutralV3,
  rayleneHappy,
  rayleneHappyV2,
  rayleneHappyV3,
  rayleneThinking,
  rayleneConfident,
  raylenePlayful,
  rayleeneSad,
  rayleeneMad,
  rayleeneSurprised,
  rayleeneCrouching,
  rayleneWriting,
  rayleneWindow,
  rayleneWindowRainy,
  rayleneWindowV2,
  rayleneWindowV3,
  rayleneNightWindow,
  rayleneNightDoodle,
  rayleneFullbody,
  rayleneVoiceDay,
  rayleneVoiceNight,
  raylene_Bippin2Day,
  raylene_Bippin2Night,
  raylene_PeriodCalendar,

  // Sy
  rylaneNeutral,
  rylaneNeutralV2,
  rylaneHappy,
  rylaneThinking,
  rylaneWriting,
  rylaneWindow,
  rylaneFullbody,
  rylaneProfile,
  rylaneVoiceDay,
  rylaneVoiceNight,
  rylaneWindowDay,

  // Cloud Room Backgrounds
  bgCloudRoomDay,
  bgCloudRoomMidday,
  bgCloudRoomAfternoon,
  bgCloudRoomEvening,
  bgCloudRoomNight,
  bgCloudRoomDeepNight,
  bgCloudRoomRain,

  // Night Room Backgrounds
  bgNightRoomDay,
  bgNightRoomMidday,
  bgNightRoomAfternoon,
  bgNightRoomEvening,
  bgNightRoomNight,
  bgNightRoomDeepNight,
  bgNightRoomRain,

  // Cloud Avatars
  cloudAvatarNeutral,
  cloudAvatarHappy,
  cloudAvatarThinking,
  cloudAvatarWriting,
  cloudAvatarWindow,
  cloudAvatarFullbody,

  // Night Portraits (real assets)
  nightFullbody,
  nightNeutral,
  nightSoftsmile,
  nightHappy,
  nightThinking,
  nightTired,
  nightAnnoyed,
  nightSad,
  nightOverwhelmed,
  nightProtective,
  nightLonely,
  nightHopeful,
  nightRelaxed,
  nightListening,
  nightWriting,
  nightWindow,
  nightPlayful,
  nightHurting,
  nightInHisHead,
  nightInLove,

  // Night Avatars
  nightAvatarNeutral,
  nightAvatarHappy,
  nightAvatarThinking,
  nightAvatarWriting,
  nightAvatarWindow,
  nightAvatarFullbody,
  nightVoiceDay,
  nightVoiceNight,

  // Rooms
  bgRayleneRoomDay,
  bgRayleneRoomMidday,
  bgRayleneRoomAfternoon,
  bgRayleneRoomEvening,
  bgRayleneRoomRain,
  bgRayleneRoomNight,
  bgRayleneRoomDeepNight,
  bgRylaneRoomDay,
  bgRylaneRoomMidday,
  bgRylaneRoomAfternoon,
  bgRylaneRoomEvening,
  bgRylaneRoomRain,
  bgRylaneRoomNight,
  bgRylaneRoomDeepNight,

  // Parent Rooms
  bgMomRoomDay,
  bgMomRoomEvening,
  bgMomRoomNight,
  bgMomRoomDeepNight,
  bgMomRoomRain,
  bgDadRoomDay,
  bgDadRoomEvening,
  bgDadRoomNight,
  bgDadRoomDeepNight,
  bgDadRoomRain,

  // Screen backgrounds
  bgComfort,
  bgJournal,
  bgBridge,
  bgVoiceBip,
  bgCircle,
  bgWindow,
  bgCalmHero,

  // Cloud / mascot
  cloud,
  cloudHappy,
  cloudHeadphones,
  cloudHeadphonesV2,
  cloudSleepy,
  cloudStormy,

  // App entry splash — one per side, shown after onboarding
  sekretSplash,        // backward-compat alias → teen
  sekretSplashTeen,
  sekretSplashParent,
} as const;

export type Character = 'raylene' | 'rylane' | 'cloud' | 'night';

export const AVATARS: Record<string, Record<string, any>> = {
  raylene: {
    neutral:   IMAGES.rayleneNeutral,
    happy:     IMAGES.rayleneHappy,
    thinking:  IMAGES.rayleneThinking,
    writing:   IMAGES.rayleneWriting,
    window:    IMAGES.rayleneWindow,
    fullbody:  IMAGES.rayleneFullbody,
    confident: IMAGES.rayleneConfident,
    playful:   IMAGES.raylenePlayful,
    sad:       IMAGES.rayleeneSad,
    mad:       IMAGES.rayleeneMad,
    surprised: IMAGES.rayleeneSurprised,
    crouching: IMAGES.rayleeneCrouching,
  },
  rylane: {
    neutral:  IMAGES.rylaneNeutral,
    happy:    IMAGES.rylaneHappy,
    thinking: IMAGES.rylaneThinking,
    writing:  IMAGES.rylaneWriting,
    window:   IMAGES.rylaneWindow,
    fullbody: IMAGES.rylaneFullbody,
  },
  cloud: {
    neutral:  IMAGES.cloudAvatarNeutral,
    happy:    IMAGES.cloudAvatarHappy,
    thinking: IMAGES.cloudAvatarThinking,
    writing:  IMAGES.cloudAvatarWriting,
    window:   IMAGES.cloudAvatarWindow,
    fullbody: IMAGES.cloudAvatarFullbody,
  },
  night: {
    neutral:   IMAGES.nightNeutral,
    happy:     IMAGES.nightSoftsmile,
    thinking:  IMAGES.nightThinking,
    writing:   IMAGES.nightWriting,
    window:    IMAGES.nightWindow,
    fullbody:  IMAGES.nightFullbody,
    softsmile: IMAGES.nightSoftsmile,
    tired:     IMAGES.nightTired,
    annoyed:   IMAGES.nightAnnoyed,
    sad:       IMAGES.nightSad,
    overwhelmed: IMAGES.nightOverwhelmed,
    protective:  IMAGES.nightProtective,
    lonely:    IMAGES.nightLonely,
    hopeful:   IMAGES.nightHopeful,
    relaxed:   IMAGES.nightRelaxed,
    listening: IMAGES.nightListening,
    playful:   IMAGES.nightPlayful,
    hurting:   IMAGES.nightHurting,
    inhishead: IMAGES.nightInHisHead,
    inlove:    IMAGES.nightInLove,
  },
};

export type TimeOfDay = "morning" | "day" | "evening" | "night";
export type RoomPhase = "day" | "midday" | "afternoon" | "evening" | "rain" | "night" | "deepNight";

export function getRoomPhase(
  date = new Date(),
  weatherMode?: string,
): RoomPhase {
  if (weatherMode === "rain") return "rain";
  const hour = date.getHours();
  if (hour >= 5  && hour < 10) return "day";
  if (hour >= 10 && hour < 14) return "midday";
  if (hour >= 14 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  if (hour >= 21 && hour < 24) return "night";
  return "deepNight"; // midnight–5 AM
}

const ROOM_SCENES: Record<Character, Record<RoomPhase, ImageSourcePropType>> = {
  raylene: {
    day:       IMAGES.bgRayleneRoomDay,
    midday:    IMAGES.bgRayleneRoomMidday,
    afternoon: IMAGES.bgRayleneRoomAfternoon,
    evening:   IMAGES.bgRayleneRoomEvening,
    night:     IMAGES.bgRayleneRoomNight,
    deepNight: IMAGES.bgRayleneRoomDeepNight,
    rain:      IMAGES.bgRayleneRoomRain,
  },
  rylane: {
    day:       IMAGES.bgRylaneRoomDay,
    midday:    IMAGES.bgRylaneRoomMidday,
    afternoon: IMAGES.bgRylaneRoomAfternoon,
    evening:   IMAGES.bgRylaneRoomEvening,
    night:     IMAGES.bgRylaneRoomNight,
    deepNight: IMAGES.bgRylaneRoomDeepNight,
    rain:      IMAGES.bgRylaneRoomRain,
  },
  cloud: {
    day: IMAGES.bgCloudRoomDay,
    midday: IMAGES.bgCloudRoomMidday,
    afternoon: IMAGES.bgCloudRoomAfternoon,
    evening: IMAGES.bgCloudRoomEvening,
    night: IMAGES.bgCloudRoomNight,
    deepNight: IMAGES.bgCloudRoomDeepNight,
    rain: IMAGES.bgCloudRoomRain,
  },
  night: {
    day: IMAGES.bgNightRoomDay,
    midday: IMAGES.bgNightRoomMidday,
    afternoon: IMAGES.bgNightRoomAfternoon,
    evening: IMAGES.bgNightRoomEvening,
    night: IMAGES.bgNightRoomNight,
    deepNight: IMAGES.bgNightRoomDeepNight,
    rain: IMAGES.bgNightRoomRain,
  },
};

function normalizeRoomPhase(phase: RoomPhase | string): RoomPhase {
  if (phase === 'deep-night') return 'deepNight';
  if (phase === 'day' || phase === 'midday' || phase === 'afternoon' || phase === 'evening' || phase === 'night' || phase === 'deepNight' || phase === 'rain') {
    return phase;
  }
  return 'day';
}

export function getRoomScene(
  character: Character,
  phase: RoomPhase | string,
): ImageSourcePropType {
  const p = normalizeRoomPhase(phase as string);
  return ROOM_SCENES[character]?.[p] ?? ROOM_SCENES.raylene.day;
}

export function getRoomBg(
  character: Character,
  time: TimeOfDay | RoomPhase | 'deep-night' | string,
  weatherMode?: string,
): ImageSourcePropType {
  if (weatherMode === 'rain') return getRoomScene(character, 'rain');
  return getRoomScene(character, time === 'morning' ? 'day' : time);
}

export function getParentRoomBg(
  style: "mom" | "dad",
  weatherMode?: string,
) {
  const h = new Date().getHours();
  let phase: RoomPhase;
  if (weatherMode === "rain") phase = "rain";
  else if (h >= 5  && h < 12) phase = "day";
  else if (h >= 12 && h < 17) phase = "day";
  else if (h >= 17 && h < 21) phase = "evening";
  else if (h >= 21 || h < 1)  phase = "night";
  else                         phase = "deepNight";
  const prefix = style === "mom" ? "bgMomRoom" : "bgDadRoom";
  const suffix = phase === "deepNight" ? "DeepNight" : phase.charAt(0).toUpperCase() + phase.slice(1);
  return IMAGES[`${prefix}${suffix}` as keyof typeof IMAGES];
}

export type VibeKey = "raylene" | "rylane" | "cloud" | "night" | "rain" | "sunset";

export type VibePack = {
  name: string;
  emoji: string;
  feeling: string;
  detail: string;
  background: string;
  card: string;
  accent: string;
  soft: string;
  room: ImageSourcePropType;
  overlay: readonly [string, string, string];
};

// Vibes are room atmospheres, not app color skins. Each one is grounded in
// an existing production room scene so previews and the live room stay honest.
export const THEME_PACKS: Record<VibeKey, VibePack> = {
  raylene: {
    name: "Suhana's Room",
    emoji: "💜",
    feeling: "scrapbook soft",
    detail: "lavender · warm pink glow · fairy lights",
    background: "#21102f",
    card: "#4b285f",
    accent: "#f19ac5",
    soft: "#f4d8f3",
    room: bgRayleneRoomEvening,
    overlay: ["rgba(42,20,61,0.08)", "rgba(87,42,103,0.28)", "rgba(24,9,39,0.62)"],
  },
  rylane: {
    name: "Sy After Dark",
    emoji: "🌃",
    feeling: "city chill",
    detail: "indigo · midnight blue · window lights",
    background: "#0c102c",
    card: "#202353",
    accent: "#8f9cff",
    soft: "#d7dcff",
    room: bgRylaneRoomDeepNight,
    overlay: ["rgba(8,13,45,0.08)", "rgba(24,29,82,0.3)", "rgba(5,7,27,0.66)"],
  },
  cloud: {
    name: "Cloud Drift",
    emoji: "☁️",
    feeling: "quiet and floating",
    detail: "cloud white · lavender mist · soft blue",
    background: "#25253f",
    card: "#555577",
    accent: "#c8c9f5",
    soft: "#f0efff",
    room: bgCloudRoomEvening,
    overlay: ["rgba(229,231,255,0.16)", "rgba(143,148,194,0.22)", "rgba(42,37,70,0.52)"],
  },
  night: {
    name: "Night Comfort",
    emoji: "🌙",
    feeling: "late-night safe",
    detail: "deep violet · moonlight silver · stars",
    background: "#110a28",
    card: "#2d2051",
    accent: "#bbb7ef",
    soft: "#e7e5ff",
    room: bgNightRoomDeepNight,
    overlay: ["rgba(20,12,53,0.08)", "rgba(47,31,91,0.28)", "rgba(7,4,24,0.7)"],
  },
  rain: {
    name: "Window Rain",
    emoji: "🌧️",
    feeling: "reflective and held",
    detail: "muted blue-purple · rain glass · hush",
    background: "#17263c",
    card: "#30445f",
    accent: "#91b7dc",
    soft: "#d8e8f7",
    room: bgRayleneRoomRain,
    overlay: ["rgba(26,58,83,0.1)", "rgba(42,67,98,0.3)", "rgba(10,22,39,0.68)"],
  },
  sunset: {
    name: "Sunset Exhale",
    emoji: "🌆",
    feeling: "warm evening",
    detail: "purple-orange sky · lamp glow · unwind",
    background: "#321630",
    card: "#66334d",
    accent: "#f4a07f",
    soft: "#ffe0d1",
    room: bgRayleneRoomEvening,
    overlay: ["rgba(142,69,72,0.1)", "rgba(106,48,92,0.26)", "rgba(39,13,44,0.62)"],
  },
};

export const normalizeVibeKey = (key?: string): VibeKey => {
  if (key && key in THEME_PACKS) return key as VibeKey;
  if (key === "flower") return "raylene";
  if (key === "galaxy") return "rylane";
  if (key === "neon") return "night";
  return "raylene";
};

// Normalize a sekret selector key (e.g. 'soft' from legacy code) to a Character.
// 'soft' is the internal key for Suhana; all others map 1-to-1.
export const normalizeCharacterKey = (key?: string): Character => {
  if (key === "rylane") return "rylane";
  if (key === "cloud")  return "cloud";
  if (key === "night")  return "night";
  return "raylene"; // 'soft', 'raylene', or any unknown → raylene
};

export const SEKRET_PROFILES: Record<
  string,
  {
    name: string;
    emoji: string;
    title: string;
    vibe: string;
    greeting: string;
  }
> = {
  soft: {
    name: "Suhana",
    emoji: "🌸",
    title: "Favorite Older Sister",
    vibe: "Funny, warm, protective, and impossible to fool.",
    greeting: "friend... 😭 okay, what happened?",
  },
  rylane: {
    name: "Sy",
    emoji: "⚡",
    title: "Loyal Bro",
    vibe: "Quiet loyalty. Keeps it real. Never talks down.",
    greeting: "Aight, I'm here. What's been heavy?",
  },
  cloud: {
    name: "Cloud Se'kret",
    emoji: "☁️",
    title: "Quiet Observer",
    vibe: "Notices. Waits. Rarely pushes.",
    greeting: "something feels different today.",
  },
  night: {
    name: "Night Se'kret",
    emoji: "🌙",
    title: "The Light Left On",
    vibe: "Presence. Not conversation.",
    greeting: "rough night?",
  },
};

export const HOME_MESSAGES = [
  "Don't stay up carrying the whole world tonight.",
  "Rest is productive too.",
  "You deserve softness too.",
  "Heavy days do not define you.",
  "Your mind deserves rest.",
  "Breathe slowly tonight.",
  "You made it through today.",
];

export const COMFORT_MESSAGES = [
  "You are not too much.",
  "Rest is not giving up.",
  "You can feel this and still be okay.",
  "You don't have to explain your pain to deserve care.",
  "You made it through hard days before.",
  "Softness is not weakness.",
  "You deserve the same kindness you give others.",
  "It's okay to not be okay right now.",
];

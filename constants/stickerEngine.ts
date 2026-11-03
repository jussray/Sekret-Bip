// constants/stickerEngine.ts
// Se'kret Bip — Sticker Expression Engine
// ─────────────────────────────────────────────────────────────────────────────
// Maps emotional states → character images using existing IMAGES keys only.
// No new filenames. No new art. No screen logic changes.
//
// HOW IT WORKS:
//   1. Se'kret Brain sets an EmotionalState ('thinking', 'comforting', etc.)
//   2. getStickerForState(character, emotionalState, context?) returns the image
//   3. useStickerExpression() hook drives smooth Animated fade transitions
//
// HOW TO EXPAND (future stickers):
//   1. Add the new IMAGES key to constants/theme.ts (one require() line)
//   2. Add the new filename to CHARACTER_ASSETS in characterAssets.ts (metadata)
//   3. Add or update an entry in STICKER_MAP below
//   No screen code needs to change — the hook re-renders automatically.
// ─────────────────────────────────────────────────────────────────────────────

import { IMAGES } from './theme';
import type { ImageSourcePropType } from 'react-native';
import type { SekretPersonality } from '../services/sekretPresence';

// ── Emotional States ──────────────────────────────────────────────────────────
// These are the states Se'kret Brain can emit.
// Add new states here as the companion logic grows.

export type EmotionalState =
  | 'neutral'       // default idle — no strong signal
  | 'happy'         // joy, pride, celebration
  | 'thinking'      // processing, pondering, deciding
  | 'journaling'    // writing, reflecting in journal
  | 'reflecting'    // quiet reflection, window-gazing
  | 'listening'     // voice bip, recording, present
  | 'responding'    // replying, talking, engaged
  | 'comforting'    // comfort mode, care, support
  | 'sleepy'        // low energy, late night
  | 'stormy'        // distressed, big feelings
  | 'voiceDay'      // voice bip — daytime context
  | 'voiceNight';   // voice bip — nighttime context

// ── Context Hints ─────────────────────────────────────────────────────────────
// Optional context passed to getStickerForState() to help break ties.

export interface StickerContext {
  screen?:     string;        // current screen name
  timeOfDay?:  'day' | 'night';
  isRylane?:   boolean;       // shorthand when character is already known
}

// ── Sticker Entry ─────────────────────────────────────────────────────────────

export interface StickerEntry {
  imageKey:    keyof typeof IMAGES;
  fallbackKey: keyof typeof IMAGES;   // shown if imageKey ever missing (belt + suspenders)
  description: string;                // human-readable — for debug + Figma handoff
}

// ── Sticker Map ───────────────────────────────────────────────────────────────
// CHARACTER → EMOTIONAL STATE → StickerEntry
//
// All keys must exist in IMAGES (verified against theme.ts on 2026-06-12).
// To add a new sticker: add the IMAGES key in theme.ts, then add/update here.

type StickerMap = Record<SekretPersonality, Record<EmotionalState, StickerEntry>>;

export const STICKER_MAP: StickerMap = {

  // ── Suhana ─────────────────────────────────────────────────────────────────
  suhana: {
    neutral:    { imageKey: 'rayleneNeutral',    fallbackKey: 'rayleneNeutral',   description: 'Suhana — calm, present' },
    happy:      { imageKey: 'rayleneHappy',      fallbackKey: 'rayleneNeutral',   description: 'Suhana — joy, celebration' },
    thinking:   { imageKey: 'rayleneThinking',   fallbackKey: 'rayleneNeutral',   description: 'Suhana — processing, pondering' },
    journaling: { imageKey: 'rayleneWriting',    fallbackKey: 'rayleneNeutral',   description: 'Suhana — writing in journal' },
    reflecting: { imageKey: 'rayleneWindow',     fallbackKey: 'rayleneNeutral',   description: 'Suhana — quiet reflection at window' },
    listening:  { imageKey: 'rayleneVoiceDay',   fallbackKey: 'rayleneNeutral',   description: 'Suhana — present, listening' },
    responding: { imageKey: 'rayleneHappy',      fallbackKey: 'rayleneNeutral',   description: 'Suhana — engaged, replying' },
    comforting: { imageKey: 'rayleneWindowRainy',fallbackKey: 'rayleneWindow',    description: 'Suhana — soft comfort, rainy window' },
    sleepy:     { imageKey: 'rayleneNightWindow',fallbackKey: 'rayleneWindow',    description: 'Suhana — late night, low energy' },
    stormy:     { imageKey: 'rayleneWriting',    fallbackKey: 'rayleneNeutral',   description: 'Suhana — big feelings, processing' },
    voiceDay:   { imageKey: 'rayleneVoiceDay',   fallbackKey: 'rayleneWindow',    description: 'Suhana — voice bip, daytime' },
    voiceNight: { imageKey: 'rayleneVoiceNight', fallbackKey: 'rayleneNightWindow', description: 'Suhana — voice bip, nighttime' },
  },

  // ── Sy ──────────────────────────────────────────────────────────────────
  sy: {
    neutral:    { imageKey: 'rylaneNeutral',    fallbackKey: 'rylaneNeutral',    description: 'Sy — composed, ready' },
    happy:      { imageKey: 'rylaneHappy',      fallbackKey: 'rylaneNeutral',    description: 'Sy — proud, winning' },
    thinking:   { imageKey: 'rylaneThinking',   fallbackKey: 'rylaneNeutral',    description: 'Sy — calculating, focused' },
    journaling: { imageKey: 'rylaneWriting',    fallbackKey: 'rylaneNeutral',    description: 'Sy — writing it down' },
    reflecting: { imageKey: 'rylaneWindowDay',  fallbackKey: 'rylaneWindow',     description: 'Sy — quiet at window, daytime' },
    listening:  { imageKey: 'rylaneVoiceDay',   fallbackKey: 'rylaneNeutral',    description: 'Sy — locked in, listening' },
    responding: { imageKey: 'rylaneHappy',      fallbackKey: 'rylaneNeutral',    description: 'Sy — direct, engaged' },
    comforting: { imageKey: 'rylaneWindow',     fallbackKey: 'rylaneNeutral',    description: 'Sy — steady, supportive' },
    sleepy:     { imageKey: 'rylaneNeutralV2',  fallbackKey: 'rylaneNeutral',    description: 'Sy — low energy, tired' },
    stormy:     { imageKey: 'rylaneThinking',   fallbackKey: 'rylaneNeutral',    description: 'Sy — processing hard feelings' },
    voiceDay:   { imageKey: 'rylaneVoiceDay',   fallbackKey: 'rylaneWindow',     description: 'Sy — voice bip, daytime' },
    voiceNight: { imageKey: 'rylaneVoiceNight', fallbackKey: 'rylaneWindow',     description: 'Sy — voice bip, nighttime' },
  },

  // ── Cloud ───────────────────────────────────────────────────────────────────
  cloud: {
    neutral:    { imageKey: 'cloud',             fallbackKey: 'cloud',            description: 'Cloud — floating, neutral' },
    happy:      { imageKey: 'cloudHappy',        fallbackKey: 'cloud',            description: 'Cloud — beaming, cheerful' },
    thinking:   { imageKey: 'cloudHeadphones',   fallbackKey: 'cloud',            description: 'Cloud — headphones on, processing' },
    journaling: { imageKey: 'cloudHeadphonesV2', fallbackKey: 'cloudHeadphones',  description: 'Cloud — focused, writing vibes' },
    reflecting: { imageKey: 'cloudSleepy',       fallbackKey: 'cloud',            description: 'Cloud — dreamy, reflective' },
    listening:  { imageKey: 'cloudHeadphones',   fallbackKey: 'cloud',            description: 'Cloud — fully tuned in' },
    responding: { imageKey: 'cloudHappy',        fallbackKey: 'cloud',            description: 'Cloud — bright, responding' },
    comforting: { imageKey: 'cloudSleepy',       fallbackKey: 'cloud',            description: 'Cloud — soft, soothing presence' },
    sleepy:     { imageKey: 'cloudSleepy',       fallbackKey: 'cloud',            description: 'Cloud — sleepy, low energy' },
    stormy:     { imageKey: 'cloudStormy',       fallbackKey: 'cloud',            description: 'Cloud — stormy feelings' },
    voiceDay:   { imageKey: 'cloudHeadphones',   fallbackKey: 'cloud',            description: 'Cloud — voice bip' },
    voiceNight: { imageKey: 'cloudHeadphones',   fallbackKey: 'cloud',            description: 'Cloud — voice bip, late night' },
  },

  // ── Night ───────────────────────────────────────────────────────────────────
  night: {
    neutral:    { imageKey: 'nightAvatarNeutral',  fallbackKey: 'rayleneWindowRainy', description: 'Night — still, present' },
    happy:      { imageKey: 'nightAvatarHappy',    fallbackKey: 'nightAvatarNeutral', description: 'Night — rare warmth' },
    thinking:   { imageKey: 'nightAvatarThinking', fallbackKey: 'nightAvatarNeutral', description: 'Night — quiet processing' },
    journaling: { imageKey: 'nightAvatarWriting',  fallbackKey: 'nightAvatarNeutral', description: 'Night — writing in the dark' },
    reflecting: { imageKey: 'nightAvatarWindow',   fallbackKey: 'nightAvatarNeutral', description: 'Night — at window, 2AM energy' },
    listening:  { imageKey: 'nightAvatarNeutral',  fallbackKey: 'rayleneWindowRainy', description: 'Night — silent listening' },
    responding: { imageKey: 'nightAvatarHappy',    fallbackKey: 'nightAvatarNeutral', description: 'Night — direct response' },
    comforting: { imageKey: 'nightAvatarWindow',   fallbackKey: 'nightAvatarNeutral', description: 'Night — standing at window for you' },
    sleepy:     { imageKey: 'nightAvatarWindow',   fallbackKey: 'nightAvatarNeutral', description: 'Night — late night low energy' },
    stormy:     { imageKey: 'nightAvatarThinking', fallbackKey: 'nightAvatarNeutral', description: 'Night — absorbing the storm' },
    voiceDay:   { imageKey: 'nightAvatarNeutral',  fallbackKey: 'rayleneWindowRainy', description: 'Night — voice bip' },
    voiceNight: { imageKey: 'nightAvatarWindow',   fallbackKey: 'nightAvatarNeutral', description: 'Night — voice bip, late night' },
  },
};

// ── Core getter ───────────────────────────────────────────────────────────────

/**
 * getStickerForState(character, state, context?)
 *
 * Returns the ImageSourcePropType for a given character + emotional state.
 * Uses context.timeOfDay to resolve voice states automatically if not explicit.
 * Falls back to neutral if anything is missing.
 *
 * Usage:
 *   <Image source={getStickerForState('suhana', 'thinking')} />
 *   <Image source={getStickerForState('sy', 'voiceDay', { timeOfDay: 'day' })} />
 */
export function getStickerForState(
  character: SekretPersonality,
  state: EmotionalState,
  context?: StickerContext,
): ImageSourcePropType {
  // Resolve generic 'listening' to voiceDay/voiceNight when on voiceBip screen
  let resolvedState = state;
  if (state === 'listening' && context?.screen === 'voiceBip') {
    resolvedState = context.timeOfDay === 'night' ? 'voiceNight' : 'voiceDay';
  }

  const characterMap = STICKER_MAP[character];
  if (!characterMap) return IMAGES.rayleneNeutral as ImageSourcePropType;

  const entry = characterMap[resolvedState];
  if (!entry) return IMAGES[STICKER_MAP[character].neutral.imageKey] as ImageSourcePropType;

  // Primary key — always exists in IMAGES (verified)
  const source = IMAGES[entry.imageKey];
  if (source) return source as ImageSourcePropType;

  // Belt + suspenders fallback
  const fallback = IMAGES[entry.fallbackKey];
  if (fallback) return fallback as ImageSourcePropType;

  return IMAGES.rayleneNeutral as ImageSourcePropType;
}

/**
 * getStickerEntry(character, state)
 *
 * Returns the full StickerEntry metadata for a given character + state.
 * Useful for debug panels, Figma handoff docs, or future sticker swaps.
 */
export function getStickerEntry(
  character: SekretPersonality,
  state: EmotionalState,
): StickerEntry {
  return STICKER_MAP[character]?.[state] ?? STICKER_MAP.suhana.neutral;
}

/**
 * getAllStatesForCharacter(character)
 *
 * Returns all EmotionalState → StickerEntry pairs for a character.
 * Use this to build a sticker preview grid or asset checklist.
 */
export function getAllStatesForCharacter(
  character: SekretPersonality,
): Array<{ state: EmotionalState; entry: StickerEntry }> {
  return Object.entries(STICKER_MAP[character]).map(([state, entry]) => ({
    state: state as EmotionalState,
    entry,
  }));
}

// ── Cloud Expression Engine ─────────────────────────────────────────────────
// Cloud's expressions map to the full-size Cloud mascot assets in theme.ts IMAGES.
// These are the large mascot avatars, NOT the sticker layer.

export type CloudExpression =
  | 'happy' | 'sleepy' | 'stormy' | 'comfort' | 'listening'
  | 'voice-bip' | 'journal' | 'hug' | 'proud' | 'crying'
  | 'cozy' | 'dreamy' | 'thinking' | 'bippin-brb' | 'cheer';

const CLOUD_EXPRESSIONS: Record<CloudExpression, keyof typeof IMAGES> = {
  'happy':       'cloudHappy',
  'sleepy':      'cloudSleepy',
  'stormy':      'cloudStormy',
  'comfort':     'cloud',
  'listening':   'cloudHeadphones',
  'voice-bip':   'cloudHeadphonesV2',
  'journal':     'cloud',
  'hug':         'cloudHappy',
  'proud':       'cloudHappy',
  'crying':      'cloudStormy',
  'cozy':        'cloud',
  'dreamy':      'cloudSleepy',
  'thinking':    'cloud',
  'bippin-brb':  'cloudSleepy',
  'cheer':       'cloudHappy',
};

/**
 * getExpressionAsset(character, expression)
 *
 * Resolves a character + expression to a renderable image source.
 * Currently specialized for the Cloud mascot expression set:
 *   getExpressionAsset('cloud', 'listening')  // → IMAGES.cloudHeadphones
 *   getExpressionAsset('cloud', 'bippin-brb') // → IMAGES.cloudSleepy
 */
export function getExpressionAsset(
  character: 'cloud',
  expression: CloudExpression,
): ImageSourcePropType {
  if (character === 'cloud') {
    const key = CLOUD_EXPRESSIONS[expression];
    const source = key ? IMAGES[key] : undefined;
    if (source) return source as ImageSourcePropType;
    return IMAGES.cloud as ImageSourcePropType;
  }
  return IMAGES.cloud as ImageSourcePropType;
}

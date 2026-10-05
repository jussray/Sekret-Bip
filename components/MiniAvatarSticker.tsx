// MiniAvatarSticker — canonical reusable mini sticker component
//
// SEPARATION OF ENGINES:
//   Full-size avatar engine → RoomScreen, HomeScreen presence,
//                             VoiceBipScreen main companion, Tolan-style moments
//   Mini sticker engine    → journal corners, page reactions, Circle reactions,
//                             streaks, save confirmations, comfort/Cloud Thoughts
//
// Stickers NEVER replace full-size avatars.
//
// CHARACTER ROUTING RULES:
//   raylene page/context  → raylene mini sticker, fallback to Suhana avatar
//   rylane  page/context  → rylane  mini sticker, fallback to Sy avatar
//   cloud   page/context  → cloud   mini sticker, fallback to Cloud avatar
//   night   context       → night/rylane-night sticker, fallback to Night avatar
//   oracle  / sekretBrain → return null (never shown, never rendered)
//   null / unknown        → return null

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { IMAGES, AVATARS } from '../constants/theme';
import {
  getContextSticker,
  getStickerById,
  type StickerContext,
} from '../constants/characterStickers';

export type MiniAvatarCharacter =
  | 'raylene'
  | 'rylane'
  | 'cloud'
  | 'night'
  | 'oracle'
  | 'sekretBrain'
  | null;

interface MiniAvatarStickerProps {
  /** Which character owns this page/context. Oracle and sekretBrain always render null. */
  character: MiniAvatarCharacter;
  /** Screen context used to pick the right sticker emotion from the registry. */
  screenContext?: StickerContext | null;
  /** Rendered size in dp. Defaults to 48. */
  size?: number;
  /** Override absolute position. Defaults to bottom-right corner (bottom:8, right:8). */
  bottom?: number;
  right?: number;
  /** Opacity override. Defaults to 0.88. */
  opacity?: number;
}

function fallbackAvatar(character: Exclude<MiniAvatarCharacter, 'oracle' | 'sekretBrain' | null>) {
  const avatarMap = AVATARS as Record<string, Record<string, unknown> | unknown>;
  const imageMap = IMAGES as Record<string, unknown>;

  if (character === 'raylene') {
    return imageMap.rayleneWriting ?? imageMap.rayleneNeutral ?? (avatarMap.raylene as any)?.neutral;
  }
  if (character === 'rylane') {
    return imageMap.rylaneWriting ?? imageMap.rylaneNeutral ?? (avatarMap.rylane as any)?.neutral;
  }
  if (character === 'cloud') {
    return imageMap.cloudAvatarWriting ?? imageMap.cloudHeadphones ?? imageMap.cloud ?? (avatarMap.cloud as any)?.neutral;
  }
  if (character === 'night') {
    return imageMap.nightWriting ?? imageMap.nightNeutral ?? (avatarMap.night as any)?.neutral;
  }
  return null;
}

function MiniAvatarImage({ source, size, bottom, right, opacity }: {
  source: unknown;
  size: number;
  bottom: number;
  right: number;
  opacity: number;
}) {
  if (!source) return null;
  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, bottom, right, opacity },
      ]}
    >
      <Image
        source={source as any}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </View>
  );
}

export function MiniAvatarSticker({
  character,
  screenContext,
  size = 48,
  bottom = 8,
  right = 8,
  opacity = 0.88,
}: MiniAvatarStickerProps) {
  // Hard block: Oracle and Se'kret Brain are never shown as stickers
  if (!character || character === 'oracle' || character === 'sekretBrain') return null;

  const ctx: StickerContext = screenContext ?? 'general';
  const imageMap = IMAGES as Record<string, unknown>;

  // Night context: prefer rylane-night sticker if registered, then fall back to Night.
  if (character === 'night') {
    const nightSticker = getStickerById('rylane-night');
    const src = nightSticker?.renderable && nightSticker.assetKey
      ? imageMap[nightSticker.assetKey]
      : null;
    return (
      <MiniAvatarImage
        source={src ?? fallbackAvatar('night')}
        size={size}
        bottom={bottom}
        right={right}
        opacity={opacity}
      />
    );
  }

  // Suhana / Sy / Cloud: look up context sticker from registry first.
  const sticker = getContextSticker(character, ctx);
  const imgSource = sticker?.renderable && sticker.assetKey
    ? imageMap[sticker.assetKey]
    : null;

  return (
    <MiniAvatarImage
      source={imgSource ?? fallbackAvatar(character)}
      size={size}
      bottom={bottom}
      right={right}
      opacity={opacity}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 12,
    pointerEvents: 'none',
  } as any,
});

// MiniReactionSticker — sticker layer companion for cards/screens
// Oracle always hidden. Sticker-first → avatar fallback → null.
// Avatar fallback is TEMPORARY until all sticker art is cut.
// Tolan layer (Suhana/Sy/Night): large avatar at mini size (40px) as stand-in.
// Mascot layer (Cloud): large mascot avatar at mini size as stand-in.

import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { IMAGES } from '../constants/theme';
import { getContextSticker, StickerContext } from '../constants/characterStickers';
import { getAvatarForState } from '../constants/characterAvatars';

export type MiniStickerCharacter = 'raylene' | 'rylane' | 'cloud' | 'night' | 'oracle' | null;

interface MiniReactionStickerProps {
  character: MiniStickerCharacter;
  screenContext?: StickerContext | null;
  size?: number;
}

export function MiniReactionSticker({ character, screenContext, size = 40 }: MiniReactionStickerProps) {
  if (!character || character === 'oracle') return null;

  const ctx: StickerContext = screenContext ?? 'general';

  // 1. Sticker layer (raylene/rylane/cloud only)
  if (character !== 'night') {
    const sticker = getContextSticker(character as any, ctx);
    if (sticker?.renderable && sticker.assetKey) {
      const imgSource = (IMAGES as Record<string, any>)[sticker.assetKey];
      if (imgSource) {
        return (
          <View style={[styles.container, { width: size, height: size }]}>
            <Image source={imgSource} style={[styles.image, { width: size, height: size }]} resizeMode="contain" />
          </View>
        );
      }
    }
  }

  // 2. Avatar fallback (all characters incl. night)
  const avatar = getAvatarForState(character as any, 'idle');
  if (avatar?.renderable && avatar.assetKey) {
    const imgSource = (IMAGES as Record<string, any>)[avatar.assetKey];
    if (imgSource) {
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Image source={imgSource} style={[styles.image, { width: size, height: size }]} resizeMode="contain" />
        </View>
      );
    }
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    zIndex: 10,
    opacity: 0.85,
    borderRadius: 20,
    overflow: 'hidden',
  },
  image: {
    borderRadius: 20,
  },
});

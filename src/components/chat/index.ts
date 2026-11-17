/**
 * src/components/chat/index.ts
 *
 * Chat-specific components.
 *
 * Usage: import { BipEmptyState } from '@/components/chat';
 */
import React from 'react';

let BipEmptyState: React.ComponentType<any>;
try {
  BipEmptyState = require('../../components/BipEmptyState').BipEmptyState;
} catch {
  BipEmptyState = () => null;
}
export { BipEmptyState };

let MiniReactionSticker: React.ComponentType<any>;
try {
  MiniReactionSticker = require('../../components/MiniReactionSticker').MiniReactionSticker;
} catch {
  MiniReactionSticker = () => null;
}
export { MiniReactionSticker };

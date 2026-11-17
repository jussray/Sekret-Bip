// src/utils/moodEngine.ts
// Converted from utils/moodEngine.js — typed version.

export interface MoodEngineResult {
  emoji: string;
  title: string;
  message: string;
  room: string;
  action: string;
}

export function getMoodEngine(mood: string): MoodEngineResult {
  if (mood === 'Happy') {
    return {
      emoji: '\uD83C\uDF24\uFE0F',
      title: 'Your glow is growing.',
      message: 'Use this energy to build confidence, not pressure.',
      room: 'Bright Growth Room',
      action: 'Try one bold little step today.',
    };
  }
  if (mood === 'Sad') {
    return {
      emoji: '\u2601\uFE0F',
      title: 'Tonight we move softly.',
      message: 'Growth can be quiet. Rest still counts.',
      room: 'Soft Recovery Room',
      action: 'Do one gentle thing for yourself.',
    };
  }
  if (mood === 'Angry') {
    return {
      emoji: '\uD83D\uDD25',
      title: 'Your fire needs somewhere safe to go.',
      message: 'Anger can become boundaries, movement, and truth.',
      room: 'Release Room',
      action: 'Move your body or name what felt unfair.',
    };
  }
  if (mood === 'Tired') {
    return {
      emoji: '\uD83C\uDF19',
      title: 'Rest is part of becoming.',
      message: 'You do not have to earn softness.',
      room: 'Low Power Growth Room',
      action: 'Choose the smallest possible win.',
    };
  }
  return {
    emoji: '\uD83D\uDC9C',
    title: 'You are becoming.',
    message: 'Bippin2 grows with your energy.',
    room: 'Growth Room',
    action: 'Start where you are.',
  };
}

type NumberRange = [number, number];

export const PRESENCE_MOTION = Object.freeze({
  stateCrossfadeMs: 420,
  cloudFloatDurationMs: 3600,
  cloudBreathDurationMs: 2200,
  pillBreathDurationMs: 1800,
  cloudTranslateX: [-6, 6] as NumberRange,
  cloudTranslateY: [-3, 3] as NumberRange,
  cloudScale: [1, 1.04] as NumberRange,
  cloudOpacity: [0.78, 1] as NumberRange,
  pillOpacity: [0.8, 1] as NumberRange,
  pillScale: [1, 1.03] as NumberRange,
});
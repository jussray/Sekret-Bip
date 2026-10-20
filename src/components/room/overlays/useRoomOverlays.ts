/**
 * src/components/room/overlays/useRoomOverlays.ts
 *
 * Returns the correct overlay config for a given sekret + variant.
 * Consumers render <RainOverlay>, <AmbientLight>, <CurtainSway>
 * based on what this hook returns.
 */

import type { TimeOfDay } from './AmbientLight';

export type Sekret = 'raylene' | 'rylane' | 'cloud' | 'night' | 'dad' | 'mom';

export interface RoomOverlayConfig {
  ambientVariant: TimeOfDay;
  rainIntensity: number;   // 0 = none, 1 = heavy
  curtainIntensity: number; // 0 = still, 1 = storm sway
  curtainColor: string;
}

const SEKRET_CURTAIN_COLORS: Record<Sekret, string> = {
  raylene: 'rgba(255,220,200,0.30)',
  rylane:  'rgba(200,220,255,0.30)',
  cloud:   'rgba(240,240,255,0.28)',
  night:   'rgba(180,160,220,0.28)',
  dad:     'rgba(200,210,200,0.30)',
  mom:     'rgba(255,210,220,0.30)',
};

export function useRoomOverlays(sekret: Sekret, variant: TimeOfDay): RoomOverlayConfig {
  const curtainColor = SEKRET_CURTAIN_COLORS[sekret] ?? 'rgba(220,200,180,0.30)';

  const rainIntensity    = variant === 'rain' ? 0.75 : 0;
  const curtainIntensity = variant === 'rain' ? 0.9
    : variant === 'evening' || variant === 'night' ? 0.25
    : 0.15;

  return {
    ambientVariant: variant,
    rainIntensity,
    curtainIntensity,
    curtainColor,
  };
}

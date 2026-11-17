/**
 * RoomMemory
 * Tracks per-character room interactions.
 * Supabase-ready: maps to the future `room_memory` table.
 *
 * NOTE: AppContent.tsx re-exports this type so screens that previously
 * imported from app/index.tsx continue to work:
 *   export type { RoomMemory } from './types/roomMemory';
 *   export { DEFAULT_ROOM_MEMORY } from './types/roomMemory';
 */
export interface RoomMemory {
  /** Active personality key (raylene | rylane | cloud | night) */
  character: string;
  /** ISO timestamp of last room visit */
  lastVisit: string;
  /** Last hotspot the user interacted with */
  lastHotspot: string;
  /** Last personality summoned in the room */
  lastSummon: string;
  /** Total visit count — used for engagement scoring */
  visitCount: number;
}

export const DEFAULT_ROOM_MEMORY: RoomMemory = {
  character: 'raylene',
  lastVisit: '',
  lastHotspot: '',
  lastSummon: '',
  visitCount: 0,
};

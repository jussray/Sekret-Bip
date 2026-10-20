/**
 * src/components/index.ts
 *
 * Master components barrel.
 * Prefer importing from a specific domain barrel for better tree-shaking:
 *   import { BottomNav }     from '@/components/layout';
 *   import { AgeGate }       from '@/components/safety';
 *   import { RoomBackground } from '@/components/room';
 */
export * from './layout';
export * from './room';

import type { ImageSourcePropType } from 'react-native';
import { getNightPoseAsset } from './nightRoomAssetRegistry';

export type CompanionId = 'night' | 'suhana' | 'sy' | 'cloud' | 'mom' | 'dad';
export type LegacyCompanionKey = 'raylene' | 'rylane';
export type CompanionRuntimeKey = CompanionId | LegacyCompanionKey;
export type CompanionRole = 'room-anchor' | 'lead' | 'guardian' | 'support' | 'parent';
export type CompanionHorizontalAnchor = 'left' | 'center' | 'right';

export interface CompanionRuntimeContract {
  id: CompanionId;
  label: string;
  role: CompanionRole;
  source: ImageSourcePropType | null;
  available: boolean;
  baseScale: number;
  aspectRatio: number;
  anchor: {
    horizontal: CompanionHorizontalAnchor;
    bottomPercent: number;
  };
  motion: {
    idleAmplitude: number;
    idleDurationMs: number;
  };
  compatibilityKey?: LegacyCompanionKey;
}

const SUHANA_MASTER = require('../../assets/images/companions/raylene/raylene-master.png');
const SY_MASTER = require('../../assets/images/companions/rylane/rylane-master.png');
const CLOUD_MASTER = require('../../assets/images/cloud.png');

export const COMPANION_RUNTIME_REGISTRY: Record<CompanionId, CompanionRuntimeContract> = {
  night: {
    id: 'night',
    label: 'Night',
    role: 'room-anchor',
    source: getNightPoseAsset('neutral').source,
    available: true,
    baseScale: 0.45,
    aspectRatio: 0.5,
    anchor: { horizontal: 'center', bottomPercent: 12 },
    motion: { idleAmplitude: 6, idleDurationMs: 2200 },
  },
  suhana: {
    id: 'suhana',
    label: 'Suhana',
    role: 'lead',
    source: SUHANA_MASTER,
    available: true,
    baseScale: 0.43,
    aspectRatio: 0.5,
    anchor: { horizontal: 'center', bottomPercent: 12 },
    motion: { idleAmplitude: 5, idleDurationMs: 2400 },
    compatibilityKey: 'raylene',
  },
  sy: {
    id: 'sy',
    label: 'Sy',
    role: 'guardian',
    source: SY_MASTER,
    available: true,
    baseScale: 0.41,
    aspectRatio: 0.5,
    anchor: { horizontal: 'right', bottomPercent: 11 },
    motion: { idleAmplitude: 4, idleDurationMs: 2500 },
    compatibilityKey: 'rylane',
  },
  cloud: {
    id: 'cloud',
    label: 'Cloud',
    role: 'support',
    source: CLOUD_MASTER,
    available: true,
    baseScale: 0.24,
    aspectRatio: 1,
    anchor: { horizontal: 'left', bottomPercent: 28 },
    motion: { idleAmplitude: 10, idleDurationMs: 3000 },
  },
  mom: {
    id: 'mom',
    label: 'Mom',
    role: 'parent',
    source: null,
    available: false,
    baseScale: 0.38,
    aspectRatio: 0.5,
    anchor: { horizontal: 'left', bottomPercent: 14 },
    motion: { idleAmplitude: 3, idleDurationMs: 2800 },
  },
  dad: {
    id: 'dad',
    label: 'Dad',
    role: 'parent',
    source: null,
    available: false,
    baseScale: 0.4,
    aspectRatio: 0.5,
    anchor: { horizontal: 'right', bottomPercent: 14 },
    motion: { idleAmplitude: 3, idleDurationMs: 2800 },
  },
};

export function resolveCompanionId(key: CompanionRuntimeKey): CompanionId {
  if (key === 'raylene') return 'suhana';
  if (key === 'rylane') return 'sy';
  return key;
}

export function getCompanionRuntime(key: CompanionRuntimeKey): CompanionRuntimeContract {
  return COMPANION_RUNTIME_REGISTRY[resolveCompanionId(key)];
}

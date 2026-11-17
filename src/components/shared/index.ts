/**
 * src/components/shared/index.ts
 *
 * Generic reusable components.
 *
 * Usage: import { SafeAsset } from '@/components/shared';
 */
import React from 'react';

// SafeAsset
let SafeAsset: React.ComponentType<any>;
try {
  SafeAsset = require('../../../components/SafeAsset').SafeAsset;
} catch {
  SafeAsset = () => null;
}
export { SafeAsset };

// SyncBadge
let SyncBadge: React.ComponentType<any>;
try {
  SyncBadge = require('../../../components/SyncBadge').SyncBadge;
} catch {
  SyncBadge = () => null;
}
export { SyncBadge };

// Analytics — KNOWN GOOD (used in AppContent directly)
export { Analytics } from '../../../components/Analytics';

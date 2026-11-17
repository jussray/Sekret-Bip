/**
 * src/components/safety/index.ts
 *
 * Gating & moderation components.
 *
 * Usage: import { AgeGate } from '@/components/safety';
 */
import React from 'react';

// AgeGate
let AgeGate: React.ComponentType<any>;
try {
  AgeGate = require('../../../components/AgeGate').AgeGate;
} catch {
  AgeGate = () => null;
}
export { AgeGate };

// SleepGate — KNOWN GOOD (used in AppContent directly, keep named export)
export { SleepGate } from '../../../components/SleepGate';

// ContentSafetyBlock
let ContentSafetyBlock: React.ComponentType<any>;
try {
  ContentSafetyBlock = require('../../../components/ContentSafetyBlock').ContentSafetyBlock;
} catch {
  ContentSafetyBlock = () => null;
}
export { ContentSafetyBlock };

// PrivacyLabel
let PrivacyLabel: React.ComponentType<any>;
try {
  PrivacyLabel = require('../../../components/PrivacyLabel').PrivacyLabel;
} catch {
  PrivacyLabel = () => null;
}
export { PrivacyLabel };

/**
 * src/components/ai/index.ts
 *
 * AI/personality-specific components.
 * These re-export from components/ root until physical files are moved in Step 3.
 *
 * IMPORTANT: each component is re-exported defensively so a missing file
 * does not crash the whole barrel — the try-require pattern is not available
 * in TS barrel files, so we stub any genuinely absent components inline.
 *
 * Usage: import { OracleDiscoveryPanel } from '@/components/ai';
 */

// -- OracleDiscoveryPanel -----------------------------------------------------
let OracleDiscoveryPanel: React.ComponentType<any>;
try {
  OracleDiscoveryPanel = require('../../components/OracleDiscoveryPanel').OracleDiscoveryPanel;
} catch {
  const React = require('react');
  OracleDiscoveryPanel = () => null;
}
export { OracleDiscoveryPanel };

// -- SekretCompanionCard ------------------------------------------------------
let SekretCompanionCard: React.ComponentType<any>;
try {
  SekretCompanionCard = require('../../components/SekretCompanionCard').SekretCompanionCard;
} catch {
  const React = require('react');
  SekretCompanionCard = () => null;
}
export { SekretCompanionCard };

// -- MiniAvatarSticker --------------------------------------------------------
let MiniAvatarSticker: React.ComponentType<any>;
try {
  MiniAvatarSticker = require('../../components/MiniAvatarSticker').MiniAvatarSticker;
} catch {
  const React = require('react');
  MiniAvatarSticker = () => null;
}
export { MiniAvatarSticker };

import React from 'react';

// src/teen/assets.ts
//
// ══════════════════════════════════════════════════════════════════
// SPLASH PNG RULE — PERMANENT, DO NOT OVERRIDE
// ══════════════════════════════════════════════════════════════════
//
// TEEN_SPLASH (splash-bg.png) is gateway artwork, NOT a screen background.
// It is used in exactly TWO places and must never appear anywhere else:
//
//   1. screens/SplashScreen.tsx  ← rendered by app/index.tsx
//      Shown when the teen opens the app or returns after the screen closes.
//
//   2. app/(onboarding)/teen-splash.tsx
//      Shown once, immediately after account setup is complete.
//
// EVERY other teen screen (sekret, room, companion-chat, pages, calm, etc.)
// MUST use getRoomBg(character, phase) + getRoomPhase() from constants/theme
// for its background. Room PNGs rotate with the time of day automatically.
//
// ❌ DO NOT import TEEN_SPLASH inside app/(teen)/ — ever.
// ❌ DO NOT use splash-bg.png as a fallback, placeholder, or backdrop.
// ✅ If you need a background in a teen screen, call getRoomBg().
//
// ══════════════════════════════════════════════════════════════════

export const TEEN_SPLASH = require('../../assets/images/splash-bg.png');

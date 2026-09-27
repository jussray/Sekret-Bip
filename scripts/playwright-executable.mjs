import fs from 'node:fs';
import { chromium } from '@playwright/test';

export const PLAYWRIGHT_CHROMIUM_FALLBACKS = Object.freeze([
  '/opt/pw-browsers/chromium',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]);

export function choosePlaywrightExecutablePath({
  explicitPath,
  managedPath,
  exists = fs.existsSync,
  fallbacks = PLAYWRIGHT_CHROMIUM_FALLBACKS,
} = {}) {
  const explicit = explicitPath?.trim();
  if (explicit) return explicit;

  // Playwright can install the full version-matched Chromium without the
  // separate headless shell (`playwright install chromium --no-shell`).
  // When that managed browser exists, launch it directly instead of leaving
  // Playwright to resolve a headless-shell executable that may not be present.
  if (managedPath && exists(managedPath)) return managedPath;

  return fallbacks.find((candidate) => exists(candidate));
}

export function resolvePlaywrightExecutablePath(env = process.env) {
  return choosePlaywrightExecutablePath({
    explicitPath: env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    managedPath: chromium.executablePath(),
  });
}

// Compatibility alias only. The canonical Cloudflare entry remains voice-entry.ts.
// Provider routing is mounted inside voice-entry.ts so existing auth, kill-switch,
// rate-limit, App Check, release identity, and Playwright contracts stay authoritative.
export { default } from './voice-entry';

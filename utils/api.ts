/**
 * Compatibility re-export for legacy screen imports.
 *
 * Canonical Se'kret API helpers, including the launch voice-cost policy, live
 * in src/utils/api.ts. Keep this file logic-free so legacy and modern routes
 * cannot drift into different paid/free voice behavior.
 */
export * from '../src/utils/api';

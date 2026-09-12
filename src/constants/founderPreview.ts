import { Platform } from 'react-native';

export type PreviewFeatureStatus =
  | 'live'
  | 'needs_setup'
  | 'server_rollout'
  | 'ui_preview'
  | 'not_built';

export type PreviewFeatureSide = 'teen' | 'parent' | 'dev' | 'shared';

export interface FounderPreviewFeature {
  key: string;
  title: string;
  group: string;
  side: PreviewFeatureSide;
  status: PreviewFeatureStatus;
  detail: string;
  route: string | null;
}

/**
 * Founder Preview defaults ON for native development clients such as Expo Go.
 * Web development remains fail-closed unless explicitly enabled, preserving
 * blank-browser onboarding and authorization guardrail tests.
 *
 * Production builds always remain closed, even if somebody accidentally leaves
 * EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW=true in a release environment.
 */
export function isFounderPreviewEnabled(): boolean {
  const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;
  if (!isDevelopment) return false;

  const explicit = process.env.EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW;
  if (explicit === 'false') return false;
  if (explicit === 'true') return true;

  return Platform.OS !== 'web';
}

export function founderPreviewAudience(): 'founder' | 'public' {
  return isFounderPreviewEnabled() ? 'founder' : 'public';
}

/**
 * Preview points are display-only. They unlock local UI gates without writing
 * a fake wallet balance, point transaction, reward purchase, or Supabase row.
 */
export const FOUNDER_PREVIEW_POINTS = 999;

export const FOUNDER_PREVIEW_FEATURES: readonly FounderPreviewFeature[] = [
  // Teen core
  { key: 'teen-room', title: 'Room', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Companion home, mood atmosphere, feature hotspots, and Bip return receipts.', route: '/(teen)/room' },
  { key: 'teen-pages', title: 'Pages', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Continuous journal with Suhana, Sy, Cloud, Night, Me, and Oracle tabs.', route: '/(teen)/pages' },
  { key: 'teen-pages-new', title: 'New Page', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Direct entry composer route.', route: '/(teen)/pages/new' },
  { key: 'teen-pages-history', title: 'Pages History', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Saved journal timeline and entry history.', route: '/(teen)/pages/history' },
  { key: 'teen-calm', title: 'Calm', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Comfort, grounding, regulation, and wind-down tools.', route: '/(teen)/calm' },
  { key: 'teen-breathe', title: 'Breathe', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Focused breathing experience.', route: '/(teen)/calm/breathe' },
  { key: 'teen-voicebip', title: 'Voice Bip', group: 'Teen · Core', side: 'teen', status: 'needs_setup', detail: 'Voice-first companion mode. Microphone permission and configured backend voice services are required for the complete flow.', route: '/(teen)/voicebip' },
  { key: 'teen-circle', title: 'Circle', group: 'Teen · Core', side: 'teen', status: 'needs_setup', detail: 'Anonymous community feed with owner-only support totals. Requires a permanent signed-in account.', route: '/(teen)/circle' },
  { key: 'teen-circle-weather', title: 'Circle Weather', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Community mood/weather view.', route: '/(teen)/circle/weather' },
  { key: 'teen-more', title: 'More', group: 'Teen · Core', side: 'teen', status: 'live', detail: 'Teen feature drawer and account tools.', route: '/(teen)/more' },

  // Teen companions and expression
  { key: 'companions', title: 'All Se’kret Companions', group: 'Teen · Companions', side: 'teen', status: 'live', detail: 'Suhana, Sy, Cloud, and Night open without waiting for point thresholds.', route: '/(teen)/discover' },
  { key: 'companion-picker', title: 'Companion Picker', group: 'Teen · Companions', side: 'teen', status: 'live', detail: 'Choose a companion before entering chat.', route: '/(teen)/chat' },
  { key: 'raylene-chat', title: 'Suhana Chat', group: 'Teen · Companions', side: 'teen', status: 'needs_setup', detail: 'Direct Suhana conversation. Complete AI replies require the configured Worker and model provider.', route: '/(teen)/chat/raylene' },
  { key: 'rylane-chat', title: 'Sy Chat', group: 'Teen · Companions', side: 'teen', status: 'needs_setup', detail: 'Direct Sy conversation with preview point gating removed.', route: '/(teen)/chat/rylane' },
  { key: 'cloud-chat', title: 'Cloud Chat', group: 'Teen · Companions', side: 'teen', status: 'needs_setup', detail: 'Direct Cloud conversation with preview point gating removed.', route: '/(teen)/chat/cloud' },
  { key: 'night-chat', title: 'Night Chat', group: 'Teen · Companions', side: 'teen', status: 'needs_setup', detail: 'Direct Night conversation with preview point gating removed.', route: '/(teen)/chat/night' },
  { key: 'cloud-thoughts', title: 'Cloud Thoughts', group: 'Teen · Companions', side: 'teen', status: 'live', detail: 'Quiet release space for thoughts that need somewhere soft to land.', route: '/(teen)/cloud' },
  { key: 'comfort', title: 'Emergency Comfort', group: 'Teen · Companions', side: 'teen', status: 'live', detail: 'Immediate comfort cards and grounding support.', route: '/(teen)/comfort' },
  { key: 'discover', title: 'Discover', group: 'Teen · Companions', side: 'teen', status: 'live', detail: 'Companion and quick-tool discovery surface.', route: '/(teen)/discover' },

  // Teen growth and rewards
  { key: 'retention', title: 'Bip Story Return Loop', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Meaningful-action receipts, active-day History, and the intentional Bip Energy fade.', route: '/(teen)/room' },
  { key: 'history', title: 'Meaningful History', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Active days, meaningful actions, and private growth categories.', route: '/(teen)/history' },
  { key: 'points', title: 'Bip Points & Energy', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Private point receipts, tiers, and the server-owned Bip Energy balance. Founder preview points are display-only.', route: '/(teen)/points' },
  { key: 'growth', title: 'Growth Tools', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Goals, reflection, and growth progress.', route: '/(teen)/growth' },
  { key: 'bippin2', title: 'Bippin 2', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Body, emotions, puberty education, and growth at the teen’s pace.', route: '/(teen)/bippin2' },
  { key: 'mind-reset', title: 'Mind Reset', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Mind-focused reset flow.', route: '/(teen)/mind-body-reset?mode=mindReset' },
  { key: 'body-reset', title: 'Body Reset', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Body-focused reset flow.', route: '/(teen)/mind-body-reset?mode=bodyReset' },
  { key: 'body-workout', title: 'Body Workout', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Guided movement and workout screen.', route: '/(teen)/body-workout' },
  { key: 'period-calendar', title: 'Period Calendar', group: 'Teen · Growth', side: 'teen', status: 'live', detail: 'Private cycle tracking.', route: '/(teen)/period-calendar' },
  { key: 'chores', title: 'Chores', group: 'Teen · Growth', side: 'teen', status: 'needs_setup', detail: 'Parent-assigned tasks and submissions. A real linked parent and assigned chores are required for live data.', route: '/(teen)/chores' },

  // Teen relationships and privacy
  { key: 'crew', title: 'Bip Crew Accountability', group: 'Teen · Connection', side: 'teen', status: 'needs_setup', detail: 'The screen and database flow are open. Real use still requires accepted Bip-ID connections.', route: '/(teen)/crew' },
  { key: 'bridge', title: 'Teen Bridge', group: 'Teen · Connection', side: 'teen', status: 'needs_setup', detail: 'Doorbell signals, response preferences, and intentional sharing require a linked parent account.', route: '/(teen)/bridge' },
  { key: 's2tell', title: 'Se’krets 2 Tell', group: 'Teen · Connection', side: 'teen', status: 'needs_setup', detail: 'Opens Bridge directly in compose mode for intentional sharing.', route: '/(teen)/bridge?compose=true' },
  { key: 'parent-link', title: 'Parent Link', group: 'Teen · Connection', side: 'shared', status: 'needs_setup', detail: 'Creates or verifies a real trusted connection. Verification and consent checks remain enforced.', route: '/(auth)/parent-link-verify' },
  { key: 'memory', title: 'Memory & Continuity', group: 'Teen · Privacy', side: 'teen', status: 'ui_preview', detail: 'Current memory controls and boundaries are visible. The full approved long-term memory engine is not released.', route: '/(teen)/continuity' },
  { key: 'profile', title: 'Teen Profile', group: 'Teen · Privacy', side: 'teen', status: 'live', detail: 'Private identity, anonymous Circle identity, companion choice, and account settings.', route: '/(teen)/profile' },
  { key: 'settings', title: 'Teen Settings', group: 'Teen · Privacy', side: 'teen', status: 'live', detail: 'Theme, companion, privacy, notifications, and account controls.', route: '/(teen)/settings' },
  { key: 'resources', title: 'Teen Help & Safety', group: 'Teen · Privacy', side: 'teen', status: 'live', detail: 'Support resources, safety tools, and legal information.', route: '/(teen)/resources' },
  { key: 'scrapbook', title: 'Emotional Scrapbook', group: 'Teen · Privacy', side: 'teen', status: 'ui_preview', detail: 'A founder-only visual prototype now exists. Persistence, sharing, media upload, and moderation are not implemented.', route: '/(dev)/scrapbook-preview' },
  { key: 'companion-memory', title: 'Approved Companion Memory', group: 'Teen · Privacy', side: 'teen', status: 'not_built', detail: 'Types and architecture exist, but the full propose/approve/edit/reject/delete memory product is not implemented.', route: null },

  // Parent side
  { key: 'parent-room', title: 'Parent Room', group: 'Parent · Core', side: 'parent', status: 'live', detail: 'Parent home base, mood check-in, and connection shortcuts.', route: '/(parent)/room' },
  { key: 'parent-bridge', title: 'Parent Bridge', group: 'Parent · Core', side: 'parent', status: 'needs_setup', detail: 'Signals, response requests, replies, and shared moments require a linked teen account.', route: '/(parent)/bridge' },
  { key: 'bridge-ai-summary', title: 'Bridge AI Summaries', group: 'Parent · Core', side: 'parent', status: 'server_rollout', detail: 'The UI and privacy validator exist. Generation stays server-disabled until a real founder UUID can be allowlisted.', route: '/(parent)/bridge' },
  { key: 'parent-pages', title: 'Parent Pages', group: 'Parent · Core', side: 'parent', status: 'live', detail: 'Parent-owned journal, letters, repair notes, and reply drafts.', route: '/(parent)/pages' },
  { key: 'parent-circle', title: 'Parent Circle', group: 'Parent · Core', side: 'parent', status: 'needs_setup', detail: 'Parent-to-parent support requires a permanent parent account and live community data.', route: '/(parent)/circle' },
  { key: 'parent-more', title: 'Parent More', group: 'Parent · Core', side: 'parent', status: 'live', detail: 'Parent feature drawer, resources, and connection management.', route: '/(parent)/more' },
  { key: 'parent-dashboard', title: 'Parent Dashboard', group: 'Parent · Support', side: 'parent', status: 'ui_preview', detail: 'Dashboard route is available for founder inspection; it must not become teen surveillance.', route: '/(parent)/dashboard' },
  { key: 'parent-calm', title: 'Parent Calm', group: 'Parent · Support', side: 'parent', status: 'live', detail: 'Pause-before-replying and parent regulation tools.', route: '/(parent)/calm' },
  { key: 'parent-voicebip', title: 'Parent Voice Bip', group: 'Parent · Support', side: 'parent', status: 'needs_setup', detail: 'Private voice reflection. Microphone and configured voice services are required for the complete flow.', route: '/(parent)/voicebip' },
  { key: 'parent-voice-reflect', title: 'Parent Voice Reflect', group: 'Parent · Support', side: 'parent', status: 'needs_setup', detail: 'Spoken reflection and reply drafts require microphone permission.', route: '/(parent)/voicereflect' },
  { key: 'parent-repair', title: 'Repair Tools', group: 'Parent · Support', side: 'parent', status: 'live', detail: 'Repair, accountability, and reconnection prompts.', route: '/(parent)/repair' },
  { key: 'parent-growth', title: 'Parent Growth', group: 'Parent · Support', side: 'parent', status: 'live', detail: 'Conversation guides, cycle awareness, and parent growth tools.', route: '/(parent)/growth' },
  { key: 'parent-sekret', title: 'Parent Se’kret Coach', group: 'Parent · Support', side: 'parent', status: 'needs_setup', detail: 'Parent coaching surface. Complete AI responses require the configured backend.', route: '/(parent)/sekret' },
  { key: 'parent-s2tell', title: 'Parent S2Tell Inbox', group: 'Parent · Connection', side: 'parent', status: 'needs_setup', detail: 'Shared items appear only after a linked teen intentionally sends them.', route: '/(parent)/s2tell' },
  { key: 'parent-approvals', title: 'Parent Approvals', group: 'Parent · Connection', side: 'parent', status: 'needs_setup', detail: 'Task submissions and reward approvals require a linked teen and pending records.', route: '/(parent)/approvals' },
  { key: 'parent-period', title: 'Parent Period Calendar', group: 'Parent · Support', side: 'parent', status: 'needs_setup', detail: 'Visibility remains connection- and consent-dependent.', route: '/(parent)/period-calendar' },
  { key: 'parent-profile', title: 'Parent Profile', group: 'Parent · Account', side: 'parent', status: 'live', detail: 'Parent identity, preferences, focus, and room style.', route: '/(parent)/profile' },
  { key: 'parent-settings', title: 'Parent Settings', group: 'Parent · Account', side: 'parent', status: 'live', detail: 'Privacy, notifications, and account controls.', route: '/(parent)/settings' },
  { key: 'parent-resources', title: 'Parent Resources', group: 'Parent · Account', side: 'parent', status: 'live', detail: 'Guides, support, and legal information.', route: '/(parent)/resources' },

  // Founder/developer tools
  { key: 'control-room', title: 'Control Room', group: 'Founder · Operations', side: 'dev', status: 'needs_setup', detail: 'Requires a founder/admin/developer app profile with audit access.', route: '/(dev)/control-room' },
  { key: 'split-view', title: 'Teen + Parent Split View', group: 'Founder · Operations', side: 'dev', status: 'live', detail: 'Development inspection of both app sides.', route: '/(dev)/split-view' },
  { key: 'feature-preview', title: 'Founder Feature Catalog', group: 'Founder · Operations', side: 'dev', status: 'live', detail: 'This complete development-only route catalog.', route: '/(dev)/feature-preview' },
] as const;

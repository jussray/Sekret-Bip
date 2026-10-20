import type { AuditSeverity } from '@/services/founderAudit';
import type { RuntimeAuditSource } from '@/services/runtimeAudit';

export type RuntimeFingerprintCategory =
  | 'screen'
  | 'navigation'
  | 'asset'
  | 'auth'
  | 'storage'
  | 'worker'
  | 'ai'
  | 'voice'
  | 'companion'
  | 'safety'
  | 'circle'
  | 'bridge'
  | 'memory'
  | 'rewards'
  | 'sync';

export interface RuntimeFingerprintDefinition {
  key: string;
  source: RuntimeAuditSource;
  event_type: string;
  screen: string | null;
  category: RuntimeFingerprintCategory;
  severity: AuditSeverity;
  title: string;
  suggested_fix: string;
}

const definitions = [
  ['screen.home_room.mount_failed', 'manual', 'screen_mount_failed', 'HomeRoom', 'screen', 'error', 'Home Room failed to mount', 'Inspect the Home Room component tree, route params, and first-render state.'],
  ['screen.pages.mount_failed', 'manual', 'screen_mount_failed', 'Pages', 'screen', 'error', 'Pages failed to mount', 'Inspect Pages tabs, selected companion state, and required assets.'],
  ['screen.journal.render_failed', 'manual', 'render_failed', 'Journal', 'screen', 'error', 'Journal failed to render', 'Inspect journal state hydration, avatar selection, and entry mapping.'],
  ['screen.circle.render_failed', 'circle', 'render_failed', 'Circle', 'circle', 'error', 'Circle failed to render', 'Check Circle query results, identity mapping, and post component props.'],
  ['screen.voice_bip.render_failed', 'voice_runtime', 'render_failed', 'VoiceBip', 'voice', 'error', 'Voice Bip failed to render', 'Check recorder permissions, selected avatar state, and voice assets.'],
  ['screen.parent_bridge.render_failed', 'parent_window', 'render_failed', 'ParentBridge', 'bridge', 'error', 'Parent Bridge failed to render', 'Check parent-link state, bridge data, and route access.'],
  ['navigation.route_failed', 'navigation', 'route_failed', null, 'navigation', 'warning', 'Navigation failed', 'Verify the Expo Router target exists and inspect route parameters.'],
  ['navigation.route_blocked', 'navigation', 'route_blocked', null, 'navigation', 'warning', 'Navigation was blocked', 'Check routeAccess policy, verification state, and account role.'],
  ['asset.missing', 'asset', 'missing_asset', null, 'asset', 'warning', 'Required asset is missing', 'Run the runtime asset audit and verify the referenced file path.'],
  ['asset.image_decode_failed', 'asset', 'image_decode_failed', null, 'asset', 'warning', 'Image failed to decode', 'Verify the image is valid, bundled, and supported by Expo.'],
  ['asset.room_scene_missing', 'asset', 'room_scene_missing', 'HomeRoom', 'asset', 'warning', 'Room scene is missing', 'Verify the character and time-of-day scene key resolves to an existing asset.'],
  ['auth.login_failed', 'supabase', 'login_failed', 'Auth', 'auth', 'error', 'Login failed', 'Inspect Supabase Auth response and client session configuration.'],
  ['auth.signup_failed', 'supabase', 'signup_failed', 'Auth', 'auth', 'error', 'Signup failed', 'Inspect validation, Supabase Auth settings, and duplicate-account handling.'],
  ['auth.session_restore_failed', 'supabase', 'session_restore_failed', 'Auth', 'auth', 'error', 'Session restore failed', 'Inspect secure storage, refresh-token handling, and auth initialization.'],
  ['storage.voice_upload_failed', 'supabase', 'voice_note_upload_failed', 'VoiceBip', 'storage', 'error', 'Voice note upload failed', 'Check bucket policy, object path ownership, and network status.'],
  ['storage.journal_image_upload_failed', 'supabase', 'journal_image_upload_failed', 'Journal', 'storage', 'error', 'Journal image upload failed', 'Check image bucket policy, file size, and MIME type.'],
  ['worker.request_failed', 'cloudflare_worker', 'request_failed', null, 'worker', 'error', 'Worker request failed', 'Inspect Cloudflare Worker logs, route configuration, and timeout behavior.'],
  ['worker.timeout', 'cloudflare_worker', 'timeout', null, 'worker', 'error', 'Worker request timed out', 'Inspect provider latency and Worker timeout/retry configuration.'],
  ['ai.openai_request_failed', 'openai', 'request_failed', null, 'ai', 'error', 'OpenAI request failed', 'Verify the Worker secret, provider status, rate limits, and payload size.'],
  ['companion.reply_failed', 'openai', 'companion_reply_failed', null, 'companion', 'error', 'Companion reply failed', 'Inspect companion selection, prompt construction, Worker response, and fallback handling.'],
  ['companion.oracle_failed', 'openai', 'oracle_generation_failed', 'Oracle', 'companion', 'error', 'Oracle generation failed', 'Inspect Oracle mode, memory payload, and response parsing.'],
  ['voice.transcription_failed', 'voice_runtime', 'transcription_failed', 'VoiceBip', 'voice', 'error', 'Voice transcription failed', 'Check microphone input, upload format, STT provider, and timeout handling.'],
  ['voice.generation_failed', 'voice_runtime', 'generation_failed', 'VoiceBip', 'voice', 'error', 'Voice generation failed', 'Check selected voice, TTS provider response, audio format, and playback initialization.'],
  ['voice.playback_failed', 'voice_runtime', 'playback_failed', 'VoiceBip', 'voice', 'warning', 'Voice playback failed', 'Check generated audio URI, Expo AV state, and device audio mode.'],
  ['circle.post_failed', 'circle', 'post_failed', 'Circle', 'circle', 'error', 'Circle post failed', 'Check post validation, anonymous identity mapping, RLS, and connectivity.'],
  ['circle.reaction_failed', 'circle', 'reaction_failed', 'Circle', 'circle', 'warning', 'Circle reaction failed', 'Check reaction vocabulary, post identity, and RLS policy.'],
  ['bridge.share_failed', 'parent_window', 'share_failed', 'Bridge', 'bridge', 'error', 'Bridge share failed', 'Check parent-link state, share permissions, and bridge delivery.'],
  ['safety.scan_failed', 'cloudflare_worker', 'safety_scan_failed', null, 'safety', 'critical', 'Safety scan failed', 'Inspect the safety Worker route, provider response, and fail-safe behavior.'],
  ['safety.parent_alert_failed', 'parent_window', 'parent_alert_failed', null, 'safety', 'critical', 'Parent safety alert failed', 'Check active parent link, alert insert policy, and notification delivery.'],
  ['memory.write_blocked', 'memory', 'write_blocked', null, 'memory', 'warning', 'Memory write was blocked', 'Verify privacy gates and ensure sensitive raw content is not being stored.'],
  ['memory.sync_failed', 'memory', 'sync_failed', null, 'memory', 'warning', 'Memory sync failed', 'Check local-to-cloud mapping, user ownership, and retry behavior.'],
  ['rewards.points_update_failed', 'rewards', 'points_update_failed', 'Rewards', 'rewards', 'error', 'Points update failed', 'Check points transaction logic, idempotency, and RLS.'],
  ['rewards.redemption_failed', 'rewards', 'redemption_failed', 'Store', 'rewards', 'error', 'Reward redemption failed', 'Check point balance, inventory, approval state, and commerce integration.'],
  ['sync.device_failed', 'supabase', 'device_sync_failed', null, 'sync', 'error', 'Device sync failed', 'Inspect pull/push mapping, timestamps, ownership, and retry handling.'],
] as const satisfies readonly [string, RuntimeAuditSource, string, string | null, RuntimeFingerprintCategory, AuditSeverity, string, string][];

export const RUNTIME_FINGERPRINTS: Record<string, RuntimeFingerprintDefinition> = Object.fromEntries(
  definitions.map(([key, source, event_type, screen, category, severity, title, suggested_fix]) => [
    key,
    { key, source, event_type, screen, category, severity, title, suggested_fix },
  ]),
);

export type RuntimeFingerprintKey = keyof typeof RUNTIME_FINGERPRINTS;

export function getRuntimeFingerprint(key: string): RuntimeFingerprintDefinition | null {
  return RUNTIME_FINGERPRINTS[key] ?? null;
}

export function buildRuntimeFingerprint(
  source: RuntimeAuditSource,
  eventType: string,
  screen?: string | null,
): string {
  return `runtime:${source}:${eventType.trim().toLowerCase()}:${screen?.trim() || '*'}`;
}

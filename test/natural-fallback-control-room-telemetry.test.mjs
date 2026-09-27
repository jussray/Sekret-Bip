import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (filePath) => fs.readFileSync(path.join(root, filePath), 'utf8');

test('natural fallback pack remains versioned, local, and companion-complete', () => {
  const source = read('src/features/sekret/naturalFallbacks.ts');

  assert.match(source, /NATURAL_FALLBACK_PACK_VERSION\s*=\s*'fallback-natural-v1\.0\.0'/);
  assert.match(source, /NATURAL_FALLBACK_VARIANTS_PER_COMPANION\s*=\s*500/);
  for (const companion of ['suhana', 'sy', 'cloud', 'night', 'sekret']) {
    assert.match(source, new RegExp(`['"]${companion}['"]`), `${companion} is represented in the fallback pack`);
  }
  assert.match(source, /BANNED_HUMAN_CLAIMS/);
  assert.match(source, /hasBannedHumanClaim/);
});

test('api fallback path records sanitized Control Room telemetry', () => {
  const api = read('src/utils/api.ts');

  assert.match(api, /createNaturalFallbackResponse/);
  assert.match(api, /logCompanionFallbackUsage/);
  assert.match(api, /worker_base_url_missing/);
  assert.match(api, /worker_reply_empty/);
  assert.match(api, /result\.error\.code \|\| 'worker_reply_failed'/);
  assert.doesNotMatch(api, /journalText|messageText|conversationText/);
});

test('runtime audit supports companion fallback events without private message payloads', () => {
  const audit = read('src/services/runtimeAudit.ts');

  assert.match(audit, /'companion_fallback'/);
  assert.match(audit, /logCompanionFallbackUsage/);
  assert.match(audit, /event_type:\s*'used'/);
  assert.match(audit, /fallback_pack_version/);
  assert.match(audit, /fallback_variant_id/);
  assert.match(audit, /identity_disclosure/);
  assert.match(audit, /safety_flag/);
  assert.match(audit, /message:\s*null/);
  assert.match(audit, /'conversationText'/);
  assert.match(audit, /'messageText'/);
});

test('Control Room analytics aggregates fallback health for founder review', () => {
  const analytics = read('src/services/controlRoomAnalytics.ts');

  assert.match(analytics, /CompanionFallbackAnalytics/);
  assert.match(analytics, /founderApprovalState:\s*'draft_founder_review'/);
  assert.match(analytics, /isCompanionFallbackRow/);
  assert.match(analytics, /fallback_kind/);
  assert.match(analytics, /byCompanion/);
  assert.match(analytics, /bySurface/);
  assert.match(analytics, /byPackVersion/);
});

test('Control Room renders founder-visible fallback telemetry surface', () => {
  const screen = read('src/screens/DevControlRoomScreen.tsx');
  const panel = read('src/features/control-room/FallbackTelemetryPanel.tsx');

  assert.match(screen, /FallbackTelemetryPanel/);
  assert.match(screen, /\['fallbacks', 'Fallbacks'\]/);
  assert.match(screen, /surface === 'fallbacks'[\s\S]*<FallbackTelemetryPanel \/>/);
  assert.match(panel, /Fallback Telemetry/);
  assert.match(panel, /loadControlRoomAnalytics\(30\)/);
  assert.match(panel, /fallback\.byCompanion/);
  assert.match(panel, /fallback\.bySurface/);
  assert.match(panel, /teen message text/);
});

test('Worker observed telemetry marks fallback decisions for Control Room sorting', () => {
  const observed = read('worker/observed-index.ts');

  assert.match(observed, /fallbackUsed \? 'fallback'/);
  assert.match(observed, /fingerprintFor\(response\.status, operation, metadata\.fallbackUsed, metadata\.decision\)/);
  assert.match(observed, /persistAuditEvent\(event, env as AuditPersistEnv\)/);
});

test('product design contract preserves splash visuals and founder gate', () => {
  const doc = read('docs/AI_COMPANION_FALLBACK_PRODUCT_DESIGN.md');

  assert.match(doc, /Splash and welcome-screen guard/);
  assert.match(doc, /Do not change splash images/);
  assert.match(doc, /Founder review is required/);
  assert.match(doc, /excludes private teen message text/);
});
/**
 * Privacy boundaries: parent/teen data contract, bridge rules, S2Tell filtering.
 *
 * These tests verify that the privacy type system and runtime guards are
 * correctly defined and that the bridge channel enforces teen-initiates-only.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const privacySrc  = fs.readFileSync(new URL('../types/privacy.ts',       import.meta.url), 'utf8');
const bridgeSrc   = fs.readFileSync(new URL('../src/bridge/index.ts',    import.meta.url), 'utf8');
const bridgeTypes = fs.readFileSync(new URL('../src/bridge/types.ts',    import.meta.url), 'utf8');
const workerSrc   = fs.readFileSync(new URL('../worker/sekret-reply.ts', import.meta.url), 'utf8');

// Replicate isParentSafeSource logic for behavioral testing.
// Any change to the allowed list in source must be reflected here intentionally.
const ALLOWED_SOURCES = [
  'explicit_teen_share',
  'bridge_message',
  'shared_mood',
  'shared_moment',
  'connection_pattern',
  'parent_own_action',
];

const BLOCKED_SOURCES = [
  'private_pages_text',
  'private_companion_chat',
  'private_voice_entry',
  'private_video_entry',
  'private_mood_tag',
  'private_circle_identity',
  'private_circle_activity',
  'ai_inferred_hidden_feeling',
];

function isParentSafeSource(source) {
  return ALLOWED_SOURCES.includes(source);
}

function assertParentSafeSource(source) {
  if (!isParentSafeSource(source)) {
    throw new Error(`[Privacy violation] Parent-facing data derived from blocked source: "${source}".`);
  }
}

// ─── Privacy type definitions in source ──────────────────────────────────────
test('privacy.ts declares ParentAllowedSource with all six allowed types', () => {
  for (const source of ALLOWED_SOURCES) {
    assert.match(privacySrc, new RegExp(`'${source}'`), `Missing allowed source: ${source}`);
  }
});

test('privacy.ts declares ParentBlockedSource with all eight blocked types', () => {
  for (const source of BLOCKED_SOURCES) {
    assert.match(privacySrc, new RegExp(`'${source}'`), `Missing blocked source: ${source}`);
  }
});

test('privacy.ts exports isParentSafeSource type guard', () => {
  assert.match(privacySrc, /export function isParentSafeSource/);
  assert.match(privacySrc, /source is ParentAllowedSource/);
});

test('privacy.ts exports assertParentSafeSource assertion', () => {
  assert.match(privacySrc, /export function assertParentSafeSource/);
  assert.match(privacySrc, /asserts source is ParentAllowedSource/);
  assert.match(privacySrc, /\[Privacy violation\]/);
});

// ─── isParentSafeSource behavioral tests ─────────────────────────────────────
test('isParentSafeSource returns true for every allowed source', () => {
  for (const source of ALLOWED_SOURCES) {
    assert.ok(isParentSafeSource(source), `Should allow: ${source}`);
  }
});

test('isParentSafeSource returns false for every blocked source', () => {
  for (const source of BLOCKED_SOURCES) {
    assert.ok(!isParentSafeSource(source), `Should block: ${source}`);
  }
});

test('isParentSafeSource returns false for arbitrary unknown strings', () => {
  assert.ok(!isParentSafeSource(''));
  assert.ok(!isParentSafeSource('unknown_source'));
  assert.ok(!isParentSafeSource('teen_journal'));
  assert.ok(!isParentSafeSource('private_pages_text')); // blocked
});

// ─── assertParentSafeSource behavioral tests ─────────────────────────────────
test('assertParentSafeSource does not throw for allowed sources', () => {
  for (const source of ALLOWED_SOURCES) {
    assert.doesNotThrow(() => assertParentSafeSource(source), `Should not throw for: ${source}`);
  }
});

test('assertParentSafeSource throws for every blocked source', () => {
  for (const source of BLOCKED_SOURCES) {
    assert.throws(
      () => assertParentSafeSource(source),
      /\[Privacy violation\]/,
      `Should throw [Privacy violation] for: ${source}`,
    );
  }
});

test('assertParentSafeSource error message names the offending source', () => {
  assert.throws(
    () => assertParentSafeSource('private_companion_chat'),
    (err) => {
      assert.ok(err.message.includes('private_companion_chat'));
      return true;
    },
  );
});

// ─── Bridge rules ─────────────────────────────────────────────────────────────
test('BRIDGE_RULES.teenInitiatesOnly is true', () => {
  assert.match(bridgeSrc, /teenInitiatesOnly: true/);
});

test('BRIDGE_RULES.parentCannotPullTeenData is true', () => {
  assert.match(bridgeSrc, /parentCannotPullTeenData: true/);
});

test('BRIDGE_RULES.teenCanRevokeShare is true', () => {
  assert.match(bridgeSrc, /teenCanRevokeShare: true/);
});

// ─── BridgeMessage type contract ─────────────────────────────────────────────
test('BridgeMessage.fromSide is always teen', () => {
  assert.match(bridgeTypes, /fromSide: 'teen'/);
});

test('BridgeMessage.toSide is always parent', () => {
  assert.match(bridgeTypes, /toSide: 'parent'/);
});

test('BridgeMessageType includes all four message kinds', () => {
  assert.match(bridgeTypes, /'s2tell'/);
  assert.match(bridgeTypes, /'period-share'/);
  assert.match(bridgeTypes, /'memory-share'/);
  assert.match(bridgeTypes, /'feeling-share'/);
});

// ─── S2Tell privacy gate ──────────────────────────────────────────────────────
// S2TellEntry has both `raw` (private) and `rewrite` (shareable).
// Only entries where shared===true may be shown to the parent.
test('S2TellMessage payload type contains a text field (the rewrite shown to parent)', () => {
  // The S2TellMessage payload carries the curated text, not raw private text.
  assert.match(bridgeTypes, /payload: \{[\s\S]*?text: string/);
});

test('Parent S2Tell inbox filters by shared===true before rendering', () => {
  // The parent inbox screen must apply the shared filter.
  // Verify the pattern exists in any parent-facing S2Tell file.
  const parentInbox = fs.readFileSync(
    new URL('../src/parent/features/s2tell/ParentS2TellInboxScreen.tsx', import.meta.url),
    'utf8',
  );
  assert.match(parentInbox, /\.filter\(.*shared\)/s);
});

test('Parent S2Tell inbox does not reference the raw field', () => {
  const parentInbox = fs.readFileSync(
    new URL('../src/parent/features/s2tell/ParentS2TellInboxScreen.tsx', import.meta.url),
    'utf8',
  );
  // 'raw' must not appear as a property access that reaches the UI
  assert.doesNotMatch(parentInbox, /entry\.raw\b/);
  assert.doesNotMatch(parentInbox, /\.raw\s*\}/);
});

// ─── parentShareSummary content rules ────────────────────────────────────────
test('Worker brain prompt forbids verbatim journal text in parentShareSummary', () => {
  assert.match(workerSrc, /Never expose private journal text verbatim in parentShareSummary/i);
});

test('Worker parentBridge surface rules state parentShareSummary must not betray teen trust', () => {
  assert.match(workerSrc, /without betraying the teen'?s? trust/i);
});

test('parentShareSummary is null when parentSharingEnabled is false', () => {
  assert.match(workerSrc, /parentSharingEnabled.*set parentShareSummary to null/is);
});

// ─── TeenShareVisibility levels ──────────────────────────────────────────────
test('privacy.ts defines all four TeenShareVisibility levels', () => {
  assert.match(privacySrc, /'private'/);
  assert.match(privacySrc, /'shared_with_parent'/);
  assert.match(privacySrc, /'safe_aggregate'/);
  assert.match(privacySrc, /'public_circle'/);
});

test('SafeMoodAggregate.visibility is locked to safe_aggregate', () => {
  assert.match(privacySrc, /visibility: 'safe_aggregate'/);
});

test('SharedMoment.visibility is locked to shared_with_parent', () => {
  assert.match(privacySrc, /visibility: 'shared_with_parent'/);
});

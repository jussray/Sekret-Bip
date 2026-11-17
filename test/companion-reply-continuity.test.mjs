import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

// Guards the continuity contract: every companion surface must route through the
// shared buildReplyRequest() so replies carry relationship style, conversation
// phase, and long-term memory — not a thin, amnesiac payload. Regressing a
// surface back to a bare fetchSekretBrainReply({ history: [] }) would let the
// companion answer the latest line in a vacuum.

test('buildReplyRequest assembles the rich memory bundle', async () => {
  const source = await read('src/services/ai/buildReplyRequest.ts');

  // Relationship style is learned, persisted, and folded into memory.
  assert.match(source, /loadTeenRelationshipProfile/);
  assert.match(source, /learnTeenRelationshipStyle/);
  assert.match(source, /saveTeenRelationshipProfile/);
  assert.match(source, /relationshipStyle: relationshipProfileToOracleNote/);

  // Conversation phase is always computed.
  assert.match(source, /getConversationPhase/);
  assert.match(source, /buildConversationPhaseInstruction/);

  // Long-term oracle understandings are attached when present.
  assert.match(source, /oracleContext/);
});

test('every thin companion surface routes through buildReplyRequest', async () => {
  const surfaces = [
    'app/(teen)/pages/[id].tsx',        // single page entry reply
    'src/utils/sekretReply.ts',         // Pages journal thread
    'src/features/sekret/companionEngine.ts', // companion chat
  ];

  for (const path of surfaces) {
    const source = await read(path);
    assert.match(source, /buildReplyRequest/, `${path} must build its payload via buildReplyRequest`);
  }
});

test('page entry reply sends real thread history, not an empty array', async () => {
  const source = await read('app/(teen)/pages/[id].tsx');

  // The reconstructed thread must be passed as history.
  assert.match(source, /const history: SekretHistoryTurn\[\] = \[\]/);
  assert.match(source, /oracleContext: buildOracleContext\(oracleProfile, 'teen'\)/);

  // The old amnesiac call shape must be gone.
  assert.doesNotMatch(source, /history:\s*\[\]/);
});

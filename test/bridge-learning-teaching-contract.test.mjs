import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Bridge Learning is registered but remains internal', () => {
  const types = read('src/types/relationshipLayer.ts');
  const flags = read('src/constants/relationshipFeatureFlags.ts');
  const architecture = read('docs/RELATIONSHIP_LAYER_ARCHITECTURE.md');

  assert.match(types, /'bridgeLearning'/);
  assert.match(flags, /bridgeLearning: 'internal'/);
  assert.doesNotMatch(flags, /bridgeLearning: 'enabled'/);
  assert.match(architecture, /### 2\. Bridge Learning/);
  assert.match(architecture, /All five features are closed by default/);
  assert.match(architecture, /src\/services\/bridgeLearningService\.ts/);
});

test('internal teaching depth is not exposed as an age or ability label', () => {
  const types = read('src/features/bridgeLearning/types.ts');
  const policy = read('src/features/bridgeLearning/teachingPolicy.ts');

  assert.match(types, /ExplanationDepth = 'concrete' \| 'plain' \| 'guided' \| 'academic'/);
  assert.match(policy, /Explain that another way/);
  assert.match(policy, /Break it down more/);
  assert.match(policy, /Teach us together/);
  assert.doesNotMatch(policy, /Explain it like you are five/i);
  assert.doesNotMatch(policy, /beginner level/i);
  assert.doesNotMatch(policy, /low comprehension/i);
});

test('failed understanding checks require a changed teaching strategy', () => {
  const policy = read('src/features/bridgeLearning/teachingPolicy.ts');
  const architecture = read('docs/BRIDGE_LEARNING_SEKRET_TEACHER.md');

  assert.match(policy, /requireChangedTeachingStrategy/);
  assert.match(policy, /requires a changed teaching strategy/);
  assert.match(policy, /cannot repeat the same teaching strategy/);
  assert.match(policy, /previousStrategyKey: current\.lastStrategyKey/);
  assert.match(policy, /proposedStrategyKey: result\.strategyKey/);
  assert.match(architecture, /Change the teaching strategy if it does not land/);
});

test('both-stumped state invites Se\'kret without bypassing participant consent', () => {
  const policy = read('src/features/bridgeLearning/teachingPolicy.ts');
  const architecture = read('docs/BRIDGE_LEARNING_SEKRET_TEACHER.md');

  assert.match(policy, /teenStumped && input\.parentStumped/);
  assert.match(policy, /return 'both_stumped'/);
  assert.match(policy, /mayInviteSekret/);
  assert.match(architecture, /may never send one without the sender confirming it/);
});

test('Bridge Learning cannot claim access to private Study Buddy or journal data', () => {
  const types = read('src/features/bridgeLearning/types.ts');
  const architecture = read('docs/BRIDGE_LEARNING_SEKRET_TEACHER.md');
  const relationshipArchitecture = read('docs/RELATIONSHIP_LAYER_ARCHITECTURE.md');

  assert.match(types, /mayReadPrivateStudyHistory: false/);
  assert.match(types, /mayReadPrivateJournal: false/);
  assert.match(types, /mayReadUnsharedSources: false/);
  assert.match(types, /mayReadSharedSessionContent: true/);
  assert.match(architecture, /private Study Buddy conversations/);
  assert.match(architecture, /journals or emotional companion chats/);
  assert.match(relationshipArchitecture, /private Study Buddy history/);
  assert.match(relationshipArchitecture, /journals, unshared uploads/);
});

test('lock-screen pings reveal only an exact approved request to join Bridge', () => {
  const policy = read('src/features/bridgeLearning/teachingPolicy.ts');

  assert.match(policy, /LOCK_SCREEN_NOTIFICATION_COPY/);
  assert.match(policy, /Your teen asked you to join them in Learning Bridge/);
  assert.match(policy, /Your parent asked you to join them in Learning Bridge/);
  assert.match(policy, /Object\.values\(LOCK_SCREEN_NOTIFICATION_COPY\) as string\[\]\)\.includes\(copy\)/);
  assert.match(policy, /exact-template allowlist/);
  assert.match(policy, /subject, question, answer, source document/);
  assert.doesNotMatch(policy, /forbidden = \[/);
});

test('Oracle is hidden and Se\'kret is the visible teacher', () => {
  const architecture = read('docs/BRIDGE_LEARNING_SEKRET_TEACHER.md');
  const types = read('src/features/bridgeLearning/types.ts');

  assert.match(architecture, /Oracle = hidden research, reasoning, verification/);
  assert.match(architecture, /Se'kret = visible teacher/);
  assert.match(types, /OracleTeachingPacket/);
  assert.match(types, /needsOutsideHelp: boolean/);
  assert.match(types, /confidence: number/);
  assert.match(types, /sources: GroundedSource\[\]/);
});

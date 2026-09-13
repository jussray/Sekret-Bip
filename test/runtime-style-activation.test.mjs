import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-runtime-style-'));

function compile(relativePath, outputName, rewrite = (source) => source) {
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    fileName: relativePath,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.equal(errors.length, 0, `${relativePath} must transpile without diagnostics`);
  const outputPath = path.join(tempDir, outputName);
  fs.writeFileSync(outputPath, rewrite(transpiled.outputText), 'utf8');
  return outputPath;
}

compile('src/features/identity/companionIds.ts', 'companionIds.mjs');
compile(
  'src/features/identity/legacyCompanionIdMigration.ts',
  'legacyCompanionIdMigration.mjs',
  (source) => source.replace("from './companionIds'", "from './companionIds.mjs'"),
);
compile(
  'src/features/sekret/identityContract.ts',
  'identityContract.mjs',
  (source) => source
    .replace("from '@/features/identity/companionIds'", "from './companionIds.mjs'")
    .replace(
      "from '@/features/identity/legacyCompanionIdMigration'",
      "from './legacyCompanionIdMigration.mjs'",
    ),
);
compile(
  'src/features/sekret/styleProfiles.ts',
  'styleProfiles.mjs',
  (source) => source.replace("from './identityContract'", "from './identityContract.mjs'"),
);
compile(
  'src/features/sekret/companionStyleEngine.ts',
  'companionStyleEngine.mjs',
  (source) => source
    .replace("from './identityContract'", "from './identityContract.mjs'")
    .replace("from './styleProfiles'", "from './styleProfiles.mjs'"),
);
const runtimePath = compile(
  'worker/runtime-style.ts',
  'runtime-style.mjs',
  (source) => source
    .replace("from '../src/features/sekret/identityContract'", "from './identityContract.mjs'")
    .replace("from '../src/features/sekret/companionStyleEngine'", "from './companionStyleEngine.mjs'")
    .replace("from '../src/features/sekret/styleProfiles'", "from './styleProfiles.mjs'"),
);

const runtime = await import(pathToFileURL(runtimePath).href);
const runtimeSource = fs.readFileSync(path.join(root, 'worker/runtime-style.ts'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'worker/index.ts'), 'utf8');
const observedSource = fs.readFileSync(path.join(root, 'worker/observed-index.ts'), 'utf8');

const suhana = runtime.resolveRuntimeStyle('suhana');
const joseema = runtime.resolveRuntimeStyle('sekret', 'joseema');
const sekret = runtime.resolveRuntimeStyle('sekret', 'sekret');
const parentCoach = runtime.resolveRuntimeStyle('parentCoach');

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('runtime actor normalization preserves visible aliases without substring guessing', () => {
  assert.equal(runtime.normalizeReplyActor('soft'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('raylene'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('Raylene'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('Rylane'), 'sy');
  assert.equal(runtime.normalizeReplyActor('Night Se’kret'), 'night');
  assert.equal(runtime.normalizeReplyActor('oracle'), null);
  assert.equal(runtime.normalizeReplyActor('joseema'), null);
  assert.equal(runtime.normalizeReplyActor('Se’kret Coach'), 'parentCoach');
  assert.equal(runtime.normalizeReplyActor('definitely-not-suhana'), null);
  assert.equal(runtime.normalizeReplyActor(''), null);
});

test('internal honor compatibility keeps Joseema and Se’kret distinct', () => {
  assert.deepEqual(runtime.resolveRuntimeIdentity('oracle'), {
    actorId: 'sekret',
    internalHonorIdentity: 'joseema',
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('joseema'), {
    actorId: 'sekret',
    internalHonorIdentity: 'joseema',
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('sekret'), {
    actorId: 'sekret',
    internalHonorIdentity: 'sekret',
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('suhana'), { actorId: 'suhana' });
});

test('parent coaching cannot cross the teen-facing actor/surface boundary', () => {
  assert.equal(runtime.validateActorSurface('parentCoach', 'journal'), 'parentCoach actor requires the parentCoach surface');
  assert.equal(runtime.validateActorSurface('suhana', 'parentCoach'), 'parentCoach surface requires the parentCoach actor');
  assert.equal(runtime.validateActorSurface('parentCoach', 'parentCoach'), null);
  assert.equal(runtime.validateActorSurface('sekret', 'selfDiscovery'), null);
});

test('named companions and internal lenses resolve versioned style contracts', () => {
  assert.equal(suhana.role, 'named-companion');
  assert.equal(suhana.textStyleVersion, 'suhana-text-v1');
  assert.equal(suhana.speechStyleVersion, 'suhana-speech-v1');
  assert.equal(suhana.maxQuestions, 1);
  assert.equal(suhana.internalHonorIdentity, undefined);

  for (const style of [joseema, sekret]) {
    assert.equal(style.role, 'continuity-presence');
    assert.equal(style.textStyleVersion, 'internal-presence-text-v1');
    assert.equal(style.speechStyleVersion, 'internal-presence-speech-v1');
    assert.equal(style.maxQuestions, 0);
  }
  assert.equal(joseema.internalHonorIdentity, 'joseema');
  assert.equal(sekret.internalHonorIdentity, 'sekret');

  assert.equal(parentCoach.role, 'parent-coach');
  assert.equal(parentCoach.maxQuestions, 1);
  assert.match(parentCoach.speechInstructions, /parent-coach delivery/i);
});

test('internal honor prompt is code-only and cannot impersonate a real person', () => {
  for (const style of [joseema, sekret]) {
    const instruction = runtime.buildRuntimeStyleInstruction(style);
    assert.match(instruction, /EMPATHY \+ ACCOUNTABILITY CONTRACT/);
    assert.match(instruction, /internal presence, not a selectable companion/i);
    assert.match(instruction, /Never show, name, speak, label, or introduce this identity/i);
    assert.match(instruction, /Never impersonate a real person/i);
    assert.match(instruction, /invent memories/i);
    assert.match(instruction, /what a real person would think, want, approve, or say/i);
    assert.match(instruction, /Ask no direct questions/);
    assert.doesNotMatch(instruction, /Actor: joseema/i);
    assert.doesNotMatch(instruction, /Actor: sekret/i);
    assert.match(instruction, /Actor: internal-presence/i);
  }
});

test('companion empathy understands perspective without validating harmful conduct', () => {
  const instruction = runtime.buildRuntimeStyleInstruction(suhana);

  assert.match(instruction, /EMPATHY \+ ACCOUNTABILITY CONTRACT/);
  assert.match(instruction, /without treating that perspective as verified truth/i);
  assert.match(instruction, /without automatically endorsing an action, belief, accusation, explanation, or choice/i);
  assert.match(instruction, /Understanding is not agreement/i);
  assert.match(instruction, /Explanation is context, not excuse/i);
  assert.match(instruction, /does not erase impact/i);
  assert.match(instruction, /preserve the boundary plainly and without shaming/i);
  assert.match(instruction, /support proportionate accountability/i);
  assert.match(instruction, /keep the judgment uncertain/i);
  assert.match(instruction, /do not invent blame or certainty/i);
  assert.match(instruction, /affected by the behavior, not only the speaker/i);
  assert.match(instruction, /Never use empathy to pressure reconciliation, forgiveness, disclosure, parent sharing, or surrender of privacy/i);
  assert.match(instruction, /Safety, consent, privacy, existing escalation rules, and factual truth outrank conversational warmth/i);
});

test('empathy invariants stay explicit and do not silently weaken truth or accountability', () => {
  assert.deepEqual(runtime.EMPATHY_ACCOUNTABILITY_INVARIANTS, {
    perspectiveIsNotTruth: true,
    understandingIsNotAgreement: true,
    explanationIsNotExcuse: true,
    compassionDoesNotEraseImpact: true,
    intentDoesNotOverrideOutcome: true,
    accountabilityCanCoexistWithEmpathy: true,
    dignitySurvivesCorrection: true,
    uncertaintyMustStayUncertain: true,
  });
});

test('parent coach remains outside the teen companion empathy contract', () => {
  const instruction = runtime.buildRuntimeStyleInstruction(parentCoach);
  assert.doesNotMatch(instruction, /EMPATHY \+ ACCOUNTABILITY CONTRACT/);
});

test('Worker resolves internal identity before delegation and strips public actor metadata', () => {
  const resolveIndex = indexSource.indexOf('resolveRuntimeIdentity(body.characterId ?? body.personality)');
  const styleIndex = indexSource.indexOf('resolveRuntimeStyle(actorId, internalHonorIdentity)');
  const rewriteIndex = indexSource.indexOf('characterId: actorId');
  const privacyIndex = indexSource.indexOf('withPublicActorMetadata');
  assert.ok(resolveIndex >= 0, 'Worker must resolve request identity');
  assert.ok(styleIndex > resolveIndex, 'Worker must resolve style after identity resolution');
  assert.ok(rewriteIndex > styleIndex, 'Worker may delegate only the execution actor after style resolution');
  assert.ok(privacyIndex >= 0, 'Worker must strip internal actor metadata before returning data');
});

test('Joseema internal output is repaired without exposing identity metadata', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'Joseema noticed a pattern. What feels true? Is there more?',
    characterId: 'sekret',
    actorId: 'sekret',
    replySource: 'openai',
  }, joseema);

  assert.equal(result.reply, 'I noticed a pattern. What feels true. Is there more.');
  assert.equal(result.actorId, undefined);
  assert.equal(result.characterId, undefined);
  assert.equal(result.actorRole, 'continuity-presence');
  assert.equal(result.questionBudget, 0);
  assert.equal(result.internalIdentityApplied, true);
  assert.equal(result.styleRepaired, true);
  assert.ok(result.styleViolationCodes.includes('style_internal_identity_leak'));
  assert.ok(result.styleViolationCodes.includes('style_question_budget'));
});

test('Se’kret internal output is repaired without exposing identity metadata', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: "Se'kret noticed a pattern. What feels true?",
    characterId: 'sekret',
    actorId: 'sekret',
    replySource: 'openai',
  }, sekret);

  assert.equal(result.reply, 'I noticed a pattern. What feels true.');
  assert.equal(result.actorId, undefined);
  assert.equal(result.characterId, undefined);
  assert.equal(result.internalIdentityApplied, true);
  assert.ok(result.styleViolationCodes.includes('style_internal_identity_leak'));
  assert.ok(result.styleViolationCodes.includes('style_question_budget'));
});

test('legacy display names are repaired to Suhana and Sy before a reply reaches the user', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'Raylene said Rylane has your back.',
  }, suhana);

  assert.equal(result.reply, 'Suhana said Sy has your back.');
  assert.equal(result.actorId, 'suhana');
  assert.equal(result.internalIdentityApplied, false);
  assert.equal(result.styleRepaired, true);
  assert.deepEqual(result.styleViolationCodes, ['style_forbidden_phrase']);
});

test('named companion output keeps one question and repairs extras', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'What happened? What do you want next?',
  }, suhana);
  assert.equal(result.reply, 'What happened? What do you want next.');
  assert.equal(result.questionBudget, 1);
  assert.equal(result.internalIdentityApplied, false);
  assert.deepEqual(result.styleViolationCodes, ['style_question_budget']);
});

test('production Worker wrapper injects, enforces, voices, and returns style evidence', () => {
  assert.match(indexSource, /buildRuntimeStyleInstruction/);
  assert.match(indexSource, /phaseInstruction:/);
  assert.match(indexSource, /enforceRuntimeStyleResponse/);
  assert.match(indexSource, /instructions: style\.speechInstructions/);
  assert.match(indexSource, /styleDecision/);
  assert.match(indexSource, /withPublicActorMetadata/);
  assert.match(runtimeSource, /parentCoach actor requires the parentCoach surface/);
  assert.match(runtimeSource, /EMPATHY_ACCOUNTABILITY_RUNTIME_INSTRUCTION/);
  assert.match(runtimeSource, /resolveRuntimeIdentity/);
});

test('observed Worker forwards generic style evidence without needing internal names', () => {
  assert.match(observedSource, /text_style_version: metadata\.textStyleVersion/);
  assert.match(observedSource, /speech_style_version: metadata\.speechStyleVersion/);
  assert.match(observedSource, /style_repaired: metadata\.styleRepaired/);
  assert.match(observedSource, /style_violation_codes: metadata\.styleViolationCodes/);
});

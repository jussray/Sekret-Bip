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
const voiceEntrySource = fs.readFileSync(path.join(root, 'worker/voice-entry.ts'), 'utf8');
const observedSource = fs.readFileSync(path.join(root, 'worker/observed-index.ts'), 'utf8');
const pickerSource = fs.readFileSync(path.join(root, 'app/(teen)/sekret.tsx'), 'utf8');
const historySource = fs.readFileSync(path.join(root, 'app/(teen)/pages/history.tsx'), 'utf8');
const detailSource = fs.readFileSync(path.join(root, 'app/(teen)/pages/[id].tsx'), 'utf8');

const suhana = runtime.resolveRuntimeStyle('suhana');
const joseema = runtime.resolveRuntimeStyle('sekret', 'joseema');
const sekret = runtime.resolveRuntimeStyle('sekret', 'sekret');
const oracleResolution = runtime.resolveRuntimeIdentity('oracle');
assert.ok(oracleResolution);
const oracle = runtime.resolveRuntimeStyle(
  oracleResolution.actorId,
  oracleResolution.internalHonorIdentity,
  oracleResolution.internalHonorIdentities,
  oracleResolution.legacyOracleBridge,
);
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

test('legacy Oracle preserves Se’kret continuity and carries Joseema in parallel', () => {
  assert.deepEqual(runtime.resolveRuntimeIdentity('oracle'), {
    actorId: 'sekret',
    internalHonorIdentity: 'sekret',
    internalHonorIdentities: ['sekret', 'joseema'],
    legacyOracleBridge: true,
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('joseema'), {
    actorId: 'sekret',
    internalHonorIdentity: 'joseema',
    internalHonorIdentities: ['joseema'],
    legacyOracleBridge: false,
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('sekret'), {
    actorId: 'sekret',
    internalHonorIdentity: 'sekret',
    internalHonorIdentities: ['sekret'],
    legacyOracleBridge: false,
  });
  assert.deepEqual(runtime.resolveRuntimeIdentity('suhana'), { actorId: 'suhana' });
  assert.equal(oracle.legacyOracleBridge, true);
  assert.deepEqual(oracle.internalHonorIdentities, ['sekret', 'joseema']);
});

test('parent coaching cannot cross the teen-facing actor/surface boundary', () => {
  assert.equal(runtime.validateActorSurface('parentCoach', 'journal'), 'parentCoach actor requires the parentCoach surface');
  assert.equal(runtime.validateActorSurface('suhana', 'parentCoach'), 'parentCoach surface requires the parentCoach actor');
  assert.equal(runtime.validateActorSurface('parentCoach', 'parentCoach'), null);
  assert.equal(runtime.validateActorSurface('sekret', 'selfDiscovery'), null);
});

test('named companions and internal lenses resolve versioned style contracts', () => {
  assert.equal(runtime.EMPATHY_ACCOUNTABILITY_RUNTIME_VERSION, 'empathy-accountability-v1');
  assert.equal(suhana.role, 'named-companion');
  assert.equal(suhana.textStyleVersion, 'suhana-text-v1+empathy-accountability-v1');
  assert.equal(suhana.speechStyleVersion, 'suhana-speech-v1');
  assert.equal(suhana.maxQuestions, 1);
  assert.equal(suhana.internalHonorIdentity, undefined);

  for (const style of [joseema, sekret, oracle]) {
    assert.equal(style.role, 'continuity-presence');
    assert.equal(style.textStyleVersion, 'internal-presence-text-v1+empathy-accountability-v1');
    assert.equal(style.speechStyleVersion, 'internal-presence-speech-v1');
    assert.equal(style.maxQuestions, 0);
    assert.doesNotMatch(style.systemPromptAddendum, /\b(?:oracle|joseema|se[’']?kret)\b/i);
    assert.doesNotMatch(style.speechInstructions, /\b(?:oracle|joseema|se[’']?kret)\b/i);
  }
  assert.equal(joseema.internalHonorIdentity, 'joseema');
  assert.equal(sekret.internalHonorIdentity, 'sekret');

  assert.equal(parentCoach.role, 'parent-coach');
  assert.equal(parentCoach.maxQuestions, 1);
  assert.match(parentCoach.speechInstructions, /parent-coach delivery/i);
});

test('internal honor prompt is generic, code-only, and cannot impersonate a real person', () => {
  for (const style of [joseema, sekret, oracle]) {
    const instruction = runtime.buildRuntimeStyleInstruction(style);
    assert.match(instruction, /EMPATHY \+ ACCOUNTABILITY CONTRACT/);
    assert.match(instruction, /internal presence, not a selectable companion/i);
    assert.match(instruction, /Never show, name, speak, label, or introduce an internal honor identity/i);
    assert.match(instruction, /Never impersonate a real person/i);
    assert.match(instruction, /invent memories/i);
    assert.match(instruction, /what a real person would think, want, approve, or say/i);
    assert.match(instruction, /Ask no direct questions/);
    assert.match(instruction, /Actor: internal-presence/i);
    assert.doesNotMatch(instruction, /\bOracle\b/i);
    assert.doesNotMatch(instruction, /\bJoseema\b/i);
    assert.doesNotMatch(instruction, /\bSe[’']?kret\b/i);
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

test('fallback replies enforce accountability even when the model is unavailable', () => {
  const guarded = runtime.enforceFallbackAccountability({
    reply: "That's okay. We can just vibe.",
    tone: 'casual',
    replySource: 'fallback',
  }, 'I hit my brother honestly');

  assert.equal(guarded.fallbackAccountabilityRepaired, true);
  assert.match(String(guarded.reply), /hurting or threatening someone isn't okay/i);
  assert.match(String(guarded.reply), /own what happened/i);
  assert.doesNotMatch(String(guarded.reply), /that's okay/i);

  const styled = runtime.enforceRuntimeStyleResponse(guarded, suhana);
  assert.equal(styled.fallbackAccountabilityRepaired, true);
  assert.equal(styled.styleEnforced, true);
});

test('fallback accountability does not rewrite ordinary degraded replies', () => {
  const guarded = runtime.enforceFallbackAccountability({
    reply: 'No rush. Start wherever feels okay.',
    tone: 'casual',
    replySource: 'fallback',
  }, 'I had a rough day');

  assert.equal(guarded.reply, 'No rush. Start wherever feels okay.');
  assert.equal(guarded.fallbackAccountabilityRepaired, false);
});

test('parent coach remains outside the teen companion empathy contract', () => {
  const instruction = runtime.buildRuntimeStyleInstruction(parentCoach);
  assert.doesNotMatch(instruction, /EMPATHY \+ ACCOUNTABILITY CONTRACT/);
});

test('Worker resolves the full internal lens set before delegation and strips public actor metadata', () => {
  const resolveIndex = indexSource.indexOf('resolveRuntimeIdentity(body.characterId ?? body.personality)');
  const pluralIndex = indexSource.indexOf('internalHonorIdentities');
  const legacyIndex = indexSource.indexOf('legacyOracleBridge');
  const styleIndex = indexSource.indexOf('resolveRuntimeStyle(');
  const rewriteIndex = indexSource.indexOf('characterId: actorId');
  const privacyIndex = indexSource.indexOf('withPublicActorMetadata');
  assert.ok(resolveIndex >= 0, 'Worker must resolve request identity');
  assert.ok(pluralIndex > resolveIndex, 'Worker must carry all internal honor lenses');
  assert.ok(legacyIndex > resolveIndex, 'Worker must carry legacy Oracle bridge evidence');
  assert.ok(styleIndex > resolveIndex, 'Worker must resolve style after identity resolution');
  assert.ok(rewriteIndex > styleIndex, 'Worker may delegate only the execution actor after style resolution');
  assert.ok(privacyIndex >= 0, 'Worker must strip internal actor metadata before returning data');
});

test('Worker applies fallback accountability before runtime style enforcement', () => {
  const delegatedGuard = indexSource.indexOf('enforceFallbackAccountability(data, userText)');
  const delegatedStyle = indexSource.indexOf('enforceRuntimeStyleResponse(guarded, style)');
  const localGuard = indexSource.indexOf('enforceFallbackAccountability({');
  const localStyle = indexSource.indexOf('enforceRuntimeStyleResponse(guarded, prepared.style)');
  assert.ok(delegatedGuard >= 0, 'delegated fallback responses must be accountability-checked');
  assert.ok(delegatedStyle > delegatedGuard, 'delegated accountability guard must run before style enforcement');
  assert.ok(localGuard >= 0, 'local no-provider fallback must be accountability-checked');
  assert.ok(localStyle > localGuard, 'local accountability guard must run before style enforcement');
  assert.match(indexSource, /rewriteStyledJsonResponse\(delegated, prepared\.style, userText, cors\)/);
  assert.match(indexSource, /fallbackAccountabilityRepaired === true/);
});

test('every internal name is repaired without exposing identity metadata', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: "Oracle said Joseema and Se'kret noticed a pattern. What feels true?",
    characterId: 'sekret',
    actorId: 'sekret',
    replySource: 'openai',
  }, oracle);

  assert.doesNotMatch(String(result.reply), /\bOracle\b/i);
  assert.doesNotMatch(String(result.reply), /\bJoseema\b/i);
  assert.doesNotMatch(String(result.reply), /\bSe[’']?kret\b/i);
  assert.equal(result.actorId, undefined);
  assert.equal(result.characterId, undefined);
  assert.equal(result.actorRole, 'continuity-presence');
  assert.equal(result.questionBudget, 0);
  assert.equal(result.internalIdentityApplied, true);
  assert.equal(result.legacyOracleBridgeApplied, true);
  assert.equal(result.styleRepaired, true);
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

test('voice front door resolves legacy Oracle through canonical internal execution', () => {
  assert.match(voiceEntrySource, /resolveRuntimeIdentity\(body\.characterId \?\? body\.personality\)/);
  assert.match(voiceEntrySource, /internalHonorIdentities/);
  assert.match(voiceEntrySource, /legacyOracleBridge/);
  assert.match(voiceEntrySource, /characterId: actorId as CharacterId/);
  assert.match(voiceEntrySource, /internalIdentityApplied: internal/);
  assert.match(voiceEntrySource, /legacyOracleBridgeApplied: style\.legacyOracleBridge === true/);
});

test('active UI exposes only the four selectable companions while old records fail closed', () => {
  assert.match(pickerSource, /PERSONALITY_ORDER: PersonalityId\[\] = \['raylene', 'rylane', 'cloud', 'night'\]/);
  assert.doesNotMatch(pickerSource, /PERSONALITY_ORDER[^;]*oracle/s);
  assert.doesNotMatch(historySource, /oracle\s*:\s*\{\s*label:\s*['"]Oracle['"]/i);
  assert.doesNotMatch(historySource, /COMPANION_FILTERS[^;]*oracle/s);
  assert.doesNotMatch(detailSource, /oracle\s*:\s*\{\s*label:\s*['"]Oracle['"]/i);
  assert.match(historySource, /label: 'Pages'/);
  assert.match(detailSource, /label: 'Pages'/);
});

test('production Worker wrapper injects, enforces, voices, and returns style evidence', () => {
  assert.match(indexSource, /buildRuntimeStyleInstruction/);
  assert.match(indexSource, /phaseInstruction:/);
  assert.match(indexSource, /enforceFallbackAccountability/);
  assert.match(indexSource, /enforceRuntimeStyleResponse/);
  assert.match(indexSource, /instructions: style\.speechInstructions/);
  assert.match(indexSource, /styleDecision/);
  assert.match(indexSource, /withPublicActorMetadata/);
  assert.match(runtimeSource, /parentCoach actor requires the parentCoach surface/);
  assert.match(runtimeSource, /EMPATHY_ACCOUNTABILITY_RUNTIME_INSTRUCTION/);
  assert.match(runtimeSource, /EMPATHY_ACCOUNTABILITY_RUNTIME_VERSION/);
  assert.match(runtimeSource, /resolveRuntimeIdentity/);
  assert.match(runtimeSource, /INTERNAL_AI_BOUNDARY_INSTRUCTION/);
  assert.match(runtimeSource, /INTERNAL_SYSTEM_PROMPT_ADDENDUM/);
});

test('observed Worker forwards generic style evidence without needing internal names', () => {
  assert.match(observedSource, /text_style_version: metadata\.textStyleVersion/);
  assert.match(observedSource, /speech_style_version: metadata\.speechStyleVersion/);
  assert.match(observedSource, /style_repaired: metadata\.styleRepaired/);
  assert.match(observedSource, /style_violation_codes: metadata\.styleViolationCodes/);
});

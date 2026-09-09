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

compile('src/features/sekret/identityContract.ts', 'identityContract.mjs');
compile('src/features/sekret/styleProfiles.ts', 'styleProfiles.mjs');
compile(
  'src/features/sekret/companionStyleEngine.ts',
  'companionStyleEngine.mjs',
  (source) => source.replace("from './styleProfiles'", "from './styleProfiles.mjs'"),
);
const runtimePath = compile(
  'worker/runtime-style.ts',
  'runtime-style.mjs',
  (source) => source
    .replace("from '../src/features/sekret/companionStyleEngine'", "from './companionStyleEngine.mjs'")
    .replace("from '../src/features/sekret/styleProfiles'", "from './styleProfiles.mjs'"),
);

const runtime = await import(pathToFileURL(runtimePath).href);
const runtimeSource = fs.readFileSync(path.join(root, 'worker/runtime-style.ts'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'worker/index.ts'), 'utf8');
const observedSource = fs.readFileSync(path.join(root, 'worker/observed-index.ts'), 'utf8');

const suhana = runtime.resolveRuntimeStyle('suhana');
const sekret = runtime.resolveRuntimeStyle('sekret');
const parentCoach = runtime.resolveRuntimeStyle('parentCoach');

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('runtime actor normalization preserves aliases without substring guessing', () => {
  assert.equal(runtime.normalizeReplyActor('soft'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('raylene'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('Raylene'), 'suhana');
  assert.equal(runtime.normalizeReplyActor('Rylane'), 'sy');
  assert.equal(runtime.normalizeReplyActor('Night Se’kret'), 'night');
  assert.equal(runtime.normalizeReplyActor('oracle'), 'sekret');
  assert.equal(runtime.normalizeReplyActor('Se’kret Coach'), 'parentCoach');
  assert.equal(runtime.normalizeReplyActor('definitely-not-suhana'), null);
  assert.equal(runtime.normalizeReplyActor(''), null);
});

test('parent coaching cannot cross the teen-facing actor/surface boundary', () => {
  assert.equal(runtime.validateActorSurface('parentCoach', 'journal'), 'parentCoach actor requires the parentCoach surface');
  assert.equal(runtime.validateActorSurface('suhana', 'parentCoach'), 'parentCoach surface requires the parentCoach actor');
  assert.equal(runtime.validateActorSurface('parentCoach', 'parentCoach'), null);
  assert.equal(runtime.validateActorSurface('sekret', 'selfDiscovery'), null);
});

test('named companions and Se’kret resolve the merged versioned style contracts', () => {
  assert.equal(suhana.role, 'named-companion');
  assert.equal(suhana.textStyleVersion, 'suhana-text-v1');
  assert.equal(suhana.speechStyleVersion, 'suhana-speech-v1');
  assert.equal(suhana.maxQuestions, 1);

  assert.equal(sekret.role, 'continuity-presence');
  assert.equal(sekret.textStyleVersion, 'sekret-presence-text-v1');
  assert.equal(sekret.speechStyleVersion, 'sekret-presence-speech-v1');
  assert.equal(sekret.maxQuestions, 0);
  assert.match(sekret.speechInstructions, /Never expose Oracle/i);

  assert.equal(parentCoach.role, 'parent-coach');
  assert.equal(parentCoach.maxQuestions, 1);
  assert.match(parentCoach.speechInstructions, /parent-coach delivery/i);
});

test('authoritative prompt instruction carries role, versions, and question budget', () => {
  const instruction = runtime.buildRuntimeStyleInstruction(sekret);
  assert.match(instruction, /overrides any conflicting legacy prompt or few-shot example/i);
  assert.match(instruction, /Text style version: sekret-presence-text-v1/);
  assert.match(instruction, /Speech style version: sekret-presence-speech-v1/);
  assert.match(instruction, /Ask no direct questions/);
  assert.match(instruction, /not a selectable companion/i);
});

test('Se’kret output is deterministically repaired to hide Oracle and ask zero questions', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'Oracle noticed a pattern. What feels true? Is there more?',
    replySource: 'openai',
  }, sekret);

  assert.equal(result.reply, "Se'kret noticed a pattern. What feels true. Is there more.");
  assert.equal(result.actorId, 'sekret');
  assert.equal(result.actorRole, 'continuity-presence');
  assert.equal(result.questionBudget, 0);
  assert.equal(result.styleRepaired, true);
  assert.deepEqual(result.styleViolationCodes, ['style_oracle_leak', 'style_question_budget']);
});

test('legacy display names are repaired to Suhana and Sy before a reply reaches the user', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'Raylene said Rylane has your back.',
  }, suhana);

  assert.equal(result.reply, 'Suhana said Sy has your back.');
  assert.equal(result.actorId, 'suhana');
  assert.equal(result.styleRepaired, true);
  assert.deepEqual(result.styleViolationCodes, ['style_forbidden_phrase']);
});

test('named companion output keeps one question and repairs extras', () => {
  const result = runtime.enforceRuntimeStyleResponse({
    reply: 'What happened? What do you want next?',
  }, suhana);
  assert.equal(result.reply, 'What happened? What do you want next.');
  assert.equal(result.questionBudget, 1);
  assert.deepEqual(result.styleViolationCodes, ['style_question_budget']);
});

test('production Worker wrapper injects, enforces, voices, and returns style evidence', () => {
  assert.match(indexSource, /buildRuntimeStyleInstruction/);
  assert.match(indexSource, /phaseInstruction:/);
  assert.match(indexSource, /enforceRuntimeStyleResponse/);
  assert.match(indexSource, /instructions: style\.speechInstructions/);
  assert.match(indexSource, /styleDecision/);
  assert.match(runtimeSource, /parentCoach actor requires the parentCoach surface/);
});

test('observed Worker forwards style versions and repair evidence to telemetry', () => {
  assert.match(observedSource, /text_style_version: metadata\.textStyleVersion/);
  assert.match(observedSource, /speech_style_version: metadata\.speechStyleVersion/);
  assert.match(observedSource, /style_repaired: metadata\.styleRepaired/);
  assert.match(observedSource, /style_violation_codes: metadata\.styleViolationCodes/);
});

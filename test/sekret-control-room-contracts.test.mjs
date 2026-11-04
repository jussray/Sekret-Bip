import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-contracts-'));

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

compile(
  'src/features/identity/companionIds.ts',
  'companionIds.mjs',
);
compile(
  'src/features/identity/legacyCompanionIdMigration.ts',
  'legacyCompanionIdMigration.mjs',
  (source) => source.replace("from './companionIds'", "from './companionIds.mjs'"),
);
const identityPath = compile(
  'src/features/sekret/identityContract.ts',
  'identityContract.mjs',
  (source) => source
    .replace("from '@/features/identity/companionIds'", "from './companionIds.mjs'")
    .replace(
      "from '@/features/identity/legacyCompanionIdMigration'",
      "from './legacyCompanionIdMigration.mjs'",
    ),
);
const styleProfilesPath = compile(
  'src/features/sekret/styleProfiles.ts',
  'styleProfiles.mjs',
  (source) => source.replace("from './identityContract'", "from './identityContract.mjs'"),
);
const styleEnginePath = compile(
  'src/features/sekret/companionStyleEngine.ts',
  'companionStyleEngine.mjs',
  (source) => source
    .replace("from './identityContract'", "from './identityContract.mjs'")
    .replace("from './styleProfiles'", "from './styleProfiles.mjs'"),
);
const relationshipPath = compile(
  'src/features/sekret/relationshipPhase.ts',
  'relationshipPhase.mjs',
);

const identity = await import(pathToFileURL(identityPath).href);
const styleProfiles = await import(pathToFileURL(styleProfilesPath).href);
const styleEngine = await import(pathToFileURL(styleEnginePath).href);
const relationship = await import(pathToFileURL(relationshipPath).href);

after(() => {
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('Oracle and Se’kret resolve to the visible Se’kret identity', () => {
  assert.equal(identity.getVisibleIdentity(), "Se'kret");
  assert.equal(identity.resolveVisibleIdentity('oracle'), "Se'kret");
  assert.equal(identity.resolveVisibleIdentity('sekret'), "Se'kret");
  assert.equal(identity.resolveVisibleIdentity('unknown-internal-value'), "Se'kret");
});

test('named companions keep their own visible identities', () => {
  assert.equal(identity.resolveVisibleIdentity('suhana'), 'Suhana');
  assert.equal(identity.resolveVisibleIdentity('sy'), 'Sy');
  assert.equal(identity.resolveVisibleIdentity('cloud'), 'Cloud');
  assert.equal(identity.resolveVisibleIdentity('night'), 'Night');

  // Legacy ids still resolve to the current canonical display name.
  assert.equal(identity.resolveVisibleIdentity('raylene'), 'Suhana');
  assert.equal(identity.resolveVisibleIdentity('rylane'), 'Sy');
});

test('Oracle leaks are detected and rejected', () => {
  assert.equal(identity.containsOracleLeak('Oracle is typing…'), true);
  assert.equal(identity.containsOracleLeak("Se'kret is typing…"), false);
  assert.throws(
    () => identity.assertNoOracleLeak('Talk to Oracle'),
    /must not expose Oracle/,
  );
  assert.doesNotThrow(() => identity.assertNoOracleLeak("Se'kret replied"));
});

test('visible and suppressed Se’kret surfaces have unambiguous semantics', () => {
  assert.equal(identity.isSekretVisibleSurface('sekret-chat'), true);
  assert.equal(identity.isSekretVisibleSurface('companion-picker'), false);
  assert.equal(identity.shouldSuppressSekretIdentity('companion-picker'), true);
  assert.equal(identity.shouldSuppressSekretIdentity('sekret-chat'), false);
});

test('named companion registry excludes Se’kret', () => {
  assert.deepEqual(
    [...styleProfiles.NAMED_COMPANION_IDS],
    ['suhana', 'sy', 'cloud', 'night'],
  );
  assert.equal(styleProfiles.isNamedCompanionId('sekret'), false);
  assert.equal(styleProfiles.getNamedCompanionStyleProfiles().length, 4);
  assert.ok(
    styleProfiles
      .getNamedCompanionStyleProfiles()
      .every((profile) => profile.role === 'named-companion'),
  );
});

test('Se’kret has a continuity-presence profile, not a companion profile', () => {
  const sekret = styleProfiles.getStyleProfile('sekret');
  assert.equal(sekret.role, 'continuity-presence');
  assert.equal(sekret.questionBudget, 0);
  assert.ok(sekret.forbiddenPhrases.includes('Oracle'));
});

test('style engine uses separate builders for companions and Se’kret presence', () => {
  const suhana = styleEngine.buildCompanionStyleRequest('suhana');
  assert.equal(suhana.role, 'named-companion');
  assert.equal(suhana.constraints.maxQuestions, 1);
  assert.match(suhana.systemPromptAddendum, /at most one direct question/i);

  const sekret = styleEngine.buildSekretPresenceStyleRequest();
  assert.equal(sekret.styleId, 'sekret');
  assert.equal(sekret.role, 'continuity-presence');
  assert.equal(sekret.constraints.maxQuestions, 0);
  assert.match(sekret.systemPromptAddendum, /Ask no direct questions/i);

  assert.throws(
    () => styleEngine.buildCompanionStyleRequest('sekret'),
    /not a named companion/,
  );
});

test('relationship phase does not counterfeit intimacy', () => {
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 0,
      reflectionRunCount: 1,
      unresolvedContradictions: 0,
    }),
    'new',
  );
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 1,
      reflectionRunCount: 0,
      unresolvedContradictions: 0,
    }),
    'building',
  );
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 10,
      reflectionRunCount: 0,
      unresolvedContradictions: 0,
    }),
    'established',
  );
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 30,
      reflectionRunCount: 0,
      unresolvedContradictions: 0,
    }),
    'deep',
  );
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 10,
      reflectionRunCount: 1,
      unresolvedContradictions: 0,
    }),
    'reflective',
  );
  assert.equal(
    relationship.deriveRelationshipPhase({
      durableMemoryCount: 30,
      reflectionRunCount: 2,
      unresolvedContradictions: 1,
    }),
    'deep',
  );
});

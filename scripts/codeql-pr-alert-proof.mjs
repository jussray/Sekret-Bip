import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function clip(value, max = 1_000) {
  if (typeof value !== 'string') return value ?? null;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function listSarifFiles(root) {
  if (!root || !fs.existsSync(root)) return [];
  const files = [];
  const visit = (entry) => {
    const stat = fs.statSync(entry);
    if (stat.isDirectory()) {
      for (const child of fs.readdirSync(entry)) visit(path.join(entry, child));
      return;
    }
    if (entry.endsWith('.sarif') || entry.endsWith('.sarif.json')) files.push(entry);
  };
  visit(root);
  return files.sort();
}

function locationFor(result) {
  const physical = result?.locations?.[0]?.physicalLocation ?? {};
  const region = physical.region ?? {};
  return {
    path: physical.artifactLocation?.uri ?? null,
    startLine: region.startLine ?? null,
    endLine: region.endLine ?? null,
  };
}

export function summarizeSarifDocuments(documents = []) {
  const findings = [];
  let runCount = 0;

  for (const document of documents) {
    for (const run of Array.isArray(document?.runs) ? document.runs : []) {
      runCount += 1;
      for (const result of Array.isArray(run?.results) ? run.results : []) {
        findings.push({
          ruleId: result.ruleId ?? 'unknown',
          level: result.level ?? 'unknown',
          message: clip(result?.message?.text),
          ...locationFor(result),
        });
      }
    }
  }

  return {
    runCount,
    findingCount: findings.length,
    findings,
  };
}

function validateWaiver(raw, index) {
  const waiver = raw ?? {};
  const id = clean(waiver.id);
  const language = clean(waiver.language);
  const ruleId = clean(waiver.ruleId);
  const findingPath = clean(waiver.path);
  const rationale = clean(waiver.rationale);
  const expiresAt = clean(waiver.expiresAt);
  const messageIncludes = clean(waiver.messageIncludes);
  const maxMatches = Number(waiver.maxMatches);

  if (!id || !language || !ruleId || !findingPath || !rationale || !expiresAt) {
    throw new Error(`CodeQL waiver ${index} is missing required identity, scope, rationale, or expiry fields.`);
  }
  if (!Number.isInteger(maxMatches) || maxMatches <= 0) {
    throw new Error(`CodeQL waiver ${id} must declare a positive integer maxMatches.`);
  }
  const expiry = Date.parse(expiresAt);
  if (!Number.isFinite(expiry)) throw new Error(`CodeQL waiver ${id} has an invalid expiresAt value.`);

  return {id, language, ruleId, path: findingPath, rationale, expiresAt, expiry, messageIncludes, maxMatches};
}

export function applyFindingWaivers(findings, waiverDocument, {
  language,
  now = new Date(),
} = {}) {
  const sourceFindings = Array.isArray(findings) ? findings : [];
  const entries = Array.isArray(waiverDocument?.waivers) ? waiverDocument.waivers : [];
  if (waiverDocument && waiverDocument.schemaVersion !== 1) {
    throw new Error('CodeQL waiver document must use schemaVersion 1.');
  }

  const output = sourceFindings.map((finding) => ({...finding, disposition: 'blocking', waiverId: null}));
  const waiverErrors = [];
  const waiverReceipts = [];
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(String(now));

  for (let index = 0; index < entries.length; index += 1) {
    const waiver = validateWaiver(entries[index], index);
    if (waiver.language !== language) continue;

    if (!Number.isFinite(nowMs) || nowMs >= waiver.expiry) {
      waiverErrors.push(`CodeQL waiver ${waiver.id} expired at ${waiver.expiresAt}.`);
      continue;
    }

    const matches = output
      .map((finding, findingIndex) => ({finding, findingIndex}))
      .filter(({finding}) => finding.disposition === 'blocking')
      .filter(({finding}) => finding.ruleId === waiver.ruleId && finding.path === waiver.path)
      .filter(({finding}) => !waiver.messageIncludes || clean(finding.message).includes(waiver.messageIncludes));

    if (matches.length === 0) {
      waiverErrors.push(`CodeQL waiver ${waiver.id} matched no finding and must be removed or reviewed.`);
      continue;
    }

    for (const {findingIndex} of matches.slice(0, waiver.maxMatches)) {
      output[findingIndex].disposition = 'waived';
      output[findingIndex].waiverId = waiver.id;
    }

    if (matches.length > waiver.maxMatches) {
      waiverErrors.push(
        `CodeQL waiver ${waiver.id} matched ${matches.length} findings, exceeding maxMatches=${waiver.maxMatches}.`,
      );
    }

    waiverReceipts.push({
      id: waiver.id,
      language: waiver.language,
      ruleId: waiver.ruleId,
      path: waiver.path,
      rationale: waiver.rationale,
      expiresAt: waiver.expiresAt,
      maxMatches: waiver.maxMatches,
      matched: Math.min(matches.length, waiver.maxMatches),
    });
  }

  return {
    findings: output,
    blockingFindings: output.filter((finding) => finding.disposition === 'blocking'),
    waivedFindings: output.filter((finding) => finding.disposition === 'waived'),
    waiverReceipts,
    waiverErrors,
  };
}

function save(directory, name, value) {
  fs.mkdirSync(directory, {recursive: true});
  fs.writeFileSync(
    path.join(directory, name),
    `${typeof value === 'string' ? value : JSON.stringify(value, null, 2)}\n`,
    'utf8',
  );
}

function loadWaiverDocument(filePath) {
  if (!filePath) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function runLocalCodeqlProof(env = process.env) {
  const sarifDir = clean(env.CODEQL_SARIF_DIR);
  const language = clean(env.CODEQL_LANGUAGE);
  const expectedHead = clean(env.EXPECTED_HEAD_SHA).toLowerCase();
  const evidenceDir = clean(env.EVIDENCE_DIR) || 'artifacts/codeql-local/evidence';
  const waiverPath = clean(env.CODEQL_WAIVER_PATH) || 'security/codeql-local-waivers.json';

  if (!sarifDir) throw new Error('CODEQL_SARIF_DIR is required');
  if (!language) throw new Error('CODEQL_LANGUAGE is required');
  if (!expectedHead) throw new Error('EXPECTED_HEAD_SHA is required');

  const sarifFiles = listSarifFiles(sarifDir);
  if (sarifFiles.length === 0) {
    save(evidenceDir, 'summary.json', {
      schemaVersion: 2,
      proofState: 'failed',
      reason: 'sarif-missing',
      language,
      exactHead: expectedHead,
      sarifFileCount: 0,
      findingCount: null,
      blockingFindingCount: null,
      waivedFindingCount: null,
    });
    throw new Error(`Local CodeQL produced no SARIF for ${language}`);
  }

  const documents = sarifFiles.map((file) => JSON.parse(fs.readFileSync(file, 'utf8')));
  const summary = summarizeSarifDocuments(documents);
  const waiverDocument = fs.existsSync(waiverPath) ? loadWaiverDocument(waiverPath) : null;
  const classified = applyFindingWaivers(summary.findings, waiverDocument, {language});
  const proofPassed = summary.runCount > 0
    && classified.blockingFindings.length === 0
    && classified.waiverErrors.length === 0;

  const receipt = {
    schemaVersion: 2,
    proofState: proofPassed ? 'passed' : 'failed',
    querySuite: 'security-extended',
    uploadMode: 'never',
    language,
    exactHead: expectedHead,
    sarifFileCount: sarifFiles.length,
    runCount: summary.runCount,
    findingCount: summary.findingCount,
    blockingFindingCount: classified.blockingFindings.length,
    waivedFindingCount: classified.waivedFindings.length,
    waiverErrors: classified.waiverErrors,
    waivers: classified.waiverReceipts,
  };

  save(evidenceDir, 'summary.json', receipt);
  save(evidenceDir, 'findings.json', classified.findings);

  if (summary.runCount === 0) {
    throw new Error(`Local CodeQL SARIF contained no analysis runs for ${language}`);
  }
  if (classified.waiverErrors.length > 0) {
    throw new Error(`Local CodeQL waiver contract failed for ${language}: ${classified.waiverErrors.join(' ')}`);
  }
  if (classified.blockingFindings.length > 0) {
    throw new Error(
      `Local CodeQL security gate failed for ${language}: ${classified.blockingFindings.length} unwaived finding(s)`,
    );
  }

  console.log(
    `Local CodeQL proof passed: language=${language} head=${expectedHead} sarif=${sarifFiles.length} `
      + `findings=${summary.findingCount} waived=${classified.waivedFindings.length} blocking=0`,
  );
  return receipt;
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  try {
    runLocalCodeqlProof();
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : String(error));
    process.exitCode = 1;
  }
}

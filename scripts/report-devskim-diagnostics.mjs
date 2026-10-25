import fs from 'node:fs';
import path from 'node:path';

const REVIEW_PATHS = Object.freeze([
  'scripts/verify-supabase-runtime-contract-health.mjs',
  'supabase/functions/runtime-contract-health/index.ts',
  'test/runtime-truth-contract.test.mjs',
]);

function safeRule(value) {
  return typeof value === 'string' && /^[a-zA-Z0-9_.:/-]{1,100}$/.test(value) ? value : 'unknown-rule';
}

function safeLocation(result) {
  const first = result?.locations?.[0]?.physicalLocation;
  const uri = first?.artifactLocation?.uri;
  if (typeof uri !== 'string') return null;
  const normalized = uri.replace(/\\/g, '/');
  const file = REVIEW_PATHS.find((candidate) => normalized === candidate || normalized.endsWith('/' + candidate));
  if (!file) return null;
  const value = first?.region?.startLine;
  const line = Number.isSafeInteger(value) && value > 0 && value <= 1000000 ? value : null;
  return { file, line };
}

export function summarizeDevSkimSarif(sarif) {
  const found = [];
  for (const run of Array.isArray(sarif?.runs) ? sarif.runs : []) {
    for (const result of Array.isArray(run?.results) ? run.results : []) {
      const location = safeLocation(result);
      if (!location) continue;
      const level = ['error', 'warning', 'note'].includes(result?.level) ? result.level : 'unknown';
      found.push({ rule: safeRule(result?.ruleId), level, ...location });
    }
  }
  return found.sort((a, b) => a.file.localeCompare(b.file) || (a.line ?? 0) - (b.line ?? 0));
}

export function renderDiagnostics(results) {
  const lines = [`DEVSKIM_SOURCE_REVIEW count=${results.length} (changed runtime witness files; no scanner messages)`];
  for (const result of results.slice(0, 50)) {
    lines.push(`DEVSKIM_SOURCE_FINDING rule=${result.rule} level=${result.level} file=${result.file} line=${result.line ?? 'unknown'}`);
  }
  if (results.length > 50) lines.push('DEVSKIM_SOURCE_FINDINGS_TRUNCATED');
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const file = process.argv[2] ?? 'devskim-results.sarif';
  const sarif = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log(renderDiagnostics(summarizeDevSkimSarif(sarif)));
}

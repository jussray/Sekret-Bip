#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultReportDir = path.join(root, 'reports', 'control-room');

function tail(value, lines = 40) {
  return (value || '').split('\n').slice(-lines).join('\n').trim();
}

function commandFor(name) {
  return process.platform === 'win32' ? `${name}.cmd` : name;
}

function childEnv(source = process.env) {
  const env = { ...source };
  if (env.CI !== 'true' && env.CI !== '1') delete env.CI;
  return env;
}

export async function detectPlaywrightAvailability({ rootDir = root, env = process.env } = {}) {
  if (env.CONTROL_ROOM_FORCE_NO_PLAYWRIGHT === '1') {
    return { available: false, reason: 'Disabled via CONTROL_ROOM_FORCE_NO_PLAYWRIGHT for deterministic fallback testing.', executablePath: null };
  }
  const packagePath = path.join(rootDir, 'node_modules', '@playwright', 'test');
  if (!fs.existsSync(packagePath)) return { available: false, reason: '@playwright/test is not installed in node_modules.', executablePath: null };
  try {
    const { chromium } = await import('@playwright/test');
    const executablePath = env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || chromium.executablePath();
    if (!executablePath || !fs.existsSync(executablePath)) {
      return { available: false, reason: 'Playwright is installed, but a Chromium executable is not present.', executablePath: executablePath || null };
    }
    return { available: true, reason: null, executablePath };
  } catch (error) {
    return { available: false, reason: `Unable to load Playwright: ${error instanceof Error ? error.message : String(error)}`, executablePath: null };
  }
}

export function parsePlaywrightJsonFile(jsonPath) {
  const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const stats = parsed.stats || {};
  const passed = Number(stats.expected || 0);
  const failed = Number(stats.unexpected || 0) + Number(stats.flaky || 0);
  const skipped = Number(stats.skipped || 0);
  const timedOut = Number(stats.timedOut || 0);
  return { passed, failed, skipped, timedOut, total: passed + failed + skipped + timedOut };
}

export function runPlaywright({ rootDir = root, env = process.env, generatedAt = new Date() } = {}) {
  const startedAt = Date.now();
  const stamp = generatedAt.toISOString().replace(/[:.]/g, '-');
  const artifactDir = path.join(rootDir, 'reports', 'control-room', 'playwright', stamp);
  fs.mkdirSync(artifactDir, { recursive: true });
  const result = spawnSync(commandFor('npx'), ['playwright', 'test'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    env: childEnv({ ...env, PLAYWRIGHT_ARTIFACT_DIR: artifactDir }),
    maxBuffer: 20 * 1024 * 1024,
  });
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const resultsJson = path.join(artifactDir, 'results.json');
  let counts = { passed: 0, failed: 0, skipped: 0, timedOut: 0, total: 0 };
  let parseError = null;
  try {
    if (!fs.existsSync(resultsJson)) throw new Error('Playwright JSON evidence was not created.');
    counts = parsePlaywrightJsonFile(resultsJson);
  } catch (error) {
    parseError = error instanceof Error ? error.message : String(error);
  }
  return {
    mode: 'playwright',
    evidenceLevel: 'browser',
    browserProof: exitCode === 0 && !parseError,
    status: exitCode === 0 && !parseError ? 'pass' : 'fail',
    exitCode,
    durationMs: Date.now() - startedAt,
    artifactDir,
    counts,
    parseError,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
  };
}

export function runFallback({ rootDir = root, env = process.env } = {}) {
  const startedAt = Date.now();
  const result = spawnSync(commandFor('npm'), ['run', 'verify:local'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    env: childEnv(env),
    maxBuffer: 20 * 1024 * 1024,
  });
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  return {
    mode: 'fallback-verify-local',
    evidenceLevel: 'non-browser-fallback',
    browserProof: false,
    status: exitCode === 0 ? 'pass' : 'fail',
    exitCode,
    durationMs: Date.now() - startedAt,
    artifactDir: null,
    counts: null,
    parseError: null,
    stdoutTail: tail(result.stdout),
    stderrTail: tail(result.stderr),
  };
}

export function writeReports(availability, run, { outputDir = defaultReportDir, generatedAt = new Date().toISOString() } = {}) {
  fs.mkdirSync(outputDir, { recursive: true });
  const jsonPath = path.join(outputDir, 'frontend.json');
  const mdPath = path.join(outputDir, 'frontend.md');
  const report = {
    generatedAt,
    mission: 'verify-frontend',
    purpose: 'Browser-level frontend verification with retained evidence and an explicit non-browser fallback.',
    playwright: availability,
    run,
  };
  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);
  const lines = [
    '# Bip Control Room — Verify Frontend', '',
    `Generated: ${generatedAt}`, '',
    `Mode: **${run.mode}**`,
    `Evidence: **${run.evidenceLevel}**`,
    `Browser proof: **${run.browserProof ? 'YES' : 'NO'}**`,
    `Status: **${run.status.toUpperCase()}**`,
    `Duration: ${run.durationMs}ms`,
  ];
  if (run.artifactDir) lines.push(`Artifacts: ${run.artifactDir}`);
  if (!availability.available) {
    lines.push('', `Playwright unavailable: ${availability.reason}`);
    lines.push('The fallback result must not be described as browser or Playwright proof.');
  }
  if (run.counts) lines.push('', `Passed: ${run.counts.passed} · Failed: ${run.counts.failed} · Skipped: ${run.counts.skipped} · Timed out: ${run.counts.timedOut}`);
  if (run.parseError) lines.push('', `Reporter parse error: ${run.parseError}`);
  if (run.status === 'fail') {
    lines.push('', '## Failure output');
    if (run.stderrTail) lines.push('', '```text', run.stderrTail, '```');
    if (run.stdoutTail) lines.push('', '```text', run.stdoutTail, '```');
  }
  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);
  return { report, jsonPath, mdPath };
}

async function main() {
  console.log('Control Room: Verify Frontend mission starting...');
  const availability = await detectPlaywrightAvailability();
  const run = availability.available ? runPlaywright() : runFallback();
  const { report, jsonPath, mdPath } = writeReports(availability, run);
  console.log(`Mode: ${report.run.mode}`);
  console.log(`Evidence: ${report.run.evidenceLevel}`);
  console.log(`Browser proof: ${report.run.browserProof ? 'YES' : 'NO'}`);
  console.log(`Status: ${report.run.status.toUpperCase()}`);
  console.log(`Report: ${path.relative(root, jsonPath)}`);
  console.log(`Readable report: ${path.relative(root, mdPath)}`);
  process.exit(report.run.status === 'pass' ? 0 : 1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main().catch(error => { console.error(error); process.exit(1); });

#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const registryPath = path.join(root, 'src', 'config', 'controlRoomVerificationRegistry.json');
const reportDir = path.join(root, 'reports', 'control-room');
const jsonPath = path.join(reportDir, 'latest.json');
const mdPath = path.join(reportDir, 'latest.md');
const TEST_SKIP_MARKER = 'CONTROL_ROOM_TEST_SKIP_RECEIPT ';

function loadVerificationRegistry() {
  let registry;
  try {
    registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to load Control Room verification registry at ${path.relative(root, registryPath)}: ${error.message}`);
  }

  if (!registry || !Array.isArray(registry.checks) || registry.checks.length === 0) {
    throw new Error('Control Room verification registry must define a non-empty checks array.');
  }

  return registry.checks.map((check, index) => {
    if (!check || typeof check !== 'object') {
      throw new Error(`Control Room verification check #${index + 1} must be an object.`);
    }
    for (const key of ['id', 'label', 'command', 'area']) {
      if (typeof check[key] !== 'string' || check[key].trim() === '') {
        throw new Error(`Control Room verification check #${index + 1} is missing string field: ${key}.`);
      }
    }
    if (!Array.isArray(check.args) || !check.args.every((arg) => typeof arg === 'string')) {
      throw new Error(`Control Room verification check ${check.id} must define args as an array of strings.`);
    }
    return { ...check, required: check.required !== false };
  });
}

const checks = loadVerificationRegistry();

function nowIso() {
  return new Date().toISOString();
}

function classifyStatus(check, exitCode, stdout, stderr) {
  const combined = `${stdout}\n${stderr}`;
  if (exitCode === 0 && combined.includes(TEST_SKIP_MARKER)) return 'warning';
  if (exitCode === 0) return 'pass';
  if (check.id === 'unit-tests' && exitCode === 2 && combined.includes('CONTROL_ROOM_NO_TESTS')) return 'warning';
  return 'fail';
}

function runCheck(check) {
  const startedAt = Date.now();
  const result = spawnSync(check.command, check.args, {
    cwd: root,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, CI: process.env.CI || 'false' },
  });

  const durationMs = Date.now() - startedAt;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const exitCode = typeof result.status === 'number' ? result.status : 1;
  const status = classifyStatus(check, exitCode, stdout, stderr);
  const skipped = `${stdout}\n${stderr}`.includes(TEST_SKIP_MARKER);

  return {
    ...check,
    commandText: `${check.command} ${check.args.join(' ')}`,
    status,
    exitCode,
    durationMs,
    stdoutTail: stdout.split('\n').slice(-40).join('\n').trim(),
    stderrTail: stderr.split('\n').slice(-40).join('\n').trim(),
    recommendation: status === 'warning'
      ? skipped
        ? 'One or more tests were skipped. Inspect the test-skip receipt; a skip is not a pass and cannot satisfy complete proof.'
        : 'No unit tests were discovered. Add tests or correct the configured test location before release.'
      : null,
  };
}

function summarize(results) {
  const passed = results.filter((check) => check.status === 'pass').length;
  const warnings = results.filter((check) => check.status === 'warning').length;
  const failed = results.filter((check) => check.status === 'fail').length;
  const requiredFailures = results.filter((check) => check.required && check.status === 'fail');
  const scoredPasses = passed + warnings * 0.5;
  const score = Math.round((scoredPasses / results.length) * 100);

  return {
    status: requiredFailures.length > 0 ? 'red' : warnings > 0 ? 'yellow' : 'green',
    pushSafe: requiredFailures.length === 0,
    demoReady: requiredFailures.length === 0 && warnings === 0 && score >= 90,
    score,
    passed,
    warnings,
    failed,
    total: results.length,
    requiredFailures: requiredFailures.map((check) => check.id),
  };
}

function writeReports(results, summary) {
  fs.mkdirSync(reportDir, { recursive: true });

  const report = {
    generatedAt: nowIso(),
    mode: 'local-control-room',
    purpose: 'Free local verification when GitHub Actions minutes are unavailable.',
    registry: path.relative(root, registryPath),
    summary,
    checks: results,
    guardrails: [
      'No GitHub PAT is required or read by this script.',
      'No OpenAI key is required or read by this script.',
      'Do not run fixture audits on real teen private content.',
      'Use GitHub Actions only as a release/PR backup while minutes are constrained.',
      'Skipped tests are warning evidence, never silent green proof.',
    ],
  };

  fs.writeFileSync(jsonPath, `${JSON.stringify(report, null, 2)}\n`);

  const lines = [];
  lines.push('# Bip Control Room — local report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push(`Status: **${summary.status.toUpperCase()}**`);
  lines.push(`Score: **${summary.score}%**`);
  lines.push(`Push safe: **${summary.pushSafe ? 'yes' : 'no'}**`);
  lines.push(`Demo ready: **${summary.demoReady ? 'yes' : 'no'}**`);
  lines.push('');
  lines.push('| Area | Check | Status | Duration | Command |');
  lines.push('| --- | --- | --- | ---: | --- |');

  for (const check of results) {
    const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    lines.push(`| ${check.area} | ${check.label} | ${icon} ${check.status} | ${check.durationMs}ms | \`${check.commandText}\` |`);
  }

  const warnings = results.filter((check) => check.status === 'warning');
  if (warnings.length) {
    lines.push('');
    lines.push('## Warnings');
    for (const check of warnings) {
      lines.push('');
      lines.push(`### ${check.label}`);
      lines.push('');
      lines.push(check.recommendation || 'Review this warning before release.');
      if (check.stderrTail) {
        lines.push('');
        lines.push('```text');
        lines.push(check.stderrTail);
        lines.push('```');
      }
      if (check.stdoutTail) {
        lines.push('');
        lines.push('```text');
        lines.push(check.stdoutTail);
        lines.push('```');
      }
    }
  }

  const failures = results.filter((check) => check.status === 'fail');
  if (failures.length) {
    lines.push('');
    lines.push('## Failures');
    for (const check of failures) {
      lines.push('');
      lines.push(`### ${check.label}`);
      lines.push('');
      lines.push(`Command: \`${check.commandText}\``);
      lines.push(`Exit code: \`${check.exitCode}\``);
      if (check.stderrTail) {
        lines.push('');
        lines.push('```text');
        lines.push(check.stderrTail);
        lines.push('```');
      }
      if (check.stdoutTail) {
        lines.push('');
        lines.push('```text');
        lines.push(check.stdoutTail);
        lines.push('```');
      }
    }
  }

  lines.push('');
  lines.push('## Guardrails');
  for (const guardrail of report.guardrails) lines.push(`- ${guardrail}`);

  fs.writeFileSync(mdPath, `${lines.join('\n')}\n`);
  return report;
}

console.log('Bip Control Room: running local verification...');
console.log('GitHub Actions minutes are not required for this command.');

const results = [];
for (const check of checks) {
  process.stdout.write(`- ${check.label}... `);
  const result = runCheck(check);
  results.push(result);
  console.log(result.status);
}

const summary = summarize(results);
writeReports(results, summary);

console.log('');
console.log(`Control Room status: ${summary.status.toUpperCase()}`);
console.log(`Score: ${summary.score}%`);
console.log(`Push safe: ${summary.pushSafe ? 'yes' : 'no'}`);
console.log(`Report: ${path.relative(root, jsonPath)}`);
console.log(`Readable report: ${path.relative(root, mdPath)}`);

process.exit(summary.pushSafe ? 0 : 1);

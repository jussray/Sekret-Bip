import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSkipObservation,
  emitSkipObservation,
  parseNodeTapSkip,
  parseNodeTapTodo,
  parseNodeTapTotals,
  resolveHeadSha,
  writeSkipReport,
} from './control-room-test-skips.mjs';

const root = process.cwd();
const testRoot = path.join(root, 'test');

function collectTests(directory) {
  if (!fs.existsSync(directory)) return [];
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectTests(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.test.mjs')) files.push(fullPath);
  }
  return files.sort();
}

const requestedTests = process.argv.slice(2).map((file) => path.resolve(root, file));
const tests = requestedTests.length > 0 ? requestedTests : collectTests(testRoot);

if (tests.length === 0) {
  console.warn('CONTROL_ROOM_NO_TESTS: No .test.mjs files were found under test/.');
  process.exit(2);
}

for (const file of tests) {
  if (!fs.existsSync(file)) {
    console.error(`CONTROL_ROOM_TEST_FILE_MISSING: ${path.relative(root, file)}`);
    process.exit(2);
  }
}

console.log(`Discovered ${tests.length} unit test file${tests.length === 1 ? '' : 's'}.`);
const command = `node --test --test-reporter=tap ${tests.map((file) => path.relative(root, file)).join(' ')}`;
const observations = [];
const seenTap = new Set();
const tapTotals = {tests: null, pass: null, fail: null, skipped: null, todo: null};
let bufferedStdout = '';

function consumeStdout(chunk) {
  process.stdout.write(chunk);
  bufferedStdout += chunk;
  const lines = bufferedStdout.split(/\r?\n/);
  bufferedStdout = lines.pop() || '';
  for (const line of lines) {
    const total = parseNodeTapTotals(line);
    if (total) tapTotals[total.field] = total.count;
    const parsed = parseNodeTapSkip(line) ?? parseNodeTapTodo(line);
    if (!parsed) continue;
    const key = `${parsed.testId}\u0000${parsed.reason}`;
    if (seenTap.has(key)) continue;
    seenTap.add(key);
    observations.push(buildSkipObservation({
      classification: /#\s*TODO\b/i.test(line) ? 'todo_unexecuted' : null,
      runner: 'node_test',
      command,
      testId: parsed.testId,
      reason: parsed.reason,
      surface: process.env.GITHUB_ACTIONS === 'true' ? 'github_actions' : 'local',
    }));
  }
}

const child = spawn(process.execPath, ['--test', '--test-reporter=tap', ...tests], {
  cwd: root,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});

child.stdout.on('data', (chunk) => consumeStdout(String(chunk)));
child.stderr.on('data', (chunk) => process.stderr.write(chunk));
child.on('error', (error) => {
  console.error(error);
  process.exit(1);
});
child.on('close', (status) => {
  if (bufferedStdout) consumeStdout('\n');
  const headSha = resolveHeadSha({ root });
  for (const observation of observations) emitSkipObservation(observation);
  const { reportPath } = writeSkipReport(observations, {
    root,
    filename: 'test-skips-latest.json',
    source: 'node_test',
    extra: {
      repository: process.env.GITHUB_REPOSITORY || 'jussray/Sekret-Bip',
      head_sha: headSha,
      command,
      exit_code: typeof status === 'number' ? status : 1,
      tap_totals: tapTotals,
    },
  });
  console.log(`CONTROL_ROOM_TEST_SKIP_SUMMARY count=${observations.length} report=${path.relative(root, reportPath)}`);
  if (observations.length > 0) {
    console.error('CONTROL_ROOM_TEST_SKIPS_REQUIRE_INVESTIGATION: skipped and TODO tests block complete proof.');
    console.error('CONTROL_ROOM_NO_SKIPS_GATE_FAILED: all discovered tests must execute and pass.');
  }
  const complete = Object.values(tapTotals).every((value) => Number.isSafeInteger(value));
  const fullyExecuted = complete && tapTotals.tests > 0 && tapTotals.pass === tapTotals.tests
    && tapTotals.fail === 0 && tapTotals.skipped === 0 && tapTotals.todo === 0;
  if (!fullyExecuted) {
    console.error('CONTROL_ROOM_TAP_EXECUTION_INCOMPLETE: expected every discovered test to execute and pass.', tapTotals);
  }
  // A passing Node process or absent skip receipts cannot override incomplete TAP totals.
  process.exit(typeof status === 'number' && status !== 0 ? status : (!fullyExecuted || observations.length > 0) ? 1 : (status ?? 1));
});

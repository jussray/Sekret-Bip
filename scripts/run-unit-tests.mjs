import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSkipObservation,
  emitSkipObservation,
  parseNodeTapSkip,
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
let bufferedStdout = '';

function consumeStdout(chunk) {
  process.stdout.write(chunk);
  bufferedStdout += chunk;
  const lines = bufferedStdout.split(/\r?\n/);
  bufferedStdout = lines.pop() || '';
  for (const line of lines) {
    const parsed = parseNodeTapSkip(line);
    if (!parsed) continue;
    const key = `${parsed.testId}\u0000${parsed.reason}`;
    if (seenTap.has(key)) continue;
    seenTap.add(key);
    observations.push(buildSkipObservation({
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
    },
  });
  console.log(`CONTROL_ROOM_TEST_SKIP_SUMMARY count=${observations.length} report=${path.relative(root, reportPath)}`);
  if (observations.length > 0) {
    console.warn('CONTROL_ROOM_TEST_SKIPS_REQUIRE_INVESTIGATION: skipped tests do not satisfy complete proof.');
  }
  process.exit(typeof status === 'number' ? status : 1);
});

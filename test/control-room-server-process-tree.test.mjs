import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const token = 'a'.repeat(64);

function getPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close(error => error ? reject(error) : resolve(port));
    });
    server.on('error', reject);
  });
}

async function waitForHealth(port, child) {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`server exited early: ${child.exitCode}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 40));
  }
  throw new Error('server health timeout');
}

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== 'ESRCH';
  }
}

async function waitForFile(file) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) return Number(fs.readFileSync(file, 'utf8'));
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error('descendant pid file timeout');
}

async function waitForExit(pid) {
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) return;
    await new Promise(resolve => setTimeout(resolve, 30));
  }
  throw new Error(`descendant ${pid} remained alive`);
}

test('timeout kills descendants before the mission lock is released', { skip: process.platform === 'win32' }, async t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'control-room-tree-'));
  const scripts = path.join(temp, 'scripts');
  fs.mkdirSync(scripts, { recursive: true });
  fs.copyFileSync('scripts/control-room-server.mjs', path.join(scripts, 'control-room-server.mjs'));
  const pidFile = path.join(temp, 'descendant.pid');
  fs.writeFileSync(path.join(scripts, 'control-room-agent.mjs'), `
    import { spawn } from 'node:child_process';
    import fs from 'node:fs';
    const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });
    fs.writeFileSync(${JSON.stringify(pidFile)}, String(child.pid));
    setInterval(() => {}, 1000);
  `);

  const port = await getPort();
  const server = spawn(process.execPath, ['scripts/control-room-server.mjs'], {
    cwd: temp,
    env: {
      ...process.env,
      CONTROL_ROOM_LOCAL_PORT: String(port),
      CONTROL_ROOM_LOCAL_TOKEN: token,
      CONTROL_ROOM_MISSION_TIMEOUT_MS: '150',
      CONTROL_ROOM_TERMINATION_GRACE_MS: '120',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(() => {
    if (server.exitCode == null) server.kill('SIGTERM');
    fs.rmSync(temp, { recursive: true, force: true });
  });

  await waitForHealth(port, server);
  const missionPromise = fetch(`http://127.0.0.1:${port}/missions/continue-yesterday`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const descendantPid = await waitForFile(pidFile);
  assert.equal(pidAlive(descendantPid), true);

  const response = await missionPromise;
  const body = await response.json();
  assert.equal(response.status, 500);
  assert.equal(body.status, 'timed_out');
  assert.equal(body.error, 'mission_timeout');
  assert.equal(body.termination, 'process_tree');
  await waitForExit(descendantPid);

  const health = await fetch(`http://127.0.0.1:${port}/health`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then(value => value.json());
  assert.equal(health.activeMission, null);
  assert.equal(health.latestRun.status, 'timed_out');
});

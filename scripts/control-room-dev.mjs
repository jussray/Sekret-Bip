#!/usr/bin/env node
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';

const port = Number(process.env.CONTROL_ROOM_LOCAL_PORT || 4317);
const token = randomBytes(32).toString('hex');
const commonEnv = {
  ...process.env,
  CONTROL_ROOM_LOCAL_PORT: String(port),
  CONTROL_ROOM_LOCAL_TOKEN: token,
  EXPO_PUBLIC_CONTROL_ROOM_LOCAL_AGENT_URL: `http://127.0.0.1:${port}`,
  EXPO_PUBLIC_CONTROL_ROOM_LOCAL_TOKEN: token,
  EXPO_PUBLIC_ENABLE_FOUNDER_PREVIEW: 'true',
};

const agent = spawn(process.execPath, ['scripts/control-room-server.mjs'], {
  env: commonEnv,
  stdio: 'inherit',
});

let expo = null;
const timer = setTimeout(() => {
  expo = spawn('npm', ['run', 'web', '--', '--localhost'], {
    env: commonEnv,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  expo.on('exit', code => {
    agent.kill('SIGTERM');
    process.exit(typeof code === 'number' ? code : 1);
  });
}, 500);

agent.on('exit', code => {
  clearTimeout(timer);
  expo?.kill('SIGTERM');
  if (!expo) process.exit(typeof code === 'number' ? code : 1);
});

function shutdown() {
  clearTimeout(timer);
  expo?.kill('SIGTERM');
  agent.kill('SIGTERM');
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

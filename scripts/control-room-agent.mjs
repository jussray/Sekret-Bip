#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const missions = new Map([
  ['continue-yesterday', { command: 'git', args: ['status', '--short', '--branch'], description: 'Inspect the current branch and worktree so the founder can resume from repository truth.' }],
  ['launch-bip', { command: 'npm', args: ['run', 'start', '--', '--localhost'], description: 'Launch Bip through Expo on localhost.' }],
  ['verify-local', { command: 'npm', args: ['run', 'verify:local'], description: 'Run the local Control Room verification suite.' }],
  ['verify-frontend', { command: 'node', args: ['scripts/control-room-verify-frontend.mjs'], description: 'Run Playwright browser smoke tests and retain evidence; fall back explicitly when browser proof is unavailable.' }],
  ['run-tests', { command: 'npm', args: ['test'], description: 'Run unit and regression tests.' }],
  ['build-web', { command: 'npm', args: ['run', 'build:web'], description: 'Build the Expo web artifact.' }],
  ['recover-system', { command: 'npm', args: ['run', 'audit:control-room'], description: 'Run Control Room recovery-oriented audits.' }],
]);

const missionId = process.argv[2] ?? 'help';

if (missionId === 'help' || missionId === '--help' || missionId === '-h') {
  console.log('Control Room Local Agent');
  console.log('Allowed missions only; arbitrary shell execution is intentionally unsupported.');
  for (const [id, mission] of missions) {
    console.log(`- ${id}: ${mission.description}`);
  }
  process.exit(0);
}

const mission = missions.get(missionId);
if (!mission) {
  console.error(`Unknown or disallowed mission: ${missionId}`);
  console.error(`Allowed missions: ${Array.from(missions.keys()).join(', ')}`);
  process.exit(64);
}

console.log(`Control Room Local Agent mission: ${missionId}`);
console.log(mission.description);
console.log(`Command: ${mission.command} ${mission.args.join(' ')}`);

const result = spawnSync(mission.command, mission.args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
  env: {
    ...process.env,
    CI: process.env.CI || 'false',
  },
});

process.exit(typeof result.status === 'number' ? result.status : 1);

import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const config = fs.readFileSync('src/config/controlRoomOs.ts', 'utf8');
const agent = fs.readFileSync('scripts/control-room-agent.mjs', 'utf8');
const localRunner = fs.readFileSync('scripts/control-room-local.js', 'utf8');
const verificationRegistry = JSON.parse(fs.readFileSync('src/config/controlRoomVerificationRegistry.json', 'utf8'));
const placement = fs.readFileSync('src/config/controlRoomPlacement.ts', 'utf8');
const workspace = fs.readFileSync('src/screens/DevControlRoomWorkspace.tsx', 'utf8');
const localServer = fs.readFileSync('scripts/control-room-server.mjs', 'utf8');
const localDev = fs.readFileSync('scripts/control-room-dev.mjs', 'utf8');
const localClient = fs.readFileSync('src/services/controlRoomLocalAgent.ts', 'utf8');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));


test('Control Room OS defines founder-first V1 missions inside the existing workspace', () => {
  for (const mission of ['launch-bip', 'continue-yesterday', 'verify-local', 'verify-frontend', 'ship-release', 'recover-system']) {
    assert.match(config, new RegExp(`id: '${mission}'`));
  }
  assert.match(workspace, /MISSION FIRST/);
  assert.match(workspace, /tab==='missions'/);
  assert.match(workspace, /tab==='operations'/);
});


test('local agent exposes only allowlisted missions and no arbitrary shell passthrough', () => {
  assert.match(agent, /Allowed missions only/);
  assert.match(agent, /new Map\(/);
  assert.match(agent, /control-room-verify-frontend\.mjs/);
  assert.match(agent, /'continue-yesterday'/);
  assert.match(agent, /git'.*status.*--short.*--branch/s);
  assert.doesNotMatch(agent, /process\.argv\.slice\(2\).*spawnSync/s);
  assert.match(agent, /Unknown or disallowed mission/);
});


test('connector and worker registries preserve fallbacks for provider failure', () => {
  for (const connector of ['github', 'supabase', 'expo', 'gmail', 'filesystem', 'playwright']) {
    assert.match(config, new RegExp(`id: '${connector}'`));
  }
  for (const worker of ['codex', 'chatgpt', 'claude', 'local-agent']) {
    assert.match(config, new RegExp(`id: '${worker}'`));
  }
  assert.match(config, /browser-test/);
  assert.match(config, /fallback:/);
  assert.match(config, /sekretbip@gmail.com/);
});


test('verification registry stays owned by Control Room config, not agent-local duplicates', () => {
  assert.equal(verificationRegistry.owner, 'Control Room');
  assert.ok(verificationRegistry.checks.length >= 10);
  for (const check of verificationRegistry.checks) {
    assert.equal(typeof check.id, 'string');
    assert.equal(typeof check.command, 'string');
    assert.ok(Array.isArray(check.args));
  }
  assert.match(localRunner, /controlRoomVerificationRegistry\.json/);
  assert.match(localRunner, /path\.resolve\(__dirname, '\.\.'\)/);
  assert.match(placement, /\.agents\/verification-registry\.json/);
});


test('Control Room UI executes only authenticated loopback allowlisted missions', () => {
  assert.equal(packageJson.scripts['control-room:dev'], 'node scripts/control-room-dev.mjs');
  assert.equal(packageJson.scripts['control-room:serve'], 'node scripts/control-room-server.mjs');
  assert.equal(packageJson.scripts['control-room:mission:continue-yesterday'], 'node scripts/control-room-agent.mjs continue-yesterday');
  assert.match(localDev, /randomBytes\(32\)/);
  assert.match(localDev, /EXPO_PUBLIC_CONTROL_ROOM_LOCAL_TOKEN/);
  assert.match(localServer, /const host = '127\.0\.0\.1'/);
  assert.match(localServer, /timingSafeEqual/);
  assert.match(localServer, /CONTROL_ROOM_LOCAL_TOKEN/);
  assert.match(localServer, /CONTROL_ROOM_TERMINATION_GRACE_MS/);
  assert.match(localServer, /new Set\(\['continue-yesterday', 'verify-local', 'verify-frontend', 'recover-system'\]\)/);
  assert.doesNotMatch(localServer, /allowedMissions.*ship-release/s);
  assert.doesNotMatch(localServer, /allowedMissions.*launch-bip/s);
  assert.match(localClient, /typeof __DEV__/);
  assert.match(localClient, /Authorization: `Bearer \$\{token\}`/);
  assert.match(workspace, /runLocalControlRoomMission/);
  assert.match(workspace, /Run \$\{mission\.title\}/);
  assert.match(workspace, /npm run control-room:dev/);
});


test('mission timeout terminates the process tree before the active slot is released', () => {
  assert.match(localServer, /detached: process\.platform !== 'win32'/);
  assert.match(localServer, /process\.kill\(-child\.pid, signal\)/);
  assert.match(localServer, /spawnSync\('taskkill', args/);
  assert.match(localServer, /terminateProcessTree\(child, 'SIGTERM'\)/);
  assert.match(localServer, /terminateProcessTree\(child, 'SIGKILL'\)/);
  assert.match(localServer, /const finishWhenTreeStops = \(\) => \{/);
  assert.match(localServer, /if \(!processTreeAlive\(processGroupId\)\) \{/);
  assert.match(localServer, /treePollTimer = setTimeout\(finishWhenTreeStops, 40\)/);
  assert.match(localServer, /if \(settled \|\| !processTreeAlive\(processGroupId\)\) return/);

  const timeoutStart = localServer.indexOf('timeoutTimer = setTimeout');
  const forceTimerStart = localServer.indexOf('forceKillTimer = setTimeout', timeoutStart);
  const errorHandlerStart = localServer.indexOf("child.on('error'", timeoutStart);
  assert.notEqual(timeoutStart, -1);
  assert.notEqual(forceTimerStart, -1);
  assert.notEqual(errorHandlerStart, -1);
  assert.doesNotMatch(localServer.slice(timeoutStart, forceTimerStart), /finish\(/);
  assert.match(localServer, /child\.on\('close',[\s\S]*else finishWhenTreeStops\(\)/);
  assert.match(localServer, /finish\('timed_out', \{ \.\.\.closePayload, error: 'mission_timeout', termination: 'process_tree' \}\)/);
  assert.match(localServer, /termination: 'process_tree'/);
  assert.match(localServer, /if \(activeChild\) terminateProcessTree\(activeChild, 'SIGKILL'\)/);
});


test('Playwright evidence output remains compatible with the room-specific suite', () => {
  const playwright = fs.readFileSync('playwright.config.ts', 'utf8');
  assert.match(playwright, /PLAYWRIGHT_ARTIFACT_DIR/);
  assert.match(playwright, /retain-on-failure/);
  assert.match(playwright, /screenshot: 'only-on-failure'/);
  assert.match(playwright, /video: 'retain-on-failure'/);
  assert.match(playwright, /'\*\*\/rooms\/\*\*'/);
  assert.match(playwright, /playwright\.room\.config\.ts/);
  const frontendVerifier = fs.readFileSync('scripts/control-room-verify-frontend.mjs', 'utf8');
  assert.match(frontendVerifier, /PLAYWRIGHT_ARTIFACT_DIR/);
  assert.match(frontendVerifier, /const stamp = generatedAt\.toISOString\(\)\.replace/);
  assert.match(frontendVerifier, /path\.join\(rootDir, 'reports', 'control-room', 'playwright', stamp\)/);
  assert.doesNotMatch(frontendVerifier, /--reporter=json/);
});

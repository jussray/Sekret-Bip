import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const workspace = fs.readFileSync(path.join(root, 'src/screens/DevControlRoomWorkspace.tsx'), 'utf8');

// refreshLocalAgent() clears localAgentError on a successful health probe. A mission
// failure that is caught in runMission must therefore be written AFTER that refresh,
// otherwise a loopback agent that is online but rejects the mission fails silently.
test('a rejected local mission keeps its error after the agent health refresh', () => {
  assert.match(
    workspace,
    /catch\(error\)\{\s*const message=error instanceof Error\?error\.message:'mission_failed';\s*await refreshLocalAgent\(\);\s*setLocalAgentError\(message\);/,
  );
});

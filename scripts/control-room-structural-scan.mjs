import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const controlRoomEntryPoint = 'app/(dev)/control-room.tsx';
const controlRoomScreenEntry = 'src/screens/DevControlRoomScreen.tsx';
const forbiddenControlRoomPaths = [
  'control-room',
  'apps/control-room',
  'founder-os',
  'operations-center',
  '.agents/verification-registry.json',
];
const requiredPaths = [
  'app/_layout.tsx',
  'src/services/index.ts',
  'src/services/runtimeAudit.ts',
  controlRoomEntryPoint,
  controlRoomScreenEntry,
  'src/screens/DevControlRoomWorkspace.tsx',
  'src/config/controlRoomOs.ts',
  'src/config/controlRoomVerificationRegistry.json',
  'src/services/controlRoomMissionEngine.ts',
  'src/types/controlRoomOs.ts',
  'scripts/control-room-agent.mjs',
  'src/services/controlRoomIssues.ts',
  'src/services/issueNormalizer.ts',
  'supabase/migrations',
];

const findings = requiredPaths
  .filter((relativePath) => !fs.existsSync(path.join(root, relativePath)))
  .map((relativePath) => ({
    source: 'structural_scan',
    severity: 'error',
    event_type: 'structural_required_path_missing',
    screen: relativePath,
    message: `Required path is missing: ${relativePath}`,
    metadata: { relativePath },
  }));

for (const relativePath of forbiddenControlRoomPaths) {
  if (fs.existsSync(path.join(root, relativePath))) {
    findings.push({
      source: 'structural_scan',
      severity: 'error',
      event_type: 'control_room_parallel_system_detected',
      screen: relativePath,
      message: `Parallel Control Room path is not allowed: ${relativePath}. Build inside ${controlRoomEntryPoint} and its approved support folders.`,
      metadata: {
        relativePath,
        rule: 'One Control Room. More capability. No parallel system.',
      },
    });
  }
}

const routeSource = fs.existsSync(path.join(root, controlRoomEntryPoint))
  ? fs.readFileSync(path.join(root, controlRoomEntryPoint), 'utf8')
  : '';
if (routeSource && !routeSource.includes('../../src/screens/DevControlRoomScreen')) {
  findings.push({
    source: 'structural_scan',
    severity: 'error',
    event_type: 'control_room_entrypoint_changed',
    screen: controlRoomEntryPoint,
    message: `${controlRoomEntryPoint} must remain the single founder Control Room entry and export ${controlRoomScreenEntry}.`,
    metadata: { controlRoomEntryPoint, controlRoomScreenEntry },
  });
}

const supabaseCandidates = ['src/utils/supabase.ts', 'utils/supabase'];
if (!supabaseCandidates.some((relativePath) => fs.existsSync(path.join(root, relativePath)))) {
  findings.push({
    source: 'structural_scan',
    severity: 'error',
    event_type: 'structural_supabase_module_missing',
    screen: 'supabase-client',
    message: 'No supported Supabase client module path was found.',
    metadata: { candidates: supabaseCandidates },
  });
}

const result = {
  scanner: 'control-room-structural-scan',
  scanned_at: new Date().toISOString(),
  ok: findings.length === 0,
  finding_count: findings.length,
  findings,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;

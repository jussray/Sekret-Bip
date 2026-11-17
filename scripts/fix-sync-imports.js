const fs = require('fs');

const parentFiles = [
  'screens/Bippin2Screen.tsx',
  'screens/BridgeScreen.tsx',
  'screens/ConnectionHubScreen.tsx',
  'screens/InsightsScreen.tsx',
  'screens/MessagesScreen.tsx',
  'screens/ParentBridgeScreen.tsx',
  'screens/SettingsScreen.tsx',
];

function readOptional(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

for (const file of parentFiles) {
  const current = readOptional(file);
  if (current === null) continue;
  const updated = current.replace(/from ['"]@\/utils\/sync['"]/g, "from '@/utils/parentBridgeCompat'");
  fs.writeFileSync(file, updated);
}

const pointsFile = 'screens/PointsScreen.tsx';
const pointsSource = readOptional(pointsFile);
if (pointsSource !== null) {
  const updated = pointsSource.replace(
    /import \{ snapshotPoints, fetchPointsHistory, syncTeenActivitySummary, type PointsHistoryEntry \} from ['"]@\/utils\/sync['"];?/,
    "import { snapshotPoints } from '@/utils/sync';\nimport { fetchPointsHistory, syncTeenActivitySummary, type PointsHistoryEntry } from '@/utils/pointsCompat';",
  );
  fs.writeFileSync(pointsFile, updated);
}

const appSettings = 'app/(main)/settings.tsx';
const settingsSource = readOptional(appSettings);
if (settingsSource !== null) {
  const updated = settingsSource.replace(/from ['"]@\/utils\/sync['"]/g, "from '@/utils/parentBridgeCompat'");
  fs.writeFileSync(appSettings, updated);
}

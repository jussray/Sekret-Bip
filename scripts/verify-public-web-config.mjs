import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};

  const parsed = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const separator = line.indexOf('=');
    if (separator <= 0) continue;

    const name = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    parsed[name] = value;
  }
  return parsed;
}

function collectTextFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTextFiles(fullPath));
      continue;
    }

    if (entry.isFile() && /\.(?:js|html|json|map|txt)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

export function verifyPublicWebConfig(outputDirectory = 'dist', options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const distPath = path.resolve(cwd, outputDirectory);
  const productionEnvPath = path.join(cwd, '.env.production');

  if (env.EXPO_NO_CLIENT_ENV_VARS === '1') {
    throw new Error(
      'EXPO_NO_CLIENT_ENV_VARS=1 disables Expo public-variable inlining and cannot be used for the production web build.',
    );
  }

  if (!fs.existsSync(distPath) || !fs.statSync(distPath).isDirectory()) {
    throw new Error(`Web export directory does not exist: ${distPath}`);
  }

  const productionEnv = parseEnvFile(productionEnvPath);
  const requiredNames = [
    'EXPO_PUBLIC_SUPABASE_URL',
    'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
    'EXPO_PUBLIC_BACKEND_URL',
  ];

  const expected = Object.fromEntries(
    requiredNames.map((name) => [name, env[name]?.trim() || productionEnv[name]?.trim() || '']),
  );

  const unresolved = requiredNames.filter((name) => {
    const value = expected[name];
    return !value || /your-|example|placeholder/i.test(value);
  });

  if (unresolved.length > 0) {
    throw new Error(`Production public configuration is unresolved: ${unresolved.join(', ')}`);
  }

  const textFiles = collectTextFiles(distPath);
  if (textFiles.length === 0) {
    throw new Error(`No text assets were found in the web export: ${distPath}`);
  }

  const missingFromBundle = requiredNames.filter((name) => {
    const expectedValue = expected[name];
    return !textFiles.some((filePath) => fs.readFileSync(filePath, 'utf8').includes(expectedValue));
  });

  if (missingFromBundle.length > 0) {
    throw new Error(
      `Expo web export did not inline required public configuration: ${missingFromBundle.join(', ')}. `
        + 'Use direct process.env.EXPO_PUBLIC_* dot-notation references in client source.',
    );
  }

  return {
    distPath,
    verifiedNames: requiredNames,
  };
}

const isDirectExecution = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectExecution) {
  const outputDirectory = process.argv[2] || 'dist';
  const result = verifyPublicWebConfig(outputDirectory);
  console.log(
    `Verified ${result.verifiedNames.length} required public configuration values in ${result.distPath}.`,
  );
}

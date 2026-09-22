import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MAX_TEXT_BYTES = 32 * 1024 * 1024;
const SERVER_SECRET_ENV_NAMES = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_API_KEY',
  'ANTHROPIC_API_KEY',
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_WORKERS_BUILDS_API_TOKEN',
  'RESEND_API_KEY',
  'FOUNDER_SESSION_ENCRYPTION_KEY',
];

const FORBIDDEN_PATH_PATTERNS = [
  /(^|\/)\.git(?:\/|$)/i,
  /(^|\/)\.env(?:\.[^/]*)?$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/i,
  /(^|\/)(?:credentials?|service[-_.]?account)(?:\.[^/]*)?$/i,
  /\.(?:pem|p12|pfx|key)$/i,
  /(^|\/)wrangler(?:\.[^/]*)?\.toml$/i,
];

const FORBIDDEN_TEXT_PATTERNS = [
  { label: 'Supabase service-role key marker', pattern: /\bSUPABASE_SERVICE_ROLE_KEY\b/ },
  { label: 'OpenAI secret key marker', pattern: /\bOPENAI_API_KEY\b/ },
  { label: 'Anthropic secret key marker', pattern: /\bANTHROPIC_API_KEY\b/ },
  { label: 'Cloudflare secret token marker', pattern: /\b(?:CLOUDFLARE_API_TOKEN|CLOUDFLARE_WORKERS_BUILDS_API_TOKEN)\b/ },
  { label: 'Resend secret key marker', pattern: /\bRESEND_API_KEY\b/ },
  { label: 'founder session encryption key marker', pattern: /\bFOUNDER_SESSION_ENCRYPTION_KEY\b/ },
  { label: 'private key material', pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { label: 'Supabase secret key material', pattern: /\bsb_secret_[A-Za-z0-9_-]{12,}/ },
  { label: 'OpenAI project key material', pattern: /\bsk-proj-[A-Za-z0-9_-]{12,}/ },
  { label: 'Anthropic key material', pattern: /\bsk-ant-[A-Za-z0-9_-]{12,}/ },
  { label: 'GitHub classic token material', pattern: /\bghp_[A-Za-z0-9]{20,}/ },
  { label: 'GitHub fine-grained token material', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'Cloudflare account token material', pattern: /\bcfat_[A-Za-z0-9_-]{12,}/ },
];

function normalizeRelative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function canonicalArtifactRoot(outputDirectory) {
  if (typeof outputDirectory !== 'string' || outputDirectory.length === 0 || outputDirectory.includes('\0')) {
    throw new Error('Built artifact directory must be a non-empty filesystem path.');
  }

  const resolved = path.resolve(outputDirectory);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new Error('Built artifact directory does not exist or is not a directory.');
  }
  return fs.realpathSync.native(resolved);
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (
    relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative)
  );
}

function walk(root) {
  const files = [];
  const violations = [];

  const visit = (directory) => {
    if (!isWithinRoot(root, directory)) {
      throw new Error('Built artifact traversal escaped the canonical root.');
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (!isWithinRoot(root, fullPath)) {
        throw new Error('Built artifact entry escaped the canonical root.');
      }

      const relative = normalizeRelative(root, fullPath);
      if (entry.isSymbolicLink()) {
        violations.push(`${relative}: symbolic links are forbidden in built artifacts`);
        continue;
      }
      if (entry.isDirectory()) visit(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  };

  visit(root);
  return { files, violations };
}

function looksLikeText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0);
}

function configuredSecrets(env) {
  return SERVER_SECRET_ENV_NAMES.flatMap((name) => {
    const value = typeof env[name] === 'string' ? env[name].trim() : '';
    return value.length >= 8 ? [{ name, value }] : [];
  });
}

export function auditBuiltArtifact(outputDirectory, options = {}) {
  const root = canonicalArtifactRoot(outputDirectory);
  const maxTextBytes = options.maxTextBytes ?? DEFAULT_MAX_TEXT_BYTES;
  const env = options.env ?? process.env;
  const secrets = configuredSecrets(env);
  const walked = walk(root);

  const violations = [...walked.violations];
  let scannedFiles = 0;
  let scannedBytes = 0;

  for (const file of walked.files) {
    if (!isWithinRoot(root, file)) {
      throw new Error('Built artifact file escaped the canonical root.');
    }

    const relative = normalizeRelative(root, file);
    scannedFiles += 1;
    const stat = fs.statSync(file);
    scannedBytes += stat.size;

    for (const pattern of FORBIDDEN_PATH_PATTERNS) {
      if (pattern.test(relative)) {
        violations.push(`${relative}: forbidden packaged path`);
        break;
      }
    }

    if (stat.size > maxTextBytes) continue;
    const buffer = fs.readFileSync(file);
    if (!looksLikeText(buffer)) continue;
    const text = buffer.toString('utf8');

    for (const { label, pattern } of FORBIDDEN_TEXT_PATTERNS) {
      if (pattern.test(text)) violations.push(`${relative}: ${label}`);
    }
    for (const { name, value } of secrets) {
      if (text.includes(value)) violations.push(`${relative}: configured ${name} value`);
    }
  }

  return { root, scannedFiles, scannedBytes, violations };
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const outputDirectory = process.argv[2] || 'dist';
  const result = auditBuiltArtifact(outputDirectory);
  if (result.violations.length > 0) {
    // Do not echo artifact-derived paths, content, configured secret names, or
    // values into CI logs. Detailed violations stay available to callers/tests.
    console.error('Built artifact leakage audit failed.');
    process.exitCode = 1;
  } else {
    console.log('Built artifact leakage audit passed.');
  }
}
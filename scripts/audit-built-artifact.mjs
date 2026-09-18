import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_MAX_TEXT_BYTES = 32 * 1024 * 1024;

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
  { label: 'OpenAI project key material', pattern: /\bsk-proj-[A-Za-z0-9_-]{12,}/ },
  { label: 'Anthropic key material', pattern: /\bsk-ant-[A-Za-z0-9_-]{12,}/ },
  { label: 'GitHub classic token material', pattern: /\bghp_[A-Za-z0-9]{20,}/ },
  { label: 'GitHub fine-grained token material', pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}/ },
  { label: 'Cloudflare account token material', pattern: /\bcfat_[A-Za-z0-9_-]{12,}/ },
];

function walk(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...walk(fullPath));
    else if (entry.isFile()) files.push(fullPath);
  }
  return files;
}

function normalizeRelative(root, file) {
  return path.relative(root, file).split(path.sep).join('/');
}

function looksLikeText(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0);
}

export function auditBuiltArtifact(outputDirectory, options = {}) {
  const root = path.resolve(outputDirectory);
  const maxTextBytes = options.maxTextBytes ?? DEFAULT_MAX_TEXT_BYTES;
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error(`Built artifact directory does not exist: ${root}`);
  }

  const violations = [];
  let scannedFiles = 0;
  let scannedBytes = 0;

  for (const file of walk(root)) {
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
  }

  return { root, scannedFiles, scannedBytes, violations };
}

const isDirectExecution = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectExecution) {
  const outputDirectory = process.argv[2] || 'dist';
  const result = auditBuiltArtifact(outputDirectory);
  if (result.violations.length > 0) {
    console.error('Built artifact leakage audit failed:');
    for (const violation of result.violations) console.error(`- ${violation}`);
    process.exitCode = 1;
  } else {
    console.log(`Built artifact leakage audit passed: ${result.scannedFiles} files, ${result.scannedBytes} bytes scanned.`);
  }
}

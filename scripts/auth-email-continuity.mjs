import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStaticSupabaseIdentityMarker, resolveSupabaseTarget } from './supabase-target-identity.mjs';

export const AUTH_EMAIL_PROOF_SCHEMA = 'juss/bip-email-access-proof-cookie@v1';
export const AUTH_EMAIL_SOURCE_FILES = Object.freeze([
  'app/(auth)/login.tsx',
  'app/(auth)/signup.tsx',
  'src/context/VerificationContext.tsx',
  'src/services/auth/postAuthBootstrap.ts',
  'scripts/configure-supabase-auth-email.mjs',
  'config/supabase-targets.json',
]);

const digest = (value) => createHash('sha256').update(value).digest('hex');
const stable = (value) => Array.isArray(value)
  ? '[' + value.map(stable).join(',') + ']'
  : value && typeof value === 'object'
    ? '{' + Object.keys(value).sort().map((key) => JSON.stringify(key) + ':' + stable(value[key])).join(',') + '}'
    : JSON.stringify(value);

function requireSourceTruth(contents) {
  const bootstrap = contents['src/services/auth/postAuthBootstrap.ts'].toString();
  const context = contents['src/context/VerificationContext.tsx'].toString();
  const config = contents['scripts/configure-supabase-auth-email.mjs'].toString();
  const login = contents['app/(auth)/login.tsx'].toString();
  const signup = contents['app/(auth)/signup.tsx'].toString();

  const remote = bootstrap.indexOf('await supabase.auth.getUser()');
  const confirmed = bootstrap.indexOf('if (!authoritativeAuth.user.email_confirmed_at)');
  const founder = bootstrap.indexOf('await getCurrentFounderProfileForRouting()');
  const welcome = bootstrap.indexOf('void ensureWelcomeEmail()');
  if (!(remote >= 0 && confirmed > remote && founder > confirmed && welcome > confirmed)) {
    throw new Error('AUTH_EMAIL_GATE_ORDER_INVALID');
  }
  if (!bootstrap.includes('authoritativeAuth.user.id !== user.id')) {
    throw new Error('AUTH_EMAIL_REMOTE_IDENTITY_BINDING_MISSING');
  }
  const sessionGate = /const permanentSession = Boolean\(session && !session\.user\.is_anonymous && session\.user\.email_confirmed_at\);/g;
  if ((context.match(sessionGate) || []).length !== 3) {
    throw new Error('AUTH_EMAIL_SESSION_RESTORATION_GATE_MISSING');
  }
  if (!config.includes('mailer_autoconfirm: false')) {
    throw new Error('AUTH_EMAIL_PROVIDER_DESIRED_CONFIRMATION_MISSING');
  }
  if (!login.includes('await fetchPostAuthBootstrap(preferredSide)') ||
      !signup.includes('await fetchPostAuthBootstrap(preferredSide)')) {
    throw new Error('AUTH_EMAIL_LOGIN_SIGNUP_BOOTSTRAP_GATE_MISSING');
  }
}

export async function buildAuthEmailProofCookie({
  repository = 'jussray/Sekret-Bip',
  root = process.cwd(),
  headSha,
} = {}) {
  if (repository !== 'jussray/Sekret-Bip') throw new Error('AUTH_EMAIL_REPOSITORY_MISMATCH');
  if (!/^[0-9a-f]{40}$/.test(headSha || '')) throw new Error('AUTH_EMAIL_EXACT_HEAD_REQUIRED');
  const target = await resolveSupabaseTarget({
    targetName: 'sekret-bip-production',
    registryPath: join(root, 'config/supabase-targets.json'),
    env: { GITHUB_REPOSITORY: repository },
  });
  const identity = buildStaticSupabaseIdentityMarker(target);
  const contents = {};
  const files = {};
  for (const file of AUTH_EMAIL_SOURCE_FILES) {
    const data = await readFile(join(root, file));
    contents[file] = data;
    files[file] = digest(data);
  }
  requireSourceTruth(contents);
  const fingerprint = digest(stable({
    repository, headSha, sourceFiles: files, targetFingerprint: identity.fingerprint,
  }));
  return {
    schema: AUTH_EMAIL_PROOF_SCHEMA,
    kind: 'non-secret-source-continuity-proof-cookie',
    browserCookie: false,
    authority: false,
    mergeAuthority: false,
    deployAuthority: false,
    repository,
    headSha,
    fingerprint: 'sha256:' + fingerprint,
    sourceFiles: files,
    supabaseTarget: identity,
    sourceChecksPassed: true,
    providerConfirmEmailSettingVerified: false,
    realUnverifiedSignupLoginVerified: false,
    independentReviewVerified: false,
    status: 'SOURCE_CHECKED_PROVIDER_AND_RUNTIME_UNVERIFIED',
    invalidatesOn: [
      'repository', 'headSha', 'sourceFiles', 'supabaseTarget',
      'providerAuthSettings', 'providerProjectIdentity', 'runtimeEvidence',
    ],
  };
}

async function main() {
  const headSha = process.env.EXPECTED_HEAD_SHA || '';
  const actual = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (!headSha || actual !== headSha) throw new Error('AUTH_EMAIL_HEAD_MOVED');
  const receipt = await buildAuthEmailProofCookie({
    repository: process.env.GITHUB_REPOSITORY || 'jussray/Sekret-Bip',
    headSha,
  });
  const output = 'gate-evidence/auth-email-proof-cookie.json';
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(receipt, null, 2) + '\n', 'utf8');
  process.stdout.write('AUTH_EMAIL_SOURCE_COOKIE_RECORDED ' + receipt.fingerprint + '\n');
}

if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  main().catch((error) => {
    process.stderr.write((error instanceof Error ? error.message : 'AUTH_EMAIL_COOKIE_FAILED') + '\n');
    process.exitCode = 1;
  });
}

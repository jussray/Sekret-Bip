import assert from 'node:assert/strict';
import { copyFile, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import {
  AUTH_EMAIL_PROOF_SCHEMA,
  AUTH_EMAIL_SOURCE_FILES,
  buildAuthEmailProofCookie,
} from '../scripts/auth-email-continuity.mjs';

const sha = 'a'.repeat(40);

test('proof cookie fingerprints the exact head, repo, source, and registered Supabase target', async () => {
  const one = await buildAuthEmailProofCookie({ headSha: sha });
  const again = await buildAuthEmailProofCookie({ headSha: sha });
  const successor = await buildAuthEmailProofCookie({ headSha: 'b'.repeat(40) });
  assert.equal(one.schema, AUTH_EMAIL_PROOF_SCHEMA);
  assert.equal(one.fingerprint, again.fingerprint);
  assert.notEqual(one.fingerprint, successor.fingerprint);
  assert.match(one.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(one.browserCookie, false);
  assert.equal(one.authority, false);
  assert.equal(one.mergeAuthority, false);
  assert.equal(one.deployAuthority, false);
  assert.equal(one.sourceChecksPassed, true);
  assert.equal(one.providerConfirmEmailSettingVerified, false);
  assert.equal(one.realUnverifiedSignupLoginVerified, false);
  assert.equal(one.supabaseTarget.providerVerified, false);
  assert.equal(one.supabaseTarget.identity.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(one.repository, 'jussray/Sekret-Bip');
  assert.equal(one.headSha, sha);
  assert.equal(Object.keys(one.sourceFiles).length, AUTH_EMAIL_SOURCE_FILES.length);
  assert.equal(Object.keys(one).some((key) => /secret|password|token|emailAddress/i.test(key)), false);
});

test('wrong repository or missing exact commit cannot mint a proof cookie', async () => {
  await assert.rejects(buildAuthEmailProofCookie({ headSha: '' }), /AUTH_EMAIL_EXACT_HEAD_REQUIRED/);
  await assert.rejects(buildAuthEmailProofCookie({ headSha: sha, repository: 'jussray/other' }), /AUTH_EMAIL_REPOSITORY_MISMATCH/);
});

test('changing confirmation policy invalidates the cookie instead of claiming success', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-auth-proof-'));
  try {
    for (const file of AUTH_EMAIL_SOURCE_FILES) {
      const destination = join(dir, file);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(process.cwd(), file), destination);
    }
    const configPath = join(dir, 'scripts/configure-supabase-auth-email.mjs');
    const before = await readFile(configPath, 'utf8');
    assert.ok(before.includes('mailer_autoconfirm: false'));
    await writeFile(configPath, before.replace('mailer_autoconfirm: false', 'mailer_autoconfirm: true'));
    await assert.rejects(
      buildAuthEmailProofCookie({ root: dir, headSha: sha }),
      /AUTH_EMAIL_PROVIDER_DESIRED_CONFIRMATION_MISSING/,
    );
    assert.ok(before.includes('mailer_allow_unverified_email_sign_ins: false'));
    await writeFile(configPath, before.replace('mailer_allow_unverified_email_sign_ins: false', 'mailer_allow_unverified_email_sign_ins: true'));
    await assert.rejects(
      buildAuthEmailProofCookie({ root: dir, headSha: sha }),
      /AUTH_EMAIL_PROVIDER_DESIRED_CONFIRMATION_MISSING/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('tampered signup or backend route authorization cannot mint a proof cookie', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'bip-auth-proof-'));
  try {
    for (const file of AUTH_EMAIL_SOURCE_FILES) {
      const destination = join(dir, file);
      await mkdir(dirname(destination), { recursive: true });
      await copyFile(join(process.cwd(), file), destination);
    }
    const path = join(dir, 'src/services/auth/postAuthBootstrap.ts');
    const before = await readFile(path, 'utf8');
    await writeFile(path, before.replace('if (!authoritativeAuth.user.email_confirmed_at)', 'if (false)'));
    await assert.rejects(
      buildAuthEmailProofCookie({ root: dir, headSha: sha }),
      /AUTH_EMAIL_GATE_ORDER_INVALID/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

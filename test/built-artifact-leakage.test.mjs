import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const {
  auditBuiltArtifact,
  buildSanitizedViolationReceipts,
} = await import('../scripts/audit-built-artifact.mjs');

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-bip-artifact-'));
  for (const [relative, contents] of Object.entries(files)) {
    const destination = path.join(root, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, contents);
  }
  return root;
}

function cleanup(root) {
  fs.rmSync(root, { recursive: true, force: true });
}

test('built artifact audit permits public release identity and EXPO_PUBLIC configuration', () => {
  const root = fixture({
    'index.html': '<html><body>Se’kret Bip</body></html>',
    'release.json': JSON.stringify({ commitSha: 'abc123', environment: 'preview' }),
    'assets/app.js': 'const url="https://api.sekretbip.net"; const key="EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY";',
  });
  try {
    assert.deepEqual(auditBuiltArtifact(root, { env: {} }).violations, []);
  } finally {
    cleanup(root);
  }
});

test('built artifact audit rejects credential and environment files', () => {
  const root = fixture({ '.env.production': 'EXPO_PUBLIC_BACKEND_URL=https://api.sekretbip.net', 'assets/app.js': 'safe' });
  try {
    assert.ok(auditBuiltArtifact(root, { env: {} }).violations.some((value) => value.includes('.env.production: forbidden packaged path')));
  } finally {
    cleanup(root);
  }
});

test('built artifact audit rejects server-only secret markers and key material', () => {
  const root = fixture({
    'assets/app.js': 'const leaked = process.env.SUPABASE_SERVICE_ROLE_KEY;',
    'assets/other.js': 'const token = "github_pat_123456789012345678901234"; const supabase="sb_secret_12345678901234567890";',
  });
  try {
    const violations = auditBuiltArtifact(root, { env: {} }).violations.join('\n');
    assert.match(violations, /Supabase service-role key marker/);
    assert.match(violations, /GitHub fine-grained token material/);
    assert.match(violations, /Supabase secret key material/);
  } finally {
    cleanup(root);
  }
});

test('built artifact audit detects configured secret values without exposing them in the receipt', () => {
  const secret = 'custom-build-secret-value-1234';
  const root = fixture({ 'assets/app.js': `const accidentallyInlined = "${secret}";` });
  try {
    const violations = auditBuiltArtifact(root, { env: { OPENAI_API_KEY: secret } }).violations;
    assert.deepEqual(violations, ['assets/app.js: configured OPENAI_API_KEY value']);
    assert.equal(violations.join('\n').includes(secret), false);
  } finally {
    cleanup(root);
  }
});

test('sanitized leakage receipts expose only safe path identity and coarse violation class', () => {
  const secret = 'custom-build-secret-value-5678';
  const root = fixture({
    '_expo/static/js/web/entry-a1b2c3.js': `const marker = "OPENAI_API_KEY"; const value = "${secret}";`,
    'assets/private-name.js': 'const marker = "SUPABASE_SERVICE_ROLE_KEY";',
  });
  try {
    const violations = auditBuiltArtifact(root, { env: { RESEND_API_KEY: secret } }).violations;
    const receipts = buildSanitizedViolationReceipts(violations);
    const serialized = JSON.stringify(receipts);

    assert.ok(receipts.some((receipt) => (
      receipt.path === '_expo/static/js/web/entry-a1b2c3.js'
      && receipt.category === 'server_secret_marker'
    )));
    assert.ok(receipts.some((receipt) => receipt.category === 'configured_secret_value'));
    assert.ok(receipts.some((receipt) => (
      receipt.path === '<redacted-path.js>'
      && receipt.category === 'server_secret_marker'
    )));
    assert.match(serialized, /"pathFingerprint":"[a-f0-9]{12}"/);
    assert.doesNotMatch(serialized, /OPENAI_API_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY/);
    assert.equal(serialized.includes(secret), false);
    assert.equal(serialized.includes('assets/private-name.js'), false);
  } finally {
    cleanup(root);
  }
});

test('built artifact audit rejects symlinks instead of following them outside the canonical root', () => {
  const root = fixture({ 'assets/app.js': 'safe' });
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sekret-bip-artifact-outside-'));
  try {
    const outsideFile = path.join(outside, 'secret.txt');
    fs.writeFileSync(outsideFile, 'SUPABASE_SERVICE_ROLE_KEY');
    fs.symlinkSync(outsideFile, path.join(root, 'assets', 'outside-link.txt'));

    const violations = auditBuiltArtifact(root, { env: {} }).violations;
    assert.deepEqual(violations, ['assets/outside-link.txt: symbolic links are forbidden in built artifacts']);
  } finally {
    cleanup(root);
    cleanup(outside);
  }
});

test('built artifact audit refuses NUL-containing root paths', () => {
  assert.throws(
    () => auditBuiltArtifact(`dist\0outside`, { env: {} }),
    /non-empty filesystem path/,
  );
});

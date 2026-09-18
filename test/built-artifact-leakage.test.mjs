import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

const { auditBuiltArtifact } = await import('../scripts/audit-built-artifact.mjs');

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
    assert.deepEqual(auditBuiltArtifact(root).violations, []);
  } finally {
    cleanup(root);
  }
});

test('built artifact audit rejects credential and environment files', () => {
  const root = fixture({ '.env.production': 'EXPO_PUBLIC_BACKEND_URL=https://api.sekretbip.net', 'assets/app.js': 'safe' });
  try {
    assert.ok(auditBuiltArtifact(root).violations.some((value) => value.includes('.env.production: forbidden packaged path')));
  } finally {
    cleanup(root);
  }
});

test('built artifact audit rejects server-only secret markers and key material', () => {
  const root = fixture({
    'assets/app.js': 'const leaked = process.env.SUPABASE_SERVICE_ROLE_KEY;',
    'assets/other.js': 'const token = "github_pat_123456789012345678901234";',
  });
  try {
    const violations = auditBuiltArtifact(root).violations.join('\n');
    assert.match(violations, /Supabase service-role key marker/);
    assert.match(violations, /GitHub fine-grained token material/);
  } finally {
    cleanup(root);
  }
});

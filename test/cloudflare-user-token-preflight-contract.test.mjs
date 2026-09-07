import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowUrl = new URL(
  '../.github/workflows/cloudflare-user-token-preflight.yml',
  import.meta.url,
);

const workflow = await readFile(workflowUrl, 'utf8');

test('Cloudflare credential preflight covers every read credential candidate without mutation', () => {
  assert.match(workflow, /CF_ACCESS_TOKEN: \$\{\{ secrets\.CLOUDFLARE_ACCESS_API_TOKEN \}\}/);
  assert.match(workflow, /CF_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /CF_BUILD_TOKEN: \$\{\{ secrets\.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN \}\}/);

  assert.match(workflow, /\/user\/tokens\/verify/);
  assert.match(workflow, /pages\/projects\/sekret-bip\/domains/);
  assert.match(workflow, /workers\/domains\?hostname=app\.sekretbip\.net/);
  assert.match(workflow, /workers\/routes/);
  assert.match(workflow, /account-access-apps/);
  assert.match(workflow, /zone-access-apps/);
  assert.match(workflow, /CLOUDFLARE_READ_AUTHORITY_INCOMPLETE/);
  assert.match(workflow, /CLOUDFLARE_READ_AUTHORITY_READY/);

  assert.doesNotMatch(workflow, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});

test('Cloudflare credential preflight reports shape and provider status without printing token contents', () => {
  assert.match(workflow, /likely-token-id/);
  assert.match(workflow, /transport=invalid/);
  assert.match(workflow, /TOKEN_VERIFY source=\$\{candidate\.source\}/);
  assert.match(workflow, /READ_PROBE source=\$\{candidate\.source\}/);
  assert.doesNotMatch(workflow, /console\.log\([^\n]*(?:candidate\.raw|normalized\.token|CF_ACCESS_TOKEN|CF_API_TOKEN|CF_BUILD_TOKEN)/);
});

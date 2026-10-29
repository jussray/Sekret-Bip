import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const workflowUrl = new URL(
  '../.github/workflows/cloudflare-user-token-preflight.yml',
  import.meta.url,
);

const workflow = await readFile(workflowUrl, 'utf8');

test('Cloudflare credential preflight covers every read credential candidate without mutation', () => {
  assert.match(workflow, /CF_APP_DOMAIN_TOKEN: \$\{\{ secrets\.CLOUDFLARE_APP_DOMAIN_API_TOKEN \}\}/);
  assert.match(workflow, /CF_ACCESS_TOKEN: \$\{\{ secrets\.CLOUDFLARE_ACCESS_API_TOKEN \}\}/);
  assert.match(workflow, /CF_API_TOKEN: \$\{\{ secrets\.CLOUDFLARE_API_TOKEN \}\}/);
  assert.match(workflow, /CF_BUILD_TOKEN: \$\{\{ secrets\.CLOUDFLARE_WORKERS_BUILDS_API_TOKEN \}\}/);

  assert.match(workflow, /source: 'CLOUDFLARE_APP_DOMAIN_API_TOKEN'/);
  assert.match(workflow, /verificationPathFor/);
  assert.match(workflow, /shape === 'account-prefixed'/);
  assert.match(workflow, /\/accounts\/\$\{accountId\}\/tokens\/verify/);
  assert.match(workflow, /shape === 'user-prefixed' \|\| shape === 'opaque-ascii'/);
  assert.match(workflow, /\/user\/tokens\/verify/);
  assert.match(workflow, /transport=unsupported shape=\$\{shape\}/);
  assert.match(workflow, /pages\/projects\/sekret-bip\/domains/);
  assert.match(workflow, /workers\/domains\?hostname=app\.sekretbip\.net/);
  assert.match(workflow, /workers\/routes/);
  assert.match(workflow, /account-access-apps/);
  assert.match(workflow, /zone-access-apps/);
  assert.match(workflow, /CLOUDFLARE_READ_AUTHORITY_INCOMPLETE/);
  assert.match(workflow, /CLOUDFLARE_READ_AUTHORITY_READY/);

  assert.doesNotMatch(workflow, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/i);
});

test('Cloudflare account-owned tokens use the account verification endpoint', () => {
  const accountBranch = workflow.match(
    /if \(shape === 'account-prefixed'\) return `([^`]+)`;/,
  );
  assert.ok(accountBranch, 'account-prefixed tokens must have an explicit verification route');
  assert.equal(accountBranch[1], '/accounts/${accountId}/tokens/verify');
});

test('Cloudflare credential preflight reports shape and provider status without printing token contents', () => {
  assert.match(workflow, /likely-token-id/);
  assert.match(workflow, /transport=invalid/);
  assert.match(workflow, /TOKEN_VERIFY source=\$\{candidate\.source\}/);
  assert.match(workflow, /READ_PROBE source=\$\{candidate\.source\}/);
  assert.doesNotMatch(workflow, /console\.log\([^\n]*(?:candidate\.raw|normalized\.token|CF_APP_DOMAIN_TOKEN|CF_ACCESS_TOKEN|CF_API_TOKEN|CF_BUILD_TOKEN)/);
});

test('credential preflight reads the same Production-scoped slots as the failing audit jobs', () => {
  assert.match(workflow, /jobs:[\s\S]*?verify-token:[\s\S]*?environment: Production/);
  assert.match(workflow, /CF_PAGES_READ_TOKEN: \$\{\{ secrets\.CLOUDFLARE_PAGES_READ_API_TOKEN \}\}/);
  assert.match(workflow, /CF_APP_BINDING_READ_TOKEN: \$\{\{ secrets\.CLOUDFLARE_APP_BINDING_READ_API_TOKEN \}\}/);
  assert.match(workflow, /source: 'CLOUDFLARE_PAGES_READ_API_TOKEN'/);
  assert.match(workflow, /source: 'CLOUDFLARE_APP_BINDING_READ_API_TOKEN'/);
  assert.match(workflow, /CLOUDFLARE_SCOPED_AUDIT_CREDENTIALS_MISSING/);
  assert.match(workflow, /CLOUDFLARE_SCOPED_AUDIT_CREDENTIALS_UNVERIFIED/);
  assert.doesNotMatch(workflow, /console\.log\([^\n]*(?:candidate\.raw|normalized\.token|CF_PAGES_READ_TOKEN|CF_APP_BINDING_READ_TOKEN)/);
});

test('PR contract checking cannot read Production credentials', () => {
  assert.match(workflow, /pull_request:[\s\S]*?paths:/);
  assert.match(workflow, /contract:[\s\S]*?if: github\.event_name == 'pull_request'/);
  assert.match(workflow, /verify-token:[\s\S]*?if: github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /node --test test\/cloudflare-user-token-preflight-contract\.test\.mjs/);
});

test('Cloudflare preflight does not forward provider message bodies into CI logs', () => {
  assert.doesNotMatch(workflow, /entry\?\.message/);
  assert.match(workflow, /entry\?\.code/);
  assert.doesNotMatch(workflow, /console\.(?:log|error)\([^\n]*(?:verify\.body|result\.body|response\.text)/);
});

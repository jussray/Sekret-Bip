import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const inventory = JSON.parse(read('supabase/functions/live-inventory.json'));
const retirement = JSON.parse(read('supabase/functions/retirement-manifest.json'));

const active = inventory.functions.filter((entry) => entry.disposition.startsWith('active'));
const retired = inventory.functions.filter((entry) => entry.disposition.includes('retire'));

test('live Supabase inventory is complete, unique, and source-controlled', () => {
  assert.equal(inventory.projectRef, 'tbsevonvegdnlyjgplmm');
  assert.equal(inventory.functions.length, 20);
  assert.equal(new Set(inventory.functions.map((entry) => entry.slug)).size, inventory.functions.length);

  for (const entry of inventory.functions) {
    const path = `supabase/functions/${entry.slug}/index.ts`;
    assert.equal(existsSync(new URL(path, root)), true, `${entry.slug} must be source-controlled`);
  }
});

test('Supabase config explicitly preserves every live verify_jwt policy', () => {
  const config = read('supabase/config.toml');
  for (const entry of inventory.functions) {
    const slug = entry.slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const section = new RegExp(`\\[functions\\.${slug}\\]\\s+verify_jwt\\s*=\\s*${entry.verifyJwt}`);
    assert.match(config, section, `${entry.slug} verify_jwt must match live inventory`);
  }
});

test('every consequential active Edge Function enters the shared limiter before route work', () => {
  assert.equal(active.length, 16);

  for (const entry of active) {
    const source = read(`supabase/functions/${entry.slug}/index.ts`);
    assert.match(source, /import \{ enforceEdgeFunctionRateLimit \} from ['"]\.\.\/_shared\/rate-limit\.ts['"];?/);

    const serveIndex = source.indexOf('Deno.serve');
    assert.notEqual(serveIndex, -1, `${entry.slug} must have a Deno.serve handler`);
    const handler = source.slice(serveIndex);
    const limiterIndex = handler.indexOf(`enforceEdgeFunctionRateLimit(`);
    assert.ok(limiterIndex >= 0 && limiterIndex < 320, `${entry.slug} must rate-limit at handler entry`);

    const bodyReadIndexes = [handler.indexOf('req.json()'), handler.indexOf('request.json()')]
      .filter((index) => index >= 0);
    if (bodyReadIndexes.length) {
      assert.ok(limiterIndex < Math.min(...bodyReadIndexes), `${entry.slug} must limit before parsing request bodies`);
    }
  }
});

test('retired production surfaces return 410 and are excluded from limiter requirements', () => {
  const manifest = new Map(retirement.functions.map((entry) => [entry.slug, entry]));
  assert.equal(retired.length, 4);

  for (const entry of retired) {
    const record = manifest.get(entry.slug);
    assert.ok(record, `${entry.slug} must be recorded in retirement manifest`);
    assert.equal(record.expectedStatus, 410);
    const source = read(`supabase/functions/${entry.slug}/index.ts`);
    assert.match(source, /status:\s*410/);
  }
});

test('shared limiter hashes caller identity and refuses spoofable forwarding headers', () => {
  const helper = read('supabase/functions/_shared/rate-limit.ts');
  assert.match(helper, /cf-connecting-ip/i);
  assert.doesNotMatch(helper, /x-forwarded-for/i);
  assert.match(helper, /crypto\.subtle\.digest\("SHA-256"/);
  assert.match(helper, /getSupabaseSecretKey\(\)/);
  assert.match(helper, /consume_edge_function_rate_limit/);
  assert.match(helper, /rate_limit_unavailable/);
  assert.match(helper, /rate_limit_exceeded/);
  assert.match(helper, /retry-after/);
});

test('database limiter is private, atomic, and service-role only', () => {
  const migration = read('supabase/migrations/20261003010000_edge_function_rate_limits.sql');
  assert.match(migration, /create table if not exists private\.edge_function_rate_limit_buckets/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all on table private\.edge_function_rate_limit_buckets from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, update, delete on table private\.edge_function_rate_limit_buckets to service_role/);
  assert.match(migration, /security definer/);
  assert.match(migration, /on conflict \(scope, key_hash\) do update/);
  assert.match(migration, /grant execute on function public\.consume_edge_function_rate_limit\(text, text, integer, integer\)\s+to service_role/);
  assert.doesNotMatch(migration, /raw_ip|authorization_token|jwt_token|api_key_value/i);
});

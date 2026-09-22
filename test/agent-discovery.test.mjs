import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const publicPaths = [
  '/$',
  '/auth.md$',
  '/what-is-sekret-bip/',
  '/how-it-works/',
  '/privacy-and-safety/',
  '/robots.txt$',
  '/sitemap.xml$',
  '/crawlers.json$',
];

function groupFor(robots, agent) {
  const escaped = agent.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = robots.match(new RegExp(`User-agent: ${escaped}\\n([\\s\\S]*?)(?=\\nUser-agent: |\\nSitemap: |$)`));
  assert.ok(match, `missing robots group for ${agent}`);
  return match[1];
}

test('robots.txt separates bounded discovery from training crawlers', () => {
  const robots = read('public/robots.txt');

  for (const agent of ['GPTBot', 'ClaudeBot', 'Google-Extended']) {
    const group = groupFor(robots, agent);
    assert.match(group, /^Disallow: \/$/m);
    assert.doesNotMatch(group, /^Allow:/m);
  }

  for (const agent of ['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User', 'Googlebot', '*']) {
    const group = groupFor(robots, agent);
    assert.match(group, /^Disallow: \/$/m);
    for (const allowed of publicPaths) assert.ok(group.includes(`Allow: ${allowed}`), `${agent} missing ${allowed}`);
  }

  assert.match(robots, /^Sitemap: https:\/\/sekretbip\.net\/sitemap\.xml$/m);
});

test('sitemap.xml contains exactly the canonical public discovery pages', () => {
  const sitemap = read('public/sitemap.xml');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(sitemap, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.deepEqual(locations, [
    'https://sekretbip.net/',
    'https://sekretbip.net/what-is-sekret-bip/',
    'https://sekretbip.net/how-it-works/',
    'https://sekretbip.net/privacy-and-safety/',
  ]);
});

test('auth.md does not advertise external-agent user delegation', () => {
  const auth = read('public/auth.md');

  assert.match(auth, /^# .*auth\.md$/m);
  assert.match(auth, /Agent audience/);
  assert.match(auth, /https:\/\/sekretbip\.net\/signup/);
  assert.match(auth, /Agent registration endpoint: none/);
  assert.match(auth, /Agent provisioning method: none/);
  assert.match(auth, /No public agent credential is currently issued/);
  assert.match(auth, /must not be shared with or delegated to external agents/);
  assert.match(auth, /does not currently publish OAuth Protected Resource Metadata or OAuth Authorization Server Metadata/);
  assert.doesNotMatch(auth, /supports agents acting on behalf of an existing/);
});

test('crawler policy is machine-readable and cannot grant authority', () => {
  const policy = JSON.parse(read('public/crawlers.json'));

  assert.equal(policy.schema, 'juss/ai-crawler-contract@v1');
  assert.equal(policy.policy.search_discovery, 'allow_bounded_public_paths');
  assert.equal(policy.policy.user_directed_retrieval, 'allow_bounded_public_paths');
  assert.equal(policy.policy.model_training, 'deny');
  assert.equal(policy.policy.bulk_dataset_collection, 'deny');
  assert.equal(policy.policy.write_or_action_authority, 'none');
  assert.equal(policy.bots.GPTBot, 'deny');
  assert.equal(policy.bots['OAI-SearchBot'], 'allow_bounded_public_paths');
  assert.equal(policy.attribution.requested, true);
  assert.ok(policy.private_scope.includes('authentication'));
});

test('Cloudflare headers deny training and agent input by default', () => {
  const headers = read('public/_headers');

  assert.match(headers, /^\/\*$/m);
  assert.match(headers, /^  Content-Signal: ai-train=no, search=yes, ai-input=no$/m);
  assert.match(headers, /^\/auth\.md$/m);
  assert.match(headers, /^  Content-Type: text\/markdown; charset=utf-8$/m);
  assert.match(headers, /^\/robots\.txt$/m);
  assert.match(headers, /^  Content-Type: text\/plain; charset=utf-8$/m);
  assert.match(headers, /^\/sitemap\.xml$/m);
  assert.match(headers, /^  Content-Type: application\/xml; charset=utf-8$/m);
  assert.match(headers, /^\/crawlers\.json$/m);
  assert.match(headers, /^  Content-Type: application\/json; charset=utf-8$/m);

  assert.match(headers, /^  X-Frame-Options: DENY$/m);
  assert.match(headers, /^  Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; object-src 'none'$/m);
});

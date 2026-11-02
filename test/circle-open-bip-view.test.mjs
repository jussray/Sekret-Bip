import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('circle relative time labels are deterministic and clamp clock skew', async () => {
  const { circleRelativeTime } = await import('../src/features/circle/relativeTime.ts');
  const now = new Date('2026-09-27T12:00:00Z');

  assert.equal(circleRelativeTime('2026-09-27T11:59:30Z', now), 'just now');
  assert.equal(circleRelativeTime('2026-09-27T12:05:00Z', now), 'just now');
  assert.equal(circleRelativeTime('2026-09-27T11:48:00Z', now), '12m ago');
  assert.equal(circleRelativeTime('2026-09-27T09:00:00Z', now), '3h ago');
  assert.equal(circleRelativeTime('2026-09-25T12:00:00Z', now), '2d ago');
  assert.equal(circleRelativeTime('not a date', now), '');
  assert.notEqual(circleRelativeTime('2026-09-01T12:00:00Z', now), '26d ago');
});

test('Open Bip view lenses are data-backed, never popularity-ranked', () => {
  const feed = read('app/(teen)/circle/feed-v2.tsx');

  assert.match(feed, /type FeedLens = 'newest' \| 'lighter' \| 'mine'/);
  assert.match(feed, /isHeavyCircleText\(item\.text\)/);
  assert.match(feed, /items\.filter\(item => item\.isOwnPost\)/);
  for (const banned of ['Trending', 'For You', 'Following', 'Popular']) {
    assert.equal(feed.includes(banned), false, `feed must not offer a ${banned} lens`);
  }
  // Counts render only inside the owner-gated private support card.
  const countReads = feed.split('item.reactions[').length - 1;
  assert.equal(countReads, 1);
  assert.ok(feed.indexOf('item.reactions[') > feed.indexOf('item.isOwnPost ? ('));
  assert.match(feed, /Anonymous by default/);
});

test('Circle tab keeps the canonical three destinations in Bip language', () => {
  const route = read('app/(teen)/circle/index.tsx');
  for (const label of ['Open Bip', 'Crew Bip', 'Messages']) {
    assert.equal(route.includes(label), true, `missing ${label}`);
  }
});

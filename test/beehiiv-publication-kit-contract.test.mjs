import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const kit = read('content', 'beehiiv', 'publication-kit.md');
const harvest = read('content', 'beehiiv', 'trial-harvest-pack.md');
const receipt = read('content', 'beehiiv', 'provider-run-receipt.md');
const pluginBoundary = read('content', 'beehiiv', 'plugin-boundary.md');

const escape = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

test('publication kit preserves the durable public assets', () => {
  for (const required of [
    '## 1. Website-builder prompt',
    '## 2. Reusable newsletter skeleton',
    '## 3. Welcome email',
    '## 4. Issue #001',
    '## 5. Podcast conversion for Issue #001',
    '## 6. Trial harvest checklist',
    '## 7. Failure rule',
  ]) {
    assert.match(kit, new RegExp(escape(required)));
  }
});

test('beehiiv remains an optional plugin rather than system authority', () => {
  assert.match(pluginBoundary, /Beehiiv is an optional edge plugin/i);
  assert.match(pluginBoundary, /Chief AI, PromptOS, and Sol/);
  assert.match(pluginBoundary, /not a main system, operating system, reasoning authority, governance authority, continuity authority, identity authority, or product\/account authority/i);
  assert.match(pluginBoundary, /provider results return as evidence rather than authority/i);
  assert.match(pluginBoundary, /Beehiiv can be removed without redesigning the main systems/i);
});

test('every external provider mutation is gated by a founder approval receipt', () => {
  assert.match(harvest, /Every external action needs a founder-approval receipt immediately before execution/i);
  for (const action of [
    'enabling a welcome email',
    'publishing or sending Issue #001',
    'publishing a podcast episode',
    'publishing a survey',
    'activating any automation',
    'submitting a support ticket',
    'changing billing or plan state',
  ]) {
    assert.match(harvest, new RegExp(escape(action), 'i'));
  }
  assert.match(receipt, /## Founder approval receipts/);
  assert.match(receipt, /A successful preview, login, CI run, or old approval does not authorize a new external action/i);
});

test('trial cutoff uses provider truth with a conservative fallback', () => {
  assert.match(harvest, /dashboard is authoritative for the exact trial cutoff and timezone/i);
  assert.match(harvest, /2026-09-14 12:00 America\/New_York/);
  assert.match(harvest, /at least 12 hours before the cutoff/i);
  assert.match(receipt, /Conservative fallback final-sweep deadline: `2026-09-14 12:00 America\/New_York`/);
});

test('billing fallback names the exact official source and keeps dashboard authority', () => {
  const sourceUrl = 'https://www.beehiiv.com/support/article/22101553752471';
  assert.match(harvest, new RegExp(escape(sourceUrl)));
  assert.match(receipt, new RegExp(escape(sourceUrl)));
  assert.match(receipt, /Account-level Billing\/Plan state remains authoritative/i);
});

test('provider receipt binds execution to an immutable source revision', () => {
  assert.match(receipt, /SOURCE_COMMIT_SHA=PENDING/);
  assert.match(receipt, /A branch name is not an immutable receipt/i);
  assert.match(receipt, /Source commit: `PENDING`/);
});

test('authentication failures keep separate receipts', () => {
  assert.match(receipt, /### Authentication attempt A/);
  assert.match(receipt, /71158dd4-8fa2-49c5-a626-29768e7f3665/);
  assert.match(receipt, /### Authentication attempt B/);
  assert.match(receipt, /9ecdcc63-099a-464a-80d1-166315bb30ea/);
  assert.match(receipt, /Neither receipt may stand in for the other/i);
});

test('durable exports happen before optional premium experiments and use unique names', () => {
  const firstExport = harvest.indexOf('#### Gate 3 — Take the first ownership export immediately');
  const podcast = harvest.indexOf('#### Gate 4 — Podcast experiment');
  const survey = harvest.indexOf('#### Gate 5 — Optional low-sensitivity preference survey');
  const automation = harvest.indexOf('#### Gate 6 — Optional automation experiment');

  assert.ok(firstExport >= 0);
  assert.ok(podcast > firstExport);
  assert.ok(survey > firstExport);
  assert.ok(automation > firstExport);

  assert.match(harvest, /beehiiv-sekret-bip-first-subscribers-YYYYMMDD-HHMMZ\.csv/);
  assert.match(harvest, /beehiiv-sekret-bip-final-subscribers-YYYYMMDD-HHMMZ\.csv/);
  assert.match(receipt, /beehiiv-sekret-bip-first-posts-YYYYMMDD-HHMMZ\.csv/);
  assert.match(receipt, /beehiiv-sekret-bip-final-posts-YYYYMMDD-HHMMZ\.csv/);
});

test('subscriber export handling has explicit storage retention deletion and purge rules', () => {
  for (const required of [
    'restricted encrypted private storage',
    'delete the first snapshot after the final snapshot is verified',
    'delete the final snapshot within 30 days',
    'subscriber deletion request',
    'record the purge date and owner',
  ]) {
    assert.match(harvest, new RegExp(escape(required), 'i'));
  }
  assert.match(receipt, /### Retention and purge/);
});

test('teen-inclusive audience is not turned into an age-linked engagement profile', () => {
  assert.doesNotMatch(harvest, /reader_role/);
  assert.doesNotMatch(receipt, /reader_role/);
  assert.match(harvest, /Do not collect an age or “teen” identity field/i);
  assert.match(harvest, /reading_context/);
  assert.match(harvest, /do not email the issue to that audience/i);
  assert.match(harvest, /Do not create or retain recipient-level open\/click histories for teen-identified subscribers/i);
});

test('survey mappings require synthetic end-to-end readback before publication', () => {
  assert.match(harvest, /submit one synthetic founder-controlled test response/i);
  assert.match(harvest, /verify all three values on the test subscriber profile/i);
  assert.match(harvest, /verify the same values in a Full Subscribers export/i);
  for (const field of ['reading_context', 'primary_interest', 'preferred_cadence']) {
    assert.match(receipt, new RegExp(escape(field)));
  }
});

test('podcast durability remains unknown until readback or recovery evidence exists', () => {
  assert.match(harvest, /Treat post-trial survival as `UNKNOWN`/);
  assert.match(harvest, /download\/export for the generated audio/i);
  assert.match(receipt, /Podcast post-trial durability \| UNKNOWN/);
  assert.match(receipt, /Recovery audio filename\/private label/);
});

test('optional automation has link destinations kill switch and a non-engagement comparison', () => {
  assert.match(harvest, /Default state: `NOT_APPLICABLE`/);
  assert.match(harvest, /verify the provider pause\/disable control before activation/i);
  assert.match(harvest, /verify how queued messages are stopped or cancelled/i);
  assert.match(harvest, /\[ISSUE_001_URL\]/);
  assert.match(harvest, /\[SURVEY_URL\]/);
  assert.match(harvest, /manual minutes required to perform the same bounded sequence/i);
  assert.match(harvest, /same synthetic workflow repeated at least three times/i);
  assert.match(harvest, /No baseline means no causal claim/i);
});

test('support ticket has one canonical body', () => {
  assert.match(harvest, /#### Gate 7 — Trial support ticket/);
  assert.match(harvest, /Hello beehiiv support/);
  assert.match(receipt, /Canonical support message: `content\/beehiiv\/trial-harvest-pack\.md`/);
  assert.doesNotMatch(receipt, /Hello beehiiv support/);
});

test('publishable copy does not invite sensitive disclosure or make clinical promises', () => {
  const forbidden = [
    /reply with your secret/i,
    /send us your private story/i,
    /tell us your private details/i,
    /guaranteed outcome/i,
    /we diagnose/i,
    /we treat/i,
    /crisis response service/i,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(kit, pattern);
  }
});

test('internal beehiiv artifacts contain no obvious provider credentials', () => {
  const combined = `${kit}\n${harvest}\n${receipt}\n${pluginBoundary}`;
  const forbidden = [
    /\bsk-[A-Za-z0-9_-]{12,}\b/,
    /BEEHIIV_API_KEY\s*=/i,
    /api[_-]?key\s*:\s*[A-Za-z0-9_-]{16,}/i,
    /publication[_-]?secret\s*:/i,
  ];

  for (const pattern of forbidden) {
    assert.doesNotMatch(combined, pattern);
  }
});

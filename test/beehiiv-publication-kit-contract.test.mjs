import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const kitPath = path.join(process.cwd(), 'content', 'beehiiv', 'publication-kit.md');
const harvestPath = path.join(process.cwd(), 'content', 'beehiiv', 'trial-harvest-pack.md');
const kit = fs.readFileSync(kitPath, 'utf8');
const harvest = fs.readFileSync(harvestPath, 'utf8');

test('beehiiv publication kit preserves the durable trial-harvest assets', () => {
  for (const required of [
    '## 1. Website-builder prompt',
    '## 2. Reusable newsletter skeleton',
    '## 3. Welcome email',
    '## 4. Issue #001',
    '## 5. Podcast conversion for Issue #001',
    '## 6. Trial harvest checklist',
    '## 7. Failure rule',
  ]) {
    assert.match(kit, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('beehiiv harvest pack preserves owned audience, automation, export, and evidence value', () => {
  for (const required of [
    '## Priority order',
    '## Audience asset — one-screen preference survey',
    '## Automation asset — Welcome → useful idea → preference',
    '## Export protocol',
    '## Evidence ledger',
    '## Downgrade test',
  ]) {
    assert.match(harvest, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(harvest, /Export All Subscribers \(Full\)/);
  assert.match(harvest, /Export All Posts/);
  assert.match(harvest, /reader_role/);
  assert.match(harvest, /primary_interest/);
  assert.match(harvest, /preferred_cadence/);
  assert.match(harvest, /AI-created podcast episode/i);
  assert.match(harvest, /aggregate evidence only/i);
});

test('beehiiv remains a distribution layer rather than product or private-data authority', () => {
  assert.match(kit, /Distribution layer: beehiiv/);
  assert.match(kit, /Product\/account authority: Se’kret Bip app, not beehiiv/);
  assert.match(kit, /newsletter subscription and a Se’kret Bip product account are separate relationships/i);
  assert.match(kit, /do not collect journals, voice notes, private family situations, safety events/i);
  assert.match(harvest, /Do not ask for journals, private family situations, mental-health details, safety events, or free-form secrets/i);
  assert.match(harvest, /Never commit subscriber CSVs, email addresses, survey response rows, or other personal data to GitHub/i);
});

test('public publication copy does not invite sensitive disclosure or make clinical promises', () => {
  const combined = `${kit}\n${harvest}`;
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
    assert.doesNotMatch(combined, pattern);
  }
});

test('beehiiv content contains no obvious provider credential material', () => {
  const combined = `${kit}\n${harvest}`;
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

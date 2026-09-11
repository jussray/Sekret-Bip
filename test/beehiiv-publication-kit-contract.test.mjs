import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const kitPath = path.join(process.cwd(), 'content', 'beehiiv', 'publication-kit.md');
const harvestPath = path.join(process.cwd(), 'content', 'beehiiv', 'trial-harvest-pack.md');
const receiptPath = path.join(process.cwd(), 'content', 'beehiiv', 'provider-run-receipt.md');
const pluginBoundaryPath = path.join(process.cwd(), 'content', 'beehiiv', 'plugin-boundary.md');
const kit = fs.readFileSync(kitPath, 'utf8');
const harvest = fs.readFileSync(harvestPath, 'utf8');
const receipt = fs.readFileSync(receiptPath, 'utf8');
const pluginBoundary = fs.readFileSync(pluginBoundaryPath, 'utf8');

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

test('critical welcome path survives Launch and avoids duplicate sends', () => {
  assert.match(kit, /built-in welcome email/i);
  assert.match(kit, /free Launch plan/i);
  assert.match(kit, /paid multi-step welcome automation as an optional experiment/i);
  assert.match(kit, /do not enable both the built-in welcome email and a Signed Up welcome automation/i);
  assert.doesNotMatch(kit, /welcome email or welcome automation/i);
});

test('beehiiv harvest pack preserves owned audience, automation, export, and evidence value', () => {
  for (const required of [
    '## Priority order',
    '## Audience asset — one-screen preference survey',
    '## Automation asset — Welcome → useful idea → preference',
    '## Export protocol',
    '## Evidence ledger',
    '## Provider run card',
    '## Downgrade test',
    '## Pay-or-cancel decision rule',
  ]) {
    assert.match(harvest, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(harvest, /Export All Subscribers \(Full\)/);
  assert.match(harvest, /Export All Posts/);
  assert.match(harvest, /reader_role/);
  assert.match(harvest, /primary_interest/);
  assert.match(harvest, /preferred_cadence/);
  assert.match(harvest, /AI-created podcast episode/i);
  assert.match(harvest, /existing published AI-created episodes and the RSS feed remain active after trial/i);
  assert.match(harvest, /Launch plan can still host one recorded podcast episode per month/i);
  assert.match(harvest, /aggregate evidence only/i);
  assert.match(harvest, /Help → submit a support ticket/);
  assert.match(harvest, /Do not pay for beehiiv because the trial is ending/i);
});

test('beehiiv provider run receipt makes provider execution auditable', () => {
  for (const required of [
    '## Trial clock',
    '## Live run order',
    '## Public asset receipts',
    '## Export receipts',
    '## Trial support ticket draft',
    '## Post-downgrade browser proof',
    '## Completion rule',
  ]) {
    assert.match(receipt, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  assert.match(receipt, /Issue #001 published/);
  assert.match(receipt, /The First Sentence/);
  assert.match(receipt, /reader_role/);
  assert.match(receipt, /primary_interest/);
  assert.match(receipt, /preferred_cadence/);
  assert.match(receipt, /First Full Subscribers export downloaded/);
  assert.match(receipt, /Final Full Subscribers export downloaded/);
  assert.match(receipt, /Post-downgrade public path verified/);
  assert.match(receipt, /Allowed state values: `OPEN`, `VERIFIED`, `BLOCKED`, `NOT_APPLICABLE`/);
});

test('beehiiv is an optional plugin and cannot become system authority', () => {
  assert.match(pluginBoundary, /Beehiiv is an optional edge plugin/i);
  assert.match(pluginBoundary, /Chief AI, PromptOS, and Sol/);
  assert.match(pluginBoundary, /not a main system, operating system, reasoning authority, governance authority, continuity authority, identity authority, or product\/account authority/i);
  assert.match(pluginBoundary, /Beehiiv is downstream of intent and authority/i);
  assert.match(pluginBoundary, /provider results return as evidence rather than authority/i);
  assert.match(pluginBoundary, /Beehiiv can be removed without redesigning the main systems/i);
  assert.match(pluginBoundary, /replace only the delivery mechanism/i);
});

test('beehiiv remains a distribution layer rather than product or private-data authority', () => {
  assert.match(kit, /Distribution layer: beehiiv/);
  assert.match(kit, /Product\/account authority: Se’kret Bip app, not beehiiv/);
  assert.match(kit, /newsletter subscription and a Se’kret Bip product account are separate relationships/i);
  assert.match(kit, /do not collect journals, voice notes, private family situations, safety events/i);
  assert.match(harvest, /Do not ask for journals, private family situations, mental-health details, safety events, or free-form secrets/i);
  assert.match(harvest, /Never commit subscriber CSVs, email addresses, survey response rows, or other personal data to GitHub/i);
  assert.match(harvest, /Do not include subscriber data, secrets, private family information, or product-account data in the ticket/i);
  assert.match(receipt, /Never paste subscriber rows, email addresses, response-level survey data, or export contents here/i);
});

test('public publication copy does not invite sensitive disclosure or make clinical promises', () => {
  const combined = `${kit}\n${harvest}\n${receipt}\n${pluginBoundary}`;
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

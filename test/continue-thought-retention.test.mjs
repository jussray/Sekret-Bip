import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');

test('Continue the Thought stores bookmark metadata only', () => {
  const continuation = read('src/features/retention/savedContinuation.ts');

  assert.match(continuation, /entryId: string/);
  assert.match(continuation, /companionKey: string/);
  assert.match(continuation, /savedAt: string/);
  assert.match(continuation, /sekretbip_saved_continuation_v1/);
  assert.doesNotMatch(
    continuation,
    /journalText|entryText|messageContent|transcript|summary|snippet|sekretReply/,
  );
});

test('Pages keeps save-for-later beside the thought and Room resumes the exact entry', () => {
  const detail = read('app/(teen)/pages/[id].tsx');
  const overlay = read('components/retention/BipReturnOverlay.tsx');

  assert.match(detail, /Save this page so you can continue it later/);
  assert.match(detail, /Room only remembers which page to reopen/);
  assert.match(detail, /saveContinuation\(\{/);
  assert.ok(
    detail.indexOf('Save this page so you can continue it later') < detail.indexOf('{entry.sekretReply ? ('),
    'save-for-later should appear before companion reply and secondary reflection cards',
  );
  assert.match(detail, /saveLaterButton:[\s\S]*minHeight: 48/);

  assert.match(overlay, /continue your thought/);
  assert.match(overlay, /Continue where you left off/);
  assert.match(overlay, /Room remembers which page to reopen\. Your words stay on that page\./);
  assert.match(overlay, /const entryId = continuation\.entryId/);
  assert.match(overlay, /archiveSavedContinuation\(\)[\s\S]*router\.push\(`\/\(teen\)\/pages\/\$\{entryId\}`/);
  assert.match(overlay, /Remove saved page from Room/);
  assert.match(overlay, /remove from Room/);
  assert.match(overlay, /floatingButton:[\s\S]*minHeight: 44/);
  assert.match(overlay, /continueButton:[\s\S]*minHeight: 44/);
  assert.match(overlay, /archiveButton:[\s\S]*minHeight: 44/);
});

test('teen return UX does not punish time away', () => {
  const ledger = read('src/features/activity/ledger.ts');
  const overlay = read('components/retention/BipReturnOverlay.tsx');

  assert.doesNotMatch(ledger, /applyBipEnergyFade/);
  assert.doesNotMatch(overlay, /applyBipEnergyFade|loadUnseenBipEnergyAdjustment|markBipEnergyAdjustmentSeen/);
  assert.doesNotMatch(overlay, /Bip Energy faded|streak resets|days away/);
  assert.match(ledger, /Teen return UX does not subtract points for time away/);
  assert.match(overlay, /Your check-ins stay part of your story, even after time away/);
});

test('saved continuation is private-account data and clears on sign-out', () => {
  const storage = read('src/utils/storage.ts');

  assert.match(storage, /savedContinuation: 'sekretbip_saved_continuation_v1'/);
  assert.match(storage, /STORAGE_KEYS\.savedContinuation/);
  assert.match(storage, /AsyncStorage\.multiRemove\(\[\.\.\.PRIVATE_ACCOUNT_KEYS\]\)/);
});

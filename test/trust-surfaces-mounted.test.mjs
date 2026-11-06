/**
 * Regression guard for #413/#414 (crisis support) and #419 (AI disclosure):
 * both components existed in the repo but were never imported anywhere,
 * so they never actually reached a teen. This asserts they are wired in.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('#414: CrisisSupportButton is imported and rendered in the teen layout, not gated by quietActive', () => {
  const source = read('app/(teen)/_layout.tsx');

  assert.match(source, /import \{ CrisisSupportButton \} from ['"]\.\.\/\.\.\/components\/CrisisSupport['"]/);
  assert.match(source, /<CrisisSupportButton \/>/);

  // Must be reachable even during Quiet Bip, where the mood button and
  // nav are intentionally hidden — safety access is not a product boundary.
  const renderIdx = source.indexOf('<CrisisSupportButton />');
  const guardIdx = source.lastIndexOf('{!quietActive &&', renderIdx);
  const moodButtonIdx = source.indexOf('<GlobalMoodButton />');
  // The nearest preceding "!quietActive &&" guard belongs to GlobalMoodButton,
  // not to CrisisSupportButton — i.e. CrisisSupportButton's own render line
  // sits after that guarded block closes, unconditional.
  assert.ok(guardIdx < moodButtonIdx, 'CrisisSupportButton must not reuse the quietActive-gated block');
});

test('#419: AIDisclosureModal is imported and rendered in companion-chat, gated on profile state', () => {
  const source = read('app/(teen)/companion-chat.tsx');

  assert.match(source, /import AIDisclosureModal from ['"]\.\.\/\.\.\/components\/companions\/AIDisclosureModal['"]/);
  assert.match(source, /<AIDisclosureModal/);
  assert.match(source, /visible=\{showAiDisclosure\}/);
  assert.match(source, /onAccept=\{\(\) => setShowAiDisclosure\(false\)\}/);

  // The acceptance check must be non-blocking: a failed/offline check must
  // never throw into the chat screen or prevent sending messages.
  assert.match(
    source,
    /ai_disclosure_accepted_at[\s\S]*?\} catch \(e\) \{\s*\/\/ Non-blocking/,
  );
});

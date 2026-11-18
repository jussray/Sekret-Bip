import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('..', import.meta.url));
const registry = fs.readFileSync(path.join(root, 'constants/stickerImages.ts'), 'utf8');
const metadata = fs.readFileSync(path.join(root, 'constants/characterStickers.ts'), 'utf8');

test('all 53 runtime stickers match their file extensions and metadata', () => {
  const entries = [...registry.matchAll(/'([^']+)':\s*require\(['"](\.\.\/assets\/images\/stickers\/[^'"]+)['"]\)/g)];
  assert.equal(entries.length, 53, 'sticker images must remain complete');
  assert.equal(new Set(entries.map((e) => e[1])).size, 53, 'sticker IDs must remain unique');
  for (const [, id, relativePath] of entries) {
    const absolute = path.resolve(root, 'constants', relativePath);
    assert.ok(fs.existsSync(absolute), id + ' runtime asset missing');
    const bytes = fs.readFileSync(absolute);
    const png = bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
    const jpeg = bytes.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
    const ext = path.extname(absolute).toLowerCase();
    assert.ok((ext === '.png' && png) || (ext === '.jpg' && jpeg),
      id + ' actual image bytes disagree with file extension');
    assert.ok(metadata.includes("id: '" + id + "'"), id + ' metadata missing');
    assert.ok(metadata.includes("assetPath: '" + relativePath.slice(3) + "'"),
      id + ' metadata path differs from the runtime file');
  }
});

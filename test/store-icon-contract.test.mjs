import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = process.cwd();
const generatedDir = path.join(root, 'assets', 'generated');

function readPngMetadata(file) {
  const buffer = fs.readFileSync(file);
  assert.ok(buffer.length > 512, `${path.basename(file)} should be a real PNG, not a placeholder`);
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR');
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bitDepth: buffer[24],
    colorType: buffer[25],
  };
}

test('canonical store icon generator emits all iOS and Android assets', () => {
  const result = spawnSync(process.execPath, ['scripts/generate-store-icons.mjs', '--quiet'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);

  const expected = new Map([
    ['teen-icon.png', 1024],
    ['parent-icon.png', 1024],
    ['teen-adaptive-foreground.png', 1024],
    ['parent-adaptive-foreground.png', 1024],
    ['teen-play-store-icon.png', 512],
    ['parent-play-store-icon.png', 512],
  ]);

  for (const [filename, dimension] of expected) {
    const file = path.join(generatedDir, filename);
    assert.ok(fs.existsSync(file), `${filename} should exist`);
    const metadata = readPngMetadata(file);
    assert.equal(metadata.width, dimension, `${filename} width`);
    assert.equal(metadata.height, dimension, `${filename} height`);
    assert.equal(metadata.bitDepth, 8, `${filename} bit depth`);
    assert.equal(metadata.colorType, 6, `${filename} should be RGBA PNG`);
  }
});

test('Expo config uses the canonical assets for both platform families', () => {
  const config = fs.readFileSync(path.join(root, 'app.config.ts'), 'utf8');

  assert.match(config, /icon,/);
  assert.match(config, /foregroundImage: adaptiveForeground/);
  assert.match(config, /com\.sekretbip\.app/);
  assert.match(config, /com\.sekretbip\.parent/);
  assert.match(config, /teen-play-store-icon\.png/);
  assert.match(config, /parent-play-store-icon\.png/);
  assert.match(config, /ITSAppUsesNonExemptEncryption: false/);
});

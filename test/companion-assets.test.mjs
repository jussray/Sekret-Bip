import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const readSrc = (rel) => fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');

const types = readSrc('src/types/companions.ts');
const manifest = readSrc('src/constants/companionManifest.ts');
const images = readSrc('src/constants/companionImages.ts');

const COMPANIONS = ['raylene', 'rylane', 'night'];

const posesFor = (companion) => {
  const match = types.match(new RegExp(`${companion}:\\s*\\[([^\\]]*)\\]`));
  return match ? [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
};

const productionFor = (companion) => {
  const match = manifest.match(
    new RegExp(`buildEntries\\('${companion}',\\s*\\{([^}]*)\\}`),
  );
  return match ? [...match[1].matchAll(/(\w+):\s*'production'/g)].map((m) => m[1]) : [];
};

const wiredFor = (companion) => {
  const block = images.match(new RegExp(`${companion}:\\s*\\{([\\s\\S]*?)\\}`));
  return block ? [...block[1].matchAll(/(\w+):\s*require\(/g)].map((m) => m[1]) : [];
};

test('Night uses the hybrid pose set (keeps headphones, adds happy + listening)', () => {
  const night = posesFor('night');
  for (const pose of ['neutral', 'happy', 'headphones', 'thinking', 'listening']) {
    assert.ok(night.includes(pose), `Night should include ${pose}`);
  }
});

test('all three companions lock neutral as Batch 0 production', () => {
  for (const companion of COMPANIONS) {
    assert.ok(
      productionFor(companion).includes('neutral'),
      `${companion} neutral should be production`,
    );
  }
});

test('every production pose is wired and present on disk', () => {
  for (const companion of COMPANIONS) {
    for (const pose of productionFor(companion)) {
      assert.ok(
        wiredFor(companion).includes(pose),
        `${companion}/${pose} is production but not wired in companionImages.ts`,
      );
      const file = new URL(
        `../assets/images/companions/teen/${companion}/${pose}.png`,
        import.meta.url,
      );
      assert.ok(fs.existsSync(file), `${companion}/${pose}.png missing on disk`);
      assert.ok(fs.statSync(file).size > 0, `${companion}/${pose}.png is empty`);
    }
  }
});

test('the three Batch 0 neutral PNGs exist and are valid PNGs', () => {
  for (const companion of COMPANIONS) {
    const file = new URL(
      `../assets/images/companions/teen/${companion}/neutral.png`,
      import.meta.url,
    );
    const head = Buffer.alloc(8);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, head, 0, 8, 0);
    fs.closeSync(fd);
    assert.equal(
      head.toString('hex'),
      '89504e470d0a1a0a',
      `${companion}/neutral.png is not a PNG`,
    );
  }
});

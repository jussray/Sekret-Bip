import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const outputDir = path.join(root, 'assets', 'generated');
const quiet = process.argv.includes('--quiet');

const COLORS = {
  deep: [22, 0, 40, 255],
  royal: [83, 54, 214, 255],
  blue: [47, 93, 255, 255],
  lavender: [228, 218, 255, 255],
  white: [250, 248, 255, 255],
  warm: [255, 187, 66, 255],
};

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function mix(a, b, t) {
  return Math.round(a + (b - a) * clamp(t));
}

function blendPixel(buffer, width, x, y, color, opacity = 1) {
  if (x < 0 || y < 0 || x >= width || y >= width) return;
  const i = (y * width + x) * 4;
  const srcAlpha = clamp((color[3] / 255) * opacity);
  const dstAlpha = buffer[i + 3] / 255;
  const outAlpha = srcAlpha + dstAlpha * (1 - srcAlpha);
  if (outAlpha <= 0) return;

  for (let c = 0; c < 3; c += 1) {
    const src = color[c] / 255;
    const dst = buffer[i + c] / 255;
    const out = (src * srcAlpha + dst * dstAlpha * (1 - srcAlpha)) / outAlpha;
    buffer[i + c] = Math.round(clamp(out) * 255);
  }
  buffer[i + 3] = Math.round(clamp(outAlpha) * 255);
}

function paintBackground(buffer, size, variant) {
  const cx = size * 0.47;
  const cy = size * 0.43;
  const maxD = size * 0.76;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = x - cx;
      const dy = y - cy;
      const d = clamp(Math.sqrt(dx * dx + dy * dy) / maxD);
      const glow = clamp(1 - d);
      const edgeBlue = variant === 'parent' ? 0.18 : 0.32;
      const royalWeight = clamp(glow * 0.82 + edgeBlue * (1 - glow));
      const i = (y * size + x) * 4;
      buffer[i] = mix(COLORS.deep[0], COLORS.royal[0], royalWeight);
      buffer[i + 1] = mix(COLORS.deep[1], COLORS.royal[1], royalWeight);
      buffer[i + 2] = mix(COLORS.deep[2], COLORS.blue[2], royalWeight * 0.72);
      buffer[i + 3] = 255;
    }
  }
}

function ellipse(buffer, size, cx, cy, rx, ry, color, opacity = 1) {
  const minX = Math.max(0, Math.floor(cx - rx - 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + rx + 2));
  const minY = Math.max(0, Math.floor(cy - ry - 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + ry + 2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const nx = (x + 0.5 - cx) / rx;
      const ny = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      const coverage = clamp((1.015 - d) / 0.03);
      if (coverage > 0) blendPixel(buffer, size, x, y, color, opacity * coverage);
    }
  }
}

function roundedRect(buffer, size, x0, y0, x1, y1, radius, color, opacity = 1) {
  const minX = Math.max(0, Math.floor(x0 - 2));
  const maxX = Math.min(size - 1, Math.ceil(x1 + 2));
  const minY = Math.max(0, Math.floor(y0 - 2));
  const maxY = Math.min(size - 1, Math.ceil(y1 + 2));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const hx = (x1 - x0) / 2;
  const hy = (y1 - y0) / 2;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const qx = Math.abs(x + 0.5 - cx) - (hx - radius);
      const qy = Math.abs(y + 0.5 - cy) - (hy - radius);
      const ox = Math.max(qx, 0);
      const oy = Math.max(qy, 0);
      const outside = Math.sqrt(ox * ox + oy * oy);
      const inside = Math.min(Math.max(qx, qy), 0);
      const distance = outside + inside - radius;
      const coverage = clamp((1.5 - distance) / 3);
      if (coverage > 0) blendPixel(buffer, size, x, y, color, opacity * coverage);
    }
  }
}

function ring(buffer, size, cx, cy, radius, thickness, color, opacity = 1) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;
  const minX = Math.max(0, Math.floor(cx - outer - 2));
  const maxX = Math.min(size - 1, Math.ceil(cx + outer + 2));
  const minY = Math.max(0, Math.floor(cy - outer - 2));
  const maxY = Math.min(size - 1, Math.ceil(cy + outer + 2));
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      const outerCoverage = clamp((outer + 1.5 - d) / 3);
      const innerCoverage = clamp((d - inner + 1.5) / 3);
      const coverage = Math.min(outerCoverage, innerCoverage);
      if (coverage > 0) blendPixel(buffer, size, x, y, color, opacity * coverage);
    }
  }
}

function paintGlyph(buffer, size, variant, adaptive = false) {
  const s = adaptive ? 0.78 : 1;
  const cx = size * 0.5;
  const cy = size * (adaptive ? 0.5 : 0.49);

  if (variant === 'parent') {
    ring(buffer, size, cx, cy, size * 0.285 * s, size * 0.026 * s, COLORS.lavender, adaptive ? 0.92 : 0.44);
    ellipse(buffer, size, cx + size * 0.215 * s, cy - size * 0.205 * s, size * 0.025 * s, size * 0.025 * s, COLORS.warm, 0.98);
  } else {
    ellipse(buffer, size, cx - size * 0.235 * s, cy - size * 0.185 * s, size * 0.017 * s, size * 0.017 * s, COLORS.lavender, 0.78);
    ellipse(buffer, size, cx + size * 0.235 * s, cy - size * 0.135 * s, size * 0.012 * s, size * 0.012 * s, COLORS.white, 0.65);
  }

  const cloud = COLORS.white;
  ellipse(buffer, size, cx - size * 0.122 * s, cy - size * 0.035 * s, size * 0.105 * s, size * 0.105 * s, cloud, 1);
  ellipse(buffer, size, cx, cy - size * 0.092 * s, size * 0.13 * s, size * 0.13 * s, cloud, 1);
  ellipse(buffer, size, cx + size * 0.126 * s, cy - size * 0.026 * s, size * 0.095 * s, size * 0.095 * s, cloud, 1);
  roundedRect(
    buffer,
    size,
    cx - size * 0.205 * s,
    cy - size * 0.03 * s,
    cx + size * 0.21 * s,
    cy + size * 0.105 * s,
    size * 0.06 * s,
    cloud,
    1,
  );

  const secret = COLORS.deep;
  ellipse(buffer, size, cx, cy - size * 0.015 * s, size * 0.036 * s, size * 0.036 * s, secret, 0.95);
  roundedRect(
    buffer,
    size,
    cx - size * 0.018 * s,
    cy + size * 0.012 * s,
    cx + size * 0.018 * s,
    cy + size * 0.087 * s,
    size * 0.014 * s,
    secret,
    0.95,
  );
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function encodePng(width, height, pixels) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    pixels.copy(raw, rowStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function renderIcon(size, variant, adaptive = false) {
  const pixels = Buffer.alloc(size * size * 4);
  if (!adaptive) paintBackground(pixels, size, variant);
  paintGlyph(pixels, size, variant, adaptive);
  return encodePng(size, size, pixels);
}

function writeIcon(filename, size, variant, adaptive = false) {
  const target = path.join(outputDir, filename);
  fs.writeFileSync(target, renderIcon(size, variant, adaptive));
  return target;
}

fs.mkdirSync(outputDir, { recursive: true });

const outputs = [
  writeIcon('teen-icon.png', 1024, 'teen'),
  writeIcon('parent-icon.png', 1024, 'parent'),
  writeIcon('teen-adaptive-foreground.png', 1024, 'teen', true),
  writeIcon('parent-adaptive-foreground.png', 1024, 'parent', true),
  writeIcon('teen-play-store-icon.png', 512, 'teen'),
  writeIcon('parent-play-store-icon.png', 512, 'parent'),
];

if (!quiet) {
  for (const file of outputs) console.log(path.relative(root, file));
}

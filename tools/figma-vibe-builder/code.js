const FRAME_W = 390;
const FRAME_H = 844;
const GAP = 72;
const PAGE_NAME = 'Bip Vibe Frames';

const GLOBAL = {
  radius: { md: 12, lg: 16, card: 18, pill: 999 },
  safety: { bg: '#FFF3F3', border: '#E07A9F', text: '#8B1A3A' },
  privacy: { bg: '#E8F5FA', border: '#7EC8E3', text: '#1A4A5C' },
  parentBoundary: { bg: '#FFFBE6', border: '#FFD166', text: '#2C1A0E' },
  verification: { bg: '#E8FAF4', text: '#0E2E22', icon: '#3A6A52' },
};

const VIBES = [
  {
    key: 'raylene', name: "Raylene's Room", atmosphere: 'companion-day',
    bg: '#FFF8EE', card: '#FFF1E6', cardAlt: '#FFE8D6', accentA: '#FFB289', accentB: '#FFD166', accentC: '#F4A0C8',
    textHigh: '#2C1A0E', textMid: '#7A5030', textLow: '#B08060', divider: 'rgba(44,26,14,0.08)', glowColor: '#FFB289', glowRadius: 48,
    overlayBase: 'rgba(255,248,238,0.70)', overlayAccent: 'rgba(255,209,102,0.14)', overlayPrimary: 'rgba(255,178,137,0.06)',
  },
  {
    key: 'rylane', name: 'Rylane After Dark', atmosphere: 'companion-day',
    bg: '#EFF6FA', card: '#E4EFF6', cardAlt: '#D6E8F3', accentA: '#7EC8E3', accentB: '#A8E6CF', accentC: '#FFB289',
    textHigh: '#0E2433', textMid: '#3A6070', textLow: '#7AACBA', divider: 'rgba(14,36,51,0.08)', glowColor: '#7EC8E3', glowRadius: 52,
    overlayBase: 'rgba(239,246,250,0.72)', overlayAccent: 'rgba(168,230,207,0.12)', overlayPrimary: 'rgba(126,200,227,0.07)',
  },
  {
    key: 'cloud', name: 'Cloud Drift', atmosphere: 'atmosphere',
    bg: '#F3FEFA', card: '#E8FAF4', cardAlt: '#D8F5EC', accentA: '#A8E6CF', accentB: '#7EC8E3', accentC: '#FFD166',
    textHigh: '#0E2E22', textMid: '#3A6A52', textLow: '#7ABAA2', divider: 'rgba(14,46,34,0.08)', glowColor: '#A8E6CF', glowRadius: 44,
    overlayBase: 'rgba(243,254,250,0.74)', overlayAccent: 'rgba(126,200,227,0.12)', overlayPrimary: 'rgba(168,230,207,0.08)',
  },
  {
    key: 'night', name: 'Night Comfort', atmosphere: 'night-comfort',
    bg: '#1E1A2E', card: '#2A2440', cardAlt: '#332D50', accentA: '#FFD166', accentB: '#FFB289', accentC: '#A8E6CF',
    textHigh: '#FFF8EE', textMid: '#C4B49A', textLow: '#7A6A52', divider: 'rgba(255,248,238,0.08)', glowColor: '#FFD166', glowRadius: 56,
    overlayBase: 'rgba(30,26,46,0.78)', overlayAccent: 'rgba(255,178,137,0.08)', overlayPrimary: 'rgba(255,209,102,0.05)',
  },
  {
    key: 'rain', name: 'Window Rain', atmosphere: 'atmosphere',
    bg: '#EEF4F9', card: '#E4EEF6', cardAlt: '#D6E6F2', accentA: '#7EC8E3', accentB: '#FFB289', accentC: '#A8E6CF',
    textHigh: '#0E2030', textMid: '#3A5A6E', textLow: '#6A9AAE', divider: 'rgba(14,32,48,0.08)', glowColor: '#7EC8E3', glowRadius: 40,
    overlayBase: 'rgba(238,244,249,0.75)', overlayAccent: 'rgba(126,200,227,0.18)', overlayPrimary: 'rgba(126,200,227,0.08)',
  },
  {
    key: 'sunset', name: 'Sunset Exhale', atmosphere: 'atmosphere',
    bg: '#FFF4E6', card: '#FFE8CC', cardAlt: '#FFD9B3', accentA: '#FFD166', accentB: '#FFB289', accentC: '#E07A9F',
    textHigh: '#2C1A0E', textMid: '#7A4A20', textLow: '#B07840', divider: 'rgba(44,26,14,0.08)', glowColor: '#FFD166', glowRadius: 60,
    overlayBase: 'rgba(255,244,230,0.72)', overlayAccent: 'rgba(255,178,137,0.20)', overlayPrimary: 'rgba(255,209,102,0.10)',
  },
];

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16) / 255,
    g: parseInt(value.slice(2, 4), 16) / 255,
    b: parseInt(value.slice(4, 6), 16) / 255,
  };
}

function parseColor(input) {
  if (input.startsWith('#')) return { color: hexToRgb(input), opacity: 1 };
  const match = input.match(/rgba?\(([^)]+)\)/);
  if (!match) return { color: hexToRgb('#000000'), opacity: 1 };
  const parts = match[1].split(',').map((part) => Number(part.trim()));
  return {
    color: { r: parts[0] / 255, g: parts[1] / 255, b: parts[2] / 255 },
    opacity: parts.length === 4 ? parts[3] : 1,
  };
}

/** @returns {SolidPaint[]} */
function solid(input) {
  const parsed = parseColor(input);
  return [{ type: 'SOLID', color: parsed.color, opacity: parsed.opacity }];
}

function rect(parent, name, x, y, w, h, fill, radius = 0, stroke) {
  const node = figma.createRectangle();
  node.name = name;
  node.x = x;
  node.y = y;
  node.resize(w, h);
  node.fills = solid(fill);
  node.cornerRadius = radius;
  if (stroke) {
    node.strokes = solid(stroke);
    node.strokeWeight = 1;
  }
  parent.appendChild(node);
  return node;
}

async function text(parent, name, value, x, y, size, color, weight = 'Regular', width) {
  const node = figma.createText();
  node.name = name;
  node.fontName = { family: 'Inter', style: weight };
  node.fontSize = size;
  node.fills = solid(color);
  node.characters = value;
  node.x = x;
  node.y = y;
  if (width) {
    node.resize(width, node.height);
    node.textAutoResize = 'HEIGHT';
  }
  parent.appendChild(node);
  return node;
}

function shadow(node, color, radius, opacity = 0.18) {
  node.effects = [{
    type: 'DROP_SHADOW',
    color: { ...parseColor(color).color, a: opacity },
    offset: { x: 0, y: 0 },
    radius,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL',
  }];
}

async function buildFrame(vibe, index, page) {
  const frame = figma.createFrame();
  frame.name = `Vibe — ${vibe.name}`;
  frame.x = index * (FRAME_W + GAP);
  frame.y = 0;
  frame.resize(FRAME_W, FRAME_H);
  frame.fills = solid(vibe.bg);
  frame.clipsContent = true;
  page.appendChild(frame);

  // Atmosphere placeholder and overlays
  rect(frame, 'Atmosphere BG Placeholder', 0, 0, FRAME_W, 320, vibe.cardAlt);
  const atmosphere = rect(frame, 'Atmosphere Accent Wash', 0, 0, FRAME_W, 320, vibe.accentA);
  atmosphere.opacity = 0.12;
  rect(frame, 'Overlay Scrim', 0, 0, FRAME_W, 320, vibe.overlayBase);

  // Nav bar
  const nav = rect(frame, 'Nav Bar', 0, 0, FRAME_W, 64, vibe.bg);
  nav.opacity = 0.92;
  await text(frame, 'Logo', "SE'KRET BIP", 20, 21, 13, vibe.textHigh, 'Semi Bold');
  await text(frame, 'Vibe Key', vibe.key.toUpperCase(), 286, 22, 11, vibe.textLow, 'Medium');

  // Hero card
  const hero = rect(frame, 'Hero Card', 20, 184, 350, 140, vibe.card, 18, vibe.divider);
  shadow(hero, vibe.glowColor, vibe.glowRadius);
  await text(frame, 'Hero Title', vibe.name, 38, 205, 17, vibe.textHigh, 'Semi Bold');
  await text(frame, 'Hero Body', 'A soft place to pause, write, and come back to yourself.', 38, 237, 15, vibe.textMid, 'Regular', 310);
  await text(frame, 'Atmosphere Label', vibe.atmosphere, 38, 284, 11, vibe.textLow, 'Medium');

  // Input
  rect(frame, 'Input Field', 20, 344, 350, 48, vibe.bg, 12, vibe.divider);
  await text(frame, 'Input Placeholder', "What's on your mind…", 36, 359, 15, vibe.textLow, 'Regular');

  // Buttons
  rect(frame, 'Primary Button', 20, 408, 168, 44, vibe.accentA, 999);
  await text(frame, 'Primary Button Label', 'Save to Journal', 45, 422, 15, vibe.textHigh, 'Semi Bold');
  rect(frame, 'Secondary Button', 202, 408, 168, 44, vibe.card, 999, vibe.accentA);
  await text(frame, 'Secondary Button Label', 'Share to Circle', 221, 422, 15, vibe.textHigh, 'Medium');

  // Privacy and verification badges
  rect(frame, 'Privacy Badge', 20, 468, 105, 30, GLOBAL.privacy.bg, 999, GLOBAL.privacy.border);
  await text(frame, 'Privacy Badge Label', '🔒 Private', 34, 477, 13, GLOBAL.privacy.text, 'Medium');
  rect(frame, 'Verification Badge', 137, 468, 112, 30, GLOBAL.verification.bg, 999);
  await text(frame, 'Verification Badge Label', '✓ Verified', 153, 477, 13, GLOBAL.verification.text, 'Medium');

  // Journal card
  rect(frame, 'Journal Card', 20, 514, 350, 96, vibe.card, 18, vibe.divider);
  await text(frame, 'Journal Entry Title', 'A little lighter today', 36, 530, 15, vibe.textHigh, 'Semi Bold');
  await text(frame, 'Journal Date', 'Today · 8:42 PM', 36, 554, 11, vibe.textLow, 'Regular');
  await text(frame, 'Journal Excerpt', 'I finally said what I needed without shrinking myself.', 36, 574, 13, vibe.textMid, 'Regular', 310);

  // Circle post card
  rect(frame, 'Circle Post Card', 20, 626, 350, 110, vibe.cardAlt, 18, vibe.divider);
  rect(frame, 'Circle Avatar', 36, 642, 32, 32, vibe.accentB, 999);
  await text(frame, 'Circle Username', 'softstar', 80, 643, 13, vibe.textHigh, 'Semi Bold');
  await text(frame, 'Circle Post Body', 'You are allowed to rest before you earn it.', 80, 665, 13, vibe.textMid, 'Regular', 260);
  await text(frame, 'Circle Reactions', '💜  felt   ☁️  comfort   ⭐  proud', 36, 708, 11, vibe.textLow, 'Regular');

  // Parent boundary preview
  rect(frame, 'Parent Boundary', 20, 752, 350, 72, GLOBAL.parentBoundary.bg, 16, GLOBAL.parentBoundary.border);
  await text(frame, 'Parent Boundary Label', 'Parent View', 36, 766, 13, GLOBAL.parentBoundary.text, 'Semi Bold');
  await text(frame, 'Parent Boundary Body', 'Shared preview only — private details stay hidden.', 36, 790, 12, GLOBAL.parentBoundary.text, 'Regular', 310);

  frame.setPluginData('vibeKey', vibe.key);
  frame.setPluginData('tokenSource', 'constants/vibeDesignTokens.ts');
  return frame;
}

async function main() {
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
  ]);

  let page = figma.root.children.find((node) => node.type === 'PAGE' && node.name === PAGE_NAME);
  if (!page) {
    page = figma.createPage();
    page.name = PAGE_NAME;
  }
  await page.loadAsync();
  figma.currentPage = page;

  const oldFrames = page.children.filter((node) => node.name.startsWith('Vibe — '));
  oldFrames.forEach((node) => node.remove());

  const frames = [];
  for (let i = 0; i < VIBES.length; i += 1) {
    frames.push(await buildFrame(VIBES[i], i, page));
  }

  figma.currentPage.selection = frames;
  figma.viewport.scrollAndZoomIntoView(frames);
  figma.notify('Built 6 Bip vibe frames from the canonical token system.');
  figma.closePlugin();
}

main().catch((error) => {
  console.error(error);
  figma.notify(`Bip Vibe Builder failed: ${error.message || error}`);
  figma.closePlugin();
});

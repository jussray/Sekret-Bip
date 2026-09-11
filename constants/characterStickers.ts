// STICKER LAYER — extracted from character sticker sheets.
// 53 individual stickers: 19 raylene / 19 rylane / 15 cloud.
// Full-size avatar images are NOT stickers. Stickers live in assets/images/stickers/.
// To render: import { IMAGES } from './theme'; use IMAGES[asset.assetKey as keyof typeof IMAGES]

export type StickerCharacter = 'raylene' | 'rylane' | 'cloud';

export type StickerContext =
  | 'journal' | 'pages' | 'cloudThoughts' | 'comfort' | 'bippinBRB'
  | 'voiceBip' | 'general' | 'moodCheck' | 'streak' | 'circle';

export interface CharacterSticker {
  layer: 'sticker';
  id: string;
  character: StickerCharacter;
  emotion: string;
  assetKey: string;
  assetPath: string;
  tags: string[];
  renderable: boolean;
  placeholder: boolean;
  prod: boolean;
}

const STICKER_BASE = { layer: 'sticker' as const, renderable: true, placeholder: false };

export const STICKER_REGISTRY: CharacterSticker[] = [
  // ── Raylene (19) ──────────────────────────────────────────────────────────
  { ...STICKER_BASE, id: 'raylene-standing',     character: 'raylene', emotion: 'standing',     assetKey: 'rayStickerStanding',    assetPath: 'assets/images/stickers/raylene/raylene-sticker-standing.png',     tags: ['standing','raylene','neutral','confident','idle'], prod: true },
  { ...STICKER_BASE, id: 'raylene-lounging',     character: 'raylene', emotion: 'lounging',     assetKey: 'rayStickerLounging',    assetPath: 'assets/images/stickers/raylene/raylene-sticker-lounging.png',     tags: ['lounging','raylene','calm','relaxed'], prod: true },
  { ...STICKER_BASE, id: 'raylene-studying',     character: 'raylene', emotion: 'studying',     assetKey: 'rayStickerStudying',    assetPath: 'assets/images/stickers/raylene/raylene-sticker-studying.png',     tags: ['studying','raylene','focused','productive'], prod: true },
  { ...STICKER_BASE, id: 'raylene-sleepy',       character: 'raylene', emotion: 'sleepy',       assetKey: 'rayStickerSleepy',      assetPath: 'assets/images/stickers/raylene/raylene-sticker-sleepy.png',       tags: ['sleepy','raylene','tired','rest','bippin-brb'], prod: true },
  { ...STICKER_BASE, id: 'raylene-peace',        character: 'raylene', emotion: 'peace',        assetKey: 'rayStickerPeace',       assetPath: 'assets/images/stickers/raylene/raylene-sticker-peace.png',        tags: ['peace','raylene','happy','calm'], prod: true },
  { ...STICKER_BASE, id: 'raylene-listening',    character: 'raylene', emotion: 'listening',    assetKey: 'rayStickerListening',   assetPath: 'assets/images/stickers/raylene/raylene-sticker-listening.png',    tags: ['listening','raylene','focused','music','headphones'], prod: true },
  { ...STICKER_BASE, id: 'raylene-comfort',      character: 'raylene', emotion: 'comfort',      assetKey: 'rayStickerComfort',     assetPath: 'assets/images/stickers/raylene/raylene-sticker-comfort.png',      tags: ['comfort','raylene','sad','hug','cloud'], prod: true },
  { ...STICKER_BASE, id: 'raylene-sunglasses',   character: 'raylene', emotion: 'sunglasses',   assetKey: 'rayStickerSunglasses',  assetPath: 'assets/images/stickers/raylene/raylene-sticker-sunglasses.png',   tags: ['sunglasses','raylene','cool','confident'], prod: true },
  { ...STICKER_BASE, id: 'raylene-happy',        character: 'raylene', emotion: 'happy',        assetKey: 'rayStickerHappy',       assetPath: 'assets/images/stickers/raylene/raylene-sticker-happy.png',        tags: ['happy','raylene','excited','loving','circle'], prod: true },
  { ...STICKER_BASE, id: 'raylene-journaling',   character: 'raylene', emotion: 'journaling',   assetKey: 'rayStickerJournaling',  assetPath: 'assets/images/stickers/raylene/raylene-sticker-journaling.png',   tags: ['journaling','raylene','focused','writing','journal','pages'], prod: true },
  { ...STICKER_BASE, id: 'raylene-thinking',     character: 'raylene', emotion: 'thinking',     assetKey: 'rayStickerThinking',    assetPath: 'assets/images/stickers/raylene/raylene-sticker-thinking.png',     tags: ['thinking','raylene','curious','reflective','mood-check'], prod: true },
  { ...STICKER_BASE, id: 'raylene-boba',         character: 'raylene', emotion: 'boba',         assetKey: 'rayStickerBoba',        assetPath: 'assets/images/stickers/raylene/raylene-sticker-boba.png',         tags: ['boba','raylene','happy','cozy','treat'], prod: true },
  { ...STICKER_BASE, id: 'raylene-crown',        character: 'raylene', emotion: 'crown',        assetKey: 'rayStickerCrown',       assetPath: 'assets/images/stickers/raylene/raylene-sticker-crown.png',        tags: ['crown','raylene','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-sunnies',      character: 'raylene', emotion: 'sunnies',      assetKey: 'rayStickerSunnies',     assetPath: 'assets/images/stickers/raylene/raylene-sticker-sunnies.png',      tags: ['sunnies','raylene','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-hoodie',       character: 'raylene', emotion: 'hoodie',       assetKey: 'rayStickerHoodie',      assetPath: 'assets/images/stickers/raylene/raylene-sticker-hoodie.png',       tags: ['hoodie','raylene','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-sekret-bip',   character: 'raylene', emotion: 'sekret-bip',   assetKey: 'rayStickerSekretBip',   assetPath: 'assets/images/stickers/raylene/raylene-sticker-sekret-bip.png',   tags: ['sekret-bip','raylene','branding','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-sekret-heart', character: 'raylene', emotion: 'sekret-heart', assetKey: 'rayStickerSekretHeart', assetPath: 'assets/images/stickers/raylene/raylene-sticker-sekret-heart.png', tags: ['sekret-heart','raylene','branding','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-pillow',       character: 'raylene', emotion: 'pillow',       assetKey: 'rayStickerPillow',      assetPath: 'assets/images/stickers/raylene/raylene-sticker-pillow.png',       tags: ['pillow','raylene','cozy','decorative'], prod: false },
  { ...STICKER_BASE, id: 'raylene-icon-cloud',   character: 'raylene', emotion: 'icon-cloud',   assetKey: 'rayStickerIconCloud',   assetPath: 'assets/images/stickers/raylene/raylene-sticker-icon-cloud.png',   tags: ['icon','cloud','raylene','decorative'], prod: false },

  // ── Rylane (19) ───────────────────────────────────────────────────────────
  { ...STICKER_BASE, id: 'rylane-mini',          character: 'rylane', emotion: 'mini',          assetKey: 'rylStickerMini',        assetPath: 'assets/images/stickers/rylane/rylane-sticker-mini.png',        tags: ['mini','rylane','neutral','idle','cute'], prod: true },
  { ...STICKER_BASE, id: 'rylane-reading',       character: 'rylane', emotion: 'reading',       assetKey: 'rylStickerReading',     assetPath: 'assets/images/stickers/rylane/rylane-sticker-reading.png',     tags: ['reading','rylane','focused','reflective','journal','pages'], prod: true },
  { ...STICKER_BASE, id: 'rylane-phone',         character: 'rylane', emotion: 'phone',         assetKey: 'rylStickerPhone',       assetPath: 'assets/images/stickers/rylane/rylane-sticker-phone.png',       tags: ['phone','rylane','casual','tired','neutral'], prod: true },
  { ...STICKER_BASE, id: 'rylane-thinking',      character: 'rylane', emotion: 'thinking',      assetKey: 'rylStickerThinking',    assetPath: 'assets/images/stickers/rylane/rylane-sticker-thinking.png',    tags: ['thinking','rylane','curious','reflective','mood-check'], prod: true },
  { ...STICKER_BASE, id: 'rylane-sitting',       character: 'rylane', emotion: 'sitting',       assetKey: 'rylStickerSitting',     assetPath: 'assets/images/stickers/rylane/rylane-sticker-sitting.png',     tags: ['sitting','rylane','calm','reflective','comfort'], prod: true },
  { ...STICKER_BASE, id: 'rylane-headphones',    character: 'rylane', emotion: 'headphones',    assetKey: 'rylStickerHeadphones',  assetPath: 'assets/images/stickers/rylane/rylane-sticker-headphones.png',  tags: ['headphones','rylane','focused','music','listening','cloud-thoughts'], prod: true },
  { ...STICKER_BASE, id: 'rylane-hoodie',        character: 'rylane', emotion: 'hoodie',        assetKey: 'rylStickerHoodie',      assetPath: 'assets/images/stickers/rylane/rylane-sticker-hoodie.png',      tags: ['hoodie','rylane','cozy','calm'], prod: true },
  { ...STICKER_BASE, id: 'rylane-calm',          character: 'rylane', emotion: 'calm',          assetKey: 'rylStickerCalm',        assetPath: 'assets/images/stickers/rylane/rylane-sticker-calm.png',        tags: ['calm','rylane','neutral','grounded'], prod: true },
  { ...STICKER_BASE, id: 'rylane-stormy',        character: 'rylane', emotion: 'stormy',        assetKey: 'rylStickerStormy',      assetPath: 'assets/images/stickers/rylane/rylane-sticker-stormy.png',      tags: ['stormy','rylane','upset','frustrated'], prod: true },
  { ...STICKER_BASE, id: 'rylane-peace',         character: 'rylane', emotion: 'peace',         assetKey: 'rylStickerPeace',       assetPath: 'assets/images/stickers/rylane/rylane-sticker-peace.png',       tags: ['peace','rylane','happy','proud','streak'], prod: true },
  { ...STICKER_BASE, id: 'rylane-happy',         character: 'rylane', emotion: 'happy',         assetKey: 'rylStickerHappy',       assetPath: 'assets/images/stickers/rylane/rylane-sticker-happy.png',       tags: ['happy','rylane','excited','loving','circle'], prod: true },
  { ...STICKER_BASE, id: 'rylane-sleepy',        character: 'rylane', emotion: 'sleepy',        assetKey: 'rylStickerSleepy',      assetPath: 'assets/images/stickers/rylane/rylane-sticker-sleepy.png',      tags: ['sleepy','rylane','rest','tired','bippin-brb'], prod: true },
  { ...STICKER_BASE, id: 'rylane-night',         character: 'rylane', emotion: 'night',         assetKey: 'rylStickerNight',       assetPath: 'assets/images/stickers/rylane/rylane-sticker-night.png',       tags: ['night','rylane','reflective','window','moon'], prod: true },
  { ...STICKER_BASE, id: 'rylane-music',         character: 'rylane', emotion: 'music',         assetKey: 'rylStickerMusic',       assetPath: 'assets/images/stickers/rylane/rylane-sticker-music.png',       tags: ['music','rylane','listening','mood'], prod: true },
  { ...STICKER_BASE, id: 'rylane-late-night',    character: 'rylane', emotion: 'late-night',    assetKey: 'rylStickerLateNight',   assetPath: 'assets/images/stickers/rylane/rylane-sticker-late-night.png',   tags: ['late-night','rylane','text','decorative'], prod: false },
  { ...STICKER_BASE, id: 'rylane-protect',       character: 'rylane', emotion: 'protect',       assetKey: 'rylStickerProtect',     assetPath: 'assets/images/stickers/rylane/rylane-sticker-protect.png',     tags: ['protect','rylane','text','decorative'], prod: false },
  { ...STICKER_BASE, id: 'rylane-why-i-love',    character: 'rylane', emotion: 'why-i-love',    assetKey: 'rylStickerWhyILove',    assetPath: 'assets/images/stickers/rylane/rylane-sticker-why-i-love.png',    tags: ['why-i-love','rylane','text','decorative'], prod: false },
  { ...STICKER_BASE, id: 'rylane-writing',       character: 'rylane', emotion: 'writing',       assetKey: 'rylStickerWriting',     assetPath: 'assets/images/stickers/rylane/rylane-sticker-writing.png',     tags: ['writing','rylane','icon','decorative'], prod: false },
  { ...STICKER_BASE, id: 'rylane-speech',        character: 'rylane', emotion: 'speech',        assetKey: 'rylStickerSpeech',      assetPath: 'assets/images/stickers/rylane/rylane-sticker-speech.png',      tags: ['speech','rylane','icon','decorative'], prod: false },

  // ── Cloud (15, all prod) ──────────────────────────────────────────────────
  { ...STICKER_BASE, id: 'cloud-sleepy',         character: 'cloud', emotion: 'sleepy',         assetKey: 'cloudStickerSleepy',    assetPath: 'assets/images/stickers/cloud/cloud-sticker-sleepy.png',    tags: ['sleepy','cloud','rest','tired','bippin-brb'], prod: true },
  { ...STICKER_BASE, id: 'cloud-happy',          character: 'cloud', emotion: 'happy',          assetKey: 'cloudStickerHappy',     assetPath: 'assets/images/stickers/cloud/cloud-sticker-happy.png',     tags: ['happy','cloud','energetic','loving'], prod: true },
  { ...STICKER_BASE, id: 'cloud-listening',      character: 'cloud', emotion: 'listening',      assetKey: 'cloudStickerListening', assetPath: 'assets/images/stickers/cloud/cloud-sticker-listening.png', tags: ['listening','cloud','focused','cloud-thoughts'], prod: true },
  { ...STICKER_BASE, id: 'cloud-voice-bip',      character: 'cloud', emotion: 'voice-bip',      assetKey: 'cloudStickerVoiceBip',  assetPath: 'assets/images/stickers/cloud/cloud-sticker-voice-bip.png',  tags: ['voice-bip','cloud','active','voice'], prod: true },
  { ...STICKER_BASE, id: 'cloud-journal',        character: 'cloud', emotion: 'journal',        assetKey: 'cloudStickerJournal',   assetPath: 'assets/images/stickers/cloud/cloud-sticker-journal.png',   tags: ['journal','cloud','writing','focused','pages'], prod: true },
  { ...STICKER_BASE, id: 'cloud-comfort',        character: 'cloud', emotion: 'comfort',        assetKey: 'cloudStickerComfort',   assetPath: 'assets/images/stickers/cloud/cloud-sticker-comfort.png',   tags: ['comfort','cloud','calm','loving'], prod: true },
  { ...STICKER_BASE, id: 'cloud-hug',            character: 'cloud', emotion: 'hug',            assetKey: 'cloudStickerHug',       assetPath: 'assets/images/stickers/cloud/cloud-sticker-hug.png',       tags: ['hug','cloud','loving','comfort'], prod: true },
  { ...STICKER_BASE, id: 'cloud-proud',          character: 'cloud', emotion: 'proud',          assetKey: 'cloudStickerProud',     assetPath: 'assets/images/stickers/cloud/cloud-sticker-proud.png',     tags: ['proud','cloud','happy','circle'], prod: true },
  { ...STICKER_BASE, id: 'cloud-stormy',         character: 'cloud', emotion: 'stormy',         assetKey: 'cloudStickerStormy',    assetPath: 'assets/images/stickers/cloud/cloud-sticker-stormy.png',    tags: ['stormy','cloud','sad','moody'], prod: true },
  { ...STICKER_BASE, id: 'cloud-crying',         character: 'cloud', emotion: 'crying',         assetKey: 'cloudStickerCrying',    assetPath: 'assets/images/stickers/cloud/cloud-sticker-crying.png',    tags: ['crying','cloud','sad','vulnerable'], prod: true },
  { ...STICKER_BASE, id: 'cloud-cozy',           character: 'cloud', emotion: 'cozy',           assetKey: 'cloudStickerCozy',      assetPath: 'assets/images/stickers/cloud/cloud-sticker-cozy.png',      tags: ['cozy','cloud','calm','general'], prod: true },
  { ...STICKER_BASE, id: 'cloud-dreamy',         character: 'cloud', emotion: 'dreamy',         assetKey: 'cloudStickerDreamy',    assetPath: 'assets/images/stickers/cloud/cloud-sticker-dreamy.png',    tags: ['dreamy','cloud','calm','night'], prod: true },
  { ...STICKER_BASE, id: 'cloud-thinking',       character: 'cloud', emotion: 'thinking',       assetKey: 'cloudStickerThinking',  assetPath: 'assets/images/stickers/cloud/cloud-sticker-thinking.png',  tags: ['thinking','cloud','curious','mood-check'], prod: true },
  { ...STICKER_BASE, id: 'cloud-bippin-brb',     character: 'cloud', emotion: 'bippin-brb',     assetKey: 'cloudStickerBippinBrb', assetPath: 'assets/images/stickers/cloud/cloud-sticker-bippin-brb.png', tags: ['bippin-brb','cloud','sleepy','brb'], prod: true },
  { ...STICKER_BASE, id: 'cloud-cheer',          character: 'cloud', emotion: 'cheer',          assetKey: 'cloudStickerCheer',     assetPath: 'assets/images/stickers/cloud/cloud-sticker-cheer.png',     tags: ['cheer','cloud','excited','streak','reward'], prod: true },
];

// ── Context → emotion mapping per character ───────────────────────────────────
const CONTEXT_EMOTION: Record<StickerCharacter, Record<StickerContext, string>> = {
  raylene: {
    journal: 'journaling', pages: 'journaling', cloudThoughts: 'listening',
    comfort: 'comfort', bippinBRB: 'sleepy', voiceBip: 'listening',
    moodCheck: 'thinking', streak: 'peace', circle: 'happy', general: 'happy',
  },
  rylane: {
    journal: 'reading', pages: 'reading', cloudThoughts: 'headphones',
    comfort: 'sitting', bippinBRB: 'sleepy', voiceBip: 'headphones',
    moodCheck: 'thinking', streak: 'peace', circle: 'happy', general: 'calm',
  },
  cloud: {
    journal: 'journal', pages: 'journal', cloudThoughts: 'listening',
    comfort: 'hug', bippinBRB: 'bippin-brb', voiceBip: 'voice-bip',
    moodCheck: 'thinking', streak: 'cheer', circle: 'proud', general: 'cozy',
  },
};

const CARD_MINI_EMOTION: Record<StickerCharacter, string> = {
  cloud: 'cozy',
  raylene: 'happy',
  rylane: 'calm',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getContextSticker(
  character: StickerCharacter,
  context: StickerContext,
): CharacterSticker | undefined {
  const emotion = CONTEXT_EMOTION[character]?.[context];
  if (!emotion) return undefined;
  return STICKER_REGISTRY.find(s => s.character === character && s.emotion === emotion);
}

export function getCardMiniSticker(character: StickerCharacter): CharacterSticker | undefined {
  const emotion = CARD_MINI_EMOTION[character];
  if (!emotion) return undefined;
  return STICKER_REGISTRY.find(s => s.character === character && s.emotion === emotion);
}

export function getProdStickers(character: StickerCharacter): CharacterSticker[] {
  return STICKER_REGISTRY.filter(s => s.character === character && s.prod);
}

export function getStickerById(id: string): CharacterSticker | undefined {
  return STICKER_REGISTRY.find(s => s.id === id);
}

export function getStickersByTag(tag: string): CharacterSticker[] {
  return STICKER_REGISTRY.filter(s => s.tags.includes(tag));
}

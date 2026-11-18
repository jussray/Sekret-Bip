import type { ImageSourcePropType } from 'react-native';

// Require map for all 53 character stickers.
// Keys match CharacterSticker.id from characterStickers.ts.
// Metro bundler requires static require() calls — no dynamic paths.

const STICKER_IMAGES: Record<string, ImageSourcePropType> = {
  // ── Suhana (19) ──────────────────────────────────────────────────────────────
  'raylene-standing':     require('../assets/images/stickers/raylene/raylene-sticker-standing.png'),
  'raylene-lounging':     require('../assets/images/stickers/raylene/raylene-sticker-lounging.png'),
  'raylene-studying':     require('../assets/images/stickers/raylene/raylene-sticker-studying.png'),
  'raylene-sleepy':       require('../assets/images/stickers/raylene/raylene-sticker-sleepy.png'),
  'raylene-peace':        require('../assets/images/stickers/raylene/raylene-sticker-peace.png'),
  'raylene-listening':    require('../assets/images/stickers/raylene/raylene-sticker-listening.png'),
  'raylene-comfort':      require('../assets/images/stickers/raylene/raylene-sticker-comfort.png'),
  'raylene-sunglasses':   require('../assets/images/stickers/raylene/raylene-sticker-sunglasses.png'),
  'raylene-happy':        require('../assets/images/stickers/raylene/raylene-sticker-happy.png'),
  'raylene-journaling':   require('../assets/images/stickers/raylene/raylene-sticker-journaling.png'),
  'raylene-thinking':     require('../assets/images/stickers/raylene/raylene-sticker-thinking.png'),
  'raylene-boba':         require('../assets/images/stickers/raylene/raylene-sticker-boba.png'),
  'raylene-crown':        require('../assets/images/stickers/raylene/raylene-sticker-crown.png'),
  'raylene-sunnies':      require('../assets/images/stickers/raylene/raylene-sticker-sunnies.png'),
  'raylene-hoodie':       require('../assets/images/stickers/raylene/raylene-sticker-hoodie.png'),
  'raylene-sekret-bip':   require('../assets/images/stickers/raylene/raylene-sticker-sekret-bip.png'),
  'raylene-sekret-heart': require('../assets/images/stickers/raylene/raylene-sticker-sekret-heart.png'),
  'raylene-pillow':       require('../assets/images/stickers/raylene/raylene-sticker-pillow.png'),
  'raylene-icon-cloud':   require('../assets/images/stickers/cloud/cloud-sticker-comfort.jpg'),

  // ── Sy (19) ──────────────────────────────────────────────────────────────────
  'rylane-mini':          require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),
  'rylane-reading':       require('../assets/images/stickers/rylane/rylane-sticker-reading.jpg'),
  'rylane-phone':         require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),
  'rylane-thinking':      require('../assets/images/stickers/rylane/rylane-sticker-thinking.png'),
  'rylane-sitting':       require('../assets/images/stickers/rylane/rylane-sticker-night.jpg'),
  'rylane-headphones':    require('../assets/images/stickers/rylane/rylane-sticker-headphones.png'),
  'rylane-hoodie':        require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),
  'rylane-calm':          require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),
  'rylane-stormy':        require('../assets/images/stickers/rylane/rylane-sticker-stormy.png'),
  'rylane-peace':         require('../assets/images/stickers/rylane/rylane-sticker-happy.jpg'),
  'rylane-happy':         require('../assets/images/stickers/rylane/rylane-sticker-happy.jpg'),
  'rylane-sleepy':        require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),
  'rylane-night':         require('../assets/images/stickers/rylane/rylane-sticker-night.jpg'),
  'rylane-music':         require('../assets/images/stickers/rylane/rylane-sticker-music.png'),
  'rylane-late-night':    require('../assets/images/stickers/rylane/rylane-sticker-night.jpg'),
  'rylane-protect':       require('../assets/images/stickers/rylane/rylane-sticker-protect.jpg'),
  'rylane-why-i-love':    require('../assets/images/stickers/rylane/rylane-sticker-happy.jpg'),
  'rylane-writing':       require('../assets/images/stickers/rylane/rylane-sticker-reading.jpg'),
  'rylane-speech':        require('../assets/images/stickers/rylane/rylane-sticker-mini.jpg'),

  // ── Cloud (15) ───────────────────────────────────────────────────────────────
  'cloud-sleepy':         require('../assets/images/stickers/cloud/cloud-sticker-sleepy.png'),
  'cloud-happy':          require('../assets/images/stickers/cloud/cloud-sticker-happy.png'),
  'cloud-listening':      require('../assets/images/stickers/cloud/cloud-sticker-listening.jpg'),
  'cloud-voice-bip':      require('../assets/images/stickers/cloud/cloud-sticker-voice-bip.png'),
  'cloud-journal':        require('../assets/images/stickers/cloud/cloud-sticker-comfort.jpg'),
  'cloud-comfort':        require('../assets/images/stickers/cloud/cloud-sticker-comfort.jpg'),
  'cloud-hug':            require('../assets/images/stickers/cloud/cloud-sticker-hug.png'),
  'cloud-proud':          require('../assets/images/stickers/cloud/cloud-sticker-proud.png'),
  'cloud-stormy':         require('../assets/images/stickers/cloud/cloud-sticker-stormy.png'),
  'cloud-crying':         require('../assets/images/stickers/cloud/cloud-sticker-crying.png'),
  'cloud-cozy':           require('../assets/images/stickers/cloud/cloud-sticker-comfort.jpg'),
  'cloud-dreamy':         require('../assets/images/stickers/cloud/cloud-sticker-dreamy.png'),
  'cloud-thinking':       require('../assets/images/stickers/cloud/cloud-sticker-comfort.jpg'),
  'cloud-bippin-brb':     require('../assets/images/stickers/cloud/cloud-sticker-bippin-brb.png'),
  'cloud-cheer':          require('../assets/images/stickers/cloud/cloud-sticker-cheer.png'),
};

export default STICKER_IMAGES;

export type CanonCharacterId = 'suhana' | 'sy' | 'cloud' | 'night' | 'sekret' | 'parentCoach';
export type LegacyCharacterId = 'raylene' | 'rylane';
export type CharacterId = CanonCharacterId | LegacyCharacterId;
export type VoiceProvider = 'cloudflare-aura-1' | 'cloudflare-aura-2' | 'elevenlabs-flash';

export interface VoiceRoutingInput {
  characterId: CharacterId;
  requiresPreciseLipSync?: boolean;
}

export interface VoiceRoutingDecision {
  provider: VoiceProvider;
  canonicalCharacterId: CanonCharacterId;
  fallbackProvider: VoiceProvider | null;
}

export function normalizeCanonicalCharacterId(characterId: CharacterId): CanonCharacterId {
  if (characterId === 'raylene') return 'suhana';
  if (characterId === 'rylane') return 'sy';
  return characterId;
}

export function selectVoiceRoute(input: VoiceRoutingInput): VoiceRoutingDecision {
  const canonicalCharacterId = normalizeCanonicalCharacterId(input.characterId);
  const isCanonCompanion = canonicalCharacterId === 'suhana'
    || canonicalCharacterId === 'sy'
    || canonicalCharacterId === 'cloud'
    || canonicalCharacterId === 'night';

  if (isCanonCompanion && input.requiresPreciseLipSync === true) {
    return {
      provider: 'elevenlabs-flash',
      canonicalCharacterId,
      fallbackProvider: 'cloudflare-aura-2',
    };
  }

  if (isCanonCompanion) {
    return {
      provider: 'cloudflare-aura-2',
      canonicalCharacterId,
      fallbackProvider: 'cloudflare-aura-1',
    };
  }

  return {
    provider: 'cloudflare-aura-1',
    canonicalCharacterId,
    fallbackProvider: null,
  };
}

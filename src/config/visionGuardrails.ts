export const SEKRET_BIP_VISION = Object.freeze({
  id: 'private-teen-emotional-growth',
  stage: 'phased-production-readiness',
  northStar: 'Help teens understand themselves, build emotional skills, and ask for support without surrendering privacy or identity control.',
  culturalMission: 'Expand the emotional culture available to young people and families by making love, repair, communication, belonging, family responsibility, courage, community, and healthier responses to hurt feel compelling and usable.',
  proofStrategy: 'Creation over censorship; earn cultural influence through safe product experiences and measurable evidence before public outcome claims.',
  source: 'docs/VISION.md',
});

export const SEKRET_BIP_GUARDRAILS = Object.freeze([
  Object.freeze({id: 'BIP-PRIVACY-001', status: 'active', summary: 'Private reflection, voice, companion, memory, and activity data stay off parent and public surfaces.'}),
  Object.freeze({id: 'BIP-CONSENT-001', status: 'active', summary: 'Parent visibility requires a verified relationship and scoped consent.'}),
  Object.freeze({id: 'BIP-IDENTITY-001', status: 'active', summary: 'Private, trusted, guardian, and anonymous public identities remain separate.'}),
  Object.freeze({id: 'BIP-AUTH-001', status: 'active', summary: 'Protected routes wait for resolved authentication and verification state.'}),
  Object.freeze({id: 'BIP-ISOLATION-001', status: 'active', summary: 'Sign-out, device, and second-user flows clear or isolate private state.'}),
  Object.freeze({id: 'BIP-AI-001', status: 'active', summary: 'AI context is minimized, authenticated, non-clinical, and unable to bypass privacy rules.'}),
  Object.freeze({id: 'BIP-MEMORY-001', status: 'gated', summary: 'Durable memory remains gated until privacy, invalidation, deletion, and tests exist.'}),
  Object.freeze({id: 'BIP-SAFETY-001', status: 'active', summary: 'Safety support does not diagnose, promise treatment, or replace emergency services.'}),
  Object.freeze({id: 'BIP-SECRET-001', status: 'active', summary: 'Model keys, service-role keys, private prompts, and user content stay off public clients and logs.'}),
  Object.freeze({id: 'BIP-TRUTH-001', status: 'active', summary: 'Planned, partial, demo, and production-complete capability remain distinguishable.'}),
]);

export function publicSekretBipGuardrailSnapshot() {
  return Object.freeze({
    version: '1.1.0',
    vision: SEKRET_BIP_VISION,
    guardrails: SEKRET_BIP_GUARDRAILS,
    privacyDefault: 'private',
    parentAccessMode: 'verified-consent-scoped',
    publicIdentityMode: 'anonymous-contextual',
    companionClinicalRole: false,
    durableMemoryStage: 'gated',
    sensitiveFieldsIncluded: false,
  });
}

export function installSekretBipGuardrailRuntime() {
  const snapshot = publicSekretBipGuardrailSnapshot();
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.guardrails = 'active';
    document.documentElement.dataset.productStage = snapshot.vision.stage;
  }
  if (typeof window !== 'undefined' && !window.__SEKRET_BIP_GUARDRAILS__) {
    Object.defineProperty(window, '__SEKRET_BIP_GUARDRAILS__', {
      value: snapshot,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }
  return snapshot;
}

declare global {
  interface Window {
    __SEKRET_BIP_GUARDRAILS__?: ReturnType<typeof publicSekretBipGuardrailSnapshot>;
  }
}

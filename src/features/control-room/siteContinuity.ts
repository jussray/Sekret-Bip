export type SiteContinuityTruthState = 'VERIFIED' | 'UNKNOWN' | 'STALE' | 'SUPERSEDED';

export interface SiteContinuityCookie {
  schema: 'juss/chatgpt-site-continuity-cookie@v1';
  projectId: 'sekret-bip';
  repository: 'jussray/Sekret-Bip';
  branch: 'main';
  siteRole: 'audit-mirror';
  siteOrigin: string;
  auditViewLink: string;
  canonicalControlRoomEntry: 'app/(dev)/control-room.tsx';
  authority: 'observe-request-only';
  repositoryBinding: 'VERIFIED';
  livePublicationReadback: SiteContinuityTruthState;
  browserCookie: false;
  fingerprint: string;
  invalidatesOn: readonly string[];
}

export const SITE_CONTINUITY_SOURCE = Object.freeze({
  projectId: 'sekret-bip' as const,
  repository: 'jussray/Sekret-Bip' as const,
  branch: 'main' as const,
  siteRole: 'audit-mirror' as const,
  siteOrigin: 'https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site',
  auditViewLink: 'https://sekret-bip-audit.p9s5nbwqyt.chatgpt.site/control-room',
  canonicalControlRoomEntry: 'app/(dev)/control-room.tsx' as const,
  authority: 'observe-request-only' as const,
  repositoryBinding: 'VERIFIED' as const,
  livePublicationReadback: 'UNKNOWN' as SiteContinuityTruthState,
});

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function buildSiteContinuityFingerprint(): string {
  const canonical = [
    SITE_CONTINUITY_SOURCE.projectId,
    SITE_CONTINUITY_SOURCE.repository,
    SITE_CONTINUITY_SOURCE.branch,
    SITE_CONTINUITY_SOURCE.siteRole,
    SITE_CONTINUITY_SOURCE.siteOrigin,
    SITE_CONTINUITY_SOURCE.auditViewLink,
    SITE_CONTINUITY_SOURCE.canonicalControlRoomEntry,
    SITE_CONTINUITY_SOURCE.authority,
  ].join('|');

  return `site:v1:${fnv1a32(canonical)}`;
}

export const SITE_CONTINUITY_FINGERPRINT = buildSiteContinuityFingerprint();

export const SITE_CONTINUITY_COOKIE: SiteContinuityCookie = Object.freeze({
  schema: 'juss/chatgpt-site-continuity-cookie@v1',
  ...SITE_CONTINUITY_SOURCE,
  browserCookie: false,
  fingerprint: SITE_CONTINUITY_FINGERPRINT,
  invalidatesOn: Object.freeze([
    'canonical repository changes',
    'canonical branch changes',
    'audit-mirror origin changes',
    'audit compatibility route changes',
    'site role or authority changes',
    'newer provider/runtime evidence contradicts this binding',
  ]),
});

export function isSiteContinuityCookieCurrent(candidate: SiteContinuityCookie): boolean {
  return candidate.schema === SITE_CONTINUITY_COOKIE.schema
    && candidate.projectId === SITE_CONTINUITY_COOKIE.projectId
    && candidate.repository === SITE_CONTINUITY_COOKIE.repository
    && candidate.branch === SITE_CONTINUITY_COOKIE.branch
    && candidate.siteRole === SITE_CONTINUITY_COOKIE.siteRole
    && candidate.siteOrigin === SITE_CONTINUITY_COOKIE.siteOrigin
    && candidate.auditViewLink === SITE_CONTINUITY_COOKIE.auditViewLink
    && candidate.canonicalControlRoomEntry === SITE_CONTINUITY_COOKIE.canonicalControlRoomEntry
    && candidate.authority === SITE_CONTINUITY_COOKIE.authority
    && candidate.browserCookie === false
    && candidate.fingerprint === SITE_CONTINUITY_FINGERPRINT;
}

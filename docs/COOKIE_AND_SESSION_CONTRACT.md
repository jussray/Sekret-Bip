# Cookie and Session Contract

Se’kret Bip does not use first-party browser cookies for authentication.

## Current session model

- iOS and Android store the Supabase session in Expo SecureStore.
- Expo web stores the session through the existing AsyncStorage adapter so the rich client can refresh its own access token.
- `utils/supabase/client.ts` is the authoritative adapter.

This is intentional. A React Native application cannot share a browser-cookie session model across native and web. Moving the current rich-client session into an HttpOnly cookie would prevent the browser client from maintaining the Supabase session unless a separately approved server-rendered web backend owned the entire auth lifecycle.

## Forbidden cookie use

- no `document.cookie`;
- no custom `Set-Cookie` auth response;
- no analytics, advertising, fingerprinting, replay, or cross-site tracking cookie;
- no teen, journal, voice, media, health, parent-visibility, or safety content in a cookie;
- no cookie that changes parent access, safety visibility, release, deployment, or spending authority.

## Future gate

A future SSR or backend-for-frontend web architecture may use cookies only after it defines the server owner, PKCE/code exchange, refresh rotation, CSRF protection, no-store cache behavior, logout/revocation, and separate native compatibility. Until then, the first-party cookie count remains zero.

# Codespaces Setup

Last reviewed: 2026-07-13

This project runs in GitHub Codespaces with minimal local setup.

## Quick start

1. Open `https://codespaces.new/jussray/Sekret-Bip?quickstart=1`.
2. Wait for the devcontainer to install dependencies and seed `.env.local` from `.env.example`.
3. Hydrate Git LFS assets:

   ```bash
   git lfs pull
   ```

4. Start the web development server:

   ```bash
   npx expo start --web -c
   ```

5. Open the forwarded Expo web port when Codespaces offers it.

## Git LFS in Codespaces

Room backgrounds and companion artwork are stored in Git LFS. The devcontainer installs `git-lfs`, but binary hydration must still be verified after cloning.

```bash
git lfs pull
ls -lh assets/images/bg-raylene-room-day.png
```

A normal multi-megabyte file is hydrated. A tiny text-sized file is an LFS pointer and must not be copied, archived, or used for visual validation.

Always hydrate LFS before:

- running `npm run verify:room-archives`;
- editing or copying room backgrounds;
- validating Expo web bundles that include large image assets;
- comparing production artwork.

## Environment variables

The devcontainer seeds `.env.local` from `.env.example`. Add only local development values.

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_BACKEND_URL=
```

Never commit `.env.local`. Never place service-role credentials, AI provider keys, Cloudflare deployment credentials, or server-only shared secrets in Expo public variables.

## Validation

Run before pushing:

```bash
npm run verify:prepush
```

The repository also uses Playwright and implementation-evidence checks in GitHub Actions. A local build passing does not replace exact-head CI.

Useful focused commands:

```bash
npm run type-check
npm test
npm run lint
npm run verify:bundle
npm run test:e2e
npm run verify:room-archives
```

## Production boundary

Codespaces is a development environment, not production evidence. Production deployment and exact-release verification are documented in `DEPLOYMENT.md`.

# Third-Party Components

Se’kret Bip contains first-party proprietary material and third-party software. The repository’s proprietary `LICENSE` applies only to first-party material authored by or for Juss Ray. It does not replace, narrow, or revoke rights granted by third-party licensors.

## Humanizer-derived voice-pattern catalog

`src/services/ai/aiPatternLinter.ts` retains a pattern catalog derived in part from **humanizer v2.8.2 (`blader/humanizer`)**.

- License: **MIT License**
- Upstream copyright: **Copyright (c) 2025 Siqi Chen**
- Upstream repository: `https://github.com/blader/humanizer`
- Authoritative upstream license text: `https://github.com/blader/humanizer/blob/main/LICENSE`

This provenance must remain discoverable in the source header and `docs/AI_PATTERN_LINTER.md`. Any release containing a substantial portion of that upstream-derived material must preserve the upstream copyright and permission notice required by the MIT License.

## Dependency sources inspected

- Root `package.json`
- Root `package-lock.json` (`lockfileVersion: 3`)
- `tools/figma-vibe-builder/package.json`
- `tools/figma-vibe-builder/package-lock.json`

The root application and nested Figma tool are marked `private` and `UNLICENSED`. License identifiers attached to resolved third-party packages remain untouched. For example, the Figma typings package retains its MIT license identifier and TypeScript retains its Apache-2.0 identifier.

## Distribution rule

Before distributing an app binary, source bundle, hosted package, or other artifact outside the owner-controlled environment, generate an attribution report from the exact resolved lockfiles and retained source-derived notices used for that release and include any copyright notices or license texts required by the applicable third-party licenses.

This file is a boundary and audit record, not a substitute for the upstream license texts. Package metadata, installed package license files, upstream repositories, retained source notices, and release-specific attribution output remain the source of truth for third-party terms.

Do not label third-party code, fonts, SDKs, assets, or derived pattern catalogs as owned by Juss Ray merely because they are used by Se’kret Bip.

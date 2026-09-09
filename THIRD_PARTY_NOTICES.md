# Third-Party Components

Se’kret Bip contains first-party proprietary material and third-party software. The repository’s proprietary `LICENSE` applies only to first-party material authored by or for Juss Ray. It does not replace, narrow, or revoke rights granted by third-party licensors.

## Dependency sources inspected

- Root `package.json`
- Root `package-lock.json` (`lockfileVersion: 3`)
- `tools/figma-vibe-builder/package.json`
- `tools/figma-vibe-builder/package-lock.json`

The root application and nested Figma tool are marked `private` and `UNLICENSED`. License identifiers attached to resolved third-party packages remain untouched. For example, the Figma typings package retains its MIT license identifier and TypeScript retains its Apache-2.0 identifier.

## Distribution rule

Before distributing an app binary, source bundle, hosted package, or other artifact outside the owner-controlled environment, generate an attribution report from the exact resolved lockfiles used for that release and include any copyright notices or license texts required by the applicable third-party licenses.

This file is a boundary and audit record, not a substitute for the upstream license texts. Package metadata, installed package license files, upstream repositories, and release-specific attribution output remain the source of truth for third-party terms.

Do not label third-party code, fonts, SDKs, or assets as owned by Juss Ray merely because they are used by Se’kret Bip.

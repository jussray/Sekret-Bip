# Bip — Dependency Health Audit

**Repo:** [jussray/Bip](https://github.com/jussray/Bip)  
**Branches compared:** 5  
**Generated:** 2026-06-08

## 🚨 Top-level findings

1. **`main` has unresolved Git conflict markers in `package.json`** (`<<<<<<< Updated upstream` / `>>>>>>> Stashed changes`). The file is currently invalid JSON and `npm install` on main will fail. Both sides are listed below as `main (ours)` and `main (theirs)`.
2. **5 MAJOR-version mismatches** across branches — these will all become merge conflicts and runtime breakage if merged as-is.
3. **Expo SDK target disagreement:** `main (ours)` claims `expo ^56.0.8` while every other branch (and the rest of main's deps) align with **Expo SDK 51**. Expo SDK 56 does not exist on the stable channel — this is almost certainly a typo for `^51` that triggered the stash. The master `package.json` standardises on **Expo SDK 51.0.28**.
4. The `restructure/organize-project` and `codespace` branches are slim subsets — they do not introduce conflicts on their own, but they will lose the supabase/router/secure-store deps unless re-merged from main.

## Severity summary

| Status | Count |
|---|---|
| 🔴 MAJOR-MISMATCH | 5 |
| 🟠 minor-mismatch | 3 |
| 🟡 patch/range-mismatch | 6 |
| ⚪ only-in-one | 8 |
| ✅ consistent | 7 |

## Branch / variant legend

- **main (ours)** — local upstream side of the conflict (SDK 56 typo)
- **main (theirs)** — stashed side of the conflict (SDK 51)
- **codespace** — codespace-effective-space-guacamole-4qj7vjr65447h7577
- **jussray-upload-1**
- **restructure/organize-project**

## Full dependency matrix

| Package | Type | Status | main (ours) | main (theirs) | codespace | jussray-upload-1 | restructure/organize-project |
|---|---|---|---|---|---|---|---|
| `expo` | dep | 🔴 MAJOR-MISMATCH | ^56.0.8 | ^51.0.0 | ^51.0.0 | ~51.0.28 | ^51.0.0 |
| `expo-constants` | dep | 🔴 MAJOR-MISMATCH | ^56.0.17 | — | — | ~16.0.2 | — |
| `expo-linking` | dep | 🔴 MAJOR-MISMATCH | ^56.0.13 | — | — | ~6.3.1 | — |
| `react-native-gesture-handler` | dep | 🔴 MAJOR-MISMATCH | ^3.0.0 | — | — | ~2.16.1 | — |
| `babel-preset-expo` | devDep | 🔴 MAJOR-MISMATCH | ^56.0.14 | ^10.0.0 | ^10.0.0 | ~11.0.0 | ^10.0.0 |
| `@react-native-async-storage/async-storage` | dep | 🟠 minor-mismatch | 1.23.1 | ^1.22.0 | ^1.22.0 | 1.23.1 | ^1.22.0 |
| `react-native` | dep | 🟠 minor-mismatch | 0.74.5 | 0.73.6 | 0.73.6 | 0.73.6 | 0.73.6 |
| `react-native-safe-area-context` | dep | 🟠 minor-mismatch | 4.10.5 | ^4.8.0 | ^4.8.0 | 4.10.5 | ^4.8.0 |
| `expo-router` | dep | 🟡 patch/range-mismatch | ~3.5.23 | — | — | ~3.5.23 | ^3.5.0 |
| `expo-status-bar` | dep | 🟡 patch/range-mismatch | ~1.12.1 | ^1.12.0 | ^1.12.0 | ~1.12.1 | ^1.12.0 |
| `react-native-web` | dep | 🟡 patch/range-mismatch | ~0.19.13 | ~0.19.10 | ~0.19.10 | ~0.19.10 | — |
| `@types/react` | devDep | 🟡 patch/range-mismatch | ~18.2.79 | ^18.2.0 | ^18.2.0 | ~18.2.79 | ^18.2.0 |
| `babel-plugin-module-resolver` | devDep | 🟡 patch/range-mismatch | ^5.0.3 | — | — | ^5.0.0 | — |
| `typescript` | devDep | 🟡 patch/range-mismatch | ~5.3.3 | ^5.3.0 | ^5.3.0 | ^5.3.3 | ^5.3.0 |
| `@supabase/supabase-js` | dep | ⚪ only-in-one | ^2.107.0 | — | — | — | — |
| `expo-av` | dep | ⚪ only-in-one | ~14.0.7 | — | — | — | — |
| `expo-font` | dep | ⚪ only-in-one | — | — | — | ~12.0.9 | — |
| `expo-haptics` | dep | ⚪ only-in-one | ~56.0.3 | — | — | — | — |
| `expo-image-picker` | dep | ⚪ only-in-one | ~56.0.15 | — | — | — | — |
| `expo-secure-store` | dep | ⚪ only-in-one | ~13.0.2 | — | — | — | — |
| `expo-splash-screen` | dep | ⚪ only-in-one | — | — | — | ~0.27.5 | — |
| `react-native-url-polyfill` | dep | ⚪ only-in-one | ^3.0.0 | — | — | — | — |
| `@expo/metro-runtime` | dep | ✅ consistent | ~3.2.3 | ~3.2.3 | ~3.2.3 | — | — |
| `expo-linear-gradient` | dep | ✅ consistent | ~13.0.2 | — | — | ~13.0.2 | — |
| `react` | dep | ✅ consistent | 18.2.0 | 18.2.0 | 18.2.0 | 18.2.0 | 18.2.0 |
| `react-dom` | dep | ✅ consistent | 18.2.0 | 18.2.0 | 18.2.0 | 18.2.0 | — |
| `react-native-screens` | dep | ✅ consistent | ~3.31.1 | — | — | ~3.31.1 | — |
| `@babel/core` | devDep | ✅ consistent | ^7.24.0 | — | — | ^7.24.0 | — |
| `@types/react-native` | devDep | ✅ consistent | — | ^0.73.0 | ^0.73.0 | ~0.73.0 | ^0.73.0 |

## 🔴 MAJOR breaking-change risks (must fix before merge)

| Package | Versions in play | Why it breaks | Master resolution |
|---|---|---|---|
| `expo` | `main (ours): ^56.0.8`, `main (theirs): ^51.0.0`, `codespace: ^51.0.0`, `jussray-upload-1: ~51.0.28`, `restructure/organize-project: ^51.0.0` | Expo SDK 56 does not exist; SDK 51 is the actual target. Mixed majors mean `expo-*` peer ranges will hard-fail. | `~51.0.28` |
| `expo-constants` | `main (ours): ^56.0.17`, `jussray-upload-1: ~16.0.2` | `^56` would require SDK 56; SDK 51 ships `~16.0.2`. | `~16.0.2` |
| `expo-linking` | `main (ours): ^56.0.13`, `jussray-upload-1: ~6.3.1` | `^56` doesn't exist; SDK 51 ships `~6.3.1`. | `~6.3.1` |
| `react-native-gesture-handler` | `main (ours): ^3.0.0`, `jussray-upload-1: ~2.16.1` | v3 is pre-Fabric and incompatible with RN 0.74 / Reanimated v3. SDK 51 expects `~2.16.1`. | `~2.16.1` |
| `babel-preset-expo` | `main (ours): ^56.0.14`, `main (theirs): ^10.0.0`, `codespace: ^10.0.0`, `jussray-upload-1: ~11.0.0`, `restructure/organize-project: ^10.0.0` | Preset major must match the Expo SDK major (`~11.0.0` for SDK 51). `^10` is SDK 50, `^56` doesn't exist. | `~11.0.0` |

## 🟠 Minor / patch drift to normalise

| Package | Versions | Master |
|---|---|---|
| `@react-native-async-storage/async-storage` | `main (ours): 1.23.1`, `main (theirs): ^1.22.0`, `codespace: ^1.22.0`, `jussray-upload-1: 1.23.1`, `restructure/organize-project: ^1.22.0` | `1.23.1` |
| `expo-router` | `main (ours): ~3.5.23`, `jussray-upload-1: ~3.5.23`, `restructure/organize-project: ^3.5.0` | `~3.5.23` |
| `expo-status-bar` | `main (ours): ~1.12.1`, `main (theirs): ^1.12.0`, `codespace: ^1.12.0`, `jussray-upload-1: ~1.12.1`, `restructure/organize-project: ^1.12.0` | `~1.12.1` |
| `react-native` | `main (ours): 0.74.5`, `main (theirs): 0.73.6`, `codespace: 0.73.6`, `jussray-upload-1: 0.73.6`, `restructure/organize-project: 0.73.6` | `0.74.5` |
| `react-native-safe-area-context` | `main (ours): 4.10.5`, `main (theirs): ^4.8.0`, `codespace: ^4.8.0`, `jussray-upload-1: 4.10.5`, `restructure/organize-project: ^4.8.0` | `4.10.5` |
| `react-native-web` | `main (ours): ~0.19.13`, `main (theirs): ~0.19.10`, `codespace: ~0.19.10`, `jussray-upload-1: ~0.19.10` | `~0.19.10` |
| `@types/react` | `main (ours): ~18.2.79`, `main (theirs): ^18.2.0`, `codespace: ^18.2.0`, `jussray-upload-1: ~18.2.79`, `restructure/organize-project: ^18.2.0` | `~18.2.79` |
| `babel-plugin-module-resolver` | `main (ours): ^5.0.3`, `jussray-upload-1: ^5.0.0` | `^5.0.0` |
| `typescript` | `main (ours): ~5.3.3`, `main (theirs): ^5.3.0`, `codespace: ^5.3.0`, `jussray-upload-1: ^5.3.3`, `restructure/organize-project: ^5.3.0` | `~5.3.3` |

## ⚪ Packages present in only one branch (decide: keep or drop)

| Package | Type | Source branch | Version | Recommendation |
|---|---|---|---|---|
| `@supabase/supabase-js` | dep | main (ours) | ^2.107.0 | **Keep — included in master** |
| `expo-av` | dep | main (ours) | ~14.0.7 | **Keep — included in master** |
| `expo-font` | dep | jussray-upload-1 | ~12.0.9 | **Keep — included in master** |
| `expo-haptics` | dep | main (ours) | ~56.0.3 | **Keep — included in master** |
| `expo-image-picker` | dep | main (ours) | ~56.0.15 | **Keep — included in master** |
| `expo-secure-store` | dep | main (ours) | ~13.0.2 | **Keep — included in master** |
| `expo-splash-screen` | dep | jussray-upload-1 | ~0.27.5 | **Keep — included in master** |
| `react-native-url-polyfill` | dep | main (ours) | ^3.0.0 | **Keep — included in master** |

## ✅ Master `package.json` (conflict-free, SDK 51 aligned)

This is the proposed single source of truth, pushed to a new branch on the repo.

```json
{
  "name": "sekret-bip",
  "version": "1.0.0",
  "description": "A private emotional wellness and self-expression app built with React Native and Expo.",
  "main": "expo-router/entry",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web",
    "test": "jest",
    "lint": "eslint . --ext .ts,.tsx",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@expo/metro-runtime": "~3.2.3",
    "@react-native-async-storage/async-storage": "1.23.1",
    "@supabase/supabase-js": "^2.107.0",
    "expo": "~51.0.28",
    "expo-av": "~14.0.7",
    "expo-constants": "~16.0.2",
    "expo-font": "~12.0.9",
    "expo-haptics": "~13.0.1",
    "expo-image-picker": "~15.0.7",
    "expo-linear-gradient": "~13.0.2",
    "expo-linking": "~6.3.1",
    "expo-router": "~3.5.23",
    "expo-secure-store": "~13.0.2",
    "expo-splash-screen": "~0.27.5",
    "expo-status-bar": "~1.12.1",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "react-native": "0.74.5",
    "react-native-gesture-handler": "~2.16.1",
    "react-native-safe-area-context": "4.10.5",
    "react-native-screens": "~3.31.1",
    "react-native-url-polyfill": "^2.0.0",
    "react-native-web": "~0.19.10"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "@types/react": "~18.2.79",
    "babel-plugin-module-resolver": "^5.0.0",
    "babel-preset-expo": "~11.0.0",
    "typescript": "~5.3.3"
  }
}
```

## Recommended merge sequence

1. Check out the new branch `chore/dep-audit-master` (this audit pushed it).
2. Open a PR titled **"chore(deps): unify package.json on Expo SDK 51"** into `main`.
3. Delete `package-lock.json` / `yarn.lock` and re-run `npm install` (or `npx expo install --check`) to regenerate a lockfile that matches.
4. After merge, rebase `jussray-upload-1` and `restructure/organize-project` onto the new `main`. Both should rebase cleanly because their dep sets are now strict subsets.
5. The `codespace-effective-space-guacamole-...` branch is a Codespaces scratch branch — recommend deleting after the rebase, or merging only its `scripts` additions (already included in master).

## Sources used for SDK 51 version pins

- [Expo SDK 51 release notes](https://expo.dev/changelog/2024/05-07-sdk-51) — RN 0.74, React 18.2, expo-router 3.5, babel-preset-expo 11.
- [`expo install` resolved versions](https://docs.expo.dev/versions/v51.0.0/) for `expo-*` packages.

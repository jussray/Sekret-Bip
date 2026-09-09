import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

type AppVariant = 'teen' | 'parent';

const EXPO_OWNER = 'sekret-bip';
const TEEN_EAS_PROJECT_ID = '3f2f2425-7119-43dd-bd7d-5bc752dabead';
const PARENT_EAS_PROJECT_ID = '40fc6484-b1e6-4668-b9bc-c7515684f817';

type ExpoExtra = NonNullable<ExpoConfig['extra']>;
type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

function prepareCloudflareReleaseSource(): void {
  if (process.env.CF_PAGES !== '1') return;

  const cwd = process.cwd();
  const scriptPath = path.join(cwd, 'scripts', 'bootstrap-release-metadata-source.mjs');
  execFileSync(process.execPath, [scriptPath], {
    cwd,
    env: process.env,
    stdio: 'inherit',
  });
}

function getAppVariant(): AppVariant {
  const explicitVariant = process.env.APP_VARIANT ?? process.env.EXPO_PUBLIC_APP_VARIANT;

  if (explicitVariant === 'parent') return 'parent';
  if (explicitVariant === 'teen') return 'teen';

  const buildProfile = process.env.EAS_BUILD_PROFILE ?? '';
  return buildProfile.startsWith('parent-') ? 'parent' : 'teen';
}

function getBaseExtra(base: ExpoConfig): ExpoExtra {
  return base.extra && typeof base.extra === 'object' ? base.extra : {};
}

function isSplashPlugin(plugin: ExpoPlugin): boolean {
  return plugin === 'expo-splash-screen' ||
    (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen');
}

// TODO(store-release): Supply real 1024×1024 square production icons before
// submitting to the App Store or Google Play:
//   assets/images/icon.png        — teen variant
//   assets/images/parent-icon.png — parent variant
// Once real icons exist, restore:
//   top-level `icon` field pointing to the appropriate file
//   `android.adaptiveIcon.foregroundImage` pointing to the appropriate file
// Until then both fields are intentionally omitted so `expo prebuild` can
// resolve a valid MIME type and the build does not fail with
// "Could not find MIME for Buffer <null>".

export default ({ config }: ConfigContext): ExpoConfig => {
  prepareCloudflareReleaseSource();

  const variant = getAppVariant();
  const isParent = variant === 'parent';
  const base = appJson.expo as ExpoConfig;
  const baseExtra = getBaseExtra(base);

  const easProjectId = isParent ? PARENT_EAS_PROJECT_ID : TEEN_EAS_PROJECT_ID;
  const plugins = (base.plugins ?? []).filter((plugin) => !isSplashPlugin(plugin));

  return ({
    ...config,
    ...base,
    owner: EXPO_OWNER,
    name: isParent ? "Se'kret Bip Parent" : "Se'kret Bip",
    slug: isParent ? 'sekret-bip-parents-' : 'sekret-bip',
    scheme: isParent ? 'sekretbipparent' : 'sekretbip',
    // icon intentionally omitted — placeholder text files are not valid images.
    // See TODO above.
    plugins: [
      ...plugins,
      [
        'expo-splash-screen',
        {
          // Color-only splash: no image reference. The opening screen is
          // rendered by React Native components (see docs/MISSING_ASSETS.md).
          backgroundColor: '#160028',
        },
      ],
    ],
    ios: {
      ...base.ios,
      bundleIdentifier: isParent ? 'com.sekretbip.parent' : 'com.sekretbip.app',
      infoPlist: {
        ...((base.ios as { infoPlist?: Record<string, unknown> })?.infoPlist),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...base.android,
      package: isParent ? 'com.sekretbip.parent' : 'com.sekretbip.app',
      // adaptiveIcon.foregroundImage intentionally omitted — placeholder text
      // files are not valid images. backgroundColor alone is valid in SDK 56.
      adaptiveIcon: {
        backgroundColor: '#160028',
      },
    },
    extra: {
      ...baseExtra,
      appVariant: variant,
      eas: {
        projectId: easProjectId,
      },
    },
  }) as unknown as ExpoConfig;
};

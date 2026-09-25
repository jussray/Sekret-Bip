import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';
import appJson from './app.json';

type AppVariant = 'teen' | 'parent';

const EXPO_OWNER = 'sekret-bip';
const TEEN_EAS_PROJECT_ID = '3f2f2425-7119-43dd-bd7d-5bc752dabead';
const PARENT_EAS_PROJECT_ID = '40fc6484-b1e6-4668-b9bc-c7515684f817';
const STORE_ASSET_DIR = './assets/generated';

type ExpoExtra = NonNullable<ExpoConfig['extra']>;
type ExpoPlugin = NonNullable<ExpoConfig['plugins']>[number];

function runNodeScript(scriptName: string, args: string[] = [], stdio: 'inherit' | 'ignore' = 'inherit'): void {
  const cwd = process.cwd();
  const scriptPath = path.join(cwd, 'scripts', scriptName);
  execFileSync(process.execPath, [scriptPath, ...args], {
    cwd,
    env: process.env,
    stdio,
  });
}

function prepareCloudflareReleaseSource(): void {
  if (process.env.CF_PAGES !== '1') return;
  runNodeScript('bootstrap-release-metadata-source.mjs');
}

function prepareStoreAssets(): void {
  // Store icons are deterministic build artifacts generated from source code.
  // Generating them during config resolution keeps iOS and Android on the same
  // canonical icon source while avoiding stale or placeholder binary assets.
  runNodeScript('generate-store-icons.mjs', ['--quiet'], 'ignore');
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

export default ({ config }: ConfigContext): ExpoConfig => {
  prepareCloudflareReleaseSource();
  prepareStoreAssets();

  const variant = getAppVariant();
  const isParent = variant === 'parent';
  const base = appJson.expo as ExpoConfig;
  const baseExtra = getBaseExtra(base);

  const easProjectId = isParent ? PARENT_EAS_PROJECT_ID : TEEN_EAS_PROJECT_ID;
  const icon = isParent
    ? `${STORE_ASSET_DIR}/parent-icon.png`
    : `${STORE_ASSET_DIR}/teen-icon.png`;
  const adaptiveForeground = isParent
    ? `${STORE_ASSET_DIR}/parent-adaptive-foreground.png`
    : `${STORE_ASSET_DIR}/teen-adaptive-foreground.png`;
  const storeListingIcon = isParent
    ? `${STORE_ASSET_DIR}/parent-play-store-icon.png`
    : `${STORE_ASSET_DIR}/teen-play-store-icon.png`;
  const plugins = (base.plugins ?? []).filter((plugin) => !isSplashPlugin(plugin));

  return ({
    ...config,
    ...base,
    owner: EXPO_OWNER,
    name: isParent ? "Se'kret Bip Parent" : "Se'kret Bip",
    slug: isParent ? 'sekret-bip-parents-' : 'sekret-bip',
    scheme: isParent ? 'sekretbipparent' : 'sekretbip',
    icon,
    plugins: [
      ...plugins,
      [
        'expo-splash-screen',
        {
          // Color-only native splash. The React Native opening screen owns the
          // visual story after launch, so store artwork never becomes UI chrome.
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
      adaptiveIcon: {
        backgroundColor: '#160028',
        foregroundImage: adaptiveForeground,
      },
    },
    extra: {
      ...baseExtra,
      appVariant: variant,
      storeAssets: {
        appIcon: icon,
        androidAdaptiveForeground: adaptiveForeground,
        googlePlayListingIcon: storeListingIcon,
      },
      eas: {
        projectId: easProjectId,
      },
    },
  }) as unknown as ExpoConfig;
};

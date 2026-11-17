// babel.config.js
// Se'kret Bip — Babel configuration
//
// `runtime: 'automatic'` on babel-preset-expo enables the React 17+
// JSX transform so files do NOT need `import React` to use JSX.
// This is required for the Vercel web export (`expo export -p web`) to
// succeed after React imports were removed from screen files.
//
// babel-plugin-module-resolver must stay in sync with tsconfig.json paths.
// After changing this file, restart Expo with: npx expo start --clear

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
        },
      ],
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            // ── Canonical alias (all new code) ────────────────────────────
            '@':            './src',

            // ── Legacy aliases → src/ direct (no shim hop) ───────────────
            // Retire these in Step 5 once screens/ is gone.
            '@hooks':       './src/hooks',
            '@utils':       './src/utils',
            '@components':  './src/components',
            '@constants':   './src/constants',
            '@types':       './src/types',
            '@screens':     './screens',
          },
        },
      ],
    ],
  };
};

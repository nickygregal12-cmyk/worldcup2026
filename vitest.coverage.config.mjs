export default {
  // Standalone config — it does not extend vite.config.js, so the automatic JSX
  // runtime has to be pinned here as well. Without it esbuild falls back to the
  // classic runtime and every rendered component needs an `import React` that
  // nothing references. Keep this in step with vite.config.js.
  esbuild: { jsx: 'automatic' },
  test: {
    // Same opt-in DOM model as vite.config.js: node by default, jsdom only where a
    // file's `// @vitest-environment jsdom` docblock asks for it. setupFiles must be
    // repeated here because this config does not extend vite.config.js — without it
    // the coverage run would execute the interaction tests with no between-test
    // cleanup and they would leak into each other.
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'scripts/**/*.{test,spec}.{js,mjs}',
      'netlify/functions/**/*.{test,spec}.js',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: 'coverage/h1',
      all: true,
      include: [
        'src/app/**/*.{js,jsx}',
        'src/design-system/**/*.{js,jsx}',
        'src/home/**/*.{js,jsx}',
        'src/tournament/**/*.{js,jsx}',
        'src/auth/**/*.{js,jsx}',
        'src/guest/**/*.{js,jsx}',
        'src/predictions/**/*.{js,jsx}',
        'src/journey/**/*.{js,jsx}',
        'src/koPredictor/**/*.{js,jsx}',
        'src/grace/**/*.{js,jsx}',
        'src/results/**/*.{js,jsx}',
        'src/matchCentre/**/*.{js,jsx}',
        'src/bracketHealth/**/*.{js,jsx}',
        'src/player/**/*.{js,jsx}',
        'src/teamProfile/**/*.{js,jsx}',
        'src/observability/**/*.{js,jsx}',
        'src/admin/**/*.{js,jsx}',
        'src/leagues/**/*.{js,jsx}',
        'src/runtime/**/*.{js,jsx}',
        'src/resolver/**/*.{js,jsx}',
        'src/config/**/*.{js,jsx}',
        'src/contracts/**/*.{js,jsx}',
        'src/lib/**/*.{js,jsx}',
      ],
      exclude: [
        'src/**/*.test.{js,jsx}',
        'src/**/__tests__/**',
        'src/testFixtures/**',
        'src/pages/**',
        'src/components/**',
        'src/store/**',
        'src/assets/**',
        'src/**/*.module.css',
      ],
    },
  },
}

// Scope test discovery to this repo's own roots. Without an explicit include,
// vitest descends into worldcup2026/ (a nested clone of the legacy project kept
// for reference) and fails on its duplicated React tree. Mirrors the include
// set in vitest.coverage.config.mjs.
export default {
  test: {
    environment: 'node',
    include: [
      'src/**/*.{test,spec}.{js,jsx}',
      'scripts/**/*.{test,spec}.{js,mjs}',
      'netlify/functions/**/*.{test,spec}.js',
    ],
  },
}

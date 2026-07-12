// Global test setup. Vitest runs this before every test file, in BOTH environments.
//
// The default environment is `node` (see vite.config.js). There, `document` does
// not exist, the branch below is skipped, and the file costs one import — the
// existing pure-model and renderToStaticMarkup suites are untouched by it.
//
// A test file opts into a DOM with a `// @vitest-environment jsdom` docblock on
// its first line. Those files get Testing Library's between-test cleanup, which
// unmounts every rendered tree and empties the container so state (a SelectField
// left open, a ScoreInput's confirmed-values Set) cannot leak into the next test.
// Testing Library registers that hook itself only when `globals: true` puts
// `afterEach` on globalThis; this suite deliberately does not use globals — every
// existing test imports its vitest helpers explicitly — so we register it here.
import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react')
  afterEach(cleanup)
}

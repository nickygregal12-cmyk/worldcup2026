import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import {
  FRONTEND_COMPONENT_HARD_CAP,
  FRONTEND_COMPONENT_REVIEW_TARGET,
  FRONTEND_STYLESHEET_HARD_CAP,
  FRONTEND_STYLESHEET_REVIEW_TARGET,
  TEMPORARY_TEST_FIXTURE_CAPS,
} from './architecture-policy.mjs'
import { countLines, walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const errors = []
const fail = message => errors.push(message)

const envExample = read('.env.example')
if (!envExample.includes('VITE_ENABLE_TIME_TRAVEL=false')) {
  fail('.env.example must default VITE_ENABLE_TIME_TRAVEL=false')
}
if (!envExample.includes('Staging-only owner tool')) {
  fail('.env.example must explain that time travel is a staging-only owner tool')
}

const allSourceFiles = [
  ...walkFiles(root, 'src'),
  ...walkFiles(root, 'scripts'),
  ...walkFiles(root, 'netlify'),
].filter(file => /\.(?:js|jsx|mjs)$/.test(file))

const eslintDisableComment = /(?:^|\s)\/\/\s*eslint-disable(?:-next-line|-line)?\b/
const eslintDisableReason = /(?:^|\s)\/\/\s*eslint-disable(?:-next-line|-line)?\b[^\n]*--\s+\S/
const eslintDisableItems = []
for (const file of allSourceFiles) {
  const lines = read(file).split('\n')
  lines.forEach((line, index) => {
    if (eslintDisableComment.test(line)) {
      const isLive = !file.includes('/__tests__/') && !file.startsWith('src/testFixtures/')
      const hasReason = eslintDisableReason.test(line)
      eslintDisableItems.push({ file, line: index + 1, isLive, hasReason })
    }
  })
}

// Re-based 38→48 / 23→30 after the Leagues and Home v2 rebuilds added reasoned disables without
// updating the ratchet: the growth is the established no-unused-vars React-import pattern plus
// four justified react-hooks exceptions in Leagues.jsx, all carrying reasons after the dashes.
//
// TIGHTENED 48→45 / 30→29 at Stage DP-PRIMITIVES. Vitest was transforming JSX with esbuild's
// CLASSIC runtime, so every rendered file needed an `import React` that nothing referenced —
// each one bought with a no-unused-vars disable. vite.config.js now pins the automatic runtime
// (matching what plugin-react already did for the browser build), so that import is dead weight.
// The four design-system files this stage rewrote dropped theirs. The remaining React-import
// disables are now equally unnecessary and can be swept in a follow-up, lowering these caps
// again — the ratchet only ever tightens.
//
// TIGHTENED 45→44 / 29→28 at Stage DP-HOME — the first instalment of exactly that sweep.
// Home's five re-cut components (HomeDashboard, HomeHero, HomeMatchCard, HomeSidebar and the
// new design-system TeamBadge) carry no `import React` and therefore no disable. Every page
// still holding one can shed it the same way at its own re-cut, dropping these caps further.
// 44 -> 43 at the Groups re-cut: TeamLabel's test no longer imports React just to
// satisfy the classic JSX runtime, so its no-unused-vars bypass went with it.
const totalDisableCap = 43
const liveDisableCap = 28
if (eslintDisableItems.length > totalDisableCap) fail(`eslint-disable total increased to ${eslintDisableItems.length}/${totalDisableCap}`)
if (eslintDisableItems.length < totalDisableCap) fail(`eslint-disable total fell to ${eslintDisableItems.length}; lower the H1 total cap from ${totalDisableCap}`)
const liveCount = eslintDisableItems.filter(item => item.isLive).length
if (liveCount > liveDisableCap) fail(`live eslint-disable total increased to ${liveCount}/${liveDisableCap}`)
if (liveCount < liveDisableCap) fail(`live eslint-disable total fell to ${liveCount}; lower the H1 live cap from ${liveDisableCap}`)
for (const item of eslintDisableItems) {
  if (!item.hasReason) fail(`${item.file}:${item.line} has eslint-disable without a reason after --`)
}

const main = read('src/main.jsx')
if (/src\/testFixtures|testFixtures\//.test(main)) fail('src/main.jsx must not import deterministic visual fixtures')
if (!main.includes('<Stage14ErrorFixture />')) fail('Stage14ErrorFixture mount is missing from root error-boundary test path')
const stage14Fixture = read('src/observability/Stage14ErrorFixture.jsx')
if (!stage14Fixture.includes('!import.meta.env.DEV')) fail('Stage14ErrorFixture must be gated to DEV only')
if (stage14Fixture.includes('VITE_') || stage14Fixture.includes('localStorage')) {
  fail('Stage14ErrorFixture must not be activated by deployable VITE flags or browser storage')
}

for (const [file, cap] of Object.entries(TEMPORARY_TEST_FIXTURE_CAPS)) {
  if (!exists(file)) fail(`Temporary test-fixture cap points to a missing file: ${file}`)
  else {
    const lines = countLines(read(file))
    if (lines > cap) fail(`${file} grew to ${lines} lines above its frozen ${cap}-line fixture cap`)
    if (lines < cap) fail(`${file} shrank to ${lines} lines; lower its fixture cap from ${cap}`)
  }
}
for (const file of walkFiles(root, 'src/testFixtures').filter(candidate => /\.(?:js|jsx)$/.test(candidate))) {
  const lines = countLines(read(file))
  const cap = TEMPORARY_TEST_FIXTURE_CAPS[file]
  if (cap === undefined && lines > FRONTEND_COMPONENT_HARD_CAP) {
    fail(`${file} is ${lines} lines; test fixtures share the ${FRONTEND_COMPONENT_HARD_CAP}-line hard cap`)
  }
}

const charter = read('docs/EURO28-DESIGN-CHARTER.md')
for (const marker of [
  'approximately 200 lines is the review target',
  'approximately 250 lines is the review target',
  '400 lines is the hard limit',
  'The hard cap also applies to test fixtures',
  'Stage14ErrorFixture is the only root-mounted error-boundary fixture',
]) {
  if (!charter.includes(marker)) fail(`Design Charter missing H1 marker: ${marker}`)
}

const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
for (const marker of [
  '| `.env.example` time-travel default | ✅ FUNCTIONAL |',
  '| Coverage threshold and no-decrease ratchet | ✅ FUNCTIONAL |',
  '| `eslint-disable` governance | ✅ FUNCTIONAL |',
  '| Frozen bridge melt schedule | ✅ FUNCTIONAL |',
  '| Visual fixture production gating | ✅ FUNCTIONAL |',
  '| Size governance clarification | ✅ FUNCTIONAL |',
]) {
  if (!ledger.includes(marker)) fail(`Functional ledger missing H1 marker: ${marker}`)
}

if (FRONTEND_COMPONENT_REVIEW_TARGET !== 200) fail('Component review target must be 200 lines')
if (FRONTEND_STYLESHEET_REVIEW_TARGET !== 250) fail('Stylesheet review target must be 250 lines')
if (FRONTEND_COMPONENT_HARD_CAP !== 400) fail('Component hard cap must be 400 lines')
if (FRONTEND_STYLESHEET_HARD_CAP !== 400) fail('Stylesheet hard cap must be 400 lines')

if (errors.length) {
  console.error('Euro Stage 13G-H1 bypass governance audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-H1 bypass governance audit passed.')
console.log(`Time travel: .env.example defaults false; staging-only local enablement is explicit.`)
console.log(`eslint-disable governance: ${eslintDisableItems.length}/${totalDisableCap} total, ${liveCount}/${liveDisableCap} live, every disable has a reason.`)
console.log('Fixture gating: deterministic fixtures stay outside the production graph; Stage14ErrorFixture is DEV-only.')
console.log('Size governance: 200/250 review targets, 400/400 hard caps, test-fixture cap ratchet active.')

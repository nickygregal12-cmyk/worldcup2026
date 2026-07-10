// Guard — native OS form controls must not re-enter live product code.
//
// Why this is a sibling audit and not more lines inside
// check-stage13g-interaction-enforcement.mjs:
//
//   1. Different definition of "live". That audit walks ACTIVE_UI_ROOTS, a
//      hand-maintained array that had already drifted away from the real
//      module graph (src/welcome, src/timePhase, src/resolver and
//      src/App.jsx are live and were unpoliced). This audit walks the graph
//      from src/main.jsx. Two scope models in one file means the stricter one
//      silently wins arguments it should lose.
//   2. Different enforcement model. That audit asserts absolute zero on the
//      surfaces it covers — "these are clean, keep them clean". This one is a
//      ratcheting allowlist over known debt. Folding an allowlist into a
//      zero-rule turns "clean" into "clean unless someone edits an array",
//      which is exactly how the Leagues regression survived.
//   3. Different blast radius. That audit also asserts admin confirmation
//      copy, refresh policy, migration sequencing and the foundation-class
//      ratchet. Native-control policy has nothing to do with any of those.
//
// The two share one allowlist (lib/nativeControlPolicy.mjs), so there is
// still exactly one place that records this debt.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { collectLiveSourceFiles } from './lib/liveModuleGraph.mjs'
import {
  CONTROL_IDS,
  CONTROL_RULES,
  MARKER_PATTERN,
  PENDING_RECUT_ALLOWLIST,
  PRIMITIVE_SOURCES,
  allowanceFor,
  countNativeControls,
} from './lib/nativeControlPolicy.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const describe = id => CONTROL_RULES.find(rule => rule.id === id).describe

const liveFiles = collectLiveSourceFiles(root)
const liveSet = new Set(liveFiles)
const observed = new Map()

for (const file of liveFiles) {
  const counts = countNativeControls(read(file))
  if (Object.keys(counts).length > 0) observed.set(file, counts)
}

// 1. Nothing may exceed its allowance, and nothing unlisted may appear.
for (const [file, counts] of observed) {
  for (const [controlId, actual] of Object.entries(counts)) {
    const allowed = allowanceFor(file, controlId)
    if (actual > allowed) {
      const detail = allowed === 0 ? 'not allowlisted' : `allowlisted for ${allowed}`
      fail(`${file}: ${actual}x ${describe(controlId)} (${detail})`)
    }
  }
}

// 2. The ratchet only turns one way. A count that dropped must be recorded in
//    the same commit, or the allowlist quietly re-opens room for a regression.
for (const entry of PENDING_RECUT_ALLOWLIST) {
  if (!MARKER_PATTERN.test(entry.marker)) fail(`${entry.file}: malformed debt marker`)
  if (!liveSet.has(entry.file)) {
    fail(`${entry.file}: allowlisted but not live; drop the entry`)
    continue
  }
  const counts = observed.get(entry.file) ?? {}
  for (const [controlId, allowed] of Object.entries(entry.counts)) {
    const actual = counts[controlId] ?? 0
    if (actual < allowed) {
      fail(`${entry.file}: ${actual}x ${describe(controlId)} but allowlisted for ${allowed}; lower the entry`)
    }
  }
}

for (const [file, counts] of Object.entries(PRIMITIVE_SOURCES)) {
  if (!liveSet.has(file)) fail(`${file}: primitive source is not live`)
  for (const [controlId, allowed] of Object.entries(counts)) {
    const actual = observed.get(file)?.[controlId] ?? 0
    if (actual < allowed) fail(`${file}: primitive allowance ${allowed} exceeds actual ${actual}; lower it`)
  }
}

// 3. Self-wiring, same discipline as the audits either side of it.
const packageJson = JSON.parse(read('package.json'))
if (!packageJson.scripts['audit:native-controls']) fail('audit:native-controls script is not registered')
if (!packageJson.scripts.check.includes('npm run audit:native-controls')) fail('npm run check must include the native-controls audit')

if (errors.length > 0) {
  console.error('Native control surface audit failed:')
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

const pendingTotal = PENDING_RECUT_ALLOWLIST.reduce(
  (sum, entry) => sum + Object.values(entry.counts).reduce((a, b) => a + b, 0),
  0,
)
const byMarker = new Map()
for (const entry of PENDING_RECUT_ALLOWLIST) {
  const count = Object.values(entry.counts).reduce((a, b) => a + b, 0)
  byMarker.set(entry.marker, (byMarker.get(entry.marker) ?? 0) + count)
}

console.log('Native control surface audit passed.')
console.log(`Live source files scanned: ${liveFiles.length}`)
console.log(`Control classes enforced: ${CONTROL_IDS.join(', ')}`)
console.log(`Pending native-control ratchet: ${pendingTotal}`)
for (const [marker, count] of [...byMarker].sort()) console.log(`  ${marker} — ${count}`)

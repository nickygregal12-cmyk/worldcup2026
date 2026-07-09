// Main-chain audit — visual-affecting changes must not land without the visual
// tier having seen them.
//
// The visual tier (npm run check:visual) needs a browser and a seeded local
// database, so it deliberately does NOT run inside npm run check. This audit is
// the honest bridge: check:visual records a content hash of every watched
// visual-affecting file (src CSS/JSX, reference prototypes, the visual tier
// itself, blessed baselines) in visual-tests/visual-run-record.json when it
// passes. Here we recompute that hash; a mismatch means visual-affecting files
// changed since the tier last ran, and the main chain fails until it is re-run.
//
// While no baselines are blessed the gate is unarmed: this audit still verifies
// the record file is coherent, but a hash mismatch only warns, because there is
// no baseline a change could silently violate yet.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { computeWatchedHash, readRunRecord } from '../visual-tests/lib/visualLib.mjs'
import { BASELINE_ROOT } from '../visual-tests/visual.config.mjs'

const root = process.cwd()
const record = readRunRecord()

if (!record) {
  console.error('Visual-freshness audit failed: visual-tests/visual-run-record.json is missing.')
  console.error('Run npm run check:visual once to create it.')
  process.exit(1)
}

const baselineDir = path.join(root, BASELINE_ROOT)
const armed = fs.existsSync(baselineDir) && fs.readdirSync(baselineDir).some(name => name.endsWith('.png'))
const currentHash = computeWatchedHash()
const fresh = currentHash === record.watchedHash

if (fresh) {
  console.log(`Visual-freshness audit passed. Watched visual files unchanged since the visual tier last ran (${record.mode} at ${record.recordedAt}, commit ${record.headCommit}).`)
  process.exit(0)
}

if (!armed) {
  console.log('Visual-freshness audit passed with notice: watched visual files changed, but the')
  console.log('regression gate is not armed yet (no blessed baselines). Once baselines are blessed,')
  console.log('this state fails the main chain until npm run check:visual is re-run.')
  process.exit(0)
}

console.error('Visual-freshness audit failed: visual-affecting files (src CSS/JSX, reference')
console.error(`prototypes, visual tier or baselines) changed since the visual tier last ran (${record.recordedAt}).`)
console.error('Run: npm run check:visual   — then commit the updated visual-tests/visual-run-record.json.')
process.exit(1)

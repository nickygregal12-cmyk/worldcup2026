// Visual regression gate: compares the latest capture against blessed baselines.
// HARD pass/fail — any page whose pixels drift beyond REGRESS_MAX_DIFF_RATIO
// (or whose dimensions change at all) fails. Until baselines are blessed the
// gate reports itself unarmed and passes, honestly and out loud.
//
//   node visual-tests/regress.mjs   (expects a prior `npm run visual:capture`)
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { BASELINE_ROOT, PAGES, REGRESS_MAX_DIFF_RATIO, VIEWPORTS } from './visual.config.mjs'
import { artifactPath, diffPngs, projectRoot, shotName, writeRunRecord } from './lib/visualLib.mjs'

const baselineDir = path.join(projectRoot, BASELINE_ROOT)
const baselines = fs.existsSync(baselineDir)
  ? fs.readdirSync(baselineDir).filter(name => name.endsWith('.png'))
  : []

if (baselines.length === 0) {
  writeRunRecord({ mode: 'unarmed-no-baselines' })
  console.log('Visual regression gate is NOT ARMED: visual-baselines/ holds no blessed baselines yet.')
  console.log('Blessing is a deliberate owner act — see visual-baselines/README.md. Passing without comparison.')
  process.exit(0)
}

const failures = []
let compared = 0

for (const pageConfig of PAGES) {
  for (const viewport of VIEWPORTS) {
    const name = shotName(pageConfig.key, viewport.name)
    const baseline = path.join(baselineDir, name)
    if (!fs.existsSync(baseline)) continue
    const current = artifactPath('current', name)
    if (!fs.existsSync(current)) {
      failures.push(`${name}: baseline exists but no current capture — run npm run visual:capture`)
      continue
    }
    const diffShot = artifactPath('regress-report', `diff--${name}`)
    const result = diffPngs(baseline, current, diffShot)
    compared += 1
    if (result.sizeMismatch) {
      failures.push(`${name}: dimensions changed (baseline ${result.leftSize.width}×${result.leftSize.height} → current ${result.rightSize.width}×${result.rightSize.height})`)
    } else if (result.diffRatio > REGRESS_MAX_DIFF_RATIO) {
      failures.push(`${name}: ${(result.diffRatio * 100).toFixed(3)}% of pixels differ (threshold ${(REGRESS_MAX_DIFF_RATIO * 100).toFixed(3)}%) — diff image: ${path.relative(projectRoot, diffShot)}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`Visual regression FAILED (${failures.length} of ${compared} comparisons):`)
  for (const failure of failures) console.error(`  - ${failure}`)
  console.error('\nIf the change is an approved contract amendment, bless new baselines deliberately:')
  console.error('  npm run visual:bless -- --pages <keys> --note "<who/why>"')
  process.exit(1)
}

writeRunRecord({ mode: 'regress-pass' })
console.log(`Visual regression passed: ${compared} baseline comparisons, none beyond ${(REGRESS_MAX_DIFF_RATIO * 100).toFixed(3)}%.`)

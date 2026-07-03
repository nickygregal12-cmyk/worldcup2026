import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const summaryPath = path.join(root, 'coverage/h1/coverage-summary.json')
const configPath = path.join(root, 'vitest.coverage.config.mjs')
const packagePath = path.join(root, 'package.json')

const thresholds = Object.freeze({
  lines: 57.7,
  statements: 57.7,
  functions: 78.53,
  branches: 68.48,
})

const errors = []
const fail = message => errors.push(message)

if (!fs.existsSync(summaryPath)) fail('Coverage summary is missing; run npm run test:coverage before this audit')
if (!fs.existsSync(configPath)) fail('vitest.coverage.config.mjs is missing')
else {
  const config = fs.readFileSync(configPath, 'utf8')
  for (const marker of [
    "reportsDirectory: 'coverage/h1'",
    "'src/pages/**'",
    "'src/components/**'",
    "'src/store/**'",
    "'src/testFixtures/**'",
    "'src/app/**/*.{js,jsx}'",
    "'src/lib/**/*.{js,jsx}'",
  ]) {
    if (!config.includes(marker)) fail(`Coverage config is missing expected live-src marker: ${marker}`)
  }
}

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
if (!pkg.devDependencies?.['@vitest/coverage-v8']) fail('Missing @vitest/coverage-v8 devDependency')
if (pkg.scripts?.['test:coverage'] !== 'vitest run --config vitest.coverage.config.mjs --coverage --maxWorkers=4') {
  fail('test:coverage script is missing or changed')
}
if (pkg.scripts?.['audit:coverage'] !== 'npm run test:coverage && node scripts/check-stage13g-h1-coverage.mjs') {
  fail('audit:coverage script is missing or changed')
}

if (fs.existsSync(summaryPath)) {
  const total = JSON.parse(fs.readFileSync(summaryPath, 'utf8')).total
  for (const [metric, floor] of Object.entries(thresholds)) {
    const actual = Number(total?.[metric]?.pct)
    if (!Number.isFinite(actual)) fail(`Coverage metric is missing: ${metric}`)
    else if (actual + 0.0001 < floor) fail(`${metric} coverage fell to ${actual}; ratcheted floor is ${floor}`)
  }
}

if (errors.length) {
  console.error('Euro Stage 13G-H1 coverage ratchet failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-H1 coverage ratchet passed.')
for (const [metric, floor] of Object.entries(thresholds)) console.log(`${metric}: floor ${floor}`)
console.log('Coverage scope: live Euro src only; legacy pages/components, store and visual fixtures excluded.')

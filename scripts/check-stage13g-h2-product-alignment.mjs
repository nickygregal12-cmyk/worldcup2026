import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const exists = file => fs.existsSync(path.join(root, file))
const errors = []
const fail = message => errors.push(message)

const h2DocPath = 'docs/STAGE-13G-H2-PRODUCT-FACING-ALIGNMENT.md'
if (!exists(h2DocPath)) fail(`${h2DocPath} is missing`)
const h2 = exists(h2DocPath) ? read(h2DocPath) : ''

const requiredDocMarkers = [
  'Decision: **drop for now**.',
  'not approved as deployable application assets',
  'Glanceable rank story | adopt-improved',
  'Rank movement up/down | adapt',
  'Top-three treatment | adopt-improved',
  'Viewer own row anchoring | adopt-improved',
  'Gap to leader | adopt-improved',
  'Copy the reference layout | drop',
  '#/player/:userId',
  '#/player/:userId/head-to-head?against=me',
  '#/player/:userId/points',
  'do **not** move Tournament Picks player entry into this docs/audit batch',
  'Import your saved Euro 2028 predictions?',
  'Import predictions to my account',
  'Start fresh',
  'Original Predictor and KO Predictor remain separate competitions',
  'No Migration 019 is created',
]

for (const marker of requiredDocMarkers) {
  if (!h2.includes(marker)) fail(`H2 document missing marker: ${marker}`)
}

const assetDoc = read('docs/THIRD-PARTY-ASSETS.md')
for (const marker of [
  'Official UEFA EURO 2028 logo and tournament identity',
  'not approved as deployable application assets',
  'Do not add the official logo to `public/`, `src/assets/`, favicons, Open Graph images, app headers or loading states.',
  'must not imply official UEFA affiliation',
]) {
  if (!assetDoc.includes(marker)) fail(`Third-party asset guidance missing marker: ${marker}`)
}

const ledger = read('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md')
if (!ledger.includes('| Stage 13G-H2 product-facing alignment | ✅ FUNCTIONAL |')) {
  fail('Functional ledger missing Stage 13G-H2 product-facing alignment row')
}
if (!ledger.includes('**v1.33:** Stage 13G-H2 product-facing alignment')) {
  fail('Functional ledger missing v1.33 H2 change-log entry')
}

for (const file of [
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
]) {
  const text = read(file)
  for (const marker of [
    'Stage 13G-H2 product-facing alignment and reference-asset decision',
    'rank movement adapt pending trustworthy previous-rank data',
    'Guest signup import prompt and signed-in copy sweep are the recommended next tight product build',
    'No route, component, scoring, resolver, database or migration change',
  ]) {
    if (!text.includes(marker)) fail(`${file} missing H2 marker: ${marker}`)
  }
}

const packageJson = JSON.parse(read('package.json'))
if (packageJson.scripts['audit:h2-product-alignment'] !== 'node scripts/check-stage13g-h2-product-alignment.mjs') {
  fail('package.json missing audit:h2-product-alignment script')
}
if (!packageJson.scripts.check.includes('npm run audit:h2-product-alignment')) {
  fail('npm run check must include audit:h2-product-alignment')
}
if (!packageJson.scripts['lint:foundation'].includes('scripts/check-stage13g-h2-product-alignment.mjs')) {
  fail('lint:foundation must include the H2 audit script')
}

const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationFiles.length !== 18) fail(`H2 must not change migration count; found ${migrationFiles.length}`)
if (migrationFiles.some(name => /(?:^|_)019|202607030019/.test(name))) fail('H2 must not create Migration 019')

const deployableAssetRoots = ['public', 'src/assets']
const bannedAssetName = /(?:uefa.*euro.*2028.*logo|euro.*2028.*logo|uefa.*logo).*\.(?:svg|png|jpe?g|webp)$/i

function walk(dir) {
  if (!fs.existsSync(path.join(root, dir))) return []
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

const bannedAssets = deployableAssetRoots.flatMap(walk).filter(file => bannedAssetName.test(file))
if (bannedAssets.length) {
  fail(`Official UEFA/EURO 2028 logo-like deployable asset filenames are not approved: ${bannedAssets.join(', ')}`)
}

if (errors.length) {
  console.error('Euro Stage 13G-H2 product alignment audit failed:')
  errors.forEach(error => console.error(`- ${error}`))
  process.exit(1)
}

console.log('Euro Stage 13G-H2 product alignment audit passed.')
console.log('Official UEFA EURO 2028 logo: not approved as a deployable app asset without recorded permission.')
console.log('Leagues reference patterns: evaluated as adopt-improved/adapt/drop before build.')
console.log('Next product build: guest import prompt and signed-in copy sweep recommended.')
console.log('Database: active migrations remain 18; no Migration 019.')

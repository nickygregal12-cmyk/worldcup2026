// Baseline blessing: promotes the latest captured screenshots to blessed
// baselines. This is a deliberate contract-amendment act, never a side effect:
//   - a --note explaining who/why is REQUIRED and recorded in BLESS-LOG.md;
//   - only explicitly named pages (or --all) are promoted;
//   - the freshness run-record is updated so the main-chain audit stays honest.
//
//   npm run visual:bless -- --pages home,groups --note "Home B v2 re-approved by Nicky"
//   npm run visual:bless -- --all --note "initial blessing after prototype re-approval"
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { spawnSync } from 'node:child_process'
import { BASELINE_ROOT, PAGES, VIEWPORTS } from './visual.config.mjs'
import { artifactPath, projectRoot, shotName, writeRunRecord } from './lib/visualLib.mjs'

const args = process.argv.slice(2)
const noteIndex = args.indexOf('--note')
const note = noteIndex >= 0 ? (args[noteIndex + 1] ?? '').trim() : ''
const all = args.includes('--all')
const pagesIndex = args.indexOf('--pages')
const requestedKeys = pagesIndex >= 0 ? (args[pagesIndex + 1] ?? '').split(',').filter(Boolean) : []

if (!note) {
  console.error('Blessing requires a recorded note: --note "<who approved this and why>".')
  console.error('Re-blessing baselines amends the visual contract; the log entry is not optional.')
  process.exit(1)
}
if (!all && requestedKeys.length === 0) {
  console.error('Name the pages being blessed (--pages home,groups) or pass --all deliberately.')
  process.exit(1)
}

const targets = all ? PAGES.map(page => page.key) : requestedKeys
const unknown = targets.filter(key => !PAGES.some(page => page.key === key))
if (unknown.length > 0) {
  console.error(`Unknown page keys: ${unknown.join(', ')}. Known: ${PAGES.map(page => page.key).join(', ')}.`)
  process.exit(1)
}

const baselineDir = path.join(projectRoot, BASELINE_ROOT)
fs.mkdirSync(baselineDir, { recursive: true })
const promoted = []
const missing = []

for (const key of targets) {
  for (const viewport of VIEWPORTS) {
    const name = shotName(key, viewport.name)
    const source = artifactPath('current', name)
    if (!fs.existsSync(source)) { missing.push(name); continue }
    fs.copyFileSync(source, path.join(baselineDir, name))
    promoted.push(name)
  }
}

if (missing.length > 0) {
  console.error(`Refusing to bless: ${missing.length} captures missing (${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', …' : ''}).`)
  console.error('Run npm run visual:capture first so blessing promotes exactly what was reviewed.')
  process.exit(1)
}

const who = spawnSync('git', ['config', 'user.name'], { encoding: 'utf8' }).stdout.trim() || 'unknown'
const commit = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).stdout.trim()
const logPath = path.join(baselineDir, 'BLESS-LOG.md')
const entry = `- ${new Date().toISOString()} · ${who} · at \`${commit}\` · pages: ${targets.join(', ')} · note: ${note}\n`
fs.appendFileSync(logPath, entry)

writeRunRecord({ mode: 'blessed', note })
console.log(`Blessed ${promoted.length} baselines for: ${targets.join(', ')}.`)
console.log(`Recorded in ${path.relative(projectRoot, logPath)} — commit visual-baselines/ and visual-tests/visual-run-record.json together.`)

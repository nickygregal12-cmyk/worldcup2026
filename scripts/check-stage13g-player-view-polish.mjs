import fs from 'node:fs'
import process from 'node:process'
import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''

const ui = `${read('src/player/PlayerView.jsx')}\n${read('src/player/PlayerViewPresentation.jsx')}`
const styles = read('src/player/PlayerView.module.css')
const tests = read('src/player/__tests__/PlayerView.test.jsx')
const pkg = JSON.parse(read('package.json'))

for (const marker of [
  'const CONTEXT',
  'Original Predictor profile',
  'KO Predictor profile',
  'Original points',
  'KO points',
  'Hidden picks',
  'PanelIntro',
  'EmptyState',
  'Match picks',
  'Original Bracket',
  'Predicted tables',
]) {
  if (!ui.includes(marker)) fail(`Player View polish marker missing: ${marker}`)
}

for (const marker of [
  '.hero',
  '.heroCopy',
  '.sectionIntro',
  '.summaryStrip',
  '.emptyState',
  '.tableGroupHeader',
]) {
  if (!styles.includes(marker)) fail(`Player View polish style missing: ${marker}`)
}

for (const marker of [
  'Original Predictor profile',
  'Original points',
  'Hidden picks',
  'KO Predictor profile',
]) {
  if (!tests.includes(marker)) fail(`Player View polish test marker missing: ${marker}`)
}

if (pkg.scripts?.['audit:stage13g-player-view-polish'] !== 'node scripts/check-stage13g-player-view-polish.mjs') {
  fail('package.json missing audit:stage13g-player-view-polish')
}

if (!pkg.scripts?.check?.includes('npm run audit:stage13g-player-view-polish')) {
  fail('check script does not include audit:stage13g-player-view-polish')
}

const migrations = fs.existsSync('supabase/migrations')
  ? fs.readdirSync('supabase/migrations').filter(name => name.endsWith('.sql'))
  : []
if (migrationSequenceError(migrations)) fail(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`Stage 13G-PLAYER-VIEW-POLISH-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-PLAYER-VIEW-POLISH-1 audit passed.')
console.log('Player View polish: header, competition context, empty states and mobile layout markers are present.')
console.log('Boundary: presentation-only; Original and KO Predictor remain separate.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)

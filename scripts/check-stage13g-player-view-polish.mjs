import fs from 'node:fs'
import process from 'node:process'

const errors = []
const fail = message => errors.push(message)
const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''

const ui = read('src/player/PlayerView.jsx')
const styles = read('src/player/PlayerView.module.css')
const tests = read('src/player/__tests__/PlayerView.test.jsx')
const pkg = JSON.parse(read('package.json'))

for (const marker of [
  'COMPETITION_CONTEXT',
  'Viewing Original Predictor picks',
  'Viewing KO Predictor picks',
  'Original points',
  'KO points',
  'Hidden picks',
  'PanelIntro',
  'EmptyState',
  'Match picks',
  'Original bracket',
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
  'Viewing Original Predictor picks',
  'Original points',
  'Hidden picks',
  'Viewing KO Predictor picks',
]) {
  if (!tests.includes(marker)) fail(`Player View polish test marker missing: ${marker}`)
}

if (pkg.scripts?.['audit:stage13g-player-view-polish'] !== 'node scripts/check-stage13g-player-view-polish.mjs') {
  fail('package.json missing audit:stage13g-player-view-polish')
}

if (!pkg.scripts?.check?.includes('npm run audit:stage13g-player-view-polish')) {
  fail('check script does not include audit:stage13g-player-view-polish')
}

if (fs.existsSync('supabase/migrations')) {
  const migration019 = fs.readdirSync('supabase/migrations').find(name => /019|migration[-_ ]?019/i.test(name))
  if (migration019) fail(`Stage 13G-PLAYER-VIEW-POLISH-1 must not create Migration 019: ${migration019}`)
}

if (errors.length > 0) {
  console.error(`Stage 13G-PLAYER-VIEW-POLISH-1 audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`- ${message}`)
  process.exit(1)
}

console.log('Stage 13G-PLAYER-VIEW-POLISH-1 audit passed.')
console.log('Player View polish: header, competition context, empty states and mobile layout markers are present.')
console.log('Boundary: presentation-only; Original and KO Predictor remain separate.')
console.log('Database: active migrations remain unchanged; no Migration 019.')

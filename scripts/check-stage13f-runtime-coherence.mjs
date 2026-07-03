import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const exists = relative => fs.existsSync(path.join(root, relative))
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const app = read('src/App.jsx')
if (!app.includes('export default function App()')) fail('src/App.jsx is not the product root')
if (exists('src/foundation')) fail('the retired src/foundation directory still exists')

for (const forbidden of [
  'EuroFoundationApp', 'EuroAuthFoundation', 'PredictionJourneyFoundation',
  'KoPredictorFoundation', 'ResultsAndLeaderboardsFoundation', 'MatchCentreFoundation',
  'LeaguesFoundation', 'AdminOperationsFoundation', 'PredictionSaveFoundation',
  'GuestWorkspaceFoundation',
]) {
  const matches = []
  for (const base of ['src', 'scripts']) {
    if (!exists(base)) continue
    const walk = directory => {
      for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const relative = path.join(directory, entry.name)
        if (entry.isDirectory()) walk(relative)
        else if (relative !== 'scripts/check-stage13f-runtime-coherence.mjs' && /\.(?:js|jsx|mjs)$/.test(entry.name) && read(relative).includes(forbidden)) matches.push(relative)
      }
    }
    walk(base)
  }
  if (matches.length) fail(`${forbidden} remains active in: ${matches.join(', ')}`)
}

for (const relative of ['src/app/visualFixture.js', 'src/app/stage13dVisualFixture.js']) {
  if (exists(relative)) fail(`production fixture remains in active app root: ${relative}`)
}
for (const source of ['src/App.jsx', 'src/main.jsx']) {
  const text = read(source)
  if (text.includes('visualFixture') || text.includes('stage13dVisualFixture')) fail(`${source} imports visual fixture code`)
}

const functionFiles = fs.readdirSync(path.join(root, 'netlify/functions'))
  .filter(name => fs.statSync(path.join(root, 'netlify/functions', name)).isFile())
  .sort()
const allowedFunctions = ['_observability.js', 'health.js', 'scheduled-heartbeat.js']
if (JSON.stringify(functionFiles) !== JSON.stringify(allowedFunctions)) {
  fail(`Netlify deploy input is not Euro-only: ${functionFiles.join(', ')}`)
}

for (const relative of ['public/manifest.json', 'public/sw.js', 'src/components/PWAInstall.jsx', 'src/components/PushNotifications.jsx']) {
  if (exists(relative)) fail(`deferred PWA/push remnant still ships: ${relative}`)
}
if (read('index.html').includes('rel="manifest"')) fail('index.html still references a deferred web manifest')
if (read('src/main.jsx').includes('serviceWorker')) fail('main runtime still manages the retired service worker')
if (read('netlify.toml').includes('/sw.js')) fail('Netlify still publishes service-worker cache headers')
if (exists('netlify/functions/snapshot-league-predictions.cjs')) fail('rejected per-league snapshot function still deploys')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql')).length
if (migrations < 16) fail(`expected at least 16 active migrations, found ${migrations}`)

if (errors.length) {
  console.error('Euro Stage 13F-H runtime coherence audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log('Euro Stage 13F-H product-root and runtime coherence audit passed.')
console.log('Root: src/App.jsx owns the product mount; active Foundation component naming is retired')
console.log('Fixtures: deterministic visual data is isolated from the production import graph')
console.log('Functions: only health, heartbeat and observability enter Euro deploy input')
console.log('PWA/push: deferred manifest, service-worker and push remnants are removed pending Stage 18C')
console.log(`Database: ${migrations} active migrations; no database change in Stage 13F-H`)

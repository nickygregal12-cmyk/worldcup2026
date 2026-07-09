import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
// Unknown-route fallback audit — scheduled product-completeness route recovery.
//
// This guard proves that unknown app hashes no longer silently fall through to
// Home without a user-facing explanation. It is a UI/test/docs/audit guard only.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { UNKNOWN_ROUTE_COPY } from '../src/app/unknownRouteCopy.js'

const root = process.cwd()
const errors = []
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const has = (file, text) => read(file).includes(text)
const requireText = (file, text, reason) => {
  if (!fs.existsSync(path.join(root, file))) {
    errors.push(`${file} is missing — ${reason}.`)
    return
  }
  if (!has(file, text)) errors.push(`${file} must contain "${text}" — ${reason}.`)
}

const app = 'src/App.jsx'
const copy = 'src/app/unknownRouteCopy.js'
const routeTests = 'src/app/__tests__/appRoutes.test.js'
const stageDoc = 'docs/archive/STAGE-PRODUCT-UNKNOWN-ROUTE-FALLBACK.md'
const roadmap = 'docs/PRODUCT-COMPLETENESS-ROADMAP.md'
const register = 'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md'
const ledger = 'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md'
const agentRules = 'docs/EURO28-AGENT-RULES-AND-ROADMAP.md'

for (const [key, value] of Object.entries(UNKNOWN_ROUTE_COPY)) {
  if (typeof value !== 'string' || value.trim().length < 4) errors.push(`UNKNOWN_ROUTE_COPY.${key} must be meaningful user-facing copy.`)
}

requireText(app, 'function UnknownDestination', 'unknown hashes need a user-facing recovery surface')
requireText(app, 'unknownDestinationRequested', 'App must detect unknown app hashes before rendering Home')
requireText(app, 'isKnownAppHash', 'unknown detection must use the central route registry')
requireText(app, 'UNKNOWN_ROUTE_COPY.title', 'the fallback title must come from shared copy')
requireText(app, 'UNKNOWN_ROUTE_COPY.predictionsSafe', 'the fallback safety reassurance must come from shared copy')
requireText(app, 'href="#/groups"', 'the fallback must offer a direct Groups recovery path')
requireText(copy, 'UNKNOWN_ROUTE_COPY', 'user-facing fallback copy must have one source of truth')
requireText(routeTests, 'identifies unknown app destinations while keeping the route fallback safe', 'route tests must cover unknown hashes')
requireText(routeTests, "isKnownAppHash('#/not-a-route')", 'route tests must prove unknown hashes are detectable')
requireText(stageDoc, 'Stage PRODUCT-UNKNOWN-ROUTE-1', 'stage documentation must name the slice')
requireText(stageDoc, 'No Supabase writes', 'stage documentation must preserve no-write safety')
requireText(stageDoc, 'Migration 019 is not created', 'stage documentation must preserve migration safety')
requireText(roadmap, 'Unknown-route fallback — CLOSED', 'the product roadmap must record the scheduled follow-on as closed')
requireText(register, 'Stage PRODUCT-UNKNOWN-ROUTE-1', 'the decision register must record the closed fallback slice')
requireText(ledger, 'Stage PRODUCT-UNKNOWN-ROUTE-1', 'the functional ledger must record the closed fallback slice')
requireText(agentRules, 'Stage PRODUCT-UNKNOWN-ROUTE-1', 'future agents must preserve the route recovery behaviour')

const migrations = fs.readdirSync(path.join(root, 'supabase/migrations')).filter(name => name.endsWith('.sql'))
if (migrationSequenceError(migrations)) errors.push(migrationSequenceError(migrations))

if (errors.length > 0) {
  console.error(`Unknown-route fallback audit failed with ${errors.length} issue(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

console.log('Stage PRODUCT-UNKNOWN-ROUTE-1 unknown-route fallback audit passed.')
console.log('Routes: unknown app hashes render a friendly recovery surface instead of silently falling through to Home.')
console.log('Safety: UI/test/docs/audit only; no scoring, resolver, Supabase write, service-role use or migration change.')
console.log(`Database: ${migrations.length} active migrations, sequentially numbered with no gaps.`)

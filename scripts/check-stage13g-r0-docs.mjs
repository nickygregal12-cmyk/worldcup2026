import { migrationSequenceError } from './lib/migrationSequenceGuard.mjs'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const requireText = (file, needles) => {
  const text = read(file)
  for (const needle of needles) {
    if (!text.includes(needle)) throw new Error(`${file} missing: ${needle}`)
  }
}

requireText('docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', [
  'Version 1.21',
  '| Admin UI fit for purpose | ⚠️ INCOHERENT |',
  '| Admin section destinations and deep links | ❌ MISSING |',
  '| Complete Admin operations backbone | 🟠 PARTIAL |',
  '| Offline players / claim-account model | 🔒 DECISION PENDING |',
  'legacy-wc26-final',
  'Stage 13G-R0 corrects the false Stage 13F-F navigation claim',
])
requireText('docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md', [
  'Version 3.9',
  'Expected Git commit: `b7f50de`',
  'C1 navigation — Option A approved',
  'Original-bracket invalidation contract — approved',
  'Offline players / claim-account',
  'same commit as every future batch',
])
requireText('docs/EURO28-AGENT-RULES-AND-ROADMAP.md', [
  'Version 4.20',
  'Stage 13G-R0 — Canonical Documentation Reconciliation and Truthful Ledger v1.21',
  'no Migration 019',
  '13G-A — Admin route integrity',
])
requireText('docs/STAGE-13G-R0-CANONICAL-RECONCILIATION.md', [
  'Starting checkpoint:** `b7f50de`',
  'exactly 18',
  'The KO Predictor remains entirely separate',
  'Do not revoke it in R0',
])

const migrations = fs.readdirSync(path.join(root, 'supabase', 'migrations')).filter((name) => name.endsWith('.sql')).sort()
if (migrationSequenceError(migrations)) throw new Error(migrationSequenceError(migrations))

console.log('Stage 13G-R0 documentation reconciliation checks passed.')
console.log(`Active migrations: ${migrations.length}`)
console.log(`Latest migration: ${migrations.at(-1)}`)

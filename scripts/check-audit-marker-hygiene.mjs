// Meta-audit — audit scripts must never hardcode user-facing prose as markers.
//
// Root cause this guards against, permanently: the Leagues.jsx competition
// -boundary sentence became unfixable because two audit scripts checked for
// the literal sentence as if it were a structural marker (a component name,
// a CSS class). Once an audit asserts exact prose, nobody can improve the
// wording without editing every audit that duplicates it — so the internal
// rule-sentence becomes the product copy forever.
//
// The rule: an audit may assert structure (component names, imports, route
// hashes, class names, config keys) or a shared named constant. It may not
// duplicate a sentence of rendered copy. This scans EVERY current and future
// scripts/*.mjs automatically — new audits are covered the day they exist.
//
// Detection: a string literal in an audit script counts as "prose" when it
// has at least PROSE_MIN_WORDS words and contains no code-shaped characters
// ({ } < > = ( ) _ / $). A prose literal that also appears verbatim in any
// active src/ file is a frozen-copy marker and fails the audit. Fix pattern:
// move the sentence to one shared exported constant, render the constant in
// the UI, and import the same constant in the audit.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const PROSE_MIN_WORDS = 5
const CODE_SHAPE = /[{}<>=()_/$]/

// Ratchet cap — the frozen-marker count recorded when this meta-audit was
// introduced. The count must NEVER rise, and the cap must be lowered in the
// same commit whenever remediation reduces the count (same discipline as the
// lint-bypass governance caps). The healthy end state is 0.
const MAX_FROZEN_MARKERS = 64

// Exceptions must name the audit file, the exact literal and a reason.
// An empty list is the healthy state — prefer the shared-constant fix.
const ALLOWED_MARKERS = Object.freeze([
  // { file: 'scripts/check-example.mjs', text: 'exact literal', reason: 'why this cannot be a constant' },
])

const isAllowedMarker = (file, text) =>
  ALLOWED_MARKERS.some(entry => entry.file === file && entry.text === text)

const looksLikeProse = text => {
  const trimmed = text.trim()
  if (CODE_SHAPE.test(trimmed)) return false
  const words = trimmed.split(/\s+/).filter(word => /[a-zA-Z]{2,}/.test(word))
  return words.length >= PROSE_MIN_WORDS
}

function extractStringLiterals(source) {
  const literals = []
  for (const match of source.matchAll(/'([^'\\\n]*(?:\\.[^'\\\n]*)*)'|"([^"\\\n]*(?:\\.[^"\\\n]*)*)"|`([^`\\]*(?:\\.[^`\\]*)*)`/g)) {
    const text = match[1] ?? match[2] ?? match[3]
    if (text) literals.push(text)
  }
  return literals
}

// Active product source only — legacy quarantined roots cannot freeze live copy.
const SRC_EXCLUDED = ['src/pages/', 'src/components/', 'src/testFixtures/']
const srcFiles = walkFiles(root, 'src').filter(file =>
  (file.endsWith('.jsx') || file.endsWith('.js'))
  && !file.includes('/__tests__/')
  && !SRC_EXCLUDED.some(prefix => file.startsWith(prefix)))
const srcSources = srcFiles.map(file => ({ file, source: read(file) }))

const auditFiles = walkFiles(root, 'scripts').filter(file =>
  file.endsWith('.mjs') && !file.includes('/__tests__/') && !file.includes('/lib/')
  && path.basename(file) !== path.basename(new URL(import.meta.url).pathname))

let scannedLiterals = 0
for (const auditFile of auditFiles) {
  const source = read(auditFile)
  const seen = new Set()
  for (const literal of extractStringLiterals(source)) {
    if (seen.has(literal)) continue
    seen.add(literal)
    if (!looksLikeProse(literal)) continue
    scannedLiterals += 1
    if (isAllowedMarker(auditFile, literal)) continue
    const frozen = srcSources.filter(entry => entry.source.includes(literal))
    if (frozen.length > 0) {
      fail(`${auditFile}: hardcodes prose that also appears in ${frozen.map(entry => entry.file).join(', ')} — "${literal.slice(0, 90)}${literal.length > 90 ? '…' : ''}". Extract the copy to one shared exported constant, render the constant in the UI and import the same constant here; audits assert structure or constants, never duplicated sentences.`)
    }
  }
}

if (errors.length > MAX_FROZEN_MARKERS) {
  console.error(`Audit marker-hygiene meta-audit failed: ${errors.length} frozen copy markers exceed the ratchet cap of ${MAX_FROZEN_MARKERS}.\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nA new audit has hardcoded a sentence of UI copy as a marker. Point it at a shared exported constant instead — audits assert structure or constants, never duplicated sentences.')
  process.exit(1)
}

if (errors.length < MAX_FROZEN_MARKERS) {
  console.error(`Audit marker-hygiene meta-audit: frozen-marker count is now ${errors.length}, below the cap of ${MAX_FROZEN_MARKERS}.`)
  console.error(`Lower MAX_FROZEN_MARKERS to ${errors.length} in this commit so the improvement is locked in — the ratchet only turns one way.`)
  process.exit(1)
}

if (errors.length === MAX_FROZEN_MARKERS && MAX_FROZEN_MARKERS > 0) {
  console.log(`Audit marker-hygiene meta-audit passed at the ratchet cap (${errors.length}/${MAX_FROZEN_MARKERS} known frozen markers, remediation backlog).`)
  console.log(`Checked ${scannedLiterals} prose-like literals across ${auditFiles.length} audit scripts against ${srcFiles.length} active source files. No NEW frozen markers.`)
} else {
  console.log(`Audit marker-hygiene meta-audit passed. Checked ${scannedLiterals} prose-like literals across ${auditFiles.length} audit scripts against ${srcFiles.length} active source files — no frozen copy markers.`)
}

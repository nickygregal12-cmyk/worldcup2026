// Meta-audit — governing documents cannot silently drift.
//
// Root cause this guards against: sections get appended to the Decision
// Register / Agent Rules while the version header and "current return point"
// at the top stay frozen at an older stage, so the front of the document
// contradicts its own tail (found live in this repo: Register header and
// return point three stages stale while its appended sections were current).
// Stage 13G-R0 made same-commit truthful records a rule; this makes the
// mechanically checkable part of that rule a build failure.
//
// Enforced against current and future docs automatically:
//   1. Every "active migrations remain/count N" claim in docs/*.md equals
//      the real migration file count, and no migration file exceeds the
//      declared ceiling (Migration 019 guard, generalised).
//   2. In any governing doc with more than one "Version X.Y" line, the
//      header (first) version is the highest — appended changelog entries
//      can never overtake a stale header.
//   3. Every designated return-point commit reference in the governing docs
//      matches the deployed head declared by the newest handover doc.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { walkFiles } from './lib/frontendArchitectureAudit.mjs'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const GOVERNING_DOCS = Object.freeze([
  'docs/EURO28-PROJECT-CONSTITUTION.md',
  'docs/EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'docs/EURO28-AGENT-RULES-AND-ROADMAP.md',
  'docs/EURO28-DESIGN-CHARTER.md',
  'docs/EURO28-FUNCTIONAL-COMPLETION-LEDGER.md',
  'docs/EURO28-SITE-ACCESS-MAP.md',
])

// ── 1. Migration-count claims match reality ─────────────────────────────────
const migrationFiles = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(name => name.endsWith('.sql')).sort()
const actualCount = migrationFiles.length
const highestNumber = Math.max(...migrationFiles.map(name => {
  const match = name.match(/^\d{8}(\d{4})_/)
  return match ? Number(match[1]) : 0
}))
if (highestNumber !== actualCount) {
  fail(`Migration numbering is not contiguous: ${actualCount} files but highest sequence number is ${String(highestNumber).padStart(4, '0')}.`)
}

// Only count claims explicitly about migrations — "exactly 24 teams" and
// similar are not migration claims and must never false-positive.
const COUNT_CLAIM = /(?:active migrations? remains?(?: at)? \**(\d+)\**|active migration count[^0-9]{0,12}\**(\d+)\**|exactly \**(\d+)\** (?:active )?migrations)/gi

// Closed stage docs are frozen historical evidence ("migrations remain 14"
// was true at that stage's close) and are exempt. Only documents that assert
// CURRENT state must always be true now: the governing docs, every dated
// handover from the current head, and every NEXT-CHAT prompt.
const allDocs = walkFiles(root, 'docs').filter(file => file.endsWith('.md') && !file.startsWith('docs/reference-prototypes/'))
const handoverDocs = allDocs.filter(file => /HANDOVER-\d{8}/.test(file)).sort()
const currentStateDocs = [
  ...GOVERNING_DOCS,
  ...(handoverDocs.length ? [handoverDocs[handoverDocs.length - 1]] : []),
  ...allDocs.filter(file => file.includes('NEXT-CHAT-PROMPT')),
].filter(file => fs.existsSync(path.join(root, file)))

for (const file of currentStateDocs) {
  const source = read(file)
  for (const match of source.matchAll(COUNT_CLAIM)) {
    const claimed = Number(match[1] ?? match[2] ?? match[3])
    if (claimed !== actualCount) {
      fail(`${file} claims ${claimed} active migrations; supabase/migrations/ contains ${actualCount}. Correct the doc in the same commit as any migration change.`)
    }
  }
}

const forbiddenNext = String(actualCount + 1).padStart(3, '0')
if (migrationFiles.some(name => name.includes(forbiddenNext))) {
  fail(`A migration numbered ${forbiddenNext} exists but governing docs still declare ${actualCount} active migrations.`)
}

// ── 2. Header version is the highest version in each governing doc ─────────
for (const file of GOVERNING_DOCS) {
  if (!fs.existsSync(path.join(root, file))) { fail(`Governing doc missing: ${file}`); continue }
  const versions = [...read(file).matchAll(/Version (\d+)\.(\d+)/g)]
    .map(match => ({ major: Number(match[1]), minor: Number(match[2]), text: `${match[1]}.${match[2]}` }))
  if (versions.length < 2) continue
  const header = versions[0]
  const highest = versions.reduce((best, current) =>
    current.major > best.major || (current.major === best.major && current.minor > best.minor) ? current : best)
  if (highest.text !== header.text) {
    fail(`${file}: header declares Version ${header.text} but the document contains Version ${highest.text}. Bump the header in the same commit as the appended entry.`)
  }
}

// ── 3. Return-point commits agree with the newest handover head ────────────
const newestHandover = handoverDocs[handoverDocs.length - 1]
if (!newestHandover) {
  fail('No dated handover doc (docs/*HANDOVER-YYYYMMDD*.md) found to anchor return-point coherence.')
} else {
  const headMatch = read(newestHandover).match(/deployed (?:commit|head)[^`\n]*`([0-9a-f]{7,40})/i)
  if (!headMatch) {
    fail(`${newestHandover} does not declare a deployed head ("deployed commit ... \`<hash>\`") — the newest handover must anchor the return point.`)
  } else {
    const head = headMatch[1]
    const RETURN_POINT = /(?:expected git commit[^`\n]*|latest known completed product commit[^`\n]*|current deployed head[^`\n]*|latest deployed commit[^`\n]*)`([0-9a-f]{7,40})/gi
    for (const file of GOVERNING_DOCS) {
      if (!fs.existsSync(path.join(root, file))) continue
      const source = read(file)
      for (const match of source.matchAll(RETURN_POINT)) {
        if (!match[1].startsWith(head) && !head.startsWith(match[1])) {
          fail(`${file} return point names \`${match[1]}\` but the newest handover (${newestHandover}) declares deployed head \`${head}\`. Update return points in the same commit as the handover.`)
        }
      }
    }
  }
}

if (errors.length > 0) {
  console.error(`Governance-coherence meta-audit failed with ${errors.length} issue(s):\n`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nGoverning documents must be corrected in the same commit as the change that made them stale — recorded state equals real state.')
  process.exit(1)
}

console.log(`Governance-coherence meta-audit passed. ${actualCount} migrations match every doc claim; version headers current; return points agree with ${newestHandover}.`)

// Documentation-structure audit — the guardrail behind the documentation
// constitution in AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md. Deliberately small:
//   1. docs/*.md must be a declared living document (new living docs are added
//      here AND to the authority map in the same commit).
//   2. docs/archive/*.md must open with its ARCHIVED banner and is frozen.
//   3. Root-level *.md is limited to the declared entry/dashboard set.
//   4. REPORT-*.md files live only in reports/.
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const root = process.cwd()
const errors = []
const fail = message => errors.push(message)

const LIVING_DOCS = new Set([
  'ADMIN-OPS-TRUST-CONTRACT.md', 'ADMIN-SCENARIO-RUNNER-BRIEF.md', 'AGENT-DRIFT-GUARDS.md',
  'APPROVED-VISUAL-CONTRACT-INVENTORY.md', 'CANDIDATE-TEAM-POOL-BRIEF.md', 'CONTEXTUAL-RETURN-RULE.md',
  'DATABASE-BACKUP-AND-RESTORE.md', 'DATABASE.md', 'DEPLOYMENT.md', 'DESIGN-CONTRAST-GUARDS.md',
  'DEVELOPMENT.md', 'EDGE-CASE-RULES-ADDENDUM.md', 'ENTRY-AND-REVIEW-JOURNEY-CONTRACT.md',
  'EURO28-AGENT-RULES-AND-ROADMAP.md', 'EURO28-CONSOLIDATED-DECISION-REGISTER-AND-ROADMAP.md',
  'EURO28-DESIGN-CHARTER.md', 'EURO28-FUNCTIONAL-COMPLETION-LEDGER.md', 'EURO28-PROJECT-CONSTITUTION.md',
  'EURO28-SITE-ACCESS-MAP.md', 'FINAL-DESIGN-CONTENT-SWEEP-CONTRACT.md', 'LEAGUE-SETUP-AND-INVITES-CONTRACT.md',
  'MORE-ACCOUNT-TRUST-CONTRACT.md', 'OPERATIONS-RUNBOOK.md', 'PRODUCT-COMPLETENESS-ROADMAP.md',
  'PUBLIC-SIGNUP-CONTROLLED-OPEN-CONTRACT.md', 'PUBLIC-SIGNUP-EXTERNAL-SETTINGS-CHECK-CONTRACT.md',
  'PUBLIC-SIGNUP-IMPLEMENTATION-CONTRACT.md', 'PUBLIC-SIGNUP-IMPLEMENTATION-READINESS-CONTRACT.md',
  'PUBLIC-SIGNUP-OPENING-GATE-CONTRACT.md', 'PUBLIC-SIGNUP-SMTP-READINESS-CONTRACT.md',
  'REFERENCE-FILE-INSTALL-MAP.md', 'RESULTS-AND-SCORING-TRUST-CONTRACT.md', 'RULES-SCORING-LOCKED-CONTRACT.md',
  'SIMULATION-SAFETY-GUIDELINES.md', 'STAGING-ADMIN-ACCESS.md', 'TESTING.md', 'THIRD-PARTY-ASSETS.md',
  'UNRESOLVED-GROUP-TIEBREAKER-PROMPT.md',
])
const ROOT_DOCS = new Set(['AGENTS.md', 'PROJECT-CONTROL.md', 'README.md'])

// 1. Every docs/*.md is declared living.
for (const name of fs.readdirSync(path.join(root, 'docs')).filter(name => name.endsWith('.md'))) {
  if (!LIVING_DOCS.has(name)) {
    fail(`docs/${name} is not a declared living document — add it to the authority map AND this audit, or archive it with a banner.`)
  }
}
for (const name of LIVING_DOCS) {
  if (!fs.existsSync(path.join(root, 'docs', name))) fail(`Declared living document is missing: docs/${name}`)
}

// 2. Archived docs carry the banner and archive contains only .md.
const archiveDir = path.join(root, 'docs', 'archive')
for (const name of fs.readdirSync(archiveDir)) {
  if (!name.endsWith('.md')) { fail(`docs/archive/${name} is not a markdown document`); continue }
  const opening = fs.readFileSync(path.join(archiveDir, name), 'utf8').slice(0, 400)
  if (!opening.includes('**ARCHIVED')) {
    fail(`docs/archive/${name} is missing its ARCHIVED banner (first lines must carry it).`)
  }
}

// 3. Root markdown is the declared entry set only.
for (const name of fs.readdirSync(root).filter(name => name.endsWith('.md'))) {
  if (!ROOT_DOCS.has(name)) fail(`Root-level ${name} is not allowed — living docs belong in docs/, session reports in reports/.`)
}

// 4. REPORT-* files live only in reports/ (which is gitignored working notes).
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'reports', 'coverage', 'dist', 'visual-artifacts'].includes(entry.name)) continue
    if (entry.name.startsWith('.')) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/^REPORT-/.test(entry.name)) out.push(path.relative(root, full))
  }
  return out
}
for (const stray of walk(root)) fail(`${stray} must live in reports/ (REPORT-<topic>-<date>.md).`)

if (errors.length > 0) {
  console.error(`Documentation-structure audit failed with ${errors.length} issue(s):`)
  for (const message of errors) console.error(`  - ${message}`)
  console.error('\nThe living set is declared in AGENT-CONTROL/10-DOC-AUTHORITY-MAP.md — change both together.')
  process.exit(1)
}

console.log(`Documentation-structure audit passed: ${LIVING_DOCS.size} living docs declared and present, archive bannered, root and reports placement clean.`)
